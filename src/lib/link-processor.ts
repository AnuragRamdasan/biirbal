import { getDbClient } from './db'
import { extractContentFromUrl, summarizeForAudio } from './content-extractor'
import { generateAudioSummary, uploadAudioToStorage } from './text-to-speech'
import { getDashboardUrl } from './config'
import { WebClient } from '@slack/web-api'
import { canProcessNewLink } from './subscription-utils'
import { isExceptionTeam } from './exception-teams'
import { trackLinkShared, trackLinkProcessed } from './analytics'
import { logger } from './logger'

interface ProcessLinkParams {
  url: string
  messageTs: string
  channelId: string
  teamId: string        // Internal database ID
  slackTeamId?: string  // Slack team ID - used for subscription checks
  linkId?: string       // Optional - for restarting existing stuck jobs
}

interface ProcessingContext {
  team: any
  channel: any
  processedLink: any
  subscriptionTeamId: string
  isLimitExceeded: boolean
  processingStartTime: number
}

async function validateLinkProcessing({
  url,
  teamId,
  slackTeamId
}: ProcessLinkParams): Promise<{ team: any; subscriptionTeamId: string; isLimitExceeded: boolean }> {
  const db = await getDbClient()
  
  const team = await db.team.findUnique({
    where: { id: teamId },
    include: { subscription: true }
  })

  if (!team) {
    throw new Error('Team not found')
  }

  // Check usage limits
  const subscriptionTeamId = slackTeamId || team.slackTeamId
  const usageCheck = await canProcessNewLink(subscriptionTeamId)
  const isExceptionTeamFlag = isExceptionTeam(subscriptionTeamId)
  const isLimitExceeded = !usageCheck.allowed && !isExceptionTeamFlag
  
  // Track link shared event
  try {
    const urlObj = new URL(url)
    trackLinkShared({
      team_id: subscriptionTeamId,
      channel_id: teamId,
      link_domain: urlObj.hostname,
      user_id: url // Using URL as proxy identifier
    })
  } catch (error) {
    console.log('Failed to track link shared event:', error)
  }

  return { team, subscriptionTeamId, isLimitExceeded }
}

async function setupChannelAndRecord({
  channelId,
  teamId,
  url,
  messageTs,
  linkId,
  team
}: ProcessLinkParams & { team: any }): Promise<{ channel: any; processedLink: any }> {
  const db = await getDbClient()
  
  // Get channel info from Slack
  const channelSlackClient = new WebClient(team.accessToken)
  let channelName = null
  try {
    const channelInfo = await channelSlackClient.conversations.info({ channel: channelId })
    channelName = channelInfo.channel?.name || null
    console.log(`📋 Channel info retrieved: ${channelName}`)
  } catch (error) {
    console.warn('Failed to get channel info from Slack:', error)
  }

  const channel = await db.channel.upsert({
    where: { slackChannelId: channelId },
    update: { 
      teamId, 
      isActive: true,
      ...(channelName && { channelName })
    },
    create: {
      slackChannelId: channelId,
      teamId,
      isActive: true,
      ...(channelName && { channelName })
    }
  })

  // Create or update processing record
  let processedLink
  if (linkId) {
    console.log(`🔄 Restarting existing link ID: ${linkId}`)
    processedLink = await db.processedLink.update({
      where: { id: linkId },
      data: {
        processingStatus: 'PROCESSING',
        errorMessage: null,
        updatedAt: new Date()
      }
    })
  } else {
    processedLink = await db.processedLink.upsert({
      where: {
        url_messageTs_channelId: {
          url,
          messageTs,
          channelId: channel.id
        }
      },
      update: { processingStatus: 'PROCESSING' },
      create: {
        url,
        messageTs,
        channelId: channel.id,
        teamId,
        processingStatus: 'PROCESSING'
      }
    })
  }

  return { channel, processedLink }
}

async function processContentAndAudio(
  url: string,
  updateProgress?: (progress: number) => Promise<void>
): Promise<{ extractedContent: any; summary: string; audioUrl: string; audioResult: any }> {
  // Extract content
  const extractedContent = await extractContentFromUrl(url)
  if (updateProgress) await updateProgress(50)
  
  // Summarize content
  const summary = await summarizeForAudio(extractedContent.text, 150, extractedContent.url)
  if (updateProgress) await updateProgress(60)
  
  // Generate audio
  const audioResult = await generateAudioSummary(summary, extractedContent.title)
  if (updateProgress) await updateProgress(80)
  
  // Upload to storage
  const audioUrl = await uploadAudioToStorage(audioResult.audioBuffer, audioResult.fileName)
  if (updateProgress) await updateProgress(90)
  
  return { extractedContent, summary, audioUrl, audioResult }
}

