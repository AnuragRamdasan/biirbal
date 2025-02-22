const { buffer } = require("micro");
const Stripe = require("stripe");
const handler = require("@/pages/api/stripe/webhook").default;
const { PrismaClient } = require("@prisma/client");

jest.mock("micro");
jest.mock("stripe");
jest.mock("@prisma/client");

describe("Stripe Webhook Handler", () => {
  let mockReq;
  let mockRes;
  let mockPrisma;
  let mockStripe;

  beforeEach(() => {
    mockReq = {
      method: "POST",
      headers: {
        "stripe-signature": "test_signature",
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
    };

    PrismaClient.mockImplementation(() => mockPrisma);
    buffer.mockResolvedValue(Buffer.from("test"));
    process.env.STRIPE_WEBHOOK_SECRET = "test_secret";
  });

  it("handles subscription created event", async () => {
    const mockEvent = {
      type: "customer.subscription.created",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          items: {
            data: [{ price: { id: "price_123" } }],
          },
          metadata: {
            workspaceId: "workspace_123",
          },
        },
      },
    };

    Stripe.prototype.webhooks.constructEvent.mockReturnValue(mockEvent);

    await handler(mockReq, mockRes);

    expect(mockPrisma.subscription.upsert).toHaveBeenCalledWith({
      where: {
        stripeSubscriptionId: "sub_123",
      },
      update: expect.any(Object),
      create: expect.any(Object),
    });
    expect(mockRes.json).toHaveBeenCalledWith({ received: true });
  });

  it("handles subscription deleted event", async () => {
    const mockEvent = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
        },
      },
    };

    Stripe.prototype.webhooks.constructEvent.mockReturnValue(mockEvent);

    await handler(mockReq, mockRes);

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
      where: {
        stripeSubscriptionId: "sub_123",
      },
      data: {
        status: "canceled",
      },
    });
  });

  it("handles signature verification errors", async () => {
    Stripe.prototype.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Invalid signature");
    });

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith("Webhook Error: Invalid signature");
  });
}); 