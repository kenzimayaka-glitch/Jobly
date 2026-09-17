-- JOBLY Career Brain / Profile foundation
-- Run once in Supabase SQL Editor if production reports:
-- "Could not find the table 'public.User' in the schema cache"
-- Idempotent: safe to run again.

DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('TALENT','RECRUITER','PARTNER','ADMIN','SUPPORT','FINANCE','MODERATOR','ANALYST');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "Provenance" AS ENUM ('DECLARED','DOCUMENT','VERIFIED','INFERRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "authUserId" TEXT UNIQUE,
  "email" TEXT UNIQUE,
  "phone" TEXT UNIQUE,
  "displayName" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'TALENT',
  "profilePhotoUrl" TEXT,
  "pitchVideoUrl" TEXT,
  "pitchVideoStoragePath" TEXT,
  "pitchVideoDurationMs" INTEGER,
  "pitchVideoUpdatedAt" TIMESTAMP(3),
  "cvPhotoUrl" TEXT,
  "englishLevel" TEXT,
  "licences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Profile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "headline" TEXT,
  "summary" TEXT,
  "location" TEXT,
  "targetRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "preferredSectors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Experience" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "company" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "description" TEXT,
  "provenance" "Provenance" NOT NULL DEFAULT 'DECLARED',
  CONSTRAINT "Experience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Skill" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "level" TEXT,
  "provenance" "Provenance" NOT NULL DEFAULT 'DECLARED',
  CONSTRAINT "Skill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Education" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "institution" TEXT NOT NULL,
  "degree" TEXT,
  "field" TEXT,
  "startDate" TIMESTAMP(3),
  "endDate" TIMESTAMP(3),
  "provenance" "Provenance" NOT NULL DEFAULT 'DECLARED',
  CONSTRAINT "Education_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Experience_userId_idx" ON "Experience"("userId");
CREATE INDEX IF NOT EXISTS "Skill_userId_idx" ON "Skill"("userId");
CREATE INDEX IF NOT EXISTS "Education_userId_idx" ON "Education"("userId");

NOTIFY pgrst, 'reload schema';
