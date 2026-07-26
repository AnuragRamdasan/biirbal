import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getDbClient } from '@/lib/db'
import { extractLinksFromMessage, shouldProcessUrl } from '@/lib/slack'
import { queueClient } from '@/lib/queue/client'
import { WebClient } from '@slack/web-api'
import { getBaseUrl } from '@/lib/config'
import { canProcessNewLink } from '@/lib/subscription-utils'

// FIX (Bug 3): reject requests older than 5 minutes before checking the HMAC.
// Without this staleness guard any captured valid request can be replayed
// indefinitely — Slack's own security guidance requires this check.
function verifySlackRequest(body: string, signature: string, timestamp: string): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) {
    throw new Error('Slack signing secret is not configured')
  }

  // Reject requests older than 5 minutes to prevent replay attacks
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
    return false
  }

  const hmac = crypto.createHmac('sha256', signingSecret)
  const [version, hash] = signature.split('=')
  
  hmac.update(`${version}:${timestamp}:${body}`)
  const expectedSignature = hmac.digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-slack-signature')
    const timestamp = request.headers.get('x-slack-request-timestamp')

    if (!signature || !timestamp) {
      return NextResponse.json({ error: 'Missing headers' }, { status: 400 })
    }

    if (!verifySlackRequest(body, signature, timestamp)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)

    if (event.type === 'url_verification') {
      return NextResponse.json({ challenge: event.challenge })
    }

    if (event.type === 'event_callback') {
      const { event: slackEvent } = event
      console.log(`🎯 Event callback received: ${slackEvent.type} from team ${event.team_id}`)

      switch (slackEvent.type) {
        case 'message':
          await handleMessage(slackEvent, event.team_id)
          break
        case 'app_mention':
          console.log(`📢 App mention received`)
          await handleAppMention(slackEvent, event.team_id)
          break
        case 'member_joined_channel':
          console.log(`👋 Member joined channel`)
          await handleMemberJoinedChannel(slackEvent, event.team_id)
          break
        default:
          console.log(`❓ Unhandled event type: ${slackEvent.type}`)
      }
    } else {
      console.log(`📨 Non-event-callback received: ${event.type}`)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Slack event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

interface MessageContext {
  event: any
  teamId: string
  team: any
  links: string[]
  validLinks: string[]
}

function shouldSkipMessage(event: any): boolean {
  return event.bot_id || !event.text || event.subtype
}

async function validateTeamAndUsage(teamId: string, userId: string): Promise<{ team: any; canProcess: boolean; reason?: string }> {
  const db = await getDbClient()
  const team = await db.team.findUnique({
    where: { slackTeamId: teamId },
    include: { subscription: true }
  })

  if (!team || !team.isActive) {
    console.log(`❌ Team not found or inactive: found=${!!team}, active=${team?.isActive}`)
    return { team: null, canProcess: false, reason: 'Team not found or inactive' }
  }
  
  console.log(`✅ Team found: ${team.teamName || team.slackTeamId}, subscription: ${team.subscription?.planId || 'none'}`)

  const usageCheck = await canProcessNewLink(teamId, userId)
  console.log(`📋 Usage check result:`, usageCheck)
  
  if (!usageCheck.allowed) {
    console.log(`❌ Link processing not allowed: ${usageCheck.reason}`)
    return { team, canProcess: false, reason: usageCheck.reason }
  }

  return { team, canProcess: true }
}

async function updateChannelInfo(channelId: string, teamId: string): Promise<void> {
  const db = await getDbClient()
  await db.channel.upsert({
    where: { slackChannelId: channelId },
    update: { updatedAt: new Date() },
    create: {
      slackChannelId: channelId,
      teamId
    }
  })
}

async function queueLinksForProcessing(context: MessageContext): Promise<boolean> {
  const { event, teamId, team, validLinks } = context
  
  console.log(`🎯 Preparing to queue ${validLinks.length} links for processing...`)
  
  const queuePromises = validLinks.map((url, index) => {
    const jobData = {
      url,
      messageTs: event.ts,
      channelId: event.channel,
      teamId: team.id,
      slackTeamId: teamId
    }
    console.log(`📦 Job ${index + 1} data:`, jobData)
    return queueClient.add('PROCESS_LINK', jobData)
  })

  try {
    console.log(`⏳ Adding ${queuePromises.length} jobs to queue...`)
    const jobIds = await Promise.all(queuePromises)
    console.log(`✅ Successfully queued ${jobIds.length} links for processing`)
    console.log(`🆔 Job IDs:`, jobIds.map((job: any) => job?.id || 'undefined'))
    return true
  } catch (error: any) {
    console.error('❌ Failed to queue link processing jobs:', error?.message || error)
    return false
  }
}

function addSlackReaction(team: any, event: any): void {
  console.log(`🎭 Adding processing reaction to Slack message...`)
  setImmediate(async () => {
    try {
      const slackClient = new WebClient(team.accessToken)
      await slackClient.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'hourglass_flowing_sand'
      })
      console.log(`✅ Processing reaction added to Slack message`)
    } catch (err: any) {
      console.log(`❌ Could not add processing reaction:`, err?.message || err)
    }
  })
}

