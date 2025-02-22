import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import Stripe from 'stripe';
import handler from '@/pages/api/stripe/create-checkout-session';

jest.mock('next-auth');
jest.mock('stripe');

describe('Create Checkout Session API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;

  beforeEach(() => {
    mockReq = {
      method: 'POST',
      body: { priceId: 'basic' },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    process.env.STRIPE_BASIC_PRICE_ID = 'price_basic';
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro';
    process.env.NEXTAUTH_URL = 'http://localhost:3000';

    (getServerSession as jest.Mock).mockResolvedValue({
      workspaceId: 'workspace1',
    });
  });

  it('creates a checkout session', async () => {
    const mockSession = { id: 'cs_test_123' };
    (Stripe.prototype.checkout.sessions.create as jest.Mock).mockResolvedValue(mockSession);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(Stripe.prototype.checkout.sessions.create).toHaveBeenCalledWith({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_basic',
          quantity: 1,
        },
      ],
      success_url: expect.stringContaining('/dashboard'),
      cancel_url: expect.stringContaining('/subscription'),
      metadata: {
        workspaceId: 'workspace1',
      },
    });

    expect(mockRes.json).toHaveBeenCalledWith({ sessionId: 'cs_test_123' });
  });

  it('handles unauthorized access', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('validates price ID', async () => {
    mockReq.body = { priceId: 'invalid' };

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid price ID' });
  });
}); 