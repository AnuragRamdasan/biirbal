import { App } from '@slack/bolt';
import { PrismaClient } from '@prisma/client';
import { verifyRequest } from '@/lib/slackHandler';

const prisma = new PrismaClient();

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: process.env.SLACK_STATE_SECRET,
  scopes: ['chat:write', 'channels:history', 'channels:read'],
  installationStore: {
    storeInstallation: async (installation) => {
      await prisma.workspace.upsert({
        where: { id: installation.team.id },
        update: { 
          botToken: installation.bot.token,
          botId: installation.bot.id
        },
        create: {
          id: installation.team.id,
          name: installation.team.name,
          botToken: installation.bot.token,
          botId: installation.bot.id
        }
      });
    },
    fetchInstallation: async (installQuery) => {
      const workspace = await prisma.workspace.findUnique({
        where: { id: installQuery.teamId }
      });
      if (!workspace) throw new Error('Workspace not found');
      return {
        botToken: workspace.botToken,
        botId: workspace.botId
      };
    }
  }
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const isValid = await verifyRequest(request);

  if (!isValid) {
    return {
      status: 401,
      body: { error: 'Invalid request' }
    }
  }

  const { type, event } = req.body;

  if (type === 'event_callback') {
    if (event.type === 'channel_join') {
      await handleChannelJoin(req.body);
    }

    if (event.type === 'message') {
      await handleMessage(req.body);
    }
  }

  res.status(200).json({ message: 'OK' });
} 