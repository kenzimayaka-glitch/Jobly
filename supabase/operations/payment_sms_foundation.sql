-- Review mirror only. Do not execute this copy.
-- Canonical migration: supabase/migrations/20261106040000_payment_sms_mobile_money_foundation.sql
-- Requires the existing billing_atomic_promo_subscription_upgrade migration first.

ALTER TABLE public."Payment"
  ADD COLUMN IF NOT EXISTS "payerPhone" text,
  ADD COLUMN IF NOT EXISTS "reportedTransactionId" text,
  ADD COLUMN IF NOT EXISTS "smsMerchantAccount" text;

CREATE INDEX IF NOT EXISTS "Payment_sms_match_idx"
  ON public."Payment" (provider, status, amount, currency, "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "Payment_provider_reported_transaction_unique"
  ON public."Payment" (provider, "reportedTransactionId")
  WHERE "reportedTransactionId" IS NOT NULL;

CREATE TABLE IF NOT EXISTS public."PaymentSmsDevice" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  provider text NOT NULL CHECK (provider IN ('SMS_MTN', 'SMS_ORANGE')),
  "merchantAccount" text NOT NULL,
  "timeZone" text NOT NULL DEFAULT 'Africa/Douala',
  "senderIds" text[] NOT NULL CHECK (cardinality("senderIds") > 0),
  "tokenHash" text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  "createdByUserId" text NOT NULL,
  "lastSeenAt" timestamptz,
  "revokedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."PaymentSmsDevice"
  ADD COLUMN IF NOT EXISTS "timeZone" text NOT NULL DEFAULT 'Africa/Douala';

CREATE TABLE IF NOT EXISTS public."PaymentSmsReceipt" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "deviceId" uuid NOT NULL REFERENCES public."PaymentSmsDevice"(id),
  provider text NOT NULL CHECK (provider IN ('SMS_MTN', 'SMS_ORANGE')),
  "senderId" text NOT NULL,
  "transactionId" text,
  amount integer,
  currency text,
  "payerPhone" text,
  "merchantAccount" text NOT NULL,
  status text NOT NULL CHECK (status IN ('SUCCESSFUL', 'FAILED', 'PENDING', 'UNKNOWN')),
  "processingStatus" text NOT NULL DEFAULT 'RECEIVED'
    CHECK ("processingStatus" IN ('RECEIVED', 'REJECTED', 'UNMATCHED', 'AMBIGUOUS', 'MATCHED')),
  "occurredAt" timestamptz,
  "receivedAt" timestamptz NOT NULL DEFAULT now(),
  "parserVersion" text NOT NULL,
  "payloadHash" text NOT NULL UNIQUE,
  "rawMessageHash" text NOT NULL,
  "fraudFlags" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "matchedPaymentId" text REFERENCES public."Payment"(id),
  "matchDetails" jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT "PaymentSmsReceipt_amount_positive" CHECK (amount IS NULL OR amount > 0),
  CONSTRAINT "PaymentSmsReceipt_currency_xaf" CHECK (currency IS NULL OR currency = 'XAF')
);

CREATE UNIQUE INDEX IF NOT EXISTS "PaymentSmsReceipt_provider_transaction_unique"
  ON public."PaymentSmsReceipt" (provider, "transactionId")
  WHERE "transactionId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "PaymentSmsReceipt_processing_idx"
  ON public."PaymentSmsReceipt" ("processingStatus", "receivedAt" DESC);
CREATE INDEX IF NOT EXISTS "PaymentSmsReceipt_payment_idx"
  ON public."PaymentSmsReceipt" ("matchedPaymentId");

ALTER TABLE public."PaymentSmsDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentSmsReceipt" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."PaymentSmsDevice" FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public."PaymentSmsReceipt" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public."PaymentSmsDevice" TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public."PaymentSmsReceipt" TO service_role;

COMMENT ON TABLE public."PaymentSmsDevice" IS
  'Authorized Jobly merchant handsets. tokenHash stores only a SHA-256 digest; raw device tokens are shown once at provisioning.';
