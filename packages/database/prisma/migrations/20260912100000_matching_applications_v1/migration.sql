-- JOBLY — Matching V1 + Applications V1 (Statut.md sections 6.1, 12.1, 12.2)
-- Ajoute les champs nécessaires au calcul du % de correspondance (5 critères)
-- et au suivi de candidature (preuve, vue recruteur, entretien, conflit de statut).

-- Profile : préférences candidat (onboarding Career Brain, étape "Objectifs")
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "targetCities" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "contractPreferences" TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE "Profile" ADD COLUMN IF NOT EXISTS "remotePreference" TEXT NOT NULL DEFAULT 'INDIFFERENT';
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_remotePreference_check"
  CHECK ("remotePreference" IN ('YES','NO','INDIFFERENT'));

-- Job : critères de correspondance (spec 12.1)
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "remoteMode" TEXT NOT NULL DEFAULT 'NO';
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "minExperienceYears" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Job" ADD CONSTRAINT "Job_remoteMode_check"
  CHECK ("remoteMode" IN ('YES','NO','PARTIAL'));
ALTER TABLE "Job" ADD CONSTRAINT "Job_minExperienceYears_check"
  CHECK ("minExperienceYears" >= 0);

-- Application : suivi de candidature (spec 12.2)
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "proofUrl" TEXT;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "viewedAt" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "interviewAt" TIMESTAMP(3);
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "statusSource" TEXT NOT NULL DEFAULT 'CANDIDATE';
ALTER TABLE "Application" ADD CONSTRAINT "Application_statusSource_check"
  CHECK ("statusSource" IN ('CANDIDATE','RECRUITER'));

CREATE INDEX IF NOT EXISTS "Job_remoteMode_idx" ON "Job"("remoteMode");
CREATE INDEX IF NOT EXISTS "Application_viewedAt_idx" ON "Application"("viewedAt");