async function notifySlack(
  context: ProcessingContext,
  params: ProcessLinkParams,
  updateProgress?: (progress: number) => Promise<void>
): Promise<void> {
  const { team, processedLink, isLimitExceeded } = context
  const { channelId, messageTs } = params
  
  const slackClient = new WebClient(team.accessToken)
  const baseMessage = `🎧 Audio summary ready: ${getDashboardUrl(processedLink.id)}`
  const limitMessage = isLimitExceeded ? `\n\n⚠️ Note: You've exceeded your monthly limit. Upgrade to access playbook on dashboard.` : ''
  const fullMessage = baseMessage + limitMessage
  
  if (team.sendSummaryAsDM) {
    await sendDMsToTeamMembers(slackClient, team.id, fullMessage)
  } else {
    await slackClient.chat.postMessage({
      channel: channelId,
      thread_ts: messageTs,
      text: fullMessage
    })
  }

  if (updateProgress) await updateProgress(100)
}

async function sendDMsToTeamMembers(slackClient: WebClient, teamId: string, message: string): Promise<void> {
  const db = await getDbClient()
  
  const activeMembers = await db.teamMembership.findMany({
    where: {
      teamId,
      isActive: true,
      slackUserId: { not: null }
    },
    select: {
      slackUserId: true,
      displayName: true,
      user: {
        select: {
          name: true
        }
      }
    }
  })
  
  
  const dmPromises = activeMembers.map(async (member) => {
    if (!member.slackUserId) return
    
    try {
      await slackClient.chat.postMessage({
        channel: member.slackUserId,
        text: message
      })
    } catch (error) {
      console.error(`❌ Failed to send DM to ${member.displayName || member.user.name} (${member.slackUserId}):`, error)
    }
  })
  
  await Promise.all(dmPromises)
}

function trackProcessingMetrics(
  context: ProcessingContext,
  success: boolean,
  extractedContent?: any
): void {
  const { subscriptionTeamId, processedLink, processingStartTime } = context
  const processingTimeSeconds = (Date.now() - processingStartTime) / 1000
  
  trackLinkProcessed({
    team_id: subscriptionTeamId,
    link_id: success ? processedLink.id : 'failed',
    processing_time_seconds: processingTimeSeconds,
    success,
    content_type: success && extractedContent?.title ? 'article' : success ? 'unknown' : 'error',
    word_count: success && extractedContent?.text ? extractedContent.text.split(' ').length : 0
  })
}

export async function processLink(params: ProcessLinkParams, updateProgress?: (progress: number) => Promise<void>): Promise<void> {
  const linkLogger = logger.child('link-processor')
  linkLogger.info('Processing link', { url: params.url, channelId: params.channelId, teamId: params.teamId })
  
  const processingStartTime = Date.now()
  let context: Partial<ProcessingContext> = { processingStartTime }
  
  try {
    if (updateProgress) await updateProgress(20)
    
    // Step 1: Validate and setup
    const { team, subscriptionTeamId, isLimitExceeded } = await validateLinkProcessing(params)
    const { channel, processedLink } = await setupChannelAndRecord({ ...params, team })
    
    context = {
      team,
      channel,
      processedLink,
      subscriptionTeamId,
      isLimitExceeded,
      processingStartTime
    }
    
    if (updateProgress) await updateProgress(30)
    
    // Step 2: Process content and generate audio
    const { extractedContent, summary, audioUrl, audioResult } = await processContentAndAudio(params.url, updateProgress)
    
    // Step 3: Update database
    console.log('💾 Updating database...')
    const db = await getDbClient()
    await db.processedLink.update({
      where: { id: processedLink.id },
      data: {
        title: extractedContent.title,
        extractedText: summary,
        audioFileUrl: audioUrl,
        audioFileKey: audioResult.fileName,
        ttsScript: audioResult.ttsScript,
        ogImage: extractedContent.ogImage,
        processingStatus: 'COMPLETED'
      }
    })
    
    // Step 4: Notify Slack
    await notifySlack(context as ProcessingContext, params, updateProgress)
    
    trackProcessingMetrics(context as ProcessingContext, true, extractedContent)

  } catch (error) {
    console.error('Link processing failed:', error)
    
    if (context.subscriptionTeamId) {
      trackProcessingMetrics(context as ProcessingContext, false)
    }
    
    throw error
  }
}

