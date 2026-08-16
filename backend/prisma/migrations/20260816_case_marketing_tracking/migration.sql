ALTER TABLE "Case"
  ADD COLUMN IF NOT EXISTS "source" TEXT,
  ADD COLUMN IF NOT EXISTS "campaign" TEXT,
  ADD COLUMN IF NOT EXISTS "startParameter" TEXT;

CREATE INDEX IF NOT EXISTS "Case_source_idx" ON "Case"("source");
CREATE INDEX IF NOT EXISTS "Case_campaign_idx" ON "Case"("campaign");
