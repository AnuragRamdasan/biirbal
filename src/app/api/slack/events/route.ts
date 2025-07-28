import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getDbClient } from '@/lib/db'
import { extractLinksFromMessage, shouldProcessUrl } from '@/lib/slack'
import { queueClient } from '@/lib/queue/client'
import { WebClient } from '@slack/web-api'
import { getBaseUrl } from '@/lib/config'
import { canProcessNewLink } from '@/lib/subscription-utils'

function verifySlackRequest(body: string, signature: string, timestamp: string): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) {
    throw new Error('Slack signing secret is not configured')
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

    // Verify request is from Slack
    if (!verifySlackRequest(body, signature, timestamp)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)

    // Handle URL verification challenge
    if (event.type === 'url_verification') {
      return NextResponse.json({ challenge: event.challenge })
    }

    // Handle events
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

async function handleMessage(event: any, teamId: string) {
  console.log(`📥 Message received from team ${teamId}, channel ${event.channel}`)
  console.log(`📝 Message text: "${event.text?.substring(0, 100)}${event.text?.length > 100 ? '...' : ''}"`)
  console.log(`👤 User ID: ${event.user}`)
  
  // Skip bot messages and messages without text
  if (event.bot_id || !event.text || event.subtype) {
    console.log(`⏭️ Skipping message: bot_id=${!!event.bot_id}, no_text=${!event.text}, subtype=${event.subtype}`)
    return
  }

  const links = extractLinksFromMessage(event.text)
  console.log(`🔗 Extracted ${links.length} links:`, links)
  
  if (links.length === 0) {
    console.log(`❌ No links found in message`)
    return
  }

  // Get team info to check subscription status
  const db = await getDbClient()
  const team = await db.team.findUnique({
    where: { slackTeamId: teamId },
    include: { subscription: true }
  })

  if (!team || !team.isActive) {
    console.log(`❌ Team not found or inactive: found=${!!team}, active=${team?.isActive}`)
    return
  }
  
  console.log(`✅ Team found: ${team.teamName || team.slackTeamId}, subscription: ${team.subscription?.planId || 'none'}`)

  // Check if team can process new links using updated subscription utils
  console.log(`🔍 Checking usage limits for team ${teamId} and user ${event.user}`)
  const usageCheck = await canProcessNewLink(teamId, event.user)
  console.log(`📋 Usage check result:`, usageCheck)
  
  if (!usageCheck.allowed) {
    console.log(`❌ Link processing not allowed: ${usageCheck.reason}`)
    return
  }
  
  console.log(`✅ Usage limits OK - proceeding with link processing`)

  // Store or update channel info
  await db.channel.upsert({
    where: { slackChannelId: event.channel },
    update: { updatedAt: new Date() },
    create: {
      slackChannelId: event.channel,
      teamId: team.id
    }
  })

  // Queue each link for background processing (non-blocking)
  const validLinks = links.filter(url => shouldProcessUrl(url))
  console.log(`🔍 Valid links after filtering: ${validLinks.length}/${links.length}`)
  console.log(`📝 Filtered links:`, validLinks)
  
  if (validLinks.length === 0) {
    console.log(`❌ No valid links to process after filtering`)
    return
  }
  
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

  // Queue links and trigger worker - proper async handling
  try {
    console.log(`⏳ Adding ${queuePromises.length} jobs to queue...`)
    const jobIds = await Promise.all(queuePromises)
    console.log(`✅ Successfully queued ${jobIds.length} links for processing`)
    console.log(`🆔 Job IDs:`, jobIds.map(job => job?.id || 'undefined'))
    
    // Quick success notification to Slack (non-blocking)
    if (jobIds.length > 0) {
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
        } catch (err) {
          console.log(`❌ Could not add processing reaction:`, err?.message || err)
        }
      })
    }
    
    // Trigger worker in background (separate from main response)
    setImmediate(async () => {
      const baseUrl = getBaseUrl()
      const workerUrl = `${baseUrl}/api/queue/worker`
      
      console.log(`🔔 Triggering worker at ${workerUrl}`)
      
      try {
        const response = await fetch(workerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(15000) // Increased to 15 second timeout
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
      } catch (error) {
        if (error.name === 'TimeoutError') {
          console.warn('⏰ Worker trigger timed out, but jobs are queued. Cron will process them.')
        } else {
          console.error('❌ Failed to trigger worker:', error?.message || error)
        }
        
        // Don't try backup cron immediately as it might also timeout
        // The scheduled cron job will pick up the queued jobs
        console.log('📅 Scheduled cron will process queued jobs automatically')
      }
    })
  } catch (error) {
    console.error('❌ Failed to queue link processing jobs:', error?.message || error)
    console.error('📊 Queue error details:', error)
  }
}

async function handleAppMention(event: any) {
  // Handle app mentions for commands like help, status, etc.
  console.log('App mention received:', event)
}

async function handleMemberJoinedChannel(event: any) {
  // Update channel info when bot is added to a channel
  if (event.user === process.env.SLACK_BOT_USER_ID) {
    const db = await getDbClient()
    const team = await db.team.findUnique({
      where: { slackTeamId: teamId }
    })

    if (team) {
      await db.channel.upsert({
        where: { slackChannelId: event.channel },
        update: { updatedAt: new Date() },
        create: {
          slackChannelId: event.channel,
          teamId: team.id
        }
      })
    }
  }
}