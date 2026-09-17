create table if not exists public."PromoCode" (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  codeHash text not null unique,
  label text not null,
  sponsorName text not null,
  sponsorType text not null default 'INTERNAL' check (sponsorType in ('INTERNAL','INSTITUTION','PARTNER','INVESTOR','CAMPAIGN')),
  scope text not null default 'TALENT' check (scope in ('TALENT','RECRUITER','BOTH')),
  planCode text not null default 'PRO' check (planCode = 'PRO'),
  maxRedemptions integer not null default 1 check (maxRedemptions > 0),
  redemptionsCount integer not null default 0 check (redemptionsCount >= 0),
  validFrom timestamptz not null default now(),
  expiresAt timestamptz,
  durationDays integer not null default 30 check (durationDays > 0 and durationDays <= 3650),
  active boolean not null default true,
  notes text,
  createdBy text references public."User"(id) on delete set null,
  createdAt timestamptz not null default now(),
  updatedAt timestamptz not null default now(),
  check (expiresAt is null or expiresAt > validFrom)
);

create table if not exists public."PromoRedemption" (
  id uuid primary key default gen_random_uuid(),
  promoCodeId uuid not null references public."PromoCode"(id) on delete cascade,
  userId text not null references public."User"(id) on delete cascade,
  productType text not null check (productType in ('TALENT','RECRUITER')),
  grantedPlan text not null default 'PRO' check (grantedPlan = 'PRO'),
  startsAt timestamptz not null default now(),
  endsAt timestamptz not null,
  createdAt timestamptz not null default now(),
  revokedAt timestamptz,
  unique (promoCodeId,userId,productType)
);

create index if not exists "PromoCode_active_expiresAt_idx" on public."PromoCode" (active, expiresAt);
create index if not exists "PromoRedemption_userId_endsAt_idx" on public."PromoRedemption" (userId, endsAt desc);
create index if not exists "PromoRedemption_promoCodeId_idx" on public."PromoRedemption" (promoCodeId);

alter table public."PromoCode" enable row level security;
alter table public."PromoRedemption" enable row level security;
revoke all on table public."PromoCode" from anon, authenticated;
revoke all on table public."PromoRedemption" from anon, authenticated;
grant select, insert, update, delete on table public."PromoCode" to service_role;
grant select, insert, update, delete on table public."PromoRedemption" to service_role;

create or replace function public.update_promo_code_timestamp()
returns trigger language plpgsql as $$
begin
  new.updatedAt = now();
  return new;
end;
$$;

drop trigger if exists promo_code_updated_at on public."PromoCode";
create trigger promo_code_updated_at before update on public."PromoCode" for each row execute function public.update_promo_code_timestamp();
revoke execute on function public.update_promo_code_timestamp() from public, anon, authenticated;
grant execute on function public.update_promo_code_timestamp() to service_role;
