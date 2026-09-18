-- Sensitive Jobly business and user data is server-side only.
-- The application uses the Supabase service-role client from Next.js API routes
-- and Prisma/direct server access; client roles must not reach these tables.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User','Profile','Experience','Education','Skill','Application',
    'Subscription','Payment','CandidateGmailConnection','RecruiterGmailConnection',
    'JiaEvent','JiaMemory','AiUsage','Commission','Partner','PartnerExtended',
    'PartnerHousing','RecruiterJob','Notification','DiscoveryQueueItem','DiscoveryRun',
    'JobSource','PaymentWebhookEvent','IdempotencyKey','AuditLog','CareerAssessment',
    'Match','QRShare','PartnerAgreement','PartnerKyc','PartnerMission',
    'PartnerMonthlyPerformance','PartnerPerformanceDaily','PartnerReferral',
    'PromoCode','PromoRedemption'
  ] LOOP
    IF to_regclass('public."' || t || '"') IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;
END $$;
