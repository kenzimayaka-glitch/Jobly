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
