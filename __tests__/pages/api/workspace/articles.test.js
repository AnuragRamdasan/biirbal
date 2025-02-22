import { getServerSession } from "next-auth";
import handler from "@/pages/api/workspace/articles";
import { PrismaClient } from "@prisma/client";

jest.mock("next-auth");
jest.mock("@prisma/client");

describe("Workspace Articles API", () => {
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
      article: {
        findMany: jest.fn(),
      },
    };

    PrismaClient.mockImplementation(() => mockPrisma);
    getServerSession.mockResolvedValue({
      user: { email: "test@example.com" },
      workspaceId: "workspace1",
    });
  });

  it("returns articles for authenticated workspace", async () => {
    const mockArticles = [
      { id: "1", url: "https://example.com/1" },
      { id: "2", url: "https://example.com/2" },
    ];

    mockPrisma.article.findMany.mockResolvedValue(mockArticles);

    await handler(mockReq, mockRes);

    expect(mockPrisma.article.findMany).toHaveBeenCalledWith({
      where: { workspaceId: "workspace1" },
      include: { channel: true },
      orderBy: { createdAt: "desc" },
    });
    expect(mockRes.json).toHaveBeenCalledWith(mockArticles);
  });

  it("handles unauthorized access", async () => {
    getServerSession.mockResolvedValue(null);

    await handler(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });
}); 