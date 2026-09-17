-- JOBLY production hardening: indexes + Supabase RLS.
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");
CREATE INDEX IF NOT EXISTS "Experience_userId_idx" ON "Experience"("userId");
CREATE INDEX IF NOT EXISTS "Skill_userId_idx" ON "Skill"("userId");
CREATE INDEX IF NOT EXISTS "Education_userId_idx" ON "Education"("userId");
CREATE INDEX IF NOT EXISTS "Job_isActive_createdAt_idx" ON "Job"("isActive","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Job_companyId_idx" ON "Job"("companyId");
CREATE INDEX IF NOT EXISTS "Job_source_isActive_lastSeenAt_idx" ON "Job"("source","isActive","lastSeenAt");
CREATE INDEX IF NOT EXISTS "Match_userId_score_idx" ON "Match"("userId","score" DESC);
CREATE INDEX IF NOT EXISTS "Match_jobId_idx" ON "Match"("jobId");
CREATE INDEX IF NOT EXISTS "Application_userId_status_idx" ON "Application"("userId","status");
CREATE INDEX IF NOT EXISTS "Application_jobId_status_idx" ON "Application"("jobId","status");
CREATE INDEX IF NOT EXISTS "Subscription_userId_status_idx" ON "Subscription"("userId","status");
CREATE INDEX IF NOT EXISTS "Payment_userId_createdAt_idx" ON "Payment"("userId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Commission_partnerId_status_idx" ON "Commission"("partnerId","status");
CREATE INDEX IF NOT EXISTS "QRShare_userId_idx" ON "QRShare"("userId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DiscoveryQueueItem_status_scheduledAt_idx" ON "DiscoveryQueueItem"("status","scheduledAt");
CREATE INDEX IF NOT EXISTS "DiscoveryRun_sourceId_createdAt_idx" ON "DiscoveryRun"("sourceId","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "DiscoveryRun_status_createdAt_idx" ON "DiscoveryRun"("status","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "JobSource_adapterKey_idx" ON "JobSource"("adapterKey");

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

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Experience" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Skill" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Education" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Match" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Application" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Partner" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Commission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "QRShare" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CourseRecommendation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JobSource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscoveryQueueItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DiscoveryRun" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_select_own_or_admin" ON "User" FOR SELECT TO authenticated USING ("authUserId" = auth.uid()::text OR public.jobly_is_admin());
CREATE POLICY "user_update_own_or_admin" ON "User" FOR UPDATE TO authenticated USING ("authUserId" = auth.uid()::text OR public.jobly_is_admin()) WITH CHECK ("authUserId" = auth.uid()::text OR public.jobly_is_admin());

CREATE POLICY "profile_owner_or_admin" ON "Profile" FOR ALL TO authenticated USING ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin()) WITH CHECK ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin());
CREATE POLICY "experience_owner_or_admin" ON "Experience" FOR ALL TO authenticated USING ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin()) WITH CHECK ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin());
CREATE POLICY "skill_owner_or_admin" ON "Skill" FOR ALL TO authenticated USING ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin()) WITH CHECK ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin());
CREATE POLICY "education_owner_or_admin" ON "Education" FOR ALL TO authenticated USING ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin()) WITH CHECK ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin());
CREATE POLICY "match_owner_or_admin" ON "Match" FOR SELECT TO authenticated USING ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin());
CREATE POLICY "application_owner_or_admin" ON "Application" FOR ALL TO authenticated USING ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin()) WITH CHECK ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin());
CREATE POLICY "subscription_owner_or_admin" ON "Subscription" FOR SELECT TO authenticated USING ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin());
CREATE POLICY "payment_owner_or_admin" ON "Payment" FOR SELECT TO authenticated USING ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin());
CREATE POLICY "partner_owner_or_admin" ON "Partner" FOR ALL TO authenticated USING ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin()) WITH CHECK ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin());
CREATE POLICY "commission_partner_owner_or_admin" ON "Commission" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public."Partner" p WHERE p."id" = "partnerId" AND (p."userId" = public.jobly_current_user_id() OR public.jobly_is_admin())));
CREATE POLICY "qr_owner_or_admin" ON "QRShare" FOR ALL TO authenticated USING ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin()) WITH CHECK ("userId" = public.jobly_current_user_id() OR public.jobly_is_admin());
CREATE POLICY "company_public_read" ON "Company" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "job_public_read_active" ON "Job" FOR SELECT TO anon, authenticated USING ("isActive" = true OR public.jobly_is_admin());
CREATE POLICY "course_public_read" ON "CourseRecommendation" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "jobsource_public_read_active" ON "JobSource" FOR SELECT TO anon, authenticated USING ("active" = true OR public.jobly_is_admin());
CREATE POLICY "audit_admin_only" ON "AuditLog" FOR SELECT TO authenticated USING (public.jobly_is_admin());
CREATE POLICY "discovery_queue_admin_only" ON "DiscoveryQueueItem" FOR ALL TO authenticated USING (public.jobly_is_admin()) WITH CHECK (public.jobly_is_admin());
CREATE POLICY "discovery_run_admin_only" ON "DiscoveryRun" FOR SELECT TO authenticated USING (public.jobly_is_admin());
