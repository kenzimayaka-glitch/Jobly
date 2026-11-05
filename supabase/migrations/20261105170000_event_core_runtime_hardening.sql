-- Event Core P1 hardening: relational integrity, atomic payment completion,
-- and race-safe reservation for the six featured slots.
ALTER TABLE public."EventFeaturedCampaign"
  ALTER COLUMN "paymentId" DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Event_creatorUserId_fkey') THEN
    ALTER TABLE public."Event" ADD CONSTRAINT "Event_creatorUserId_fkey"
      FOREIGN KEY ("creatorUserId") REFERENCES public."User"(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventPayment_eventId_fkey') THEN
    ALTER TABLE public."EventPayment" ADD CONSTRAINT "EventPayment_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES public."Event"(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventPayment_paymentId_fkey') THEN
    ALTER TABLE public."EventPayment" ADD CONSTRAINT "EventPayment_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES public."Payment"(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventFeaturedCampaign_eventId_fkey') THEN
    ALTER TABLE public."EventFeaturedCampaign" ADD CONSTRAINT "EventFeaturedCampaign_eventId_fkey"
      FOREIGN KEY ("eventId") REFERENCES public."Event"(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventFeaturedCampaign_paymentId_fkey') THEN
    ALTER TABLE public."EventFeaturedCampaign" ADD CONSTRAINT "EventFeaturedCampaign_paymentId_fkey"
      FOREIGN KEY ("paymentId") REFERENCES public."Payment"(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EventEntitlement_organizerUserId_fkey') THEN
    ALTER TABLE public."EventEntitlement" ADD CONSTRAINT "EventEntitlement_organizerUserId_fkey"
      FOREIGN KEY ("organizerUserId") REFERENCES public."User"(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_event_featured_campaign(
  p_campaign_id text,
  p_event_id text,
  p_payment_id text,
  p_price integer,
  p_duration_days integer,
  p_free boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_slot integer;
  v_start timestamp without time zone := timezone('UTC', now());
  v_end timestamp without time zone;
  v_price integer;
  v_status text;
BEGIN
  IF p_duration_days < 1 OR p_duration_days > 7 THEN
    RAISE EXCEPTION 'FEATURED_DURATION_INVALID';
  END IF;
  IF p_free AND p_payment_id IS NOT NULL THEN
    RAISE EXCEPTION 'FREE_FEATURED_PAYMENT_NOT_ALLOWED';
  END IF;
  IF NOT p_free AND p_payment_id IS NULL THEN
    RAISE EXCEPTION 'FEATURED_PAYMENT_REQUIRED';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('jobly_event_featured_campaign_slots'));
  UPDATE public."EventFeaturedCampaign"
     SET status = 'PAYMENT_EXPIRED', "updatedAt" = v_start
   WHERE status = 'PENDING_PAYMENT'
     AND "createdAt" < v_start - interval '30 minutes';

  IF NOT EXISTS (SELECT 1 FROM public."Event" e WHERE e.id = p_event_id AND e.status = 'PUBLISHED') THEN
    RAISE EXCEPTION 'EVENT_NOT_PUBLISHED';
  END IF;

  v_end := v_start + make_interval(days => p_duration_days);
  v_price := CASE WHEN p_free THEN 0 ELSE p_price END;
  v_status := CASE WHEN p_free THEN 'ACTIVE' ELSE 'PENDING_PAYMENT' END;

  SELECT slot
    INTO v_slot
    FROM generate_series(1, 6) AS slots(slot)
   WHERE NOT EXISTS (
     SELECT 1
       FROM public."EventFeaturedCampaign" c
      WHERE c.slot = slots.slot
        AND c.status IN ('PENDING_PAYMENT', 'ACTIVE')
        AND c."startAt" < v_end
        AND c."endAt" > v_start
   )
   ORDER BY slot
   LIMIT 1;

  IF v_slot IS NULL THEN
    RAISE EXCEPTION 'FEATURED_FULL';
  END IF;

  INSERT INTO public."EventFeaturedCampaign"
    (id, "eventId", slot, "startAt", "endAt", price, "paymentId", status, "createdAt", "updatedAt")
  VALUES
    (p_campaign_id, p_event_id, v_slot, v_start, v_end, v_price, p_payment_id, v_status, v_start, v_start);

  RETURN jsonb_build_object(
    'id', p_campaign_id,
    'eventId', p_event_id,
    'slot', v_slot,
    'startAt', v_start,
    'endAt', v_end,
    'price', v_price,
    'paymentId', p_payment_id,
    'status', v_status
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_event_publication(
  p_event_id text,
  p_payment_id text,
  p_expected_amount integer,
  p_expected_currency text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_payment public."Payment"%ROWTYPE;
  v_event_payment public."EventPayment"%ROWTYPE;
BEGIN
  SELECT * INTO v_payment
    FROM public."Payment"
   WHERE id = p_payment_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;

  SELECT * INTO v_event_payment
    FROM public."EventPayment"
   WHERE "eventId" = p_event_id
     AND "paymentId" = p_payment_id
     AND purpose = 'PUBLICATION'
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EVENT_PAYMENT_NOT_FOUND'; END IF;

  IF v_payment.feature IS DISTINCT FROM 'EVENT_PUBLICATION' THEN
    RAISE EXCEPTION 'PAYMENT_FEATURE_MISMATCH';
  END IF;
  IF v_payment.amount <> p_expected_amount OR v_event_payment.amount <> p_expected_amount THEN
    RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH';
  END IF;
  IF upper(v_payment.currency) <> upper(p_expected_currency) THEN
    RAISE EXCEPTION 'PAYMENT_CURRENCY_MISMATCH';
  END IF;
  IF v_payment.status NOT IN ('CREATED', 'PENDING', 'PAID') THEN
    RAISE EXCEPTION 'PAYMENT_STATE_INVALID';
  END IF;

  UPDATE public."Payment"
     SET status = 'PAID', "paidAt" = COALESCE("paidAt", now()), "updatedAt" = now()
   WHERE id = p_payment_id;
  UPDATE public."EventPayment"
     SET status = 'PAID', "updatedAt" = now()
   WHERE id = v_event_payment.id;
  UPDATE public."Event"
     SET status = 'PUBLISHED', "updatedAt" = now()
   WHERE id = p_event_id AND status <> 'PUBLISHED';

  IF NOT FOUND AND NOT EXISTS (
    SELECT 1 FROM public."Event" WHERE id = p_event_id AND status = 'PUBLISHED'
  ) THEN
    RAISE EXCEPTION 'EVENT_NOT_FOUND';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_event_featured_payment(
  p_campaign_id text,
  p_payment_id text,
  p_expected_amount integer,
  p_expected_currency text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_payment public."Payment"%ROWTYPE;
  v_campaign public."EventFeaturedCampaign"%ROWTYPE;
BEGIN
  SELECT * INTO v_payment
    FROM public."Payment"
   WHERE id = p_payment_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;

  SELECT * INTO v_campaign
    FROM public."EventFeaturedCampaign"
   WHERE id = p_campaign_id AND "paymentId" = p_payment_id
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CAMPAIGN_NOT_FOUND'; END IF;

  IF v_payment.feature IS DISTINCT FROM 'EVENT_FEATURED' THEN
    RAISE EXCEPTION 'PAYMENT_FEATURE_MISMATCH';
  END IF;
  IF v_payment.amount <> p_expected_amount OR v_campaign.price <> p_expected_amount THEN
    RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH';
  END IF;
  IF upper(v_payment.currency) <> upper(p_expected_currency) THEN
    RAISE EXCEPTION 'PAYMENT_CURRENCY_MISMATCH';
  END IF;
  IF v_campaign.status NOT IN ('PENDING_PAYMENT', 'ACTIVE') THEN
    RAISE EXCEPTION 'CAMPAIGN_STATE_INVALID';
  END IF;

  UPDATE public."Payment"
     SET status = 'PAID', "paidAt" = COALESCE("paidAt", now()), "updatedAt" = now()
   WHERE id = p_payment_id;
  UPDATE public."EventFeaturedCampaign"
     SET status = 'ACTIVE', "updatedAt" = now()
   WHERE id = p_campaign_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.create_event_featured_campaign(text,text,text,integer,integer,boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_event_publication(text,text,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_event_featured_payment(text,text,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_event_featured_campaign(text,text,text,integer,integer,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_event_publication(text,text,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_event_featured_payment(text,text,integer,text) TO service_role;
