-- JOBLY — Recruiter & Partner foundation
-- Run once in Supabase SQL Editor (in addition to PROFILE-FOUNDATION.sql, which must
-- already have been run — these tables reference "User"(id)).
-- Idempotent: safe to run again.
--
-- Context: app/api/recruiter/jobs/route.ts previously queried "recruiter_jobs" and
-- "recruiter_profiles", two tables that were never created by any migration or SQL
-- script in this project. This file creates the real tables, named and shaped to
-- match the rest of the app (quoted PascalCase, ownership via "User".id — the same
-- pattern already used by Profile/Experience/Skill/Education), and the code has been
-- updated to match.

DO $$ BEGIN
  CREATE TYPE "RecruiterJobStatus" AS ENUM ('draft', 'published', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommissionStatus" AS ENUM ('GENERATED','PENDING','VALIDATED','PAYABLE','PAYMENT_EXECUTED','PAID','REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Recruiter ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "RecruiterProfile" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "companyName" TEXT NOT NULL DEFAULT 'Mon entreprise',
  "sector" TEXT,
  "website" TEXT,
  "location" TEXT,
  "verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecruiterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "RecruiterJob" (
  "id" TEXT PRIMARY KEY,
  "recruiterUserId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "companyName" TEXT NOT NULL DEFAULT 'Mon entreprise',
  "description" TEXT NOT NULL,
  "location" TEXT,
  "mode" TEXT NOT NULL DEFAULT 'Hybride',
  "contract" TEXT NOT NULL DEFAULT 'CDI',
  "salary" TEXT,
  "sector" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "RecruiterJobStatus" NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecruiterJob_recruiterUserId_fkey" FOREIGN KEY ("recruiterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "RecruiterJob_recruiterUserId_idx" ON "RecruiterJob"("recruiterUserId");

-- ── Partner ──────────────────────────────────────────────────────────────
-- Same shape as packages/database/prisma/schema.prisma (Partner/Commission),
-- created directly here because that Prisma migration was never actually applied
-- to this Supabase project (only the Profile/Experience/Skill/Education subset was,
-- via PROFILE-FOUNDATION.sql).

CREATE TABLE IF NOT EXISTS "Partner" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "referralCode" TEXT NOT NULL UNIQUE,
  "payoutProvider" TEXT,
  "payoutPhone" TEXT,
  "kycStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Partner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Commission" (
  "id" TEXT PRIMARY KEY,
  "partnerId" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'XAF',
  "status" "CommissionStatus" NOT NULL DEFAULT 'GENERATED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  CONSTRAINT "Commission_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Commission_amount_check" CHECK ("amount" >= 0)
);

CREATE INDEX IF NOT EXISTS "Commission_partnerId_idx" ON "Commission"("partnerId");

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Same defense-in-depth posture as packages/database/prisma/migrations/
-- 20260909091000_production_hardening_rls (also possibly never applied to
-- this project — recreated here idempotently so it's safe regardless).
-- The app's own API routes use the service-role client, which bypasses RLS;
-- these policies protect against any other client (anon key, another tool)
-- reading someone else's recruiter jobs or commissions.

CREATE OR REPLACE FUNCTION public.jobly_current_user_id()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT "id" FROM public."User" WHERE "authUserId" = auth.uid()::text LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.jobly_is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public."User" WHERE "authUserId" = auth.uid()::text AND "role" = 'ADMIN');
$$;
REVOKE ALL ON FUNCTION public.jobly_current_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.jobly_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.jobly_current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.jobly_is_admin() TO authenticated;

ALTER TABLE "RecruiterProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecruiterJob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Partner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recruiter_profile_owner_or_admin" ON "RecruiterProfile";
CREATE POLICY "recruiter_profile_owner_or_admin" ON "RecruiterProfile" FOR ALL TO authenticated
  USING ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin())
  WITH CHECK ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin());

DROP POLICY IF EXISTS "recruiter_job_owner_or_admin" ON "RecruiterJob";
CREATE POLICY "recruiter_job_owner_or_admin" ON "RecruiterJob" FOR ALL TO authenticated
  USING ("recruiterUserId" = public.jobly_current_user_id() OR public.jobly_is_admin())
  WITH CHECK ("recruiterUserId" = public.jobly_current_user_id() OR public.jobly_is_admin());

-- Une offre "published" doit rester lisible par n'importe quel talent connecté
-- (côté /jobs, à brancher plus tard) ; les brouillons restent privés au recruteur.
DROP POLICY IF EXISTS "recruiter_job_published_readable" ON "RecruiterJob";
CREATE POLICY "recruiter_job_published_readable" ON "RecruiterJob" FOR SELECT TO authenticated
  USING ("status" = 'published');

DROP POLICY IF EXISTS "partner_owner_or_admin" ON "Partner";
CREATE POLICY "partner_owner_or_admin" ON "Partner" FOR ALL TO authenticated
  USING ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin())
  WITH CHECK ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin());

DROP POLICY IF EXISTS "commission_partner_owner_or_admin" ON "Commission";
CREATE POLICY "commission_partner_owner_or_admin" ON "Commission" FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public."Partner" p WHERE p."id" = "partnerId" AND (p."userId" = public.jobly_current_user_id() OR public.jobly_is_admin())));

NOTIFY pgrst, 'reload schema';
