CREATE TYPE "DiscoveryQueueStatus" AS ENUM ('PENDING','RUNNING','SUCCEEDED','FAILED','SKIPPED');
ALTER TABLE "JobSource" ADD COLUMN "lastQueuedAt" TIMESTAMP(3);
ALTER TABLE "JobSource" ADD COLUMN "lastRunAt" TIMESTAMP(3);
ALTER TABLE "JobSource" ADD COLUMN "lastSuccessAt" TIMESTAMP(3);
CREATE TABLE "DiscoveryQueueItem" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "status" "DiscoveryQueueStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "lockedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiscoveryQueueItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DiscoveryQueueItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "DiscoveryQueueItem_status_scheduledAt_idx" ON "DiscoveryQueueItem"("status","scheduledAt");
CREATE UNIQUE INDEX "DiscoveryQueueItem_sourceId_scheduledAt_key" ON "DiscoveryQueueItem"("sourceId","scheduledAt");
