-- JOBLY P2/P3 — Pricing catalogue + Subscription lifecycle + Payment Core
ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "PlanCode" ADD VALUE IF NOT EXISTS 'START';
ALTER TYPE "PlanCode" ADD VALUE IF NOT EXISTS 'PREMIUM';
ALTER TYPE "PlanCode" ADD VALUE IF NOT EXISTS 'PRO';
ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "billingInterval" TEXT, ADD COLUMN IF NOT EXISTS "priceAmount" INTEGER, ADD COLUMN IF NOT EXISTS "priceCurrency" TEXT NOT NULL DEFAULT 'XAF', ADD COLUMN IF NOT EXISTS "provider" TEXT, ADD COLUMN IF NOT EXISTS "currentPeriodStart" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "currentPeriodEnd" TIMESTAMP(3);
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_billingInterval_check" CHECK ("billingInterval" IS NULL OR "billingInterval" IN ('MONTHLY','ANNUAL'));
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_priceAmount_check" CHECK ("priceAmount" IS NULL OR "priceAmount" >= 0);
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT, ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT, ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3), ADD COLUMN IF NOT EXISTS "failureReason" TEXT, ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_status_check" CHECK ("status" IN ('CREATED','PENDING','SUCCESSFUL','FAILED','REFUNDED'));
CREATE INDEX IF NOT EXISTS "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");
CREATE INDEX IF NOT EXISTS "Payment_userId_createdAt_idx_p2" ON "Payment"("userId","createdAt");
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" ("id" TEXT PRIMARY KEY,"code" TEXT NOT NULL UNIQUE,"name" TEXT NOT NULL,"monthlyPrice" INTEGER NOT NULL,"annualPrice" INTEGER NOT NULL,"aiCredits" INTEGER NOT NULL,"storageMb" INTEGER NOT NULL,"features" JSONB NOT NULL,"active" BOOLEAN NOT NULL DEFAULT TRUE,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "SubscriptionPlan_prices_check" CHECK ("monthlyPrice">=0 AND "annualPrice">=0),CONSTRAINT "SubscriptionPlan_limits_check" CHECK ("aiCredits">=0 AND "storageMb">=0));
CREATE TABLE IF NOT EXISTS "IdempotencyKey" ("id" TEXT PRIMARY KEY,"userId" TEXT NOT NULL,"endpoint" TEXT NOT NULL,"key" TEXT NOT NULL,"payloadHash" TEXT NOT NULL,"statusCode" INTEGER NOT NULL,"response" JSONB NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "IdempotencyKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,CONSTRAINT "IdempotencyKey_userId_endpoint_key_key" UNIQUE ("userId","endpoint","key"));
CREATE INDEX IF NOT EXISTS "IdempotencyKey_createdAt_idx" ON "IdempotencyKey"("createdAt");
CREATE TABLE IF NOT EXISTS "PaymentWebhookEvent" ("id" TEXT PRIMARY KEY,"provider" TEXT NOT NULL,"externalEventId" TEXT NOT NULL,"eventType" TEXT NOT NULL,"payloadHash" TEXT NOT NULL,"payload" JSONB NOT NULL,"receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"processedAt" TIMESTAMP(3),"status" TEXT NOT NULL DEFAULT 'RECEIVED',"error" TEXT,CONSTRAINT "PaymentWebhookEvent_provider_externalEventId_key" UNIQUE ("provider","externalEventId"));
CREATE INDEX IF NOT EXISTS "PaymentWebhookEvent_provider_receivedAt_idx" ON "PaymentWebhookEvent"("provider","receivedAt");
ALTER TABLE "SubscriptionPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "IdempotencyKey" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentWebhookEvent" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscription_plan_public_read" ON "SubscriptionPlan" FOR SELECT TO anon, authenticated USING ("active"=true);
CREATE POLICY "idempotency_owner_or_admin" ON "IdempotencyKey" FOR SELECT TO authenticated USING ("userId"=public.jobly_current_user_id() OR public.jobly_is_admin());
CREATE POLICY "webhook_admin_only" ON "PaymentWebhookEvent" FOR SELECT TO authenticated USING (public.jobly_is_admin());
INSERT INTO "SubscriptionPlan" ("id","code","name","monthlyPrice","annualPrice","aiCredits","storageMb","features") VALUES
('plan_free','FREE','Free',0,0,5,25,'["profile","cv","jobs","applications","matching_basic","mobility_basic","career_brain_limited"]'),
('plan_start','START','Start',1800,5000,30,100,'["free","matching_improved","cv_analysis_limited","job_alerts","career_brain_improved"]'),
('plan_premium','PREMIUM','Premium',3500,15500,120,250,'["start","matching_advanced","cv_optimization","cover_letter","career_brain","interview_prep","job_search_assistant","mobility_premium"]'),
('plan_pro','PRO','Pro',5000,25800,300,500,'["premium","career_brain_advanced","interview_simulation","advanced_application_adaptation","prioritized_search","mobility_advanced","priority_support"]')
ON CONFLICT ("code") DO UPDATE SET "name"=EXCLUDED."name","monthlyPrice"=EXCLUDED."monthlyPrice","annualPrice"=EXCLUDED."annualPrice","aiCredits"=EXCLUDED."aiCredits","storageMb"=EXCLUDED."storageMb","features"=EXCLUDED."features","active"=TRUE;
