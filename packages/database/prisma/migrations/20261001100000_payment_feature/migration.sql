ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "feature" TEXT;
CREATE INDEX IF NOT EXISTS "Payment_userId_feature_createdAt_idx" ON "Payment"("userId","feature","createdAt");
