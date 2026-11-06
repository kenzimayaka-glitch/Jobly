-- Explicitly deny Data API client roles on the P1 live-ingestion recovery backup.
-- Preserve service_role's existing grants and BYPASSRLS.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'JobP1QualityLiveIngestionBackup'
      AND policyname = 'deny_client_access'
  ) THEN
    CREATE POLICY deny_client_access
      ON public."JobP1QualityLiveIngestionBackup"
      FOR ALL
      TO anon, authenticated
      USING (false)
      WITH CHECK (false);
  END IF;
END
$$;
