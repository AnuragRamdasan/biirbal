-- Add new fields for enhanced subscription plans
ALTER TABLE "subscriptions" ADD COLUMN "planId" TEXT NOT NULL DEFAULT 'free';
ALTER TABLE "subscriptions" ADD COLUMN "monthlyLinkLimit" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "subscriptions" ADD COLUMN "userLimit" INTEGER NOT NULL DEFAULT 2;

-- Update existing subscriptions to use new plan structure
UPDATE "subscriptions" SET 
  "monthlyLinkLimit" = CASE 
    WHEN "monthlyLimit" <= 50 THEN 30    -- Free plan
    WHEN "monthlyLimit" <= 100 THEN 100  -- Pro plan  
    ELSE -1                              -- Enterprise (unlimited)
  END,
  "userLimit" = CASE
    WHEN "monthlyLimit" <= 50 THEN 2     -- Free plan
    WHEN "monthlyLimit" <= 100 THEN 5    -- Pro plan
    ELSE -1                              -- Enterprise (unlimited)
  END,
  "planId" = CASE
    WHEN "monthlyLimit" <= 50 THEN 'free'
    WHEN "monthlyLimit" <= 100 THEN 'pro'
    ELSE 'enterprise'
  END;