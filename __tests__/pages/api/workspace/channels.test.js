import { getServerSession } from "next-auth";
import handler from "@/pages/api/workspace/channels";
import { PrismaClient } from "@prisma/client";

jest.mock("next-auth");
jest.mock("@prisma/client");

describe("Workspace Channels API", () => {
  let mockReq;
  let mockRes;
  let mockPrisma;

  beforeEach(() => {
    mockReq = {
      method: "GET",
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockPrisma = {
      channel: {
        findMany: jest.fn(),
      },
    };

    PrismaClient.mockImplementation(() => mockPrisma);
    getServerSession.mockResolvedValue({
      user: { email: "test@example.com" },
      workspaceId: "workspace1",
    });
  });

  it("returns channels for authenticated workspace", async () => {
    const mockChannels = [
      { id: "channel1", name: "general" },
      { id: "channel2", name: "random" },
    ];

    mockPrisma.channel.findMany.mockResolvedValue(mockChannels);

    await handler(mockReq, mockRes);

    expect(mockPrisma.channel.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "workspace1" },
    });
    expect(mockRes.json).toHaveBeenCalledWith(mockChannels);
  });

  it("handles unauthorized access", async () => {
    getServerSession.mockResolvedValue(null);

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });
}); 