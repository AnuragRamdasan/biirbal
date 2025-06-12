import { App } from '@slack/bolt'
import { PrismaClient } from '@prisma/client'
import { AppRunner } from '@seratch_/bolt-http-runner'
import { WebClient } from '@slack/web-api'

const prisma = new PrismaClient()

// Validate environment variables
const requiredEnvVars = [
  'SLACK_SIGNING_SECRET',
  'SLACK_CLIENT_ID', 
  'SLACK_CLIENT_SECRET',
  'SLACK_STATE_SECRET',
  'OPENAI_API_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET_NAME'
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`)
  }
}

export const appRunner = new AppRunner({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  scopes: ['chat:write', 'channels:history', 'channels:read', 'links:read', 'team:read'],
  installationStore: {
    storeInstallation: async (installation) => {
      try {
        await prisma.workspace.upsert({
          where: { id: installation.team.id },
          update: {
            name: installation.team.name,
            botToken: installation.bot.token,
            botId: installation.bot.id,
          },
          create: {
            id: installation.team.id,
            name: installation.team.name,
            botToken: installation.bot.token,
            botId: installation.bot.id,
          },
        })
        console.log(`✅ Workspace ${installation.team.name} installed successfully`)
      } catch (error) {
        console.error('❌ Error storing installation:', error)
        throw error
      }
    },
    fetchInstallation: async (installQuery) => {
      try {
        const workspace = await prisma.workspace.findUnique({
          where: { id: installQuery.teamId },
        })
        if (!workspace) {
          throw new Error(`Workspace not found: ${installQuery.teamId}`)
        }
        return {
          team: { id: workspace.id, name: workspace.name },
          bot: { token: workspace.botToken, id: workspace.botId },
        }
      } catch (error) {
        console.error('❌ Error fetching installation:', error)
        throw error
      }
    },
  },
})

const app = new App(appRunner.appOptions())

// Improved URL extraction with better regex
function extractUrls(text) {
  if (!text) return []
  
  // More robust URL regex that handles edge cases
  const urlRegex = /https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w/_.])*)?(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?/g
  const urls = text.match(urlRegex) || []
  
  // Clean URLs (remove trailing punctuation)
  return urls.map(url => {
    // Remove common trailing punctuation
    return url.replace(/[.,!?;:]$/, '')
  }).filter(url => {
    // Filter out obviously invalid URLs
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  })
}

// Process URLs asynchronously to avoid Slack timeouts
async function processUrlsAsync(urls, workspaceId, channelId, messageTs, botToken) {
  const { extractTextFromUrl } = await import('@/lib/textExtractor')
  const { generateAudio } = await import('@/lib/audioGenerator')
  const { uploadToS3 } = await import('@/lib/s3')
  const { summarizeText } = await import('@/lib/textSummarizer')
  
  const workspaceClient = new WebClient(botToken)
  
  for (const url of urls) {
    try {
      console.log(`🔄 Processing URL: ${url}`)
      
      // Check if URL already exists for this workspace
      const existingArticle = await prisma.article.findFirst({
        where: { 
          url,
          workspaceId,
        }
      })
      
      if (existingArticle) {
        console.log(`⚡ URL already processed, sending existing audio: ${url}`)
        await workspaceClient.chat.postMessage({
          channel: channelId,
          thread_ts: messageTs,
          text: `🎧 *Article Audio* (previously processed)\n<${existingArticle.audioUrl}|Listen to audio version>`,
        })
        continue
      }

      // Create article record with processing status
      const article = await prisma.article.create({
        data: {
          url,
          text: '',
          status: 'processing',
          channelId,
          workspaceId,
        },
      })

      // Send initial processing message
      const processingMessage = await workspaceClient.chat.postMessage({
        channel: channelId,
        thread_ts: messageTs,
        text: `🔄 Processing article: ${url}\n_This may take a few moments..._`,
      })

      try {
        // Extract text with timeout
        const originalText = await Promise.race([
          extractTextFromUrl(url),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 30000)
          )
        ])

        if (!originalText || originalText.length < 100) {
          throw new Error('Insufficient content extracted')
        }

        // Summarize text
        const summarizedText = await summarizeText(originalText)
        
        // Generate audio
        const audioBuffer = await generateAudio(summarizedText)
        
        // Upload to S3
        const audioUrl = await uploadToS3(
          audioBuffer,
          `${workspaceId}/${channelId}/${Date.now()}-${article.id}.mp3`
        )

        // Update article with results
        await prisma.article.update({
          where: { id: article.id },
          data: {
            text: originalText,
            summarizedText,
            audioUrl,
            status: 'completed',
          },
        })

        // Update the processing message with success
        await workspaceClient.chat.update({
          channel: channelId,
          ts: processingMessage.ts,
          text: `✅ *Article Audio Ready*\n<${audioUrl}|🎧 Listen to audio version>\n\n_Original:_ ${url}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `✅ *Article converted to audio*\n<${url}|View original article>`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `🎧 <${audioUrl}|Listen to audio version>`,
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `📊 ~${Math.ceil(summarizedText.length / 1000)} min listen • ${Math.ceil(originalText.length / 1000)} words`,
                },
              ],
            },
          ],
        })

        console.log(`✅ Successfully processed URL: ${url}`)

      } catch (processingError) {
        console.error(`❌ Error processing URL ${url}:`, processingError)
        
        // Update article status to failed
        await prisma.article.update({
          where: { id: article.id },
          data: { status: 'failed' },
        })

        // Update processing message with error
        await workspaceClient.chat.update({
          channel: channelId,
          ts: processingMessage.ts,
          text: `❌ *Failed to process article*\n${url}\n\n_Error: ${processingError.message}_\n\nThis could be due to:\n• Paywall or login required\n• Content too short\n• Network issues\n• Unsupported content type`,
        })
      }

    } catch (error) {
      console.error(`❌ Fatal error processing URL ${url}:`, error)
    }
  }
}

