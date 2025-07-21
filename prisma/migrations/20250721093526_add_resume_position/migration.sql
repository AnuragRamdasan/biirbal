-- AlterTable
ALTER TABLE "audio_listens" ADD COLUMN     "resumePosition" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "processed_links" ADD COLUMN     "isAccessRestricted" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "subscriptions" ALTER COLUMN "monthlyLinkLimit" SET DEFAULT 20,
ALTER COLUMN "userLimit" SET DEFAULT 1;
