ALTER TABLE "MarketingVisit"
  ADD COLUMN IF NOT EXISTS "applicationStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastStepAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "funnelStep" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceTypeSelected" TEXT,
  ADD COLUMN IF NOT EXISTS "abandonedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reminderSentAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "MarketingVisit_lastStepAt_idx"
  ON "MarketingVisit"("lastStepAt");

CREATE INDEX IF NOT EXISTS "MarketingVisit_funnelStep_idx"
  ON "MarketingVisit"("funnelStep");

CREATE INDEX IF NOT EXISTS "MarketingVisit_abandonedAt_idx"
  ON "MarketingVisit"("abandonedAt");
