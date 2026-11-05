-- Allow one current subscription and one checkout in progress per user/profile.
-- This preserves the paid plan during an upgrade until the new payment is confirmed.
DROP INDEX IF EXISTS public."Subscription_userId_productType_active_pending_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_userId_productType_active_key"
  ON public."Subscription" ("userId", "productType")
  WHERE status = 'ACTIVE';

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_userId_productType_pending_key"
  ON public."Subscription" ("userId", "productType")
  WHERE status = 'PENDING';

CREATE OR REPLACE FUNCTION public.finalize_payment(
  p_payment_id text,
  p_user_id text,
  p_status text,
  p_amount integer,
  p_now timestamp with time zone,
  p_failure_reason text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public
AS $function$
DECLARE
  v_payment public."Payment"%ROWTYPE;
  v_sub public."Subscription"%ROWTYPE;
  v_partner_id uuid;
  v_commission public."Commission"%ROWTYPE;
  v_commission_amount integer := 0;
BEGIN
  SELECT *
    INTO v_payment
    FROM public."Payment"
   WHERE id = p_payment_id
     AND "userId" = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND';
  END IF;
  IF v_payment.amount <> p_amount THEN
    RAISE EXCEPTION 'AMOUNT_MISMATCH';
  END IF;
  IF p_status NOT IN ('PENDING', 'SUCCESSFUL', 'FAILED') THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_STATUS';
  END IF;
  IF v_payment.status = p_status THEN
    RETURN jsonb_build_object(
      'payment', to_jsonb(v_payment),
      'commission', 'null'::jsonb,
      'idempotent', true
    );
  END IF;

  -- CREATED -> SUCCESSFUL is allowed for a provider confirmation recovered
  -- after the provider intent succeeded but the first DB status update failed.
  IF NOT (
    (v_payment.status = 'CREATED' AND p_status IN ('PENDING', 'SUCCESSFUL', 'FAILED'))
    OR (v_payment.status = 'PENDING' AND p_status IN ('SUCCESSFUL', 'FAILED'))
  ) THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_TRANSITION';
  END IF;

  IF v_payment.subscriptionId IS NOT NULL AND p_status = 'SUCCESSFUL' THEN
    SELECT *
      INTO v_sub
      FROM public."Subscription"
     WHERE id = v_payment.subscriptionId
       AND "userId" = p_user_id::uuid
     FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SUBSCRIPTION_NOT_FOUND';
    END IF;
    IF v_sub.status <> 'PENDING' THEN
      RAISE EXCEPTION 'SUBSCRIPTION_NOT_PENDING';
    END IF;
  END IF;

  UPDATE public."Payment"
     SET status = p_status,
         "updatedAt" = p_now,
         "paidAt" = CASE WHEN p_status = 'SUCCESSFUL' THEN p_now ELSE "paidAt" END,
         "failureReason" = CASE
           WHEN p_status = 'FAILED' THEN coalesce(p_failure_reason, 'Provider returned FAILED')
           ELSE "failureReason"
         END
   WHERE id = p_payment_id;

  SELECT * INTO v_payment
    FROM public."Payment"
   WHERE id = p_payment_id;

  IF v_payment.subscriptionId IS NOT NULL AND p_status = 'SUCCESSFUL' THEN
    -- Retire the former plan only when the new purchase is confirmed.
    UPDATE public."Subscription"
       SET status = 'EXPIRED',
           "updatedAt" = p_now
     WHERE "userId" = v_sub."userId"
       AND "productType" = v_sub."productType"
       AND id <> v_sub.id
       AND status IN ('ACTIVE', 'TRIAL');

    UPDATE public."Subscription"
       SET status = 'ACTIVE',
           "currentPeriodStart" = p_now,
           "currentPeriodEnd" = CASE
             WHEN upper(coalesce("billingInterval", '')) = 'ANNUAL'
               THEN p_now + interval '1 year'
             ELSE p_now + interval '1 month'
           END,
           "canceledAt" = NULL,
           "updatedAt" = p_now
     WHERE id = v_sub.id;

    IF upper(coalesce(v_sub."productType", '')) = 'RECRUITER' THEN
      IF upper(v_sub."planCode") = 'PREMIUM' THEN
        v_commission_amount := 5000;
      ELSIF upper(v_sub."planCode") = 'PRO' THEN
        v_commission_amount := 10000;
      END IF;

      IF v_commission_amount > 0 THEN
        SELECT pr."partnerId"
          INTO v_partner_id
          FROM public."PartnerReferral" pr
          JOIN public."Partner" pa ON pa.id = pr."partnerId"
         WHERE pr."referredUserId" = v_sub."userId"
           AND pr."accountType" = 'RECRUITER'
           AND pa."partnerType" = 'DISTRIBUTOR'
         LIMIT 1;

        IF v_partner_id IS NOT NULL THEN
          SELECT *
            INTO v_commission
            FROM public."Commission"
           WHERE "partnerId" = v_partner_id
             AND "referredUserId" = v_sub."userId"
             AND "sourceType" = 'ACQUISITION'
           LIMIT 1;

          IF NOT FOUND THEN
            INSERT INTO public."Commission"(
              "partnerId", event, amount, currency, status, "sourceType",
              "accountType", "planCode", "billingInterval", "subscriptionId", "referredUserId"
            )
            VALUES (
              v_partner_id,
              'DISTRIBUTOR_ACQUISITION_' || v_sub."planCode",
              v_commission_amount,
              'XAF',
              'GENERATED',
              'ACQUISITION',
              'RECRUITER',
              v_sub."planCode",
              v_sub."billingInterval",
              v_sub.id,
              v_sub."userId"
            )
            RETURNING * INTO v_commission;
          END IF;
        END IF;
      END IF;
    END IF;
  ELSIF v_payment.subscriptionId IS NOT NULL AND p_status = 'FAILED' THEN
    UPDATE public."Subscription"
       SET status = 'EXPIRED',
           "updatedAt" = p_now
     WHERE id = v_payment.subscriptionId
       AND "userId" = p_user_id::uuid
       AND status = 'PENDING';
  END IF;

  RETURN jsonb_build_object(
    'payment', to_jsonb(v_payment),
    'commission', CASE
      WHEN v_commission.id IS NOT NULL THEN to_jsonb(v_commission)
      ELSE 'null'::jsonb
    END,
    'idempotent', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.finalize_payment(text, text, text, integer, timestamptz, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.finalize_payment(text, text, text, integer, timestamptz, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_payment(text, text, text, integer, timestamptz, text) TO service_role;
