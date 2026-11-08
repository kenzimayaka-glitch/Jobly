-- LOT-00: consent-aware profile photos and private event media.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "profilePhotoStoragePath" TEXT,
  ADD COLUMN IF NOT EXISTS "profilePhotoVisibility" TEXT NOT NULL DEFAULT 'PRIVATE',
  ADD COLUMN IF NOT EXISTS "profilePhotoConsentAt" TIMESTAMP(3);

ALTER TABLE "User"
  DROP CONSTRAINT IF EXISTS "User_profilePhotoVisibility_check",
  ADD CONSTRAINT "User_profilePhotoVisibility_check"
    CHECK ("profilePhotoVisibility" IN ('PRIVATE', 'PUBLIC'));

ALTER TABLE "User"
  DROP CONSTRAINT IF EXISTS "User_profilePhotoPublicConsent_check",
  ADD CONSTRAINT "User_profilePhotoPublicConsent_check"
    CHECK ("profilePhotoVisibility" <> 'PUBLIC' OR "profilePhotoConsentAt" IS NOT NULL);

ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "mediaStoragePath" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Event_mediaStoragePath_key"
  ON "Event" ("mediaStoragePath")
  WHERE "mediaStoragePath" IS NOT NULL;
