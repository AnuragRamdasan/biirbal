import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getServerSession(req, res);

  if (!session || !session.workspaceId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const articles = await prisma.article.findMany({
      where: {
        workspaceId: session.workspaceId,
      },
      include: {
        channel: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(articles);
  } catch (error) {
    console.error("Error fetching articles:", error);
    res.status(500).json({ error: "Failed to fetch articles" });
  }
}
