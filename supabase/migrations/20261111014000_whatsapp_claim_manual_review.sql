CREATE OR REPLACE FUNCTION public.review_whatsapp_recruiter_offer_claim(
  p_claim_id uuid,
  p_admin_user_id text,
  p_approved boolean,
  p_review_note text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claim public."RecruiterOfferClaim"%ROWTYPE;
  v_share public."CVShare"%ROWTYPE;
  v_admin_role text;
  v_admin_active boolean;
  v_result jsonb;
  v_now timestamptz := now();
  v_phone text;
BEGIN
  SELECT role INTO v_admin_role FROM public."User" WHERE id = p_admin_user_id;
  IF v_admin_role <> 'ADMIN' THEN
    RAISE EXCEPTION 'WHATSAPP_CLAIM_REVIEW_FORBIDDEN';
  END IF;
  SELECT active INTO v_admin_active FROM public."AdminIdentity"
   WHERE "ownerUserId" = p_admin_user_id AND active = true LIMIT 1;
  IF COALESCE(v_admin_active,false) IS NOT TRUE THEN
    RAISE EXCEPTION 'WHATSAPP_CLAIM_ADMIN_IDENTITY_INACTIVE';
  END IF;

  SELECT * INTO v_claim FROM public."RecruiterOfferClaim" WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WHATSAPP_CLAIM_NOT_FOUND'; END IF;
  IF v_claim.status <> 'PENDING' THEN RAISE EXCEPTION 'WHATSAPP_CLAIM_ALREADY_REVIEWED'; END IF;
  IF NOT p_approved THEN
    IF length(trim(COALESCE(p_review_note,''))) < 4 THEN RAISE EXCEPTION 'WHATSAPP_CLAIM_REJECTION_NOTE_REQUIRED'; END IF;
    UPDATE public."RecruiterOfferClaim"
      SET status='REJECTED', "reviewedAt"=v_now, "reviewedByUserId"=p_admin_user_id, "reviewNote"=left(trim(p_review_note),1000)
      WHERE id=p_claim_id;
    RETURN jsonb_build_object('status','REJECTED');
  END IF;

  SELECT * INTO v_share FROM public."CVShare" WHERE id=v_claim."sourceShareId";
  IF NOT FOUND OR v_share."revokedAt" IS NOT NULL OR (v_share."expiresAt" IS NOT NULL AND v_share."expiresAt"<=v_now) THEN
    RAISE EXCEPTION 'WHATSAPP_CLAIM_SHARE_INVALID';
  END IF;
  v_phone := COALESCE(NULLIF(v_claim."offerPhone",''),NULLIF(v_claim."registeredPhone",''));
  IF length(regexp_replace(COALESCE(v_phone,''),'[^0-9]','','g')) < 8 THEN
    RAISE EXCEPTION 'WHATSAPP_CLAIM_PHONE_REQUIRES_MANUAL_CAPTURE';
  END IF;

  -- The admin decision is the explicit override after manual ownership verification.
  -- The original two phone values are retained in RecruiterOfferClaim and the conversion audit.
  v_result := public.claim_whatsapp_recruiter_offer(
    v_claim."sourceShareId",v_claim."applicationId",v_claim."recruiterUserId",
    v_phone,v_phone,COALESCE(v_share."companyNameSnapshot",'Mon entreprise')
  );
  IF v_result->>'status' <> 'CLAIMED' THEN
    RAISE EXCEPTION 'WHATSAPP_CLAIM_ATTACH_FAILED:%',COALESCE(v_result->>'status','UNKNOWN');
  END IF;

  UPDATE public."RecruiterJob"
    SET "sourceProvenance" = COALESCE("sourceProvenance",'{}'::jsonb) ||
      jsonb_build_object('manualPhoneReview',jsonb_build_object(
        'approved',true,'reviewedByUserId',p_admin_user_id,'reviewedAt',v_now,
        'registeredPhone',v_claim."registeredPhone",'offerPhone',v_claim."offerPhone",
        'reviewNote',left(trim(COALESCE(p_review_note,'')),1000)
      )),
      "updatedAt"=v_now
    WHERE "sourceShareId"=v_claim."sourceShareId";

  UPDATE public."RecruiterOfferClaim"
    SET status='APPROVED',"reviewedAt"=v_now,"reviewedByUserId"=p_admin_user_id,"reviewNote"=left(trim(COALESCE(p_review_note,'')),1000)
    WHERE id=p_claim_id;
  RETURN jsonb_build_object('status','APPROVED','recruiterJobId',v_result->>'recruiterJobId','applicationId',v_result->>'applicationId');
END;
$$;
REVOKE ALL ON FUNCTION public.review_whatsapp_recruiter_offer_claim(uuid,text,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.review_whatsapp_recruiter_offer_claim(uuid,text,boolean,text) TO service_role;
