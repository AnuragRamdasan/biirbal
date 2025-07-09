import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/prisma'
import { extractLinksFromMessage, shouldProcessUrl } from '@/lib/slack'
import { queueClient } from '@/lib/queue/client'
import { WebClient } from '@slack/web-api'

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

      switch (slackEvent.type) {
        case 'message':
          await handleMessage(slackEvent, event.team_id)
          break
        case 'app_mention':
          await handleAppMention(slackEvent, event.team_id)
          break
        case 'member_joined_channel':
          await handleMemberJoinedChannel(slackEvent, event.team_id)
          break
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Slack event error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function handleMessage(event: any, teamId: string) {
  // Skip bot messages and messages without text
  if (event.bot_id || !event.text || event.subtype) {
    return
  }

  const links = extractLinksFromMessage(event.text)
  if (links.length === 0) {
    return
  }

  // Get team info to check subscription status
  const team = await db.findTeamBySlackId(teamId)

  if (!team || !team.isActive) {
    return
  }

  // Check subscription limits
  if (team.subscription) {
    const currentMonth = new Date().getMonth()
    const subscriptionMonth = team.subscription.updatedAt.getMonth()
    
    // Reset counter if new month
    if (currentMonth !== subscriptionMonth) {
      await db.updateSubscription(team.id, { linksProcessed: 0 })
    }

    if (team.subscription.linksProcessed >= team.subscription.monthlyLimit) {
      // TODO: Send limit reached message
      return
    }
  }

  // Store or update channel info
  await db.upsertChannel(event.channel, team.id)

  // Queue each link for background processing (non-blocking)
  const queuePromises = links
    .filter(url => shouldProcessUrl(url))
    .map(url => queueClient.add('PROCESS_LINK', {
      url,
      messageTs: event.ts,
      channelId: event.channel,
      teamId: team.id,
      slackTeamId: teamId
    }))

  // Queue links and trigger worker - proper async handling
  try {
    const jobIds = await Promise.all(queuePromises)
    console.log(`✅ Queued ${jobIds.length} links for processing`)
    
    // Quick success notification to Slack (non-blocking)
    if (jobIds.length > 0) {
      setImmediate(async () => {
        try {
          const slackClient = new WebClient(team.accessToken)
          await slackClient.reactions.add({
            channel: event.channel,
            timestamp: event.ts,
            name: 'hourglass_flowing_sand'
          })
        } catch (err) {
          console.log('Could not add processing reaction:', err.message)
        }
      })
    }
    
    // Trigger worker in background (separate from main response)
    setImmediate(async () => {
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://biirbal.com'
      try {
        const workerUrl = `${baseUrl}/api/queue/worker`
        
        console.log(`🔔 Triggering worker at ${workerUrl}`)
        
        const response = await fetch(workerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(15000) // Increased to 15 second timeout
        })
        
        if (response.ok) {
          console.log(`✅ Worker triggered successfully: ${response.status}`)
        } else {
          console.warn(`⚠️ Worker responded with ${response.status}, but jobs are queued`)
        }
      } catch (error) {
        if (error.name === 'TimeoutError') {
          console.warn('⏰ Worker trigger timed out, but jobs are queued. Cron will process them.')
        } else {
          console.error('❌ Failed to trigger worker:', error)
        }
        
        // Don't try backup cron immediately as it might also timeout
        // The scheduled cron job will pick up the queued jobs
        console.log('📅 Scheduled cron will process queued jobs automatically')
      }
    })
  } catch (error) {
    console.error('Failed to queue link processing jobs:', error)
  }
}

async function handleAppMention(event: any, teamId: string) {
  // Handle app mentions for commands like help, status, etc.
  console.log('App mention received:', event)
}

async function handleMemberJoinedChannel(event: any, teamId: string) {
  // Update channel info when bot is added to a channel
  if (event.user === process.env.SLACK_BOT_USER_ID) {
    const team = await db.findTeamBySlackId(teamId)

    if (team) {
      await db.upsertChannel(event.channel, team.id)
    }
  }
}