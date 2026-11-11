ALTER TABLE public."User" ADD COLUMN IF NOT EXISTS "signupPhone" text;
ALTER TABLE public."Application"
  ADD COLUMN IF NOT EXISTS "cvApprovedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "letterApprovedAt" timestamptz;
ALTER TABLE public."RecruiterJob"
  ADD COLUMN IF NOT EXISTS "applicationProfile" jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "applicationReady" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "sourceType" text NOT NULL DEFAULT 'JOBLY_CREATED',
  ADD COLUMN IF NOT EXISTS "sourceJobId" uuid NULL REFERENCES public."Job"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "sourceShareId" uuid NULL REFERENCES public."CVShare"(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "sourcePhoneSnapshot" text NULL,
  ADD COLUMN IF NOT EXISTS "sourceProvenance" jsonb NOT NULL DEFAULT '{}'::jsonb;
CREATE UNIQUE INDEX IF NOT EXISTS "RecruiterJob_sourceShareId_key" ON public."RecruiterJob"("sourceShareId") WHERE "sourceShareId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "RecruiterJob_whatsapp_sourceJobId_key" ON public."RecruiterJob"("sourceJobId") WHERE "sourceType"='WHATSAPP_ATTRIBUTION' AND "sourceJobId" IS NOT NULL;
CREATE TABLE IF NOT EXISTS public."RecruiterOfferClaim" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "sourceShareId" uuid NOT NULL REFERENCES public."CVShare"(id) ON DELETE CASCADE,
  "sourceJobId" uuid NOT NULL REFERENCES public."Job"(id) ON DELETE CASCADE,
  "applicationId" text NOT NULL REFERENCES public."Application"(id) ON DELETE CASCADE,
  "recruiterUserId" text NOT NULL REFERENCES public."User"(id) ON DELETE CASCADE,
  "registeredPhone" text,
  "offerPhone" text,
  "status" text NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','APPROVED','REJECTED')),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "reviewedAt" timestamptz,
  "reviewedByUserId" text,
  "reviewNote" text,
  UNIQUE ("sourceShareId","recruiterUserId")
);
ALTER TABLE public."RecruiterOfferClaim" ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS "RecruiterOfferClaim_status_createdAt_idx" ON public."RecruiterOfferClaim"("status","createdAt");
CREATE INDEX IF NOT EXISTS "RecruiterOfferClaim_recruiter_status_idx" ON public."RecruiterOfferClaim"("recruiterUserId","status");

