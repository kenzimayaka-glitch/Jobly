-- Pin the only non-catalog object resolution path for the immutable,
-- SECURITY INVOKER offer resegmentation helper to the built-in catalog.
ALTER FUNCTION public.jobly_p1_resegment_offer(jsonb)
  SET search_path = pg_catalog;
