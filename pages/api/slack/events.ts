import { NextApiRequest, NextApiResponse } from 'next';
import { App } from '@slack/bolt';
import { PrismaClient } from '@prisma/client';
import { extractTextFromUrl } from '@/lib/textExtractor';
import { generateAudio } from '@/lib/audioGenerator';
import { uploadToS3 } from '@/lib/s3';

const prisma = new PrismaClient();

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, event } = req.body;

  // Handle URL verification
  if (type === 'url_verification') {
    return res.status(200).json({ challenge: req.body.challenge });
  }

  // Handle message events
  if (type === 'event_callback' && event.type === 'message') {
    try {
      const workspace = await prisma.workspace.findFirst({
        where: {
          channels: {
            some: {
              id: event.channel
            }
          }
        },
        include: {
          subscription: true
        }
      });

      if (!workspace || !workspace.subscription) {
        return res.status(200).json({ message: 'Workspace not found or no active subscription' });
      }

      // Extract URLs from message
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = event.text.match(urlRegex);

      if (!urls) {
        return res.status(200).json({ message: 'No URLs found' });
      }

      for (const url of urls) {
        // Extract text from URL
        const text = await extractTextFromUrl(url);
        
        // Generate audio
        const audioBuffer = await generateAudio(text);
        
        // Upload to S3
        const audioUrl = await uploadToS3(audioBuffer, `${workspace.id}/${event.channel}/${Date.now()}.mp3`);

        // Save to database
        await prisma.article.create({
          data: {
            url,
            text,
            audioUrl,
            channelId: event.channel,
            workspaceId: workspace.id,
          }
        });

        // Post comment with audio link
        await app.client.chat.postMessage({
          channel: event.channel,
          thread_ts: event.ts,
          text: `🎧 Audio version available: ${audioUrl}`,
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  res.status(200).json({ message: 'OK' });
} 