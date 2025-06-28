import { prisma } from './prisma'
import { extractContentFromUrl, summarizeForAudio } from './content-extractor'
import { generateAudioSummary, uploadAudioToStorage, saveAudioLocally } from './text-to-speech'
import { WebClient } from '@slack/web-api'
import { Readable } from 'stream'

interface ProcessLinkParams {
  url: string
  messageTs: string
  channelId: string
  teamId: string
  slackTeamId: string
}

export async function processLinkInBackground(params: ProcessLinkParams) {
  // Process in background to avoid blocking the Slack event response
  setImmediate(async () => {
    try {
      await processLink(params)
    } catch (error) {
      console.error('Background link processing failed:', error)
    }
  })
}

export async function processLink({
  url,
  messageTs,
  channelId,
  teamId,
  slackTeamId
}: ProcessLinkParams): Promise<void> {
  let processedLink
  
  try {
    // Find or create the channel record first
    const channel = await prisma.channel.upsert({
      where: {
        slackChannelId: channelId
      },
      update: {},
      create: {
        slackChannelId: channelId,
        teamId: teamId
      }
    })

    // Create or get existing processed link record
    processedLink = await prisma.processedLink.upsert({
      where: {
        url_messageTs_channelId: {
          url,
          messageTs,
          channelId: channel.id
        }
      },
      update: {
        processingStatus: 'PROCESSING'
      },
      create: {
        url,
        messageTs,
        channelId: channel.id,
        teamId,
        processingStatus: 'PROCESSING'
      }
    })

    // Get team info for Slack client
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { subscription: true }
    })

    if (!team) {
      throw new Error('Team not found')
    }

    const slackClient = new WebClient(team.accessToken)

    // Step 1: Extract content from URL
    console.log('Extracting content from:', url)
    const extractedContent = await extractContentFromUrl(url)

    // Step 2: Summarize content for audio
    const audioText = summarizeForAudio(extractedContent.text, 200)

    // Step 3: Generate audio summary
    console.log('Generating audio summary for:', extractedContent.title)
    const audioResult = await generateAudioSummary(
      audioText,
      extractedContent.title,
      parseInt(process.env.MAX_AUDIO_DURATION_SECONDS || '90')
    )

    // Step 4: Upload audio file
    let audioUrl: string
    if (process.env.NODE_ENV === 'development') {
      audioUrl = await saveAudioLocally(audioResult.audioBuffer, audioResult.fileName)
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biirbal.com'
      audioUrl = `${baseUrl}${audioUrl}`
    } else {
      audioUrl = await uploadAudioToStorage(audioResult.audioBuffer, audioResult.fileName)
    }

    // Step 5: Update database
    await prisma.processedLink.update({
      where: { id: processedLink.id },
      data: {
        title: extractedContent.title,
        extractedText: extractedContent.excerpt,
        audioFileUrl: audioUrl,
        audioFileKey: audioResult.fileName,
        processingStatus: 'COMPLETED',
        updatedAt: new Date()
      }
    })

    // Step 6: Reply with dashboard permalink instead of uploading to Slack
    await replyWithDashboardLink({
      slackClient,
      channelId,
      messageTs,
      processedLinkId: processedLink.id,
      title: extractedContent.title,
      excerpt: extractedContent.excerpt,
      url
    })

    // Step 7: Update subscription usage
    if (team.subscription) {
      await prisma.subscription.update({
        where: { teamId: team.id },
        data: {
          linksProcessed: {
            increment: 1
          }
        }
      })
    }

    console.log('Successfully processed link:', url)

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
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://biirbal.com'
    const dashboardUrl = `${baseUrl}/dashboard#${processedLinkId}`

    await slackClient.chat.postMessage({
      channel: channelId,
      thread_ts: messageTs,
      text: `🎧 Audio summary ready for: *${title}*\n\n${excerpt}\n\n📱 Listen on your dashboard: ${dashboardUrl}\n\n_Original link: ${url}_`
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
        text: `🎧 Audio summary processed for: *${title}*\n\n${excerpt}\n\n_Original link: ${url}_\n\n⚠️ Link sharing failed, but audio is ready on your dashboard.`
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