COMMENT ON TABLE public."PaymentSmsReceipt" IS
  'Restricted server-only Mobile Money SMS evidence. Raw SMS body is never stored.';

-- Claim a receipt and finalize one payment atomically. The row lock and unique
-- transaction index prevent one operator receipt from activating two orders.
CREATE OR REPLACE FUNCTION public.finalize_payment_from_sms(
  p_receipt_id uuid,
  p_payment_id text,
  p_user_id text,
  p_now timestamptz DEFAULT now(),
  p_match_reason text DEFAULT 'TRANSACTION_ID'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_receipt public."PaymentSmsReceipt"%ROWTYPE;
  v_device public."PaymentSmsDevice"%ROWTYPE;
  v_payment public."Payment"%ROWTYPE;
  v_result jsonb;
BEGIN
  SELECT * INTO v_receipt
    FROM public."PaymentSmsReceipt"
   WHERE id = p_receipt_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SMS_RECEIPT_NOT_FOUND'; END IF;

  IF v_receipt."processingStatus" = 'MATCHED' THEN
    IF v_receipt."matchedPaymentId" = p_payment_id THEN
      SELECT * INTO v_payment FROM public."Payment" WHERE id = p_payment_id;
      RETURN jsonb_build_object('payment', to_jsonb(v_payment), 'idempotent', true);
    END IF;
    RAISE EXCEPTION 'SMS_TRANSACTION_ALREADY_CLAIMED';
  END IF;

  SELECT * INTO v_payment
    FROM public."Payment"
   WHERE id = p_payment_id AND "userId" = p_user_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;

  IF v_receipt.status <> 'SUCCESSFUL'
     OR v_receipt."processingStatus" NOT IN ('RECEIVED', 'UNMATCHED', 'AMBIGUOUS') THEN
    RAISE EXCEPTION 'SMS_RECEIPT_NOT_ELIGIBLE';
  END IF;

  -- Re-check and lock the paired handset at the final authorization boundary.
  -- A concurrent revocation cannot race a payment finalization.
  SELECT * INTO v_device
    FROM public."PaymentSmsDevice"
   WHERE id = v_receipt."deviceId"
   FOR UPDATE;
  IF NOT FOUND OR v_device.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'SMS_DEVICE_REVOKED';
  END IF;
  IF v_device.provider <> v_receipt.provider
     OR regexp_replace(v_device."merchantAccount", '[^0-9]', '', 'g')
        <> regexp_replace(v_receipt."merchantAccount", '[^0-9]', '', 'g')
     OR NOT (v_receipt."senderId" = ANY(v_device."senderIds")) THEN
    RAISE EXCEPTION 'SMS_DEVICE_RECEIPT_MISMATCH';
  END IF;

  IF v_receipt.provider <> v_payment.provider THEN RAISE EXCEPTION 'SMS_PROVIDER_MISMATCH'; END IF;
  IF v_receipt."transactionId" IS NULL
     OR (v_payment."reportedTransactionId" IS NOT NULL
         AND v_payment."reportedTransactionId" IS DISTINCT FROM v_receipt."transactionId") THEN
    RAISE EXCEPTION 'SMS_TRANSACTION_REFERENCE_MISMATCH';
  END IF;
  IF coalesce(v_receipt."occurredAt", v_receipt."receivedAt") < v_payment."createdAt" - interval '2 minutes'
     OR coalesce(v_receipt."occurredAt", v_receipt."receivedAt") > p_now + interval '5 minutes' THEN
    RAISE EXCEPTION 'SMS_RECEIPT_PREDATES_PAYMENT_ORDER';
  END IF;
  IF v_receipt.amount IS DISTINCT FROM v_payment.amount
     OR upper(coalesce(v_receipt.currency, '')) <> upper(v_payment.currency) THEN
    RAISE EXCEPTION 'SMS_AMOUNT_OR_CURRENCY_MISMATCH';
  END IF;
  IF v_receipt."merchantAccount" IS DISTINCT FROM v_payment."smsMerchantAccount" THEN
    RAISE EXCEPTION 'SMS_MERCHANT_MISMATCH';
  END IF;
  IF v_receipt."payerPhone" IS NOT NULL THEN
    IF v_payment."payerPhone" IS NULL THEN RAISE EXCEPTION 'SMS_PAYER_NOT_CONFIRMED'; END IF;
    IF regexp_replace(v_receipt."payerPhone", '[^0-9]', '', 'g')
       <> regexp_replace(v_payment."payerPhone", '[^0-9]', '', 'g') THEN
      RAISE EXCEPTION 'SMS_PAYER_MISMATCH';
    END IF;
  END IF;
  IF v_payment.status NOT IN ('CREATED', 'PENDING') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_TRANSITION';
  END IF;

  -- Capture the transaction reference from the trusted merchant receipt.
  -- The unique provider/reference index prevents a replay or cross-order reuse.
  UPDATE public."Payment"
     SET "reportedTransactionId" = v_receipt."transactionId",
         "updatedAt" = p_now
   WHERE id = p_payment_id
     AND "reportedTransactionId" IS NULL;

  UPDATE public."PaymentSmsReceipt"
     SET "processingStatus" = 'MATCHED',
         "matchedPaymentId" = p_payment_id,
         "matchDetails" = jsonb_build_object('reason', p_match_reason, 'matchedAt', p_now)
   WHERE id = p_receipt_id;
  v_result := public.finalize_payment(p_payment_id, p_user_id, 'SUCCESSFUL', v_payment.amount, p_now, NULL);
  RETURN v_result || jsonb_build_object('receiptId', p_receipt_id);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_payment_from_sms(uuid, text, text, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_payment_from_sms(uuid, text, text, timestamptz, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_payment_from_sms(uuid, text, text, timestamptz, text) TO service_role;


-- Central operator settings managed by Jobly administrators. Merchant codes are
-- never compiled into application code or exposed by public read APIs.
-- The per-order merchant-code snapshot is isolated from the customer-readable
-- Payment row. Only service_role can read this table.
CREATE TABLE IF NOT EXISTS public."PaymentSmsOrderConfig" (
  "paymentId" text PRIMARY KEY REFERENCES public."Payment"(id) ON DELETE CASCADE,
  "merchantCode" text NOT NULL CHECK ("merchantCode" ~ '^[A-Za-z0-9_-]{1,40}$'),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."PaymentSmsOrderConfig" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."PaymentSmsOrderConfig" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON TABLE public."PaymentSmsOrderConfig" TO service_role;

COMMENT ON TABLE public."PaymentSmsOrderConfig" IS
  'Server-only snapshot of the merchant code used for a payment. Kept outside Payment so customer-facing Payment reads cannot expose merchant configuration.';

CREATE TABLE IF NOT EXISTS public."PaymentSmsProviderConfig" (
  provider text PRIMARY KEY CHECK (provider IN ('SMS_MTN', 'SMS_ORANGE')),
  "merchantAccount" text NOT NULL,
  "merchantCode" text NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "updatedByUserId" text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "PaymentSmsProviderConfig_account_valid"
    CHECK (length(regexp_replace("merchantAccount", '[^0-9]', '', 'g')) BETWEEN 9 AND 15),
  CONSTRAINT "PaymentSmsProviderConfig_code_valid"
    CHECK ("merchantCode" ~ '^[A-Za-z0-9_-]{1,40}$')
);

ALTER TABLE public."PaymentSmsProviderConfig" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."PaymentSmsProviderConfig" FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public."PaymentSmsProviderConfig" TO service_role;

COMMENT ON TABLE public."PaymentSmsProviderConfig" IS
  'Central MTN/Orange checkout settings. Read and written only by the server service_role through administrator-checked APIs. Merchant code changes apply to new payments; each pending payment retains its own code snapshot.';
