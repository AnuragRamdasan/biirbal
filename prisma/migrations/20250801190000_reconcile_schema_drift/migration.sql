-- Manual migration to reconcile schema drift
-- This migration brings the database in sync with the current schema

-- Remove isAccessRestricted column from processed_links (if it exists)
-- This column was added but later removed from the schema
ALTER TABLE "processed_links" DROP COLUMN IF EXISTS "isAccessRestricted";

-- Remove old subscription columns (if they exist)
-- These columns were removed from the schema
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "linksProcessed";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "monthlyLimit";

-- Add sendSummaryAsDM to teams table (if not exists)
-- This column was added to the schema
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "sendSummaryAsDM" BOOLEAN NOT NULL DEFAULT false;

-- Remove foreign key on slackUserId from audio_listens (if exists)
-- This was replaced with userId foreign key
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'audio_listens_slackUserId_fkey'
        AND table_name = 'audio_listens'
    ) THEN
        ALTER TABLE "audio_listens" DROP CONSTRAINT "audio_listens_slackUserId_fkey";
    END IF;
END $$;

-- Ensure userId foreign key exists on audio_listens
-- This is the current schema requirement
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'audio_listens_userId_fkey'
        AND table_name = 'audio_listens'
    ) THEN
        ALTER TABLE "audio_listens" ADD CONSTRAINT "audio_listens_userId_fkey" 
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;