-- Career Journey 360
CREATE TYPE "CareerJourneyStatus" AS ENUM ('ACTIVE','PAUSED','COMPLETED','ARCHIVED');
CREATE TYPE "CareerGoalStatus" AS ENUM ('ACTIVE','PAUSED','COMPLETED','ABANDONED');
CREATE TYPE "CareerMissionStatus" AS ENUM ('PROPOSED','ACCEPTED','IN_PROGRESS','COMPLETED','ABANDONED','DEFERRED');
CREATE TYPE "CareerEvidenceType" AS ENUM ('DECLARATION','DOCUMENT','PORTFOLIO','PROJECT','EXPERIENCE','ASSESSMENT','FEEDBACK');
CREATE TYPE "CareerEvidenceProvenance" AS ENUM ('DECLARED','DOCUMENTED','AI_EVALUATED','CONVERGENT');
CREATE TYPE "CareerRecommendationType" AS ENUM ('APPLY','DEFER_APPLICATION','UPDATE_CV','LEARN','PRACTICE','PROJECT','PORTFOLIO','INTERVIEW_PREP','EXPLORE_PATH','REASSESS','READY_TO_APPLY');
CREATE TYPE "CareerReviewFrequency" AS ENUM ('OFF','WEEKLY','MONTHLY');
CREATE TYPE "CareerAssessmentFormat" AS ENUM ('MCQ','CASE','ROLEPLAY','PRACTICAL','ORAL','PORTFOLIO');

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "careerJourneyId" TEXT;

-- Prisma relation columns are stored on the child tables; the User relation
-- above is virtual in Prisma and does not create a physical column.
ALTER TABLE "User" DROP COLUMN IF EXISTS "careerJourneyId";

