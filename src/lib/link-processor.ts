import { prisma } from './prisma'
import { extractContentFromUrl, summarizeForAudio } from './content-extractor'
import { generateAudioSummary, uploadAudioToStorage } from './text-to-speech'
import { WebClient } from '@slack/web-api'
import { Readable } from 'stream'
import { PerformanceTimer, performanceMetrics, logMemoryUsage } from './performance'

interface ProcessLinkParams {
  url: string
  messageTs: string
  channelId: string
  teamId: string
  slackTeamId: string
}

export async function processLinkInBackground(params: ProcessLinkParams) {
  // Legacy function - now just delegates to the main processLink
  // The job queue handles the background processing
  return processLink(params)
}

export async function processLink({
  url,
  messageTs,
  channelId,
  teamId,
  slackTeamId
}: ProcessLinkParams): Promise<void> {
  const timer = new PerformanceTimer(`LinkProcessing:${url.split('/')[2] || 'unknown'}`)
  let processedLink
  
  try {
    logMemoryUsage('ProcessLink:Start')
    console.log(`🚀 Starting lightning-fast processing for: ${url}`)
    
    // PARALLEL PHASE 1: Database setup and content extraction
    const [channel, team, extractedContent] = await Promise.all([
      // Database operation 1: Channel upsert
      prisma.channel.upsert({
        where: { slackChannelId: channelId },
        update: {},
        create: { slackChannelId: channelId, teamId: teamId }
      }),
      
      // Database operation 2: Team lookup with subscription
      prisma.team.findUnique({
        where: { id: teamId },
        include: { subscription: true }
      }),
      
      // Slow operation: Content extraction (run in parallel)
      extractContentFromUrl(url)
    ])

    if (!team) {
      throw new Error('Team not found')
    }

    timer.mark('Phase1:DatabaseAndExtraction')

    // PARALLEL PHASE 2: Database record creation and audio text preparation
    const audioText = summarizeForAudio(extractedContent.text, 200)
    
    const [processedLinkRecord] = await Promise.all([
      // Database operation: Create processed link record
      prisma.processedLink.upsert({
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
      }),
      
      // No await needed - audio text preparation is synchronous
      Promise.resolve()
    ])
    
    processedLink = processedLinkRecord
    
    timer.mark('Phase2:DatabaseRecord')

    // PARALLEL PHASE 3: Audio generation and Slack client setup
    const slackClient = new WebClient(team.accessToken)
    
    console.log(`🎵 Starting turbo audio generation for: ${extractedContent.title}`)
    
    const [audioResult] = await Promise.all([
      // Slow operation: Audio generation
      generateAudioSummary(
        audioText,
        extractedContent.title,
        parseInt(process.env.MAX_AUDIO_DURATION_SECONDS || '90')
      ),
      
      // Fast operation: Slack client is already ready
      Promise.resolve()
    ])
    
    timer.mark('Phase3:AudioGeneration')

    // PARALLEL PHASE 4: File upload and database update preparation  
    const audioUrl = await uploadAudioToStorage(audioResult.audioBuffer, audioResult.fileName)
    
    timer.mark('Phase4:FileUpload')

    // PARALLEL PHASE 5: Final database updates and Slack notification
    await Promise.all([
      // Database update: Mark as completed
      prisma.processedLink.update({
        where: { id: processedLink.id },
        data: {
          title: extractedContent.title,
          extractedText: extractedContent.excerpt,
          audioFileUrl: audioUrl,
          audioFileKey: audioResult.fileName,
          ttsScript: audioResult.ttsScript,
          processingStatus: 'COMPLETED',
          updatedAt: new Date()
        }
      }),
      
      // Slack notification: Send dashboard link
      replyWithDashboardLink({
        slackClient,
        channelId,
        messageTs,
        processedLinkId: processedLink.id,
        title: extractedContent.title,
        excerpt: extractedContent.excerpt,
        url
      }),
      
      // Database update: Increment usage counter
      team.subscription ? prisma.subscription.update({
        where: { teamId: team.id },
        data: { linksProcessed: { increment: 1 } }
      }) : Promise.resolve()
    ])
    
    const totalTime = timer.end()
    performanceMetrics.recordTiming('LinkProcessing', totalTime)
    logMemoryUsage('ProcessLink:Complete')
    
    console.log(`🚀 LIGHTNING FAST! Processed ${url} in ${totalTime.toFixed(2)}ms`)

  } catch (error) {
    console.error('Link processing failed:', error)
    
    // Update database with error
    if (processedLink) {
      await prisma.processedLink.update({
        where: { id: processedLink.id },
        data: {
          processingStatus: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        }
      })
    }

    // Optionally notify in Slack about the failure
    try {
      const team = await prisma.team.findUnique({
        where: { id: teamId }
      })
      
      if (team) {
        const slackClient = new WebClient(team.accessToken)
        await slackClient.chat.postMessage({
          channel: channelId,
          thread_ts: messageTs,
          text: `⚠️ Sorry, I couldn't process the link: ${url}. ${error instanceof Error ? error.message : 'Unknown error occurred.'}`
        })
      }
    } catch (notifyError) {
      console.error('Failed to notify about processing error:', notifyError)
    }
  }
}

interface ReplyWithDashboardLinkParams {
  slackClient: WebClient
  channelId: string
  messageTs: string
  processedLinkId: string
  title: string
  excerpt: string
  url: string
}

async function replyWithDashboardLink({
  slackClient,
  channelId,
  messageTs,
  processedLinkId,
  title,
  excerpt,
  url
}: ReplyWithDashboardLinkParams): Promise<void> {
  try {
    const baseUrl = 'https://biirbal.com'
    const dashboardUrl = `${baseUrl}/dashboard#${processedLinkId}`

    await slackClient.chat.postMessage({
      channel: channelId,
      thread_ts: messageTs,
      text: `🎧 Audio summary ready. Listen on your dashboard: ${dashboardUrl}.`
    })

    console.log('Dashboard link posted to Slack successfully')
  } catch (error: any) {
    console.error('Failed to post dashboard link to Slack:', {
      error: error.data || error.message || error,
      channel: channelId,
      messageTs,
      processedLinkId,
      slackApiError: error.data
    })
    
    // Fallback: Post basic completion message
    try {
      await slackClient.chat.postMessage({
        channel: channelId,
        thread_ts: messageTs,
        text: `🎧 Audio summary ready. Link sharing failed but you can still listen on your dashboard.`
      })
      console.log('Fallback message posted successfully')
    } catch (fallbackError: any) {
      console.error('Fallback message failed:', {
        error: fallbackError.data || fallbackError.message || fallbackError,
        channel: channelId,
        slackApiError: fallbackError.data
      })
      throw error
    }
  }
}