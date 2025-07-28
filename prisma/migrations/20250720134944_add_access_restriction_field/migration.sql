-- Add access restriction field to processed_links table
ALTER TABLE "processed_links" ADD COLUMN "isAccessRestricted" BOOLEAN NOT NULL DEFAULT false;