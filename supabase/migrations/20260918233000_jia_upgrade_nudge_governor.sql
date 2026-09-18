-- J'IA value-first subscription nudge governor
create table if not exists public."JiaUpgradeNudge" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" text not null references public."User"(id) on delete cascade,
  "featureKey" text not null,
  "action" text not null check ("action" in ('SHOWN','CLICKED','DISMISSED')),
  "planCode" text not null default 'FREE',
  "metadata" jsonb not null default '{}'::jsonb,
  "createdAt" timestamptz not null default now()
);
create index if not exists "JiaUpgradeNudge_user_created_idx" on public."JiaUpgradeNudge" ("userId","createdAt" desc);
create index if not exists "JiaUpgradeNudge_user_feature_action_idx" on public."JiaUpgradeNudge" ("userId","featureKey","action","createdAt" desc);
alter table public."JiaUpgradeNudge" enable row level security;
revoke all on public."JiaUpgradeNudge" from anon, authenticated;
grant select,insert on public."JiaUpgradeNudge" to authenticated;
drop policy if exists "JiaUpgradeNudge_own_select" on public."JiaUpgradeNudge";
drop policy if exists "JiaUpgradeNudge_own_insert" on public."JiaUpgradeNudge";
create policy "JiaUpgradeNudge_own_select" on public."JiaUpgradeNudge" for select to authenticated using ((select auth.uid()::text) = "userId");
create policy "JiaUpgradeNudge_own_insert" on public."JiaUpgradeNudge" for insert to authenticated with check ((select auth.uid()::text) = "userId");
