# JOBLY Production Database Runbook — C0.7.0

## Source of truth used
- Historical C0.6.4 production-hardened Prisma schema.
- Historical C0.5.1 auth/RBAC schema decisions.
- Latest C0.6.9 Vercel frontend baseline.

## What is finalized in this delivery
- Versioned Prisma production schema.
- Initial PostgreSQL baseline migration.
- Historical C0.6 discovery migrations preserved.
- Production indexes and integrity checks.
- Supabase RLS for user-owned data.
- Public read boundaries for active jobs and public catalogs.
- Admin-only boundaries for audit and discovery operations.
- Production environment contract.

## Live deployment status
NOT APPLIED to the real Supabase project in this environment. Real credentials and database access are required for that final operational action.

## Deployment order
1. Create/confirm a Supabase production project.
2. Configure DATABASE_URL (pooled) and DIRECT_URL (direct) for Prisma.
3. Run `npm install` then `npm run db:generate`.
4. Run `npm run db:validate`.
5. Run `npm run db:migrate:deploy`.
6. Run the seed only after reviewing the source registry.
7. Verify RLS with an authenticated Talent and an Admin test account.
8. Run API smoke tests.

### Important migration baseline rule
C0.7.0 uses a cumulative production baseline. The historical C0.6 migration files are preserved as documentation only and are not active Prisma migrations in this package. This prevents duplicate columns/tables when deploying a fresh production database.

## Required production checks
- No anonymous read of private Talent data.
- One Talent cannot read another Talent's profile/application/match.
- ADMIN policies work.
- Service-role backend bypass is used only server-side.
- `SUPABASE_SERVICE_ROLE_KEY` never reaches the browser.
- Backups/PITR enabled in the Supabase production plan/configuration.
- Migration history is committed before deployment.

## Important architectural rule
Prisma and Supabase Auth share PostgreSQL but do not replace each other:
- `auth.users` = authentication identity.
- `public."User".authUserId` = link to Supabase Auth identity.
- Prisma owns application models and migrations.
