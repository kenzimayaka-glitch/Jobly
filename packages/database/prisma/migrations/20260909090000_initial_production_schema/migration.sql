-- JOBLY production baseline. Derived from the latest historical Prisma schema (C0.6.4).
CREATE TYPE "UserRole" AS ENUM ('TALENT','RECRUITER','PARTNER','ADMIN','SUPPORT','FINANCE','MODERATOR','ANALYST');
CREATE TYPE "Provenance" AS ENUM ('DECLARED','DOCUMENT','VERIFIED','INFERRED');
CREATE TYPE "ApplicationStatus" AS ENUM ('DISCOVERED','PREPARED','USER_REVIEW','SUBMITTED','ACKNOWLEDGED','INTERVIEW','OFFER','REJECTED','WITHDRAWN');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL','ACTIVE','EXPIRED','CANCELED');
CREATE TYPE "PlanCode" AS ENUM ('FREE','PREMIUM_MONTHLY','PREMIUM_ANNUAL');
CREATE TYPE "CommissionStatus" AS ENUM ('GENERATED','PENDING','VALIDATED','PAYABLE','PAYMENT_EXECUTED','PAID','REJECTED');
CREATE TYPE "QRShareType" AS ENUM ('PROFILE','CV','PORTFOLIO','REPORT','JOBLY_ID');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY, "authUserId" TEXT UNIQUE, "email" TEXT UNIQUE, "phone" TEXT UNIQUE,
  "displayName" TEXT, "role" "UserRole" NOT NULL DEFAULT 'TALENT', "profilePhotoUrl" TEXT,
  "cvPhotoUrl" TEXT, "englishLevel" TEXT, "licences" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "Profile" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE, "headline" TEXT, "summary" TEXT, "location" TEXT,
  "targetRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "preferredSectors" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Experience" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "company" TEXT NOT NULL, "title" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL, "endDate" TIMESTAMP(3), "description" TEXT, "provenance" "Provenance" NOT NULL DEFAULT 'DECLARED',
  CONSTRAINT "Experience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Skill" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "level" TEXT,
  "provenance" "Provenance" NOT NULL DEFAULT 'DECLARED',
  CONSTRAINT "Skill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Education" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "institution" TEXT NOT NULL, "degree" TEXT, "field" TEXT,
  "startDate" TIMESTAMP(3), "endDate" TIMESTAMP(3), "provenance" "Provenance" NOT NULL DEFAULT 'DECLARED',
  CONSTRAINT "Education_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Company" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL, "description" TEXT, "website" TEXT, "logoUrl" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT FALSE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Job" (
  "id" TEXT PRIMARY KEY, "companyId" TEXT, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
  "language" TEXT NOT NULL DEFAULT 'fr', "location" TEXT, "contractType" TEXT, "salaryMin" INTEGER, "salaryMax" INTEGER,
  "salaryCurrency" TEXT DEFAULT 'XAF', "source" TEXT, "sourceUrl" TEXT, "deadline" TIMESTAMP(3), "lastSeenAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Job_salary_range_check" CHECK ("salaryMin" IS NULL OR "salaryMax" IS NULL OR "salaryMin" <= "salaryMax")
);
CREATE UNIQUE INDEX "Job_source_sourceUrl_key" ON "Job"("source","sourceUrl");
CREATE TABLE "Match" (
  "id" TEXT PRIMARY KEY, "jobId" TEXT NOT NULL, "userId" TEXT NOT NULL, "score" INTEGER NOT NULL, "category" TEXT NOT NULL,
  "reasons" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Match_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Match_score_check" CHECK ("score" >= 0 AND "score" <= 100)
);
CREATE TABLE "Application" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "jobId" TEXT NOT NULL, "status" "ApplicationStatus" NOT NULL DEFAULT 'DISCOVERED',
  "language" TEXT NOT NULL, "cvUrl" TEXT, "cvPhotoUrl" TEXT, "letterText" TEXT, "atsScore" INTEGER, "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Application_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Application_userId_jobId_key" UNIQUE ("userId","jobId"),
  CONSTRAINT "Application_ats_score_check" CHECK ("atsScore" IS NULL OR ("atsScore" >= 0 AND "atsScore" <= 100))
);
CREATE TABLE "Subscription" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "plan" "PlanCode" NOT NULL, "status" "SubscriptionStatus" NOT NULL,
  "trialStartedAt" TIMESTAMP(3), "trialEndsAt" TIMESTAMP(3), "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Payment" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "provider" TEXT NOT NULL, "externalId" TEXT UNIQUE, "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XAF', "status" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Payment_amount_check" CHECK ("amount" >= 0)
);
CREATE TABLE "Partner" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL UNIQUE, "referralCode" TEXT NOT NULL UNIQUE, "payoutProvider" TEXT,
  "payoutPhone" TEXT, "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
  CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "Commission" (
  "id" TEXT PRIMARY KEY, "partnerId" TEXT NOT NULL, "event" TEXT NOT NULL, "amount" INTEGER NOT NULL, "currency" TEXT NOT NULL DEFAULT 'XAF',
  "status" "CommissionStatus" NOT NULL DEFAULT 'GENERATED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "paidAt" TIMESTAMP(3),
  CONSTRAINT "Commission_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Commission_amount_check" CHECK ("amount" >= 0)
);
CREATE TABLE "QRShare" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL UNIQUE, "type" "QRShareType" NOT NULL,
  "expiresAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QRShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "CourseRecommendation" (
  "id" TEXT PRIMARY KEY, "skill" TEXT NOT NULL, "title" TEXT NOT NULL, "provider" TEXT NOT NULL, "url" TEXT NOT NULL,
  "isFree" BOOLEAN NOT NULL DEFAULT TRUE, "language" TEXT NOT NULL DEFAULT 'fr', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "AuditLog" (
  "id" TEXT PRIMARY KEY, "userId" TEXT, "action" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT,
  "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE TABLE "JobSource" (
  "id" TEXT PRIMARY KEY, "name" TEXT NOT NULL UNIQUE, "baseUrl" TEXT NOT NULL, "searchUrl" TEXT, "country" TEXT NOT NULL DEFAULT 'CM',
  "language" TEXT NOT NULL DEFAULT 'fr', "active" BOOLEAN NOT NULL DEFAULT TRUE, "discoveryStatus" TEXT NOT NULL DEFAULT 'READY',
  "ingestionMode" TEXT NOT NULL DEFAULT 'EXTERNAL_LINK', "adapterKey" TEXT, "feedUrl" TEXT, "maxItems" INTEGER NOT NULL DEFAULT 50,
  "staleAfterHours" INTEGER NOT NULL DEFAULT 168, "requestTimeoutMs" INTEGER NOT NULL DEFAULT 15000,
  "lastQueuedAt" TIMESTAMP(3), "lastRunAt" TIMESTAMP(3), "lastSuccessAt" TIMESTAMP(3), "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TYPE "DiscoveryQueueStatus" AS ENUM ('PENDING','RUNNING','SUCCEEDED','FAILED','SKIPPED');
CREATE TABLE "DiscoveryQueueItem" (
  "id" TEXT PRIMARY KEY, "sourceId" TEXT NOT NULL, "status" "DiscoveryQueueStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledAt" TIMESTAMP(3) NOT NULL, "startedAt" TIMESTAMP(3), "finishedAt" TIMESTAMP(3), "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT, "lockedBy" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiscoveryQueueItem_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DiscoveryQueueItem_sourceId_scheduledAt_key" UNIQUE ("sourceId","scheduledAt")
);
CREATE TABLE "DiscoveryRun" (
  "id" TEXT PRIMARY KEY, "sourceId" TEXT NOT NULL, "queueItemId" TEXT, "status" TEXT NOT NULL, "fetched" INTEGER NOT NULL DEFAULT 0,
  "created" INTEGER NOT NULL DEFAULT 0, "updated" INTEGER NOT NULL DEFAULT 0, "skipped" INTEGER NOT NULL DEFAULT 0, "expired" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER, "error" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscoveryRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
