import { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/slack/events';
import { PrismaClient } from '@prisma/client';
import { extractTextFromUrl } from '@/lib/textExtractor';
import { generateAudio } from '@/lib/audioGenerator';
import { uploadToS3 } from '@/lib/s3';

jest.mock('@prisma/client');
jest.mock('@/lib/textExtractor');
jest.mock('@/lib/audioGenerator');
jest.mock('@/lib/s3');
jest.mock('@slack/bolt');

describe('Slack Events API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      body: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockPrisma = {
      workspace: {
        findFirst: jest.fn(),
      },
      article: {
        create: jest.fn(),
      },
    } as any;

    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
  });

  it('handles URL verification', async () => {
    mockReq.body = {
      type: 'url_verification',
      challenge: 'test_challenge',
    };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ challenge: 'test_challenge' });
  });

  it('processes message with URL', async () => {
    const mockWorkspace = {
      id: 'workspace1',
      subscription: { status: 'active' },
    };
    mockPrisma.workspace.findFirst.mockResolvedValue(mockWorkspace as any);
    (extractTextFromUrl as jest.Mock).mockResolvedValue('Article text');
    (generateAudio as jest.Mock).mockResolvedValue(Buffer.from('audio'));
    (uploadToS3 as jest.Mock).mockResolvedValue('https://audio-url.mp3');

    mockReq.body = {
      type: 'event_callback',
      event: {
        type: 'message',
        channel: 'channel1',
        text: 'Check this out https://example.com/article',
        ts: '1234567890.123',
      },
    };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(extractTextFromUrl).toHaveBeenCalledWith('https://example.com/article');
    expect(generateAudio).toHaveBeenCalled();
    expect(uploadToS3).toHaveBeenCalled();
    expect(mockPrisma.article.create).toHaveBeenCalled();
  });

  it('handles missing workspace or subscription', async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue(null);

    mockReq.body = {
      type: 'event_callback',
      event: {
        type: 'message',
        channel: 'channel1',
        text: 'https://example.com',
      },
    };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Workspace not found or no active subscription',
    });
  });
}); 