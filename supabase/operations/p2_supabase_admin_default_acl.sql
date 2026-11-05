-- READ-ONLY diagnostic for Supabase-managed supabase_admin defaults.
-- DO NOT add ALTER DEFAULT PRIVILEGES statements for supabase_admin here.
-- Supabase reserves this internal role; postgres cannot join it or change its defaults.
-- These defaults apply only to objects actually created by supabase_admin.
-- Inspect actual ownership before classifying this as an application exposure.

-- Default ACL entries maintained by Supabase for supabase_admin.
SELECT
  d.defaclrole::regrole::text AS creator,
  CASE WHEN d.defaclnamespace = 0 THEN '(global)'
       ELSE d.defaclnamespace::regnamespace::text END AS schema_name,
  CASE d.defaclobjtype
    WHEN 'r' THEN 'tables'
    WHEN 'S' THEN 'sequences'
    WHEN 'f' THEN 'functions'
    ELSE d.defaclobjtype::text
  END AS object_type,
  CASE acl.grantee WHEN 0 THEN 'PUBLIC'
       ELSE acl.grantee::regrole::text END AS grantee,
  acl.privilege_type
FROM pg_default_acl d
CROSS JOIN LATERAL aclexplode(d.defaclacl) acl
WHERE d.defaclrole = 'supabase_admin'::regrole
  AND d.defaclnamespace IN (
    'public'::regnamespace,
    'graphql'::regnamespace,
    'graphql_public'::regnamespace
  )
ORDER BY 1, 2, 3, 4, 5;

-- Count real objects owned by supabase_admin in exposed schemas.
WITH owned_objects AS (
  SELECT 'relation'::text AS object_kind, n.nspname AS schema_name,
         c.relname AS object_name, c.relowner AS owner_oid
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'graphql', 'graphql_public')
    AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
  UNION ALL
  SELECT 'function', n.nspname, p.proname, p.proowner
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'graphql', 'graphql_public')
)
SELECT schema_name, object_kind,
       count(*) FILTER (WHERE owner_oid = 'supabase_admin'::regrole) AS supabase_admin_owned,
       count(*) FILTER (WHERE owner_oid = 'postgres'::regrole) AS postgres_owned
FROM owned_objects
GROUP BY schema_name, object_kind
ORDER BY schema_name, object_kind;
