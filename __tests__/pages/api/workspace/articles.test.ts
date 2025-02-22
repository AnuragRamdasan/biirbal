import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import handler from '@/pages/api/workspace/articles';
import { PrismaClient } from '@prisma/client';

jest.mock('next-auth');
jest.mock('@prisma/client');

describe('Workspace Articles API', () => {
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
      article: {
        findMany: jest.fn(),
      },
    } as any;

    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'test@example.com' },
      workspaceId: 'workspace1',
    });
  });

  it('returns articles for authenticated workspace', async () => {
    const mockArticles = [
      { id: '1', url: 'https://example.com/1' },
      { id: '2', url: 'https://example.com/2' },
    ];

    mockPrisma.article.findMany.mockResolvedValue(mockArticles);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockPrisma.article.findMany).toHaveBeenCalledWith({
      where: { workspaceId: 'workspace1' },
      include: { channel: true },
      orderBy: { createdAt: 'desc' },
    });
    expect(mockRes.json).toHaveBeenCalledWith(mockArticles);
  });

  it('handles unauthorized access', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });
}); 