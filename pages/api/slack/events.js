import { App } from '@slack/bolt'
import { PrismaClient } from '@prisma/client'
import { AppRunner } from '@seratch_/bolt-http-runner'
import { WebClient } from '@slack/web-api'
import { extractTextFromUrl } from '@/lib/textExtractor'
import { generateAudio } from '@/lib/audioGenerator'
import { uploadToS3 } from '@/lib/s3'
const prisma = new PrismaClient()

export const appRunner = new AppRunner({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  scopes: ['chat:write', 'channels:history', 'channels:read', 'links:read', 'team:read'],
  installationStore: {
    storeInstallation: async (installation) => {
      await prisma.workspace.upsert({
        where: { id: installation.team.id },
        update: {
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
    },
    fetchInstallation: async (installQuery) => {
      const workspace = await prisma.workspace.findUnique({
        where: { id: installQuery.teamId },
      })
      if (!workspace) throw new Error('Workspace not found')
      return {
        botToken: workspace.botToken,
        botId: workspace.botId,
      }
    },
  },
})

const app = new App(appRunner.appOptions())

app.event('link_shared', async ({ event }) => {
  console.log('link_shared', event)
})

app.message(async ({ message, say, client }) => {
  console.log('message', message)
  // Ignore messages from the bot itself
  if (message.bot_id) return

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: message.team },
    })

    if (!workspace?.botToken) {
      console.error('Workspace not authenticated')
      return
    }

    // Extract URLs from message text using regex
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const urls = message.text.match(urlRegex) || []

    // Create a new client instance with the workspace's token
    const workspaceClient = new WebClient(workspace.botToken)

    if (urls.length > 0) {
      // Iterate through each URL found in the message
      for (const url of urls) {
        try {
          const link = url.substring(0, url.length - 1)
          const text = await extractTextFromUrl(link)

          // Generate audio from text
          const audioBuffer = await generateAudio(text)

          // Upload audio to S3
          const audioUrl = await uploadToS3(
            audioBuffer,
            `${message.team}/${message.channel}/${Date.now()}.mp3`
          )

          // Get channel info from Slack
          const channelInfo = await workspaceClient.conversations.info({
            channel: message.channel,
          })

          // Create or update channel in database
          const channel = await prisma.channel.upsert({
            where: { id: message.channel },
            create: {
              id: message.channel,
              name: channelInfo.channel.name,
              workspaceId: message.team,
            },
            update: {
              name: channelInfo.channel.name,
            },
          })

          const workspace = await prisma.workspace.findUnique({
            where: { id: message.team },
          })

          // Save to database
          await prisma.article.create({
            data: {
              url,
              text,
              audioUrl,
              channelId: channel.id,
              workspaceId: workspace.id,
            },
          })

          // Use the workspace-specific client to send message with the extracted text
          await workspaceClient.chat.postMessage({
            channel: message.channel,
            text: `🎧 Audio version available: ${audioUrl}\n_Click to listen or download_`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: '🎧 *Article Audio Version*',
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `Original URL: ${url}`,
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `<${audioUrl}|Click here to listen or download>`,
                },
              },
            ],
          })
        } catch (urlError) {
          console.error(`Error extracting text from URL :`, urlError)
        }
      }
    } else {
      // No URLs found in the message
      await workspaceClient.chat.postMessage({
        channel: message.channel,
        text: `Hey there <@${message.user}>! I didn't find any links in your message.`,
      })
    }
  } catch (error) {
    console.error('Error handling message:', error.stack || error.message || error)
    if (error.code === 'slack_webapi_platform_error') {
      console.error('Slack API Error:', error.data)
    }
  }
})

app.event('channel_join', async ({ event }) => {
  console.log('channel_join', event)
})

app.event('url_verification', async ({ challenge }) => {
  return {
    status: 200,
    body: { challenge },
  }
})

appRunner.setup(app)

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Sorry! This endpoint does not accept your requests.' })
    return
  }
  await appRunner.handleEvents(req, res)
}