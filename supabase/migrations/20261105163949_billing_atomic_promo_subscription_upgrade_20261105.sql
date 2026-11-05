-- Billing lifecycle production rollout (applied 2026-11-05 via Supabase migration API).
-- Source counterparts remain in packages/database/prisma/migrations.
-- This file mirrors the exact SQL recorded as Supabase migration
-- 20261105163949_billing_atomic_promo_subscription_upgrade_20261105.

CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_promo_code_id uuid,
  p_user_id text,
  p_product_type text,
  p_now timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_promo public."PromoCode"%ROWTYPE;
  v_existing public."PromoRedemption"%ROWTYPE;
  v_redemption public."PromoRedemption"%ROWTYPE;
  v_ends_at timestamptz;
BEGIN
  IF p_product_type NOT IN ('TALENT', 'RECRUITER') THEN
    RAISE EXCEPTION 'INVALID_PRODUCT_TYPE';
  END IF;

  SELECT *
    INTO v_promo
    FROM public."PromoCode"
   WHERE id = p_promo_code_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROMO_NOT_FOUND';
  END IF;

  IF NOT v_promo.active OR v_promo.validfrom > p_now
     OR (v_promo.expiresat IS NOT NULL AND v_promo.expiresat <= p_now) THEN
    RAISE EXCEPTION 'PROMO_NOT_ACTIVE';
  END IF;

  IF v_promo.scope NOT IN (p_product_type, 'BOTH') THEN
    RAISE EXCEPTION 'PROMO_SCOPE_MISMATCH';
  END IF;

  IF v_promo.redemptionscount >= v_promo.maxredemptions THEN
    RAISE EXCEPTION 'PROMO_LIMIT_REACHED';
  END IF;

  SELECT *
    INTO v_existing
    FROM public."PromoRedemption"
   WHERE promocodeid = p_promo_code_id
     AND userid = p_user_id
     AND producttype = p_product_type
   LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'PROMO_ALREADY_REDEEMED';
  END IF;

  v_ends_at := p_now + make_interval(days => v_promo.durationdays);
  IF v_promo.expiresat IS NOT NULL THEN
    v_ends_at := LEAST(v_ends_at, v_promo.expiresat);
  END IF;
  IF v_ends_at <= p_now THEN
    RAISE EXCEPTION 'PROMO_EXPIRED_AT_CREATION';
  END IF;

  UPDATE public."PromoCode"
     SET redemptionscount = redemptionscount + 1,
         updatedat = p_now
   WHERE id = p_promo_code_id;

  INSERT INTO public."PromoRedemption" (
    promocodeid, userid, producttype, grantedplan, startsat, endsat
  )
  VALUES (
    p_promo_code_id, p_user_id, p_product_type, 'PRO', p_now, v_ends_at
  )
  RETURNING * INTO v_redemption;

  RETURN jsonb_build_object(
    'id', v_redemption.id,
    'productType', v_redemption.producttype,
    'grantedPlan', v_redemption.grantedplan,
    'startsAt', v_redemption.startsat,
    'endsAt', v_redemption.endsat
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'PROMO_ALREADY_REDEEMED';
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_promo_code(uuid, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.redeem_promo_code(uuid, text, text, timestamptz) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_promo_code(uuid, text, text, timestamptz) TO service_role;


-- Subscription upgrade lifecycle.
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

