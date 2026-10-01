-- One account gets one and only one 30-credit J’IA welcome grant,
-- regardless of whether the account is Talent or Recruiter.
create or replace function public.claim_ai_welcome_credit(
  p_user_id text,
  p_role text
)
returns table (
  granted boolean,
  credits integer,
  granted_at timestamptz
)
language plpgsql
set search_path = public
as $$
declare
  v_user "User"%rowtype;
begin
  select *
    into v_user
  from "User"
  where id = p_user_id
  for update;

  if not found then
    return;
  end if;

  if upper(coalesce(v_user.role::text, '')) <> upper(p_role) then
    granted := false;
    credits := coalesce(v_user."aiWelcomeCredits", 0);
    granted_at := v_user."aiWelcomeGrantedAt";
    return next;
    return;
  end if;

  if v_user."aiWelcomeGrantedAt" is null
     and coalesce(v_user."aiWelcomeCredits", 0) = 0 then
    update "User"
       set "aiWelcomeCredits" = 30,
           "aiWelcomeGrantedAt" = now(),
           "updatedAt" = now()
     where id = p_user_id
       and "aiWelcomeGrantedAt" is null
       and coalesce("aiWelcomeCredits", 0) = 0
    returning true, "aiWelcomeCredits", "aiWelcomeGrantedAt"
      into granted, credits, granted_at;

    if found then
      return next;
      return;
    end if;
  end if;

  granted := false;
  credits := coalesce(v_user."aiWelcomeCredits", 0);
  granted_at := v_user."aiWelcomeGrantedAt";
  return next;
end;
$$;

revoke all on function public.claim_ai_welcome_credit(text, text) from public;
revoke all on function public.claim_ai_welcome_credit(text, text) from anon;
revoke all on function public.claim_ai_welcome_credit(text, text) from authenticated;
grant execute on function public.claim_ai_welcome_credit(text, text) to service_role;
