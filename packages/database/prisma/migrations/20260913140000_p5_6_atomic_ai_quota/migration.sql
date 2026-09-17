-- P5.6 — quota IA atomique
-- Empêche deux requêtes concurrentes du même utilisateur de dépasser le quota mensuel.
CREATE OR REPLACE FUNCTION public.reserve_ai_credit(
  p_user_id TEXT,
  p_plan_code TEXT,
  p_operation TEXT,
  p_cost INTEGER,
  p_request_hash TEXT
)
RETURNS TABLE (
  allowed BOOLEAN,
  used_credits INTEGER,
  remaining_credits INTEGER,
  usage_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quota INTEGER;
  v_used INTEGER;
  v_id TEXT;
BEGIN
  IF p_cost IS NULL OR p_cost <= 0 THEN
    RAISE EXCEPTION 'AI credit cost must be positive';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id, 0));

  SELECT a.id
    INTO v_id
    FROM "AiUsage" a
   WHERE a."userId" = p_user_id
     AND a."requestHash" = p_request_hash
   ORDER BY a."createdAt" DESC
   LIMIT 1;

  v_quota := CASE p_plan_code
    WHEN 'START' THEN 30
    WHEN 'PREMIUM' THEN 120
    WHEN 'PRO' THEN 300
    ELSE 5
  END;

  IF v_id IS NOT NULL THEN
    SELECT COALESCE(SUM(a.credits), 0)::INTEGER
      INTO v_used
      FROM "AiUsage" a
     WHERE a."userId" = p_user_id
       AND a."createdAt" >= date_trunc('month', timezone('UTC', now()));

    RETURN QUERY SELECT TRUE, v_used, GREATEST(v_quota - v_used, 0), v_id;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(a.credits), 0)::INTEGER
    INTO v_used
    FROM "AiUsage" a
   WHERE a."userId" = p_user_id
     AND a."createdAt" >= date_trunc('month', timezone('UTC', now()));

  IF v_used + p_cost > v_quota THEN
    RETURN QUERY SELECT FALSE, v_used, GREATEST(v_quota - v_used, 0), NULL::TEXT;
    RETURN;
  END IF;

  v_id := gen_random_uuid()::TEXT;
  INSERT INTO "AiUsage" (
    id, "userId", "planCode", operation, credits, provider,
    model, "requestHash", success, "createdAt"
  )
  VALUES (
    v_id, p_user_id, p_plan_code, p_operation, p_cost, 'RESERVED',
    'reservation-v1', p_request_hash, TRUE, now()
  );

  RETURN QUERY SELECT TRUE, v_used + p_cost, v_quota - v_used - p_cost, v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_ai_credit(TEXT, TEXT, TEXT, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_ai_credit(TEXT, TEXT, TEXT, INTEGER, TEXT) TO service_role;

CREATE UNIQUE INDEX IF NOT EXISTS "AiUsage_userId_requestHash_key"
ON "AiUsage"("userId","requestHash");
