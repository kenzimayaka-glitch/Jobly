-- J'IA durable cognitive core
create table if not exists public.jia_memory (
  id uuid primary key default gen_random_uuid(), user_id text not null references public."User"(id) on delete cascade,
  memory_type text not null check (memory_type in ('WORKING','EPISODIC','SEMANTIC','PROCEDURAL','LONG_TERM','EVENT','USER','WORLD','JOBLY','REFLECTIVE')),
  content jsonb not null default '{}'::jsonb, source text, confidence numeric not null default 0.5 check (confidence between 0 and 1),
  importance numeric not null default 0.5 check (importance between 0 and 1), relevance numeric not null default 0.5 check (relevance between 0 and 1),
  first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(), expires_at timestamptz,
  contradiction_key text, recurrence_count integer not null default 1, future_utility numeric not null default 0.5 check (future_utility between 0 and 1),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists jia_memory_user_type_idx on public.jia_memory(user_id,memory_type);
create index if not exists jia_memory_contradiction_idx on public.jia_memory(user_id,contradiction_key);
create table if not exists public.jia_beliefs (
  id uuid primary key default gen_random_uuid(), user_id text not null references public."User"(id) on delete cascade,
  belief_key text not null, belief text not null, confidence numeric not null default 0.5 check (confidence between 0 and 1),
  status text not null default 'UNKNOWN' check (status in ('CONFIRMED','LIKELY','CONTESTED','UNKNOWN')),
  evidence jsonb not null default '[]'::jsonb, counter_evidence jsonb not null default '[]'::jsonb,
  last_evaluated_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,belief_key)
);
create table if not exists public.jia_predictions (
  id uuid primary key default gen_random_uuid(), user_id text not null references public."User"(id) on delete cascade,
  prediction text not null, prediction_type text not null check (prediction_type in ('FACT','EVIDENCE','INFERENCE','PREDICTION','HYPOTHESIS')),
  probability numeric not null check (probability between 0 and 1), horizon text, context jsonb not null default '{}'::jsonb,
  expected_at timestamptz, outcome jsonb, outcome_at timestamptz, calibration_error numeric,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.jia_reflections (
  id uuid primary key default gen_random_uuid(), user_id text not null references public."User"(id) on delete cascade,
  trigger_type text not null, expectation jsonb not null default '{}'::jsonb, result jsonb not null default '{}'::jsonb,
  error jsonb not null default '{}'::jsonb, learning jsonb not null default '{}'::jsonb, next_strategy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.jia_world_entities (
  id uuid primary key default gen_random_uuid(), user_id text references public."User"(id) on delete cascade,
  entity_type text not null, canonical_key text not null, attributes jsonb not null default '{}'::jsonb,
  confidence numeric not null default 0.5 check (confidence between 0 and 1), source_refs jsonb not null default '[]'::jsonb,
  first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id,entity_type,canonical_key)
);
create table if not exists public.jia_world_relations (
  id uuid primary key default gen_random_uuid(), user_id text references public."User"(id) on delete cascade,
  from_entity_id uuid not null references public.jia_world_entities(id) on delete cascade,
  relation_type text not null, to_entity_id uuid not null references public.jia_world_entities(id) on delete cascade,
  confidence numeric not null default 0.5 check (confidence between 0 and 1), source_refs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), unique(user_id,from_entity_id,relation_type,to_entity_id)
);
create table if not exists public.jia_action_runs (
  id uuid primary key default gen_random_uuid(), user_id text not null references public."User"(id) on delete cascade,
  goal jsonb not null default '{}'::jsonb, plan jsonb not null default '{}'::jsonb, permission jsonb not null default '{}'::jsonb,
  precondition jsonb not null default '{}'::jsonb, action jsonb not null default '{}'::jsonb, result jsonb,
  verification jsonb, outcome jsonb, status text not null default 'PLANNED' check (status in ('PLANNED','PROPOSED','EXECUTED','VERIFIED','FAILED','REFLECTED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.jia_self_state (
  user_id text primary key references public."User"(id) on delete cascade, state jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now()
);
alter table public.jia_memory enable row level security;
alter table public.jia_beliefs enable row level security;
alter table public.jia_predictions enable row level security;
alter table public.jia_reflections enable row level security;
alter table public.jia_world_entities enable row level security;
alter table public.jia_world_relations enable row level security;
alter table public.jia_action_runs enable row level security;
alter table public.jia_self_state enable row level security;
revoke all on public.jia_memory,public.jia_beliefs,public.jia_predictions,public.jia_reflections,public.jia_world_entities,public.jia_world_relations,public.jia_action_runs,public.jia_self_state from anon,authenticated;
