# Jobly — P2 Supabase hardening (validation package)

**Snapshot:** 2026-11-05  
**Production project:** JOBLY-PROD (`mpoyaegtwtmhookdzqdy`)  
**Base `main`:** `b7c35fa5b35c538072d2a62194048208f3395ab8`  
**Working branch:** `fix/p2-supabase-hardening-20261105-r3`  
**Production writes:** main P2 SQL migration applied and validated; pg_net and supabase_admin owner-level steps remain unexecuted.

## Latest verified production baseline

- Project status `ACTIVE_HEALTHY`; PostgreSQL 17.6.1.166.
- Public tables: 153; RLS enabled: 153; RLS/no-policy INFO: 72.
- Security Advisor WARN findings: 2: `extension_in_public` (`pg_net`) and `auth_leaked_password_protection` (disabled).
- A prior scan briefly reported `function_search_path_mutable` for `public.jobly_p1_sanitize_offer_sections(jsonb)`. The latest advisor no longer reports it, and a fresh catalog query returns no matching function. The migration deliberately contains no stale ALTER FUNCTION against an absent object.
- 23 service-only tables still have effective client table grants. Main migration revokes all table privileges for `anon` and `authenticated`, retaining `service_role`.
- `postgres` default ACLs grant future table/sequence rights to client roles; main migration revokes these defaults.
- `supabase_admin` defaults still grant future table/sequence rights to client roles and EXECUTE to PUBLIC/clients on future public functions. The connected DB role is `postgres`, not superuser and not a member of `supabase_admin`; its `rolcreaterole` attribute does not grant membership. The guarded operator script remains staged for the Supabase owner/support path. This part was not applied.
- Performance Advisor: 42 unindexed FKs (INFO), 170 unused indexes (INFO), one archive table without PK (INFO), one overlapping authenticated SELECT-policy warning for `RecruiterJob` (WARN).
- Four FK candidates have live usage: `Application` (~5 rows), `RecruitmentRole` (~1), `Community` (~8), `jia_action_runs` (~25). The remaining 38 findings are on tables with estimated 0 live rows and 0–8 KB relation sizes; the package does not add speculative indexes.
- `jobs_backup_20260929`: 54 rows; all 54 existing `id` values are non-null and distinct (0 nulls). Migration rechecks this and creates the PK on the existing `id`.
- Usage statistics reset timestamp: 2026-08-25. The 170 "unused" index notices are not a safe deletion list; infrequent Recruitment/Mobility/Event/Payment flows may rely on them.

## Prepared correction set

1. **Service-only ACLs:** revoke client table privileges on the 23 service-only/no-policy tables; keep `service_role`.
2. **Future defaults (postgres):** revoke client defaults on public tables and sequences.
3. **RecruiterJob RLS:** consolidate authenticated SELECT to owner OR published; retain owner-only INSERT/UPDATE/DELETE and both UPDATE USING/WITH CHECK predicates.
4. **Archive key:** add a guarded primary key on existing `jobs_backup_20260929.id`; stop if any null/duplicate appears before apply.
5. **Indexes:** add only the four FK indexes justified by current active rows; defer the other 38.
6. **supabase_admin:** separately revoke future table/sequence client defaults and future public function EXECUTE defaults. A role guard prevents execution by `postgres` unless membership/ownership is granted.
7. **pg_net:** guarded drop/recreate in `extensions`, no CASCADE; archive the current response, pause/restore the one discovery cron, abort on queued requests or hidden function dependencies.
8. **Assertions:** confirm all above, including the archive PK, cron restoration, and service_role ingestion access.

## pg_net cutover evidence / safety

- Current: `pg_net 0.20.4`, registered in `public`, `extrelocatable=false`; HTTP API objects live in `net`. Its actual extension owner is `supabase_admin`, not `postgres`.
- Supabase documents that non-relocatable extensions such as pg_net need a drop/recreate to install under `extensions`: [Supabase pg_net docs](https://supabase.com/docs/guides/database/extensions/pg_net).
- Only one `pg_cron` command references `net.http_*`: `jobly-discover-jobs-every-6h`, schedule `15 */6 * * *`; active. The event trigger `issue_pg_net_access` is enabled and restores schema usage grants after extension creation.
- Last preflight: pending request queue = 0; response table = 1 record. Script archives response before recreation. The response status was 546; after cutover the next HTTP response must be 2xx before ingestion is declared operational.
- Script uses `DROP EXTENSION pg_net RESTRICT`, never CASCADE. It now checks extension ownership before creating the archive or pausing the cron. `postgres` is not a member of the extension owner `supabase_admin`, so the guard stops before any writes. The cutover must be run by Supabase's owner/support; it was not executed.

## Auth leaked-password protection

- Still disabled according to Security Advisor.
- The organization plan was queried and confirmed as `free`. Supabase leaked-password protection requires Pro or above: [Password Security](https://supabase.com/docs/guides/auth/password-security). This setting cannot be enabled without a paid upgrade, which is not authorized and will not be made.
- Current project metadata does not expose subscription plan; no Auth settings write tool is connected. The setting remains a manual gate: **Authentication → Settings → Password Security → Leaked Password Protection** if the current plan includes it. No upgrade/payment is included or requested.

## Findings deliberately not masked

- The 72 RLS/no-policy notices are INFO. All 153 public tables have RLS enabled; no broad policies are created just to silence lints. The 23 actual client ACL exposures are revoked separately.
- The 38 low-activity FK findings are deferred pending real rows/workload.
- 170 unused-index warnings are not deleted blindly; use feature-level EXPLAIN and representative traffic.
- No existing business rows are deleted or rewritten. The one archive PK is added only after an in-migration uniqueness/null check.

## Approval and execution gates

1. Have an authorized Supabase owner/operator apply the `supabase_admin` default ACL step.
2. Have Supabase owner/support run the guarded `pg_net` recreation and cron cutover after a fresh queue/dependency preflight; verify the next discovery response is 2xx.
3. Do not enable leaked-password protection unless the owner independently approves a paid Pro upgrade; current instruction is no payment.
4. Run the final SQL assertions after the two owner-level database steps; rerun Advisors.
5. Re-run GitHub CI on the final branch, merge into `main`, and deploy via Vercel.

## Current state

- Prepared files are committed to the working branch; they are not merged.
- The main migration has passed a controlled SQL transaction test with explicit ROLLBACK; a post-test catalog check confirms the 23 client grants, two original RecruiterJob policies, zero new FK indexes and missing archive PK remain unchanged. JOBLY-PROD has not been persistently modified by this preparation.
- No Supabase branch, paid resource, Netlify deploy, Vercel production deploy, or Auth plan change has been made.
- This document is a validation package, not a claim that production is already green.
