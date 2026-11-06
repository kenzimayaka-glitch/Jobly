DO $$
DECLARE
  v_count integer;
BEGIN
  IF to_regclass('public."AndroidAttestationChallenge"') IS NULL
     OR to_regclass('public."AndroidDeviceAttestation"') IS NULL THEN
    RAISE EXCEPTION 'Android attestation tables are missing';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public."AndroidAttestationChallenge"'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public."AndroidDeviceAttestation"'::regclass) THEN
    RAISE EXCEPTION 'Android attestation tables must have RLS enabled';
  END IF;

  IF has_table_privilege('anon', 'public."AndroidAttestationChallenge"', 'select')
     OR has_table_privilege('authenticated', 'public."AndroidAttestationChallenge"', 'select')
     OR has_table_privilege('anon', 'public."AndroidDeviceAttestation"', 'select')
     OR has_table_privilege('authenticated', 'public."AndroidDeviceAttestation"', 'select') THEN
    RAISE EXCEPTION 'Client roles must not read Android attestation records';
  END IF;

  IF NOT has_table_privilege('service_role', 'public."AndroidAttestationChallenge"', 'select')
     OR NOT has_table_privilege('service_role', 'public."AndroidAttestationChallenge"', 'insert')
     OR NOT has_table_privilege('service_role', 'public."AndroidAttestationChallenge"', 'update')
     OR NOT has_table_privilege('service_role', 'public."AndroidAttestationChallenge"', 'delete')
     OR NOT has_table_privilege('service_role', 'public."AndroidDeviceAttestation"', 'select')
     OR NOT has_table_privilege('service_role', 'public."AndroidDeviceAttestation"', 'insert')
     OR NOT has_table_privilege('service_role', 'public."AndroidDeviceAttestation"', 'update')
     OR NOT has_table_privilege('service_role', 'public."AndroidDeviceAttestation"', 'delete') THEN
    RAISE EXCEPTION 'service_role must manage Android attestation records';
  END IF;

  SELECT count(*) INTO v_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename IN ('AndroidAttestationChallenge', 'AndroidDeviceAttestation');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Android attestation tables must not expose client RLS policies';
  END IF;
END;
$$;
