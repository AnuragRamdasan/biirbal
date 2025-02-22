const { PrismaClient } = require("@prisma/client");
const handler = require("@/pages/api/slack/events").default;
const { extractTextFromUrl } = require("@/lib/textExtractor");
const { generateAudio } = require("@/lib/audioGenerator");
const { uploadToS3 } = require("@/lib/s3");

jest.mock("@prisma/client");
jest.mock("@/lib/textExtractor");
jest.mock("@/lib/audioGenerator");
jest.mock("@/lib/s3");
jest.mock("@slack/bolt");

describe("Slack Events API", () => {
  let mockReq;
  let mockRes;
  let mockPrisma;

  beforeEach(() => {
    mockReq = {
      method: "POST",
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
    };

    PrismaClient.mockImplementation(() => mockPrisma);
  });

  it("handles URL verification", async () => {
    mockReq.body = {
      type: "url_verification",
      challenge: "test_challenge",
    };

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ challenge: "test_challenge" });
  });

  it("processes message with URL", async () => {
    const mockWorkspace = {
      id: "workspace1",
      subscription: { status: "active" },
    };
    mockPrisma.workspace.findFirst.mockResolvedValue(mockWorkspace);
    extractTextFromUrl.mockResolvedValue("Article text");
    generateAudio.mockResolvedValue(Buffer.from("audio"));
    uploadToS3.mockResolvedValue("https://audio-url.mp3");

    mockReq.body = {
      type: "event_callback",
      event: {
        type: "message",
        channel: "channel1",
        text: "Check this out https://example.com/article",
        ts: "1234567890.123",
      },
    };

    await handler(mockReq, mockRes);

    expect(extractTextFromUrl).toHaveBeenCalledWith(
      "https://example.com/article"
    );
    expect(generateAudio).toHaveBeenCalled();
    expect(uploadToS3).toHaveBeenCalled();
    expect(mockPrisma.article.create).toHaveBeenCalled();
  });

  it("handles missing workspace or subscription", async () => {
    mockPrisma.workspace.findFirst.mockResolvedValue(null);

    mockReq.body = {
      type: "event_callback",
      event: {
        type: "message",
        channel: "channel1",
        text: "https://example.com",
      },
    };

    await handler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Workspace not found or no active subscription",
    });
  });
}); 