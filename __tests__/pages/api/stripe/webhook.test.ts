import { NextApiRequest, NextApiResponse } from 'next';
import { buffer } from 'micro';
import Stripe from 'stripe';
import handler from '@/pages/api/stripe/webhook';
import { PrismaClient } from '@prisma/client';

jest.mock('micro');
jest.mock('stripe');
jest.mock('@prisma/client');

describe('Stripe Webhook Handler', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockStripe: jest.Mocked<Stripe>;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      headers: {
        'stripe-signature': 'test_signature',
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    mockPrisma = {
      subscription: {
        upsert: jest.fn(),
        update: jest.fn(),
      },
    } as any;

    (PrismaClient as jest.Mock).mockImplementation(() => mockPrisma);
    (buffer as jest.Mock).mockResolvedValue(Buffer.from('test'));
    process.env.STRIPE_WEBHOOK_SECRET = 'test_secret';
  });

  it('handles subscription created event', async () => {
    const mockEvent = {
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
          status: 'active',
          items: {
            data: [{ price: { id: 'price_123' } }],
          },
          metadata: {
            workspaceId: 'workspace_123',
          },
        },
      },
    };

    (Stripe.prototype.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith({
      where: {
        stripeSubscriptionId: 'sub_123',
      },
      update: expect.any(Object),
      create: expect.any(Object),
    });
    expect(mockRes.json).toHaveBeenCalledWith({ received: true });
  });

  it('handles subscription deleted event', async () => {
    const mockEvent = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
        },
      },
    };

    (Stripe.prototype.webhooks.constructEvent as jest.Mock).mockReturnValue(mockEvent);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
      where: {
        stripeSubscriptionId: 'sub_123',
      },
      data: {
        status: 'canceled',
      },
    });
  });

  it('handles signature verification errors', async () => {
    (Stripe.prototype.webhooks.constructEvent as jest.Mock).mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith('Webhook Error: Invalid signature');
  });
}); 