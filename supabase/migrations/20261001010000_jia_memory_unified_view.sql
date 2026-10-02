-- Unified server-only read model for legacy JiaMemory and the durable cognitive memory.
drop view if exists public.jia_memory_unified;
create view public.jia_memory_unified
with (security_invoker = true)
as
select
  id,
  "userId" as user_id,
  category as memory_type,
  jsonb_build_object('key', key, 'value', value) as content,
  source,
  confidence,
  0.5::numeric as importance,
  0.5::numeric as relevance,
  "createdAt" as first_seen_at,
  "lastObservedAt" as last_seen_at,
  null::timestamptz as expires_at,
  null::text as contradiction_key,
  1::integer as recurrence_count,
  0.5::numeric as future_utility,
  "createdAt" as created_at,
  "updatedAt" as updated_at,
  'LEGACY'::text as storage_kind
from public."JiaMemory"
union all
select
  id,
  user_id,
  memory_type,
  content,
  source,
  confidence,
  importance,
  relevance,
  first_seen_at,
  last_seen_at,
  expires_at,
  contradiction_key,
  recurrence_count,
  future_utility,
  created_at,
  updated_at,
  'COGNITIVE'::text as storage_kind
from public.jia_memory;

revoke all on public.jia_memory_unified from anon, authenticated;
grant select on public.jia_memory_unified to service_role;
