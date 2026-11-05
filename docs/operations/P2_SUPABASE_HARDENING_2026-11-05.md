# Jobly — P2 Supabase hardening (audit & correction plan)

**Snapshot:** 2026-11-05  
**Production project:** JOBLY-PROD (`mpoyaegtwtmhookdzqdy`)  
**Code target:** `main`  
**Working branch:** `fix/p2-supabase-hardening-20261105-r2`

## Current production evidence

- Project status: `ACTIVE_HEALTHY`; PostgreSQL 17.6.1.166.
- Public tables: 145; RLS enabled: 145; RLS disabled: 0.
- Security Advisor: 64 `rls_enabled_no_policy` INFO, 1 `extension_in_public` WARN, 1 `auth_leaked_password_protection` WARN.
- 23 tables with RLS enabled and no policies still had direct table privileges for `anon` and/or `authenticated`.
- Default privileges for objects created by `postgres` grant all table privileges to both client roles.
- Performance Advisor: 38 unindexed foreign keys (INFO), 162 unused indexes (INFO), 1 backup table without a PK (INFO), 1 duplicate permissive authenticated SELECT-policy warning for `RecruiterJob`.
- Four tables with live workload statistics have missing FK indexes: `Application` (5 rows est.), `RecruitmentRole` (1), `Community` (8), `jia_action_runs` (25).
- `service_role` has SELECT/INSERT on `JobOfferPipeline` and `JobHarvestCapture`; both roles continue to bypass RLS as designed.
- `pg_net` is version 0.20.4, `extrelocatable=false`, installed in `public`. An active cron job `jobly-discover-jobs-every-6h` runs as `postgres` every six hours and calls `net.http_post`.
- Database migration history already contains many applied migrations, but no existing Prisma migration directory or Supabase migration file was found at the expected paths on `main`.

## Corrections proposed in this branch

1. Revoke all table ACLs from `anon` and `authenticated` on the 23 service-only tables without policies. `service_role` grants are not touched.
2. Revoke table grants from future public tables created by `postgres`. Existing sequence defaults are deliberately preserved to avoid breaking authorized inserts that rely on sequence USAGE.
3. Replace the overlapping `RecruiterJob` policies with one SELECT policy implementing the same effective rule (owner OR published) and separate owner-only INSERT/UPDATE/DELETE policies. UPDATE keeps both USING and WITH CHECK.
4. Add four FK indexes, limited to tables with live usage statistics and observed rows.
5. Add a read-only SQL assertion script for ACLs, service-role ingestion access, default privileges, policy shape, and index validity.

## Findings deliberately not changed

- The 64 RLS/no-policy INFO findings are not “fixed” by inventing permissive policies. The 23 client ACL exposures are separately revoked; the remaining tables stay deny-by-default until a product-approved per-table access matrix exists.
- The 34 other FK index findings are deferred until table statistics/workload are refreshed and read/write impact is understood.
- The 162 unused indexes are not dropped: current statistics are not a sufficient basis for deletion, and modules may not yet have representative traffic.
- `jobs_backup_20260929` remains an archive without a primary key; no key is invented for backup data.
- `pg_net` is not relocated or dropped because it is non-relocatable and is used by the active discovery cron. Relocation requires a separately tested recreation and cron cutover.
- Leaked-password protection is an Auth dashboard/plan setting; no Auth configuration update action is exposed in the connected Supabase tools. It remains a manual platform-setting gate.

## Validation / deployment status

- GitHub branch created from `main`: `fix/p2-supabase-hardening-20261105-r2`.
- Migration and assertion script are staged in this branch.
- Supabase production has not been modified.
- `main` has not been modified or merged.
- A local database test could not be run in this execution environment because Supabase CLI, Docker/Podman, and PostgreSQL client/server binaries are not installed, and direct GitHub cloning is unavailable. The SQL assertion script is provided for the CI/controlled environment.
- The complete P2 item is **not yet green**: the two platform WARN findings (`pg_net`, leaked-password protection) remain unaddressed, and the migration still needs execution and post-migration Advisor verification.

## Green exit criteria

1. Apply this migration in a controlled database environment and pass `p2_hardening_assertions.sql`.
2. Confirm no authenticated SELECT-policy overlap remains on `RecruiterJob`.
3. Re-run Security and Performance Advisors.
4. Resolve leaked-password protection through Auth settings if supported by the current plan.
5. Plan a separate no-downtime `pg_net` recreation/cutover only if the platform/extension supports it; do not drop it as a lint workaround.
6. Refresh table statistics and revisit remaining FK indexes and archival table decisions.
7. Merge only after CI + database verification; production deployment requires explicit release approval.
