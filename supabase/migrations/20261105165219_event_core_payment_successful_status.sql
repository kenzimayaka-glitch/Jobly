-- Payment.status in JOBLY-PROD allows CREATED, PENDING, SUCCESSFUL, FAILED, REFUNDED.
-- This migration corrects Event Core finalizers to use SUCCESSFUL after provider confirmation.
CREATE OR REPLACE FUNCTION public.finalize_event_publication(
  p_event_id text,
  p_payment_id text,
  p_expected_amount integer,
  p_expected_currency text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_payment public."Payment"%ROWTYPE;
  v_event_payment public."EventPayment"%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM public."Payment" WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;

  SELECT * INTO v_event_payment FROM public."EventPayment"
   WHERE "eventId" = p_event_id AND "paymentId" = p_payment_id AND purpose = 'PUBLICATION'
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'EVENT_PAYMENT_NOT_FOUND'; END IF;

  IF v_payment.feature IS DISTINCT FROM 'EVENT_PUBLICATION' THEN RAISE EXCEPTION 'PAYMENT_FEATURE_MISMATCH'; END IF;
  IF v_payment.amount <> p_expected_amount OR v_event_payment.amount <> p_expected_amount THEN RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH'; END IF;
  IF upper(v_payment.currency) <> upper(p_expected_currency) THEN RAISE EXCEPTION 'PAYMENT_CURRENCY_MISMATCH'; END IF;
  IF v_payment.status NOT IN ('CREATED', 'PENDING', 'SUCCESSFUL') THEN RAISE EXCEPTION 'PAYMENT_STATE_INVALID'; END IF;

  UPDATE public."Payment" SET status = 'SUCCESSFUL', "paidAt" = COALESCE("paidAt", now()), "updatedAt" = now()
   WHERE id = p_payment_id;
  UPDATE public."EventPayment" SET status = 'PAID', "updatedAt" = now() WHERE id = v_event_payment.id;
  UPDATE public."Event" SET status = 'PUBLISHED', "updatedAt" = now() WHERE id = p_event_id AND status <> 'PUBLISHED';
  IF NOT FOUND AND NOT EXISTS (SELECT 1 FROM public."Event" WHERE id = p_event_id AND status = 'PUBLISHED') THEN RAISE EXCEPTION 'EVENT_NOT_FOUND'; END IF;
  RETURN true;
END; $$;

CREATE OR REPLACE FUNCTION public.finalize_event_featured_payment(
  p_campaign_id text,
  p_payment_id text,
  p_expected_amount integer,
  p_expected_currency text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  v_payment public."Payment"%ROWTYPE;
  v_campaign public."EventFeaturedCampaign"%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM public."Payment" WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;

  SELECT * INTO v_campaign FROM public."EventFeaturedCampaign"
   WHERE id = p_campaign_id AND "paymentId" = p_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CAMPAIGN_NOT_FOUND'; END IF;

  IF v_payment.feature IS DISTINCT FROM 'EVENT_FEATURED' THEN RAISE EXCEPTION 'PAYMENT_FEATURE_MISMATCH'; END IF;
  IF v_payment.amount <> p_expected_amount OR v_campaign.price <> p_expected_amount THEN RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH'; END IF;
  IF upper(v_payment.currency) <> upper(p_expected_currency) THEN RAISE EXCEPTION 'PAYMENT_CURRENCY_MISMATCH'; END IF;
  IF v_campaign.status NOT IN ('PENDING_PAYMENT', 'ACTIVE') THEN RAISE EXCEPTION 'CAMPAIGN_STATE_INVALID'; END IF;

  UPDATE public."Payment" SET status = 'SUCCESSFUL', "paidAt" = COALESCE("paidAt", now()), "updatedAt" = now()
   WHERE id = p_payment_id;
  UPDATE public."EventFeaturedCampaign" SET status = 'ACTIVE', "updatedAt" = now() WHERE id = p_campaign_id;
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.finalize_event_publication(text,text,integer,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finalize_event_featured_payment(text,text,integer,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_event_publication(text,text,integer,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_event_featured_payment(text,text,integer,text) TO service_role;
