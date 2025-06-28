import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { extractLinksFromMessage, shouldProcessUrl } from '@/lib/slack'
import { processLinkInBackground } from '@/lib/link-processor'

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
  const team = await prisma.team.findUnique({
    where: { slackTeamId: teamId },
    include: { subscription: true }
  })

  if (!team || !team.isActive) {
    return
  }

  // Check subscription limits
  if (team.subscription) {
    const currentMonth = new Date().getMonth()
    const subscriptionMonth = team.subscription.updatedAt.getMonth()
    
    // Reset counter if new month
    if (currentMonth !== subscriptionMonth) {
      await prisma.subscription.update({
        where: { teamId: team.id },
        data: { linksProcessed: 0 }
      })
    }

    if (team.subscription.linksProcessed >= team.subscription.monthlyLimit) {
      // TODO: Send limit reached message
      return
    }
  }

  // Store or update channel info
  await prisma.channel.upsert({
    where: { slackChannelId: event.channel },
    update: { updatedAt: new Date() },
    create: {
      slackChannelId: event.channel,
      teamId: team.id,
      isActive: true
    }
  })

  // Process each link
  for (const url of links) {
    if (shouldProcessUrl(url)) {
      await processLinkInBackground({
        url,
        messageTs: event.ts,
        channelId: event.channel,
        teamId: team.id,
        slackTeamId: teamId
      })
    }
  }
}

async function handleAppMention(event: any, teamId: string) {
  // Handle app mentions for commands like help, status, etc.
  console.log('App mention received:', event)
}

async function handleMemberJoinedChannel(event: any, teamId: string) {
  // Update channel info when bot is added to a channel
  if (event.user === process.env.SLACK_BOT_USER_ID) {
    const team = await prisma.team.findUnique({
      where: { slackTeamId: teamId }
    })

    if (team) {
      await prisma.channel.upsert({
        where: { slackChannelId: event.channel },
        update: { isActive: true, updatedAt: new Date() },
        create: {
          slackChannelId: event.channel,
          teamId: team.id,
          isActive: true
        }
      })
    }
  }
}