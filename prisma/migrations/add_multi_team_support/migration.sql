-- CreateTable: Add TeamMembership table first
CREATE TABLE "team_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "slackUserId" TEXT,
    "displayName" TEXT,
    "realName" TEXT,
    "profileImage24" TEXT,
    "profileImage32" TEXT,
    "profileImage48" TEXT,
    "title" TEXT,
    "userAccessToken" TEXT,
    "role" TEXT NOT NULL DEFAULT 'member',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_memberships_userId_teamId_key" ON "team_memberships"("userId", "teamId");

-- CreateIndex  
CREATE UNIQUE INDEX "team_memberships_slackUserId_teamId_key" ON "team_memberships"("slackUserId", "teamId");

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_memberships" ADD CONSTRAINT "team_memberships_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data: Create memberships for existing user-team relationships
INSERT INTO "team_memberships" (
    "id",
    "userId", 
    "teamId",
    "slackUserId",
    "displayName",
    "realName", 
    "profileImage24",
    "profileImage32",
    "profileImage48",
    "title",
    "userAccessToken",
    "role",
    "isActive",
    "joinedAt",
    "updatedAt"
)
SELECT 
    gen_random_uuid()::text,
    u."id",
    u."teamId",
    u."slackUserId",
    u."displayName",
    u."realName",
    u."profileImage24", 
    u."profileImage32",
    u."profileImage48",
    u."title",
    u."userAccessToken",
    CASE WHEN u."slackUserId" IS NOT NULL THEN 'member' ELSE 'admin' END,
    u."isActive",
    u."createdAt",
    u."updatedAt"
FROM "users" u
WHERE u."teamId" IS NOT NULL;

-- Now safely drop the old columns and constraints
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_slackUserId_key";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_teamId_fkey";

-- Drop the old columns
ALTER TABLE "users" DROP COLUMN IF EXISTS "slackUserId";
ALTER TABLE "users" DROP COLUMN IF EXISTS "teamId";
ALTER TABLE "users" DROP COLUMN IF EXISTS "displayName";
ALTER TABLE "users" DROP COLUMN IF EXISTS "realName";
ALTER TABLE "users" DROP COLUMN IF EXISTS "profileImage24";
ALTER TABLE "users" DROP COLUMN IF EXISTS "profileImage32";
ALTER TABLE "users" DROP COLUMN IF EXISTS "profileImage48";
ALTER TABLE "users" DROP COLUMN IF EXISTS "title";
ALTER TABLE "users" DROP COLUMN IF EXISTS "userAccessToken";
ALTER TABLE "users" DROP COLUMN IF EXISTS "isActive";