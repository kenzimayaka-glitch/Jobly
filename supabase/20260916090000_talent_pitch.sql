-- JOBLY — TRUE VIDEO PITCH ENGINE — 16/09/2026
-- Idempotent migration for 5–8 second talent pitches.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pitchVideoUrl" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pitchVideoStoragePath" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pitchVideoDurationMs" INTEGER;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pitchVideoUpdatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "User_pitchVideoUpdatedAt_idx" ON "User"("pitchVideoUpdatedAt");
NOTIFY pgrst, 'reload schema';