CREATE OR REPLACE FUNCTION public.claim_whatsapp_recruiter_offer(p_share_id uuid,p_application_id text,p_recruiter_user_id text,p_recruiter_phone text,p_offer_phone text,p_company_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 v_share public."CVShare"%ROWTYPE; v_application public."Application"%ROWTYPE; v_job public."Job"%ROWTYPE;
 v_existing public."RecruiterJob"%ROWTYPE; vj jsonb; v_id text; v_now timestamptz:=now(); v_tags text[]:=ARRAY[]::text[];
 v_remote text; v_mode text; v_contract text; v_salary text; v_company text; v_updated integer;
BEGIN
 SELECT * INTO v_share FROM public."CVShare" WHERE id=p_share_id FOR UPDATE;
 IF NOT FOUND OR v_share."revokedAt" IS NOT NULL OR (v_share."expiresAt" IS NOT NULL AND v_share."expiresAt"<=v_now) THEN RETURN jsonb_build_object('status','INVALID_SHARE'); END IF;
 IF v_share.source IS DISTINCT FROM ('WHATSAPP_APPLICATION:'||p_application_id) THEN RETURN jsonb_build_object('status','INVALID_CONTEXT'); END IF;
 SELECT * INTO v_application FROM public."Application" WHERE id=p_application_id AND "userId"=v_share."userId" FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','APPLICATION_NOT_FOUND'); END IF;
 SELECT * INTO v_existing FROM public."RecruiterJob"
  WHERE "sourceShareId"=p_share_id OR ("sourceType"='WHATSAPP_ATTRIBUTION' AND "sourceJobId"=v_share."jobId")
  ORDER BY CASE WHEN "sourceShareId"=p_share_id THEN 0 ELSE 1 END LIMIT 1 FOR UPDATE;
 IF FOUND THEN
  IF v_existing."recruiterUserId"<>p_recruiter_user_id THEN RETURN jsonb_build_object('status','ALREADY_CLAIMED'); END IF;
  IF v_application."recruiterJobId" IS DISTINCT FROM v_existing.id THEN
   IF v_application."jobId" IS NOT NULL AND v_application."jobId"=v_share."jobId" THEN
    UPDATE public."Application" SET "jobId"=NULL,"recruiterJobId"=v_existing.id,"status"='SUBMITTED',"submittedAt"=COALESCE("submittedAt",v_now),"updatedAt"=v_now WHERE id=p_application_id AND "userId"=v_share."userId";
   ELSE RETURN jsonb_build_object('status','APPLICATION_ALREADY_LINKED'); END IF;
  END IF;
  UPDATE public."CVShare" SET "jobId"=NULL WHERE id=p_share_id;
  UPDATE public."RecruiterOfferClaim" SET "status"='APPROVED',"reviewedAt"=COALESCE("reviewedAt",v_now) WHERE "sourceShareId"=p_share_id AND "recruiterUserId"=p_recruiter_user_id;
  RETURN jsonb_build_object('status','CLAIMED','recruiterJobId',v_existing.id,'applicationId',p_application_id,'idempotent',true);
 END IF;
 IF v_share."jobId" IS NULL OR v_application."jobId" IS DISTINCT FROM v_share."jobId" OR v_application."recruiterJobId" IS NOT NULL THEN RETURN jsonb_build_object('status','APPLICATION_NOT_LINKED'); END IF;
 SELECT * INTO v_job FROM public."Job" WHERE id=v_share."jobId" FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','SOURCE_OFFER_NOT_FOUND'); END IF;
 IF length(regexp_replace(COALESCE(p_recruiter_phone,''),'[^0-9]','','g'))<8 OR regexp_replace(COALESCE(p_recruiter_phone,''),'[^0-9]','','g')<>regexp_replace(COALESCE(p_offer_phone,''),'[^0-9]','','g') THEN RETURN jsonb_build_object('status','PHONE_MISMATCH'); END IF;
 vj:=to_jsonb(v_job);
 v_remote:=CASE WHEN vj->>'remoteMode' IN ('YES','PARTIAL') THEN vj->>'remoteMode' ELSE 'NO' END;
 v_mode:=CASE v_remote WHEN 'YES' THEN 'Télétravail' WHEN 'PARTIAL' THEN 'Hybride' ELSE 'Présentiel' END;
 v_contract:=COALESCE(NULLIF(vj->>'contractType',''),NULLIF(vj->>'contract',''),'À préciser');
 v_salary:=COALESCE(NULLIF(vj->>'salary',''),CASE WHEN NULLIF(vj->>'salaryMin','') IS NOT NULL OR NULLIF(vj->>'salaryMax','') IS NOT NULL THEN concat_ws(' - ',vj->>'salaryMin',vj->>'salaryMax') ELSE NULL END);
 IF jsonb_typeof(vj->'tags')='array' THEN SELECT COALESCE(array_agg(value),'{}'::text[]) INTO v_tags FROM jsonb_array_elements_text(vj->'tags') AS value; END IF;
 v_company:=COALESCE(NULLIF(trim(p_company_name),''),NULLIF(v_share."companyNameSnapshot",''),'Mon entreprise'); v_id:=gen_random_uuid()::text;
 INSERT INTO public."RecruiterJob"(id,"recruiterUserId",title,"companyName",description,location,mode,contract,salary,sector,tags,status,"remoteMode","minExperienceYears","applicationProfile","applicationReady","sourceType","sourceJobId","sourceShareId","sourcePhoneSnapshot","sourceProvenance","createdAt","updatedAt")
 VALUES(v_id,p_recruiter_user_id,v_job.title,v_company,v_job.description,v_job.location,v_mode,v_contract,v_salary,vj->>'sector',v_tags,'published',v_remote,COALESCE(NULLIF(vj->>'minExperienceYears','')::integer,0),COALESCE(vj->'applicationProfile','{}'::jsonb),COALESCE(NULLIF(vj->>'applicationReady','')::boolean,true),'WHATSAPP_ATTRIBUTION',v_job.id,p_share_id,p_offer_phone,
 jsonb_build_object('kind','WHATSAPP_RECRUITER_CONVERSION','originalJobId',v_job.id,'originalSource',vj->>'source','originalSourceUrl',vj->>'sourceUrl','originalCompanyId',vj->>'companyId','shareId',p_share_id,'applicationId',p_application_id,'claimedAt',v_now),v_now,v_now);
 UPDATE public."Application" SET "jobId"=NULL,"recruiterJobId"=v_id,"status"='SUBMITTED',"submittedAt"=COALESCE("submittedAt",v_now),"updatedAt"=v_now WHERE id=p_application_id AND "userId"=v_share."userId" AND "jobId"=v_share."jobId" AND "recruiterJobId" IS NULL;
 GET DIAGNOSTICS v_updated=ROW_COUNT;
 IF v_updated<>1 THEN DELETE FROM public."RecruiterJob" WHERE id=v_id; RETURN jsonb_build_object('status','APPLICATION_ALREADY_LINKED'); END IF;
 UPDATE public."CVShare" SET "jobId"=NULL WHERE id=p_share_id;
 UPDATE public."RecruiterOfferClaim" SET "status"='APPROVED',"reviewedAt"=COALESCE("reviewedAt",v_now) WHERE "sourceShareId"=p_share_id AND "recruiterUserId"=p_recruiter_user_id;
 RETURN jsonb_build_object('status','CLAIMED','recruiterJobId',v_id,'applicationId',p_application_id,'idempotent',false);
END; $$;
REVOKE ALL ON FUNCTION public.claim_whatsapp_recruiter_offer(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_recruiter_offer(uuid,text,text,text,text,text) TO service_role;