// Handle message events
app.message(async ({ message, client }) => {
  // Ignore bot messages and messages without text
  if (message.bot_id || !message.text || message.subtype) {
    return
  }

  try {
    // Extract URLs from message
    const urls = extractUrls(message.text)
    
    if (urls.length === 0) {
      return // No URLs found, ignore message
    }

    console.log(`📩 Found ${urls.length} URLs in message from team ${message.team}`)

    // Verify workspace exists and get token
    const workspace = await prisma.workspace.findUnique({
      where: { id: message.team },
    })

    if (!workspace?.botToken) {
      console.error(`❌ Workspace not found or missing token: ${message.team}`)
      return
    }

    // Get/create channel info
    const workspaceClient = new WebClient(workspace.botToken)
    
    try {
      const channelInfo = await workspaceClient.conversations.info({
        channel: message.channel,
      })

      // Upsert channel
      await prisma.channel.upsert({
        where: { id: message.channel },
        create: {
          id: message.channel,
          name: channelInfo.channel.name,
          workspaceId: workspace.id,
        },
        update: {
          name: channelInfo.channel.name,
        },
      })

    } catch (channelError) {
      console.error('❌ Error getting channel info:', channelError)
      // Continue processing even if channel info fails
    }

    // Process URLs asynchronously (don't await - prevents Slack timeout)
    setImmediate(() => {
      processUrlsAsync(
        urls,
        workspace.id,
        message.channel,
        message.ts,
        workspace.botToken
      ).catch(error => {
        console.error('❌ Error in async URL processing:', error)
      })
    })

    // Immediately acknowledge to Slack that we received the message
    console.log(`⚡ Message acknowledged, processing ${urls.length} URLs asynchronously`)

  } catch (error) {
    console.error('❌ Error handling message:', error)
  }
})

// Handle app mentions (when someone @mentions the bot)
app.event('app_mention', async ({ event, client }) => {
  try {
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: `👋 Hi <@${event.user}>! I automatically convert URLs to audio. Just share any article link in a channel where I'm added and I'll create an audio version for you!`,
    })
  } catch (error) {
    console.error('❌ Error handling app mention:', error)
  }
})

// URL verification for Slack
app.event('url_verification', async ({ challenge }) => {
  return challenge
})

appRunner.setup(app)

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await appRunner.handleEvents(req, res)
  } catch (error) {
    console.error('❌ Error in Slack event handler:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
