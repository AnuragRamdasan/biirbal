import { getDbClient } from './db'
import { extractContentFromUrl, summarizeForAudio } from './content-extractor'
import { generateAudioSummary, uploadAudioToStorage } from './text-to-speech'
import { getDashboardUrl } from './config'
import { WebClient } from '@slack/web-api'
import { canProcessNewLink } from './subscription-utils'

interface ProcessLinkParams {
  url: string
  messageTs: string
  channelId: string
  teamId: string
  slackTeamId: string
}

export async function processLink({
  url,
  messageTs,
  channelId,
  teamId,
  slackTeamId
}: ProcessLinkParams, updateProgress?: (progress: number) => Promise<void>): Promise<void> {
  console.log(`🚀 Processing: ${url}`)
  
  try {
    console.log('💾 Getting database client...')
    const db = await getDbClient()
    console.log('✅ Database client ready')
    
    if (updateProgress) await updateProgress(20)
    
    // Get team and setup channel
    const team = await db.team.findUnique({
      where: { id: teamId },
      include: { subscription: true }
    })

    if (!team) {
      throw new Error('Team not found')
    }

    // Check if usage limits are exceeded (but don't block processing)
    const usageCheck = await canProcessNewLink(teamId)
    const isLimitExceeded = !usageCheck.allowed

    const channel = await db.channel.upsert({
      where: { slackChannelId: channelId },
      update: { teamId, isActive: true },
      create: {
        slackChannelId: channelId,
        teamId,
        isActive: true
      }
    })

    // Create processing record
    const processedLink = await db.processedLink.upsert({
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

    if (updateProgress) await updateProgress(30)

    // 1. Extract content with ScrapingBee
    console.log('📄 Extracting content...')
    const extractedContent = await extractContentFromUrl(url)
    
    if (updateProgress) await updateProgress(50)
    
    // 2. Summarize with OpenAI
    console.log('🤖 Summarizing content...')
    const summary = await summarizeForAudio(extractedContent.text, 150)
    console.log('🖼️ OG Image extracted:', extractedContent.ogImage)
    
    if (updateProgress) await updateProgress(60)
    
    // 3. Generate audio with OpenAI TTS
    console.log('🎤 Generating audio...')
    const audioResult = await generateAudioSummary(summary, extractedContent.title, 59)
    
    if (updateProgress) await updateProgress(80)
    
    // 4. Upload to S3
    console.log('☁️ Uploading audio...')
    const audioUrl = await uploadAudioToStorage(audioResult.audioBuffer, audioResult.fileName)
    
    if (updateProgress) await updateProgress(90)
    
    // 5. Update database
    console.log('💾 Updating database...')
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

    // 6. Notify Slack
    console.log('📱 Notifying Slack...')
    const slackClient = new WebClient(team.accessToken)
    const baseMessage = `🎧 Audio summary ready: ${getDashboardUrl(processedLink.id)}`
    const limitMessage = isLimitExceeded ? `\n\n⚠️ Note: You've exceeded your monthly limit. Upgrade to access playback on dashboard.` : ''
    
    await slackClient.chat.postMessage({
      channel: channelId,
      thread_ts: messageTs,
      text: baseMessage + limitMessage
    })

    if (updateProgress) await updateProgress(100)
    console.log(`✅ Successfully processed: ${url}`)

  } catch (error) {
    console.error('Link processing failed:', error)
    throw error
  }
}

