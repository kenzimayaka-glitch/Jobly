update public."JiaMemory" set category='interaction_style' where category='behavior';
do $$ begin
  alter table public."JiaMemory" drop constraint if exists jia_memory_category_check;
  alter table public."JiaMemory" add constraint jia_memory_category_check check (category in ('career','mobility','campus','community','financial_signal','interaction_style'));
exception when duplicate_object then null; end $$;
create index if not exists jia_memory_confidence_idx on public."JiaMemory" ("userId",confidence,"lastObservedAt" desc);
create or replace function public.purge_jia_memory(p_user_id text) returns void language plpgsql security definer set search_path=public as $$
begin
  if auth.uid()::text <> p_user_id then raise exception 'NOT_AUTHORIZED'; end if;
  delete from public."JiaMemory" where "userId"=p_user_id;
end; $$;
revoke all on function public.purge_jia_memory(text) from public,anon;
grant execute on function public.purge_jia_memory(text) to authenticated;
