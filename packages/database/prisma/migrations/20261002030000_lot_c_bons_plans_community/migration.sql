-- JOBLY Lot C — Bons plans + Community
-- Schema-only migration. Do not apply to production automatically.

create table "BonPlan" (
  "id" text primary key,
  "authorId" text references "User"("id") on delete set null,
  "title" text not null,
  "description" text not null,
  "category" text not null,
  "country" text,
  "city" text,
  "sourceUrl" text,
  "imageUrl" text,
  "status" text not null default 'PUBLISHED',
  "startsAt" timestamptz,
  "expiresAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index "BonPlan_country_city_category_status_idx"
  on "BonPlan" ("country","city","category","status");
create index "BonPlan_expiresAt_status_idx"
  on "BonPlan" ("expiresAt","status");
create index "BonPlan_authorId_createdAt_idx"
  on "BonPlan" ("authorId","createdAt");

create table "BonPlanInteraction" (
  "id" text primary key,
  "userId" text not null references "User"("id") on delete cascade,
  "bonPlanId" text not null references "BonPlan"("id") on delete cascade,
  "type" text not null,
  "createdAt" timestamptz not null default now(),
  constraint "BonPlanInteraction_userId_bonPlanId_type_key"
    unique ("userId","bonPlanId","type")
);
create index "BonPlanInteraction_bonPlanId_createdAt_idx"
  on "BonPlanInteraction" ("bonPlanId","createdAt");

create table "BonPlanComment" (
  "id" text primary key,
  "userId" text not null references "User"("id") on delete cascade,
  "bonPlanId" text not null references "BonPlan"("id") on delete cascade,
  "content" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index "BonPlanComment_bonPlanId_createdAt_idx"
  on "BonPlanComment" ("bonPlanId","createdAt");

create table "Community" (
  "id" text primary key,
  "createdById" text not null references "User"("id") on delete cascade,
  "name" text not null,
  "slug" text not null unique,
  "description" text,
  "category" text not null,
  "country" text,
  "city" text,
  "status" text not null default 'ACTIVE',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index "Community_country_city_category_status_idx"
  on "Community" ("country","city","category","status");

create table "CommunityMembership" (
  "id" text primary key,
  "userId" text not null references "User"("id") on delete cascade,
  "communityId" text not null references "Community"("id") on delete cascade,
  "role" text not null default 'MEMBER',
  "createdAt" timestamptz not null default now(),
  constraint "CommunityMembership_userId_communityId_key"
    unique ("userId","communityId")
);
create index "CommunityMembership_communityId_createdAt_idx"
  on "CommunityMembership" ("communityId","createdAt");

create table "CommunityPost" (
  "id" text primary key,
  "communityId" text not null references "Community"("id") on delete cascade,
  "authorId" text not null references "User"("id") on delete cascade,
  "content" text not null,
  "status" text not null default 'PUBLISHED',
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index "CommunityPost_communityId_createdAt_idx"
  on "CommunityPost" ("communityId","createdAt");
create index "CommunityPost_authorId_createdAt_idx"
  on "CommunityPost" ("authorId","createdAt");

create table "CommunityPostComment" (
  "id" text primary key,
  "userId" text not null references "User"("id") on delete cascade,
  "postId" text not null references "CommunityPost"("id") on delete cascade,
  "content" text not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index "CommunityPostComment_postId_createdAt_idx"
  on "CommunityPostComment" ("postId","createdAt");

create table "CommunityPostReaction" (
  "id" text primary key,
  "userId" text not null references "User"("id") on delete cascade,
  "postId" text not null references "CommunityPost"("id") on delete cascade,
  "type" text not null,
  "createdAt" timestamptz not null default now(),
  constraint "CommunityPostReaction_userId_postId_type_key"
    unique ("userId","postId","type")
);
create index "CommunityPostReaction_postId_createdAt_idx"
  on "CommunityPostReaction" ("postId","createdAt");

-- Defense in depth: all new public tables use RLS.
alter table "BonPlan" enable row level security;
alter table "BonPlanInteraction" enable row level security;
alter table "BonPlanComment" enable row level security;
alter table "Community" enable row level security;
alter table "CommunityMembership" enable row level security;
alter table "CommunityPost" enable row level security;
alter table "CommunityPostComment" enable row level security;
alter table "CommunityPostReaction" enable row level security;

grant select on "BonPlan","BonPlanComment","Community","CommunityPost","CommunityPostComment" to anon, authenticated;
grant select on "BonPlanInteraction","CommunityMembership","CommunityPostReaction" to authenticated;
grant all on "BonPlan","BonPlanInteraction","BonPlanComment","Community","CommunityMembership","CommunityPost","CommunityPostComment","CommunityPostReaction" to service_role;

create policy "published bons plans are public"
  on "BonPlan" for select to anon, authenticated
  using ("status" = 'PUBLISHED' and ("expiresAt" is null or "expiresAt" > now()));

create policy "published bon plan comments are public"
  on "BonPlanComment" for select to anon, authenticated
  using (exists (
    select 1 from "BonPlan" bp
    where bp."id" = "BonPlanComment"."bonPlanId"
      and bp."status" = 'PUBLISHED'
      and (bp."expiresAt" is null or bp."expiresAt" > now())
  ));

create policy "active communities are public"
  on "Community" for select to anon, authenticated
  using ("status" = 'ACTIVE');

create policy "published community posts are public"
  on "CommunityPost" for select to anon, authenticated
  using (
    "status" = 'PUBLISHED'
    and exists (
      select 1 from "Community" c
      where c."id" = "CommunityPost"."communityId" and c."status" = 'ACTIVE'
    )
  );

create policy "published community comments are public"
  on "CommunityPostComment" for select to anon, authenticated
  using (
    exists (
      select 1 from "CommunityPost" p
      join "Community" c on c."id" = p."communityId"
      where p."id" = "CommunityPostComment"."postId"
        and p."status" = 'PUBLISHED'
        and c."status" = 'ACTIVE'
    )
  );
