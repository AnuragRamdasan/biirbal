-- AlterTable
ALTER TABLE "audio_listens" ADD COLUMN     "slackUserId" TEXT;

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "slackUserId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT,
    "displayName" TEXT,
    "realName" TEXT,
    "email" TEXT,
    "profileImage24" TEXT,
    "profileImage32" TEXT,
    "profileImage48" TEXT,
    "title" TEXT,
    "userAccessToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_slackUserId_key" ON "users"("slackUserId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_listens" ADD CONSTRAINT "audio_listens_slackUserId_fkey" FOREIGN KEY ("slackUserId") REFERENCES "users"("slackUserId") ON DELETE SET NULL ON UPDATE CASCADE;
