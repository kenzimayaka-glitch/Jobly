-- CV shares are bearer links. Set a bounded lifetime for all newly created
-- records and backfill legacy rows that were created without an expiry.
alter table public."CVShare"
  alter column "expiresAt" set default (now() + interval '30 days');

update public."CVShare"
set "expiresAt" = "createdAt" + interval '30 days'
where "expiresAt" is null;
