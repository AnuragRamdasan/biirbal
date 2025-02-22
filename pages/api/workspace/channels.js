import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getServerSession(req, res);

  if (!session || !session.workspaceId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const channels = await prisma.channel.findMany({
      where: {
        workspaceId: session.workspaceId,
      },
    });

    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
} 