-- JOBLY — Unification RecruiterJob / Job pour les candidatures.
-- Décision du fondateur (12/09/2026) : une candidature peut porter sur une offre
-- Discovery ("Job", scrapée) OU sur une offre publiée par un recruteur JOBLY
-- ("RecruiterJob") — l'écran Offres mélange les deux sources.
--
-- Jusqu'ici "RecruiterJob" existait uniquement en SQL brut (voir
-- RECRUITER-PARTNER-FOUNDATION.sql), sans modèle Prisma ni lien avec
-- "Application". Cette migration comble ce point de vigilance documenté dans
-- Statut.md (section 4).

-- RecruiterJob : mêmes critères de matching que Job (spec 12.1), pour un calcul
-- de % de correspondance cohérent quelle que soit la source de l'offre.
ALTER TABLE "RecruiterJob" ADD COLUMN IF NOT EXISTS "remoteMode" TEXT NOT NULL DEFAULT 'NO';
ALTER TABLE "RecruiterJob" ADD COLUMN IF NOT EXISTS "minExperienceYears" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RecruiterJob" ADD CONSTRAINT "RecruiterJob_remoteMode_check"
  CHECK ("remoteMode" IN ('YES','NO','PARTIAL'));
ALTER TABLE "RecruiterJob" ADD CONSTRAINT "RecruiterJob_minExperienceYears_check"
  CHECK ("minExperienceYears" >= 0);

-- Application : jobId devient optionnel, ajout de recruiterJobId.
-- Note Postgres : une contrainte UNIQUE(userId, x) n'empêche PAS deux lignes où x
-- est NULL (NULL <> NULL) — donc unique(userId, jobId) et unique(userId, recruiterJobId)
-- cohabitent sans index partiel : chacune ne s'applique qu'aux lignes de sa propre source.
ALTER TABLE "Application" ALTER COLUMN "jobId" DROP NOT NULL;
ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "recruiterJobId" TEXT;
ALTER TABLE "Application" ADD CONSTRAINT "Application_recruiterJobId_fkey"
  FOREIGN KEY ("recruiterJobId") REFERENCES "RecruiterJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_exactly_one_source_check"
  CHECK (
    ("jobId" IS NOT NULL AND "recruiterJobId" IS NULL) OR
    ("jobId" IS NULL AND "recruiterJobId" IS NOT NULL)
  );
CREATE UNIQUE INDEX IF NOT EXISTS "Application_userId_recruiterJobId_key" ON "Application"("userId","recruiterJobId");
CREATE INDEX IF NOT EXISTS "Application_recruiterJobId_idx" ON "Application"("recruiterJobId");
CREATE INDEX IF NOT EXISTS "RecruiterJob_status_idx" ON "RecruiterJob"("status");