CREATE TABLE "CareerJourney" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "CareerJourneyStatus" NOT NULL DEFAULT 'ACTIVE',
  "targetRole" TEXT,
  "targetDescription" TEXT,
  "targetHorizonMonths" INTEGER,
  "consentFollowUp" BOOLEAN NOT NULL DEFAULT false,
  "reviewFrequency" "CareerReviewFrequency" NOT NULL DEFAULT 'OFF',
  "baselineReadiness" INTEGER,
  "latestReadiness" INTEGER,
  "baselineSnapshot" JSONB,
  "latestSnapshot" JSONB,
  "lastReevaluatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerJourney_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerGoal" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "journeyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "horizonMonths" INTEGER,
  "status" "CareerGoalStatus" NOT NULL DEFAULT 'ACTIVE',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "constraints" JSONB,
  "successSignals" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerMission" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "journeyId" TEXT NOT NULL,
  "goalId" TEXT,
  "recommendationId" TEXT,
  "title" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "gapTarget" TEXT,
  "steps" JSONB,
  "expectedResult" TEXT,
  "expectedEvidence" TEXT,
  "dueAt" TIMESTAMP(3),
  "followUpAt" TIMESTAMP(3),
  "status" "CareerMissionStatus" NOT NULL DEFAULT 'PROPOSED',
  "progressPercent" INTEGER NOT NULL DEFAULT 0,
  "acceptedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "abandonedAt" TIMESTAMP(3),
  "deferredAt" TIMESTAMP(3),
  CONSTRAINT "CareerMission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerMissionUpdate" (
  "id" TEXT NOT NULL,
  "missionId" TEXT NOT NULL,
  "status" "CareerMissionStatus",
  "progress" INTEGER,
  "note" TEXT,
  "response" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerMissionUpdate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerEvidence" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "missionId" TEXT,
  "assessmentId" TEXT,
  "portfolioId" TEXT,
  "type" "CareerEvidenceType" NOT NULL,
  "provenance" "CareerEvidenceProvenance" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sourceUrl" TEXT,
  "storageUrl" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  "acceptedByUser" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerPortfolioItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "role" TEXT,
  "objective" TEXT,
  "actions" TEXT,
  "result" TEXT,
  "contribution" TEXT,
  "technologies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "provenance" "CareerEvidenceProvenance" NOT NULL DEFAULT 'DECLARED',
  "acceptedByUser" BOOLEAN NOT NULL DEFAULT false,
  "visibleOnCv" BOOLEAN NOT NULL DEFAULT false,
  "visibleOnPortfolio" BOOLEAN NOT NULL DEFAULT false,
  "sourceUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerPortfolioItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerRecommendation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "journeyId" TEXT NOT NULL,
  "goalId" TEXT,
  "type" "CareerRecommendationType" NOT NULL,
  "title" TEXT NOT NULL,
  "rationale" TEXT NOT NULL,
  "gap" TEXT,
  "expectedOutcome" TEXT,
  "alternatives" JSONB,
  "assumptions" JSONB,
  "missingData" JSONB,
  "sourceType" TEXT NOT NULL DEFAULT 'CAREER_ENGINE',
  "accepted" BOOLEAN,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerPathScenario" (
  "id" TEXT NOT NULL,
  "journeyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "targetRole" TEXT NOT NULL,
  "assumptions" JSONB,
  "gaps" JSONB,
  "steps" JSONB,
  "constraints" JSONB,
  "selected" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerPathScenario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerCompetencyAssessment" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "journeyId" TEXT NOT NULL,
  "competency" TEXT NOT NULL,
  "format" "CareerAssessmentFormat" NOT NULL,
  "title" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "adaptive" BOOLEAN NOT NULL DEFAULT true,
  "optional" BOOLEAN NOT NULL DEFAULT true,
  "conditions" JSONB,
  "resultSummary" TEXT,
  "score" INTEGER,
  "dimensions" JSONB,
  "limitations" JSONB,
  "officialCertification" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerCompetencyAssessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerCompetencyAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "attemptNumber" INTEGER NOT NULL DEFAULT 1,
  "answers" JSONB,
  "score" INTEGER,
  "feedback" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerCompetencyAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CareerReview" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "journeyId" TEXT NOT NULL,
  "frequency" "CareerReviewFrequency" NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "summary" TEXT NOT NULL,
  "completedMissions" INTEGER NOT NULL DEFAULT 0,
  "pendingMissions" INTEGER NOT NULL DEFAULT 0,
  "newSkillsCount" INTEGER NOT NULL DEFAULT 0,
  "readinessBefore" INTEGER,
  "readinessAfter" INTEGER,
  "matchingBefore" INTEGER,
  "matchingAfter" INTEGER,
  "nextPriorities" JSONB,
  "acknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CareerReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CareerJourney_userId_key" ON "CareerJourney"("userId");
CREATE INDEX "CareerJourney_status_updatedAt_idx" ON "CareerJourney"("status","updatedAt");
CREATE INDEX "CareerGoal_userId_status_idx" ON "CareerGoal"("userId","status");
CREATE INDEX "CareerGoal_journeyId_priority_idx" ON "CareerGoal"("journeyId","priority");
CREATE INDEX "CareerMission_userId_status_dueAt_idx" ON "CareerMission"("userId","status","dueAt");
CREATE INDEX "CareerMission_journeyId_status_idx" ON "CareerMission"("journeyId","status");
CREATE INDEX "CareerMissionUpdate_missionId_createdAt_idx" ON "CareerMissionUpdate"("missionId","createdAt");
CREATE INDEX "CareerEvidence_userId_type_createdAt_idx" ON "CareerEvidence"("userId","type","createdAt");
CREATE INDEX "CareerPortfolioItem_userId_createdAt_idx" ON "CareerPortfolioItem"("userId","createdAt");
CREATE INDEX "CareerRecommendation_userId_createdAt_idx" ON "CareerRecommendation"("userId","createdAt");
CREATE INDEX "CareerRecommendation_journeyId_accepted_idx" ON "CareerRecommendation"("journeyId","accepted");
CREATE INDEX "CareerPathScenario_journeyId_selected_idx" ON "CareerPathScenario"("journeyId","selected");
CREATE INDEX "CareerCompetencyAssessment_userId_competency_createdAt_idx" ON "CareerCompetencyAssessment"("userId","competency","createdAt");
CREATE UNIQUE INDEX "CareerCompetencyAttempt_assessmentId_attemptNumber_key" ON "CareerCompetencyAttempt"("assessmentId","attemptNumber");
CREATE INDEX "CareerCompetencyAttempt_userId_createdAt_idx" ON "CareerCompetencyAttempt"("userId","createdAt");
CREATE INDEX "CareerReview_userId_periodEnd_idx" ON "CareerReview"("userId","periodEnd");

ALTER TABLE "CareerJourney" ADD CONSTRAINT "CareerJourney_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerGoal" ADD CONSTRAINT "CareerGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerGoal" ADD CONSTRAINT "CareerGoal_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "CareerJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerMission" ADD CONSTRAINT "CareerMission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerMission" ADD CONSTRAINT "CareerMission_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "CareerJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerMission" ADD CONSTRAINT "CareerMission_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "CareerGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareerMission" ADD CONSTRAINT "CareerMission_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "CareerRecommendation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareerMissionUpdate" ADD CONSTRAINT "CareerMissionUpdate_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "CareerMission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerEvidence" ADD CONSTRAINT "CareerEvidence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerEvidence" ADD CONSTRAINT "CareerEvidence_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "CareerMission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareerEvidence" ADD CONSTRAINT "CareerEvidence_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "CareerCompetencyAssessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareerEvidence" ADD CONSTRAINT "CareerEvidence_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "CareerPortfolioItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareerPortfolioItem" ADD CONSTRAINT "CareerPortfolioItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerRecommendation" ADD CONSTRAINT "CareerRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerRecommendation" ADD CONSTRAINT "CareerRecommendation_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "CareerJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerRecommendation" ADD CONSTRAINT "CareerRecommendation_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "CareerGoal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CareerPathScenario" ADD CONSTRAINT "CareerPathScenario_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "CareerJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerCompetencyAssessment" ADD CONSTRAINT "CareerCompetencyAssessment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerCompetencyAssessment" ADD CONSTRAINT "CareerCompetencyAssessment_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "CareerJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerCompetencyAttempt" ADD CONSTRAINT "CareerCompetencyAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerCompetencyAttempt" ADD CONSTRAINT "CareerCompetencyAttempt_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "CareerCompetencyAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerReview" ADD CONSTRAINT "CareerReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareerReview" ADD CONSTRAINT "CareerReview_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "CareerJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;
