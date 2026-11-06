-- Jobly Mobile Money SMS confirmation foundation.
-- Private tables only; no merchant/device is enabled by default.
-- Raw SMS bodies are intentionally not retained.
-- No production rollout is performed by this source migration.

CREATE TABLE public."PaymentSmsDevice" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "deviceId" text NOT NULL UNIQUE,
  "tokenHash" varchar(64) NOT NULL CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  "isActive" boolean NOT NULL DEFAULT false,
  "lastSeenAt" timestamptz,
  "revokedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public."PaymentSmsMerchantAccount" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "deviceId" uuid NOT NULL REFERENCES public."PaymentSmsDevice"(id) ON DELETE RESTRICT,
  provider text NOT NULL CHECK (provider IN ('SMS_MTN', 'SMS_ORANGE')),
  "merchantAccount" text NOT NULL,
  "shortCode" text NOT NULL,
  "ussdCode" text NOT NULL,
  "senderAllowlist" text[] NOT NULL DEFAULT '{}',
  "isActive" boolean NOT NULL DEFAULT false,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "PaymentSmsMerchantAccount_provider_merchantAccount_key"
    UNIQUE (provider, "merchantAccount"),
  CONSTRAINT "PaymentSmsMerchantAccount_values_nonempty_check"
    CHECK (
      length(btrim("merchantAccount")) > 0
      AND length(btrim("shortCode")) > 0
      AND length(btrim("ussdCode")) > 0
    ),
  CONSTRAINT "PaymentSmsMerchantAccount_active_sender_check"
    CHECK (
      NOT "isActive"
      OR (
        cardinality("senderAllowlist") > 0
        AND array_position("senderAllowlist", '') IS NULL
      )
    )
);

CREATE TABLE public."PaymentSmsIntent" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "paymentId" text NOT NULL UNIQUE REFERENCES public."Payment"(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('SMS_MTN', 'SMS_ORANGE')),
  "merchantAccountId" uuid NOT NULL REFERENCES public."PaymentSmsMerchantAccount"(id) ON DELETE RESTRICT,
  "payerPhone" text NOT NULL,
  "internalReference" text NOT NULL UNIQUE,
  "declaredTransactionId" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public."PaymentSmsReceipt" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "deviceId" uuid NOT NULL REFERENCES public."PaymentSmsDevice"(id) ON DELETE RESTRICT,
  "merchantAccountId" uuid REFERENCES public."PaymentSmsMerchantAccount"(id) ON DELETE RESTRICT,
  "paymentId" text UNIQUE REFERENCES public."Payment"(id) ON DELETE SET NULL,
  provider text CHECK (provider IS NULL OR provider IN ('SMS_MTN', 'SMS_ORANGE')),
  "senderId" text NOT NULL,
  "senderTrusted" boolean NOT NULL DEFAULT false,
  "transactionId" text,
  "payerPhone" text,
  "parsedMerchantAccount" text,
  amount integer CHECK (amount IS NULL OR amount > 0),
  currency text,
  "messageStatus" text NOT NULL DEFAULT 'UNKNOWN'
    CHECK ("messageStatus" IN ('SUCCESSFUL', 'FAILED', 'PENDING', 'UNKNOWN')),
  "processingStatus" text NOT NULL DEFAULT 'RECEIVED'
    CHECK ("processingStatus" IN ('RECEIVED', 'UNMATCHED', 'MATCHED', 'REJECTED', 'ERROR')),
  "parserVersion" text,
  "payloadHash" varchar(64) NOT NULL UNIQUE CHECK ("payloadHash" ~ '^[0-9a-f]{64}$'),
  "occurredAt" timestamptz,
  "receivedAt" timestamptz NOT NULL DEFAULT now(),
  "matchedAt" timestamptz,
  "anomalyCodes" text[] NOT NULL DEFAULT '{}',
  CONSTRAINT "PaymentSmsReceipt_provider_transactionId_key"
    UNIQUE (provider, "transactionId")
);

CREATE INDEX "PaymentSmsMerchantAccount_deviceId_isActive_idx"
  ON public."PaymentSmsMerchantAccount" ("deviceId", "isActive");
CREATE INDEX "PaymentSmsIntent_provider_payerPhone_createdAt_idx"
  ON public."PaymentSmsIntent" (provider, "payerPhone", "createdAt");
CREATE INDEX "PaymentSmsIntent_merchantAccountId_createdAt_idx"
  ON public."PaymentSmsIntent" ("merchantAccountId", "createdAt");
