-- Manual Event payment review without a payment-provider API.
CREATE TABLE IF NOT EXISTS public."EventManualPaymentSubmission" (
  "id" text PRIMARY KEY,
  "paymentId" text NOT NULL UNIQUE REFERENCES public."Payment"(id) ON DELETE CASCADE,
  "eventId" text NOT NULL REFERENCES public."Event"(id) ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "paymentMethod" text NOT NULL CHECK ("paymentMethod" IN ('MTN_MOMO','ORANGE_MONEY','BANK_TRANSFER','OTHER')),
  "transactionReference" text NOT NULL,
  "proofPath" text NOT NULL,
  "notes" text,
  "status" text NOT NULL DEFAULT 'SUBMITTED' CHECK ("status" IN ('SUBMITTED','APPROVED','REJECTED')),
  "reviewedByUserId" text REFERENCES public."User"(id) ON DELETE SET NULL,
  "reviewedAt" timestamptz,
  "reviewNote" text,
  "submittedAt" timestamptz NOT NULL DEFAULT now(),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "EventManualPaymentSubmission_status_created_idx"
  ON public."EventManualPaymentSubmission"("status","createdAt" DESC);
CREATE INDEX IF NOT EXISTS "EventManualPaymentSubmission_user_created_idx"
  ON public."EventManualPaymentSubmission"("userId","createdAt" DESC);
ALTER TABLE public."EventManualPaymentSubmission" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."EventManualPaymentSubmission" FROM anon, authenticated;
GRANT ALL ON public."EventManualPaymentSubmission" TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_event_manual_payment(
  p_submission_id text,
  p_admin_user_id text,
  p_approved boolean,
  p_review_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  v_submission public."EventManualPaymentSubmission"%ROWTYPE;
  v_payment public."Payment"%ROWTYPE;
  v_event_payment public."EventPayment"%ROWTYPE;
  v_campaign public."EventFeaturedCampaign"%ROWTYPE;
  v_has_event_payment boolean := false;
  v_has_campaign boolean := false;
  v_now timestamptz := now();
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public."User" u
    WHERE u.id = p_admin_user_id AND u.role::text IN ('ADMIN','FINANCE')
  ) THEN RAISE EXCEPTION 'MANUAL_PAYMENT_REVIEW_FORBIDDEN'; END IF;

  SELECT * INTO v_submission FROM public."EventManualPaymentSubmission"
  WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'MANUAL_PAYMENT_SUBMISSION_NOT_FOUND'; END IF;
  IF v_submission.status <> 'SUBMITTED' THEN RAISE EXCEPTION 'MANUAL_PAYMENT_ALREADY_REVIEWED'; END IF;

  SELECT * INTO v_payment FROM public."Payment"
  WHERE id = v_submission."paymentId" FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'PAYMENT_NOT_FOUND'; END IF;
  IF v_payment.provider <> 'MANUAL' THEN RAISE EXCEPTION 'PAYMENT_PROVIDER_NOT_MANUAL'; END IF;
  IF v_payment.status NOT IN ('CREATED','PENDING') THEN RAISE EXCEPTION 'PAYMENT_STATE_INVALID'; END IF;

  SELECT * INTO v_event_payment FROM public."EventPayment"
  WHERE "paymentId" = v_payment.id FOR UPDATE;
  v_has_event_payment := FOUND;
  SELECT * INTO v_campaign FROM public."EventFeaturedCampaign"
  WHERE "paymentId" = v_payment.id FOR UPDATE;
  v_has_campaign := FOUND;
  IF v_has_event_payment = v_has_campaign THEN RAISE EXCEPTION 'MANUAL_PAYMENT_TARGET_INVALID'; END IF;

  IF p_approved THEN
    UPDATE public."Payment" SET status='SUCCESSFUL', "paidAt"=v_now, "failureReason"=NULL, "updatedAt"=v_now
    WHERE id=v_payment.id;
    IF v_has_event_payment THEN
      IF v_event_payment.amount <> v_payment.amount THEN RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH'; END IF;
      UPDATE public."EventPayment" SET status='SUCCESSFUL', "updatedAt"=v_now WHERE id=v_event_payment.id;
      UPDATE public."Event" SET status='PUBLISHED', "updatedAt"=v_now WHERE id=v_event_payment."eventId";
    ELSE
      IF v_campaign.price <> v_payment.amount THEN RAISE EXCEPTION 'PAYMENT_AMOUNT_MISMATCH'; END IF;
      IF v_campaign.status <> 'PENDING_PAYMENT' THEN RAISE EXCEPTION 'FEATURED_CAMPAIGN_STATE_INVALID'; END IF;
      UPDATE public."EventFeaturedCampaign" SET status='ACTIVE', "updatedAt"=v_now WHERE id=v_campaign.id;
    END IF;
    UPDATE public."EventManualPaymentSubmission"
      SET status='APPROVED', "reviewedByUserId"=p_admin_user_id, "reviewedAt"=v_now,
          "reviewNote"=NULLIF(left(trim(COALESCE(p_review_note,'')),1000),''), "updatedAt"=v_now
      WHERE id=p_submission_id;
  ELSE
    UPDATE public."Payment"
      SET status='FAILED', "failureReason"=COALESCE(NULLIF(left(trim(COALESCE(p_review_note,'')),240),''),'MANUAL_PAYMENT_REJECTED'),
          "updatedAt"=v_now
      WHERE id=v_payment.id;
    IF v_has_event_payment THEN
      UPDATE public."EventPayment" SET status='FAILED', "updatedAt"=v_now WHERE id=v_event_payment.id;
      UPDATE public."Event" SET status='DRAFT', "updatedAt"=v_now WHERE id=v_event_payment."eventId" AND status <> 'PUBLISHED';
    ELSE
      UPDATE public."EventFeaturedCampaign" SET status='PAYMENT_FAILED', "updatedAt"=v_now WHERE id=v_campaign.id;
    END IF;
    UPDATE public."EventManualPaymentSubmission"
      SET status='REJECTED', "reviewedByUserId"=p_admin_user_id, "reviewedAt"=v_now,
          "reviewNote"=NULLIF(left(trim(COALESCE(p_review_note,'')),1000),''), "updatedAt"=v_now
      WHERE id=p_submission_id;
  END IF;
  RETURN jsonb_build_object('submissionId',p_submission_id,'paymentId',v_payment.id,
    'status',CASE WHEN p_approved THEN 'APPROVED' ELSE 'REJECTED' END,
    'target',CASE WHEN v_has_event_payment THEN 'PUBLICATION' ELSE 'FEATURED' END);
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_event_manual_payment(text,text,boolean,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_event_manual_payment(text,text,boolean,text) TO service_role;
