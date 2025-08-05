-- Multi-team migration script
-- This script safely migrates existing user-team relationships to the new multi-team model

BEGIN;

-- Step 1: Create the TeamMembership table
CREATE TABLE IF NOT EXISTS "team_memberships" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_memberships_pkey" PRIMARY KEY ("id")
);

-- Step 2: Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "team_memberships_userId_teamId_key" ON "team_memberships"("userId", "teamId");
CREATE UNIQUE INDEX IF NOT EXISTS "team_memberships_slackUserId_teamId_key" ON "team_memberships"("slackUserId", "teamId");

-- Step 3: Add foreign key constraints
ALTER TABLE "team_memberships" 
ADD CONSTRAINT "team_memberships_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_memberships" 
ADD CONSTRAINT "team_memberships_teamId_fkey" 
FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 4: Migrate existing user-team relationships to memberships
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
    'tm_' || substr(md5(random()::text), 1, 24), -- Generate unique ID
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
    CASE 
        WHEN u."slackUserId" IS NOT NULL THEN 'member' 
        ELSE 'admin' 
    END,
    u."isActive",
    u."createdAt",
    u."updatedAt"
FROM "users" u
WHERE u."teamId" IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM "team_memberships" tm 
    WHERE tm."userId" = u."id" AND tm."teamId" = u."teamId"
);

-- Step 5: Verify the migration
SELECT 
    'Migration Summary:' as info,
    (SELECT COUNT(*) FROM users WHERE "teamId" IS NOT NULL) as users_with_teams,
    (SELECT COUNT(*) FROM team_memberships) as memberships_created;

COMMIT;

-- Print instructions for next steps
SELECT 'Next steps:' as instructions,
       '1. Verify data migration was successful' as step1,
       '2. Update application code to use TeamMembership model' as step2,
       '3. Run final schema update to remove old columns' as step3;