CREATE INDEX "PaymentSmsReceipt_deviceId_receivedAt_idx"
  ON public."PaymentSmsReceipt" ("deviceId", "receivedAt");
CREATE INDEX "PaymentSmsReceipt_processingStatus_receivedAt_idx"
  ON public."PaymentSmsReceipt" ("processingStatus", "receivedAt");

ALTER TABLE public."PaymentSmsDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentSmsMerchantAccount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentSmsIntent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentSmsReceipt" ENABLE ROW LEVEL SECURITY;

CREATE POLICY payment_sms_device_deny_clients
  ON public."PaymentSmsDevice" FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY payment_sms_merchant_deny_clients
  ON public."PaymentSmsMerchantAccount" FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY payment_sms_intent_deny_clients
  ON public."PaymentSmsIntent" FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
CREATE POLICY payment_sms_receipt_deny_clients
  ON public."PaymentSmsReceipt" FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

REVOKE ALL ON TABLE
  public."PaymentSmsDevice",
  public."PaymentSmsMerchantAccount",
  public."PaymentSmsIntent",
  public."PaymentSmsReceipt"
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."PaymentSmsDevice",
  public."PaymentSmsMerchantAccount",
  public."PaymentSmsIntent",
  public."PaymentSmsReceipt"
TO service_role;

