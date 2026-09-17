ALTER TABLE "Job" ADD COLUMN "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "JobSource" ADD COLUMN "staleAfterHours" INTEGER NOT NULL DEFAULT 168;
ALTER TABLE "JobSource" ADD COLUMN "requestTimeoutMs" INTEGER NOT NULL DEFAULT 15000;

CREATE TABLE "DiscoveryRun" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "queueItemId" TEXT,
  "status" TEXT NOT NULL,
  "fetched" INTEGER NOT NULL DEFAULT 0,
  "created" INTEGER NOT NULL DEFAULT 0,
  "updated" INTEGER NOT NULL DEFAULT 0,
  "skipped" INTEGER NOT NULL DEFAULT 0,
  "expired" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscoveryRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DiscoveryRun_sourceId_createdAt_idx" ON "DiscoveryRun"("sourceId", "createdAt");
CREATE INDEX "DiscoveryRun_status_createdAt_idx" ON "DiscoveryRun"("status", "createdAt");
ALTER TABLE "DiscoveryRun" ADD CONSTRAINT "DiscoveryRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Job_source_isActive_lastSeenAt_idx" ON "Job"("source", "isActive", "lastSeenAt");
