-- Jobly — bonus J’IA de bienvenue Free, one-shot.
-- Le bonus est accordé une seule fois à la création du compte Talent.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "aiWelcomeCredits" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "aiWelcomeGrantedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "aiWelcomeSeenAt" TIMESTAMPTZ;

-- Free n’a plus de quota mensuel récurrent : ses crédits J’IA proviennent
-- uniquement du bonus de bienvenue. Les plans payants conservent leur quota mensuel.
CREATE OR REPLACE FUNCTION public.reserve_ai_credit(
  p_user_id uuid,
  p_plan_code text,
  p_operation text,
  p_cost integer,
  p_request_hash text
)
RETURNS TABLE(allowed boolean, used_credits integer, remaining_credits integer, usage_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota integer;
  v_used integer;
  v_id text;
  v_started_at timestamptz;
  v_bonus integer;
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized AI credit reservation';
  END IF;
  IF p_cost IS NULL OR p_cost <= 0 THEN
    RAISE EXCEPTION 'AI credit cost must be positive';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  SELECT a.id INTO v_id FROM "AiUsage" a
   WHERE a."userId" = p_user_id AND a."requestHash" = p_request_hash
   ORDER BY a."createdAt" DESC LIMIT 1;

  IF p_plan_code = 'FREE' THEN
    SELECT "aiWelcomeCredits", "aiWelcomeGrantedAt" INTO v_bonus, v_started_at
      FROM "User" WHERE id = p_user_id;
    v_bonus := COALESCE(v_bonus, 0);
    IF v_started_at IS NULL OR v_bonus <= 0 THEN
      RETURN QUERY SELECT FALSE, 0, 0, NULL::text; RETURN;
    END IF;
    SELECT COALESCE(SUM(a.credits),0)::integer INTO v_used FROM "AiUsage" a
      WHERE a."userId" = p_user_id AND a."planCode" = 'FREE' AND a."createdAt" >= v_started_at;
    v_quota := v_bonus;
  ELSE
    v_quota := CASE p_plan_code WHEN 'START' THEN 30 WHEN 'PREMIUM' THEN 120 WHEN 'PRO' THEN 300 ELSE 0 END;
    SELECT COALESCE(SUM(a.credits),0)::integer INTO v_used FROM "AiUsage" a
      WHERE a."userId" = p_user_id AND a."createdAt" >= date_trunc('month', timezone('UTC', now()));
  END IF;

  IF v_id IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, v_used, GREATEST(v_quota-v_used,0), v_id; RETURN;
  END IF;
  IF v_used + p_cost > v_quota THEN
    RETURN QUERY SELECT FALSE, v_used, GREATEST(v_quota-v_used,0), NULL::text; RETURN;
  END IF;

  v_id := gen_random_uuid()::text;
  INSERT INTO "AiUsage"(id,"userId","planCode",operation,credits,provider,model,"requestHash",success,"createdAt")
  VALUES(v_id,p_user_id,p_plan_code,p_operation,p_cost,'RESERVED','reservation-v1',p_request_hash,TRUE,now());
  RETURN QUERY SELECT TRUE, v_used+p_cost, v_quota-v_used-p_cost, v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_credit(uuid,text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_ai_credit(uuid,text,text,integer,text) TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS "AiUsage_userId_requestHash_key" ON "AiUsage"("userId","requestHash");