-- Atomic, deterministic, service-only matcher. J'IA never decides whether a
-- payment is real; it can only explain flags to the customer/admin.
CREATE OR REPLACE FUNCTION public.match_payment_sms_receipt(p_receipt_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_receipt public."PaymentSmsReceipt"%ROWTYPE;
  v_account public."PaymentSmsMerchantAccount"%ROWTYPE;
  v_candidate_count integer := 0;
  v_payment_id text;
  v_payment public."Payment"%ROWTYPE;
  v_finalize jsonb;
  v_reference_time timestamptz;
  v_now timestamptz := clock_timestamp();
BEGIN
  SELECT *
    INTO v_receipt
    FROM public."PaymentSmsReceipt"
   WHERE id = p_receipt_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_SMS_RECEIPT_NOT_FOUND';
  END IF;

  IF v_receipt."processingStatus" = 'MATCHED' THEN
    RETURN jsonb_build_object(
      'matched', true,
      'paymentId', v_receipt."paymentId",
      'idempotent', true
    );
  END IF;

  IF v_receipt."processingStatus" = 'REJECTED' THEN
    RETURN jsonb_build_object(
      'matched', false,
      'decision', 'REJECTED',
      'idempotent', true
    );
  END IF;

  IF NOT v_receipt."senderTrusted"
     OR v_receipt.provider IS NULL
     OR v_receipt."messageStatus" <> 'SUCCESSFUL'
     OR v_receipt."transactionId" IS NULL
     OR v_receipt.amount IS NULL
     OR v_receipt.currency <> 'XAF'
     OR v_receipt."payerPhone" IS NULL
     OR v_receipt."merchantAccountId" IS NULL THEN
    UPDATE public."PaymentSmsReceipt"
       SET "processingStatus" = 'REJECTED',
           "anomalyCodes" = array_append(
             coalesce("anomalyCodes", '{}'::text[]),
             'RECEIPT_NOT_ELIGIBLE_FOR_AUTOMATIC_MATCH'
           )
     WHERE id = p_receipt_id;
    RETURN jsonb_build_object('matched', false, 'decision', 'REJECTED');
  END IF;

  SELECT ma.*
    INTO v_account
    FROM public."PaymentSmsMerchantAccount" ma
    JOIN public."PaymentSmsDevice" d ON d.id = ma."deviceId"
   WHERE ma.id = v_receipt."merchantAccountId"
     AND ma."deviceId" = v_receipt."deviceId"
     AND ma.provider = v_receipt.provider
     AND ma."isActive" = true
     AND d."isActive" = true
     AND d."revokedAt" IS NULL
     AND EXISTS (
       SELECT 1
         FROM unnest(ma."senderAllowlist") AS allowed(sender_id)
        WHERE upper(btrim(allowed.sender_id)) = upper(btrim(v_receipt."senderId"))
     )
     AND (
       v_receipt."parsedMerchantAccount" IS NULL
       OR regexp_replace(v_receipt."parsedMerchantAccount", '[^0-9]', '', 'g')
          = regexp_replace(ma."merchantAccount", '[^0-9]', '', 'g')
     );

  IF NOT FOUND THEN
    UPDATE public."PaymentSmsReceipt"
       SET "processingStatus" = 'REJECTED',
           "anomalyCodes" = array_append(
             coalesce("anomalyCodes", '{}'::text[]),
             'DEVICE_ACCOUNT_OR_SENDER_NOT_AUTHORIZED'
           )
     WHERE id = p_receipt_id;
    RETURN jsonb_build_object('matched', false, 'decision', 'REJECTED');
  END IF;

  v_reference_time := coalesce(v_receipt."occurredAt", v_receipt."receivedAt");

  SELECT count(*), min(p.id)
    INTO v_candidate_count, v_payment_id
    FROM public."PaymentSmsIntent" i
    JOIN public."Payment" p ON p.id = i."paymentId"
    JOIN public."Subscription" s ON s.id = p."subscriptionId"
   WHERE i.provider = v_receipt.provider
     AND i."merchantAccountId" = v_receipt."merchantAccountId"
     AND regexp_replace(i."payerPhone", '[^0-9]', '', 'g')
         = regexp_replace(v_receipt."payerPhone", '[^0-9]', '', 'g')
     AND p.provider = v_receipt.provider
     AND p.amount = v_receipt.amount
     AND p.currency = v_receipt.currency
     AND p.status IN ('CREATED', 'PENDING')
     AND p."subscriptionId" IS NOT NULL
     AND s.status = 'PENDING'
     AND p."createdAt" BETWEEN v_reference_time - interval '6 hours'
                           AND v_reference_time + interval '5 minutes'
     AND (
       i."declaredTransactionId" IS NULL
       OR upper(i."declaredTransactionId") = upper(v_receipt."transactionId")
     );

  IF v_candidate_count <> 1 THEN
    UPDATE public."PaymentSmsReceipt"
       SET "processingStatus" = 'UNMATCHED',
           "anomalyCodes" = array_append(
             coalesce("anomalyCodes", '{}'::text[]),
             CASE WHEN v_candidate_count = 0
               THEN 'NO_UNIQUE_PAYMENT_ORDER'
               ELSE 'MULTIPLE_PAYMENT_ORDERS_MATCH'
             END
           )
     WHERE id = p_receipt_id;
    RETURN jsonb_build_object(
      'matched', false,
      'decision', CASE WHEN v_candidate_count = 0 THEN 'NO_MATCH' ELSE 'AMBIGUOUS' END
    );
  END IF;

  -- Serialize competing receipts for the same order. A second, different SMS
  -- cannot activate a payment already finalized by the first receipt.
  SELECT *
    INTO v_payment
    FROM public."Payment"
   WHERE id = v_payment_id
   FOR UPDATE;

  IF NOT FOUND OR v_payment.status NOT IN ('CREATED', 'PENDING') THEN
    UPDATE public."PaymentSmsReceipt"
       SET "processingStatus" = 'UNMATCHED',
           "anomalyCodes" = array_append(
             coalesce("anomalyCodes", '{}'::text[]),
             'PAYMENT_ALREADY_SETTLED'
           )
     WHERE id = p_receipt_id;
    RETURN jsonb_build_object('matched', false, 'decision', 'PAYMENT_ALREADY_SETTLED');
  END IF;

  v_finalize := public.finalize_payment(
    v_payment_id,
    v_payment."userId",
    'SUCCESSFUL',
    v_receipt.amount,
    v_now,
    NULL
  );

  UPDATE public."PaymentSmsReceipt"
     SET "paymentId" = v_payment_id,
         "processingStatus" = 'MATCHED',
         "matchedAt" = v_now
   WHERE id = p_receipt_id;

  RETURN jsonb_build_object(
    'matched', true,
    'paymentId', v_payment_id,
    'finalization', v_finalize,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.match_payment_sms_receipt(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_payment_sms_receipt(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_payment_sms_receipt(uuid) TO service_role;

COMMENT ON TABLE public."PaymentSmsDevice" IS
  'Private authorized Jobly Android merchant handsets; device tokens are stored as SHA-256 hashes.';
COMMENT ON TABLE public."PaymentSmsReceipt" IS
  'Private normalized Mobile Money SMS receipts; raw SMS bodies are intentionally not retained.';
COMMENT ON FUNCTION public.match_payment_sms_receipt(uuid) IS
  'Service-only deterministic SMS payment matcher; finalizes a unique matching pending subscription payment.';