function triggerWorkerProcess(): void {
  setImmediate(async () => {
    const baseUrl = getBaseUrl()
    const workerUrl = `${baseUrl}/api/queue/worker`
    
    console.log(`🔔 Triggering worker at ${workerUrl}`)
    
    try {
      const response = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000)
      })
      
      console.log(`📡 Worker response status: ${response.status}`)
      
      if (response.ok) {
        const responseText = await response.text()
        console.log(`✅ Worker triggered successfully: ${response.status}`)
        console.log(`📄 Worker response:`, responseText.substring(0, 200))
      } else {
        const errorText = await response.text()
        console.warn(`⚠️ Worker responded with ${response.status}:`, errorText.substring(0, 200))
        console.warn(`⚠️ Jobs are still queued and will be processed by cron`)
      }
    } catch (error: any) {
      if (error.name === 'TimeoutError') {
        console.warn('⏰ Worker trigger timed out, but jobs are queued. Cron will process them.')
      } else {
        console.error('❌ Failed to trigger worker:', error?.message || error)
      }
      console.log('📅 Scheduled cron will process queued jobs automatically')
    }
  })
}

async function handleMessage(event: any, teamId: string) {
  console.log(`📥 Message received from team ${teamId}, channel ${event.channel}`)
  console.log(`📝 Message text: "${event.text?.substring(0, 100)}${event.text?.length > 100 ? '...' : ''}"`)
  console.log(`👤 User ID: ${event.user}`)
  
  if (shouldSkipMessage(event)) {
    console.log(`⏭️ Skipping message: bot_id=${!!event.bot_id}, no_text=${!event.text}, subtype=${event.subtype}`)
    return
  }

  const links = extractLinksFromMessage(event.text)
  console.log(`🔗 Extracted ${links.length} links:`, links)
  
  if (links.length === 0) {
    console.log(`❌ No links found in message`)
    return
  }

  const { team, canProcess, reason } = await validateTeamAndUsage(teamId, event.user)
  if (!canProcess) {
    console.log(`❌ Cannot process: ${reason}`)
    return
  }

  console.log(`✅ Usage limits OK - proceeding with link processing`)
  
  const validLinks = links.filter(url => shouldProcessUrl(url))
  console.log(`🔍 Valid links after filtering: ${validLinks.length}/${links.length}`)
  
  if (validLinks.length === 0) {
    console.log(`❌ No valid links to process after filtering`)
    return
  }

  await updateChannelInfo(event.channel, team.id)
  
  const context: MessageContext = { event, teamId, team, links, validLinks }
  const queueSuccess = await queueLinksForProcessing(context)
  
  if (queueSuccess) {
    addSlackReaction(team, event)
    triggerWorkerProcess()
  }
}

async function handleAppMention(event: any, _teamId?: string) {
  console.log('App mention received:', event)
}

async function handleMemberJoinedChannel(event: any, teamId: string) {
  if (event.user === process.env.SLACK_BOT_USER_ID) {
    const db = await getDbClient()
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId }
    })

    if (team) {
      await updateChannelInfo(event.channel, team.id)
    }
  }
}
