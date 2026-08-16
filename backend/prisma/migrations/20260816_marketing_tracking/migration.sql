CREATE TABLE IF NOT EXISTS "MarketingVisit" (
  "id" TEXT NOT NULL,
  "telegramId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "campaign" TEXT NOT NULL,
  "startParam" TEXT NOT NULL,
  "username" TEXT,
  "firstName" TEXT,
  "lastName" TEXT,
  "phoneLinkedAt" TIMESTAMP(3),
  "caseId" TEXT,
  "caseDisplayId" TEXT,
  "convertedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketingVisit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MarketingVisit_telegramId_idx"
ON "MarketingVisit"("telegramId");

CREATE INDEX IF NOT EXISTS "MarketingVisit_source_idx"
ON "MarketingVisit"("source");

CREATE INDEX IF NOT EXISTS "MarketingVisit_campaign_idx"
ON "MarketingVisit"("campaign");

CREATE INDEX IF NOT EXISTS "MarketingVisit_startParam_idx"
ON "MarketingVisit"("startParam");

CREATE INDEX IF NOT EXISTS "MarketingVisit_caseId_idx"
ON "MarketingVisit"("caseId");

CREATE INDEX IF NOT EXISTS "MarketingVisit_createdAt_idx"
ON "MarketingVisit"("createdAt");
