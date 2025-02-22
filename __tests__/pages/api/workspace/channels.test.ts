import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import handler from '@/pages/api/workspace/channels';
import { PrismaClient } from '@prisma/client';

jest.mock('next-auth');
jest.mock('@prisma/client');

describe('Workspace Channels API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockPrisma = {
      channel: {
        findMany: jest.fn(),
      },
    } as any;

    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com' },
      workspaceId: 'workspace1',
    });
  });

  it('returns channels for authenticated workspace', async () => {
    const mockChannels = [
      { id: 'channel1', name: 'general' },
      { id: 'channel2', name: 'random' },
    ];

    mockPrisma.channel.findMany.mockResolvedValue(mockChannels);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockPrisma.channel.findMany).toHaveBeenCalledWith({
      where: { workspaceId: 'workspace1' },
    });
    expect(mockRes.json).toHaveBeenCalledWith(mockChannels);
  });

  it('handles unauthorized access', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });
}); 