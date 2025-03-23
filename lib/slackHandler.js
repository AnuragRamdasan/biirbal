import { PrismaClient } from '@prisma/client'
import { verifySlackRequest } from '@slack/bolt'

const prisma = new PrismaClient()

export const handleChannelJoin = async (request) => {
  const workspace = await prisma.workspace.findFirst({
    where: {
      id: request.body.team_id,
    },
  })

  if (!workspace) {
    return {
      status: 404,
      body: { error: 'Workspace not found' },
    }
  }

  const channel = await prisma.channel.findFirst({
    where: {
      id: request.body.channel_id,
    },
  })

  if (!channel) {
    await prisma.channel.create({
      data: {
        id: request.body.channel_id,
        name: request.body.channel_name,
        workspaceId: workspace.id,
        articles: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  }

  return {
    status: 200,
    body: { message: 'Channel joined' },
  }
}

export const handleMessage = async (request) => {
  try {
    const workspace = await prisma.workspace.findFirst({
      where: {
        channels: {
          some: {
            id: event.channel,
          },
        },
      },
      include: {
        subscription: true,
      },
    })

    if (!workspace || !workspace.subscription) {
      return res.status(200).json({ message: 'Workspace not found or no active subscription' })
    }

    // Extract URLs from message
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const urls = event.text.match(urlRegex)

    if (!urls) {
      return res.status(200).json({ message: 'No URLs found' })
    }

    for (const url of urls) {
      const text = await extractTextFromUrl(url)
      const audioBuffer = await generateAudio(text)
      const audioUrl = await uploadToS3(
        audioBuffer,
        `${workspace.id}/${event.channel}/${Date.now()}.mp3`
      )

      await prisma.article.create({
        data: {
          url,
          text,
          audioUrl,
          channelId: event.channel,
          workspaceId: workspace.id,
        },
      })

      await app.client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: `🎧 Audio version available: ${audioUrl}`,
      })
    }
  } catch (error) {
    console.error('Error processing message:', error)
  }
}

export const verifyRequest = async (request) => {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  const isValid = await verifySlackRequest({
    signingSecret,
    headers: request.headers,
    body: typeof request.body === 'string' ? request.body : JSON.stringify(request.body),
  })

  console.log('isValid', isValid)
  return isValid
}
