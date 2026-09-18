-- Jobly production hardening: ownership RLS + atomic payment finalization.
do $$ begin
  execute 'create policy "User own row select" on public."User" for select to authenticated using (id = auth.uid()::text)';
  execute 'create policy "User own row insert" on public."User" for insert to authenticated with check (id = auth.uid()::text)';
  execute 'create policy "User own row update" on public."User" for update to authenticated using (id = auth.uid()::text) with check (id = auth.uid()::text)';
exception when duplicate_object then null; end $$;
do $$ begin execute 'create policy "Profile own rows" on public."Profile" for all to authenticated using ("userId" = auth.uid()::text) with check ("userId" = auth.uid()::text)'; exception when duplicate_object then null; end $$;
do $$ begin execute 'create policy "Experience own rows" on public."Experience" for all to authenticated using ("userId" = auth.uid()) with check ("userId" = auth.uid())'; exception when duplicate_object then null; end $$;
do $$ begin execute 'create policy "Skill own rows" on public."Skill" for all to authenticated using ("userId" = auth.uid()) with check ("userId" = auth.uid())'; exception when duplicate_object then null; end $$;
do $$ begin execute 'create policy "Education own rows" on public."Education" for all to authenticated using ("userId" = auth.uid()) with check ("userId" = auth.uid())'; exception when duplicate_object then null; end $$;
do $$ begin execute 'create policy "CVShare own rows" on public."CVShare" for all to authenticated using ("userId" = auth.uid()::text) with check ("userId" = auth.uid()::text)'; exception when duplicate_object then null; end $$;
do $$ begin execute 'create policy "Payment own rows" on public."Payment" for select to authenticated using ("userId" = auth.uid()::text)'; exception when duplicate_object then null; end $$;

create or replace function public.finalize_payment(
  p_payment_id text, p_user_id text, p_status text, p_amount integer,
  p_now timestamptz, p_failure_reason text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare v_payment public."Payment"%rowtype; v_sub public."Subscription"%rowtype;
v_partner_id uuid; v_commission public."Commission"%rowtype; v_commission_amount integer:=0;
begin
 select * into v_payment from public."Payment" where id=p_payment_id and "userId"=p_user_id for update;
 if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
 if v_payment.amount<>p_amount then raise exception 'AMOUNT_MISMATCH'; end if;
 if p_status not in ('PENDING','SUCCESSFUL','FAILED') then raise exception 'INVALID_PAYMENT_STATUS'; end if;
 if v_payment.status=p_status then return jsonb_build_object('payment',to_jsonb(v_payment),'commission','null'::jsonb,'idempotent',true); end if;
 if not ((v_payment.status='CREATED' and p_status in ('PENDING','FAILED')) or (v_payment.status='PENDING' and p_status in ('SUCCESSFUL','FAILED'))) then raise exception 'INVALID_PAYMENT_TRANSITION'; end if;
 update public."Payment" set status=p_status,"updatedAt"=p_now,"paidAt"=case when p_status='SUCCESSFUL' then p_now else "paidAt" end,"failureReason"=case when p_status='FAILED' then coalesce(p_failure_reason,'Provider returned FAILED') else "failureReason" end where id=p_payment_id;
 select * into v_payment from public."Payment" where id=p_payment_id;
 if v_payment.subscriptionId is not null and p_status='SUCCESSFUL' then
   select * into v_sub from public."Subscription" where id=v_payment.subscriptionId and "userId"=p_user_id for update;
   if not found then raise exception 'SUBSCRIPTION_NOT_FOUND'; end if;
   update public."Subscription" set status='ACTIVE',"currentPeriodStart"=p_now,"currentPeriodEnd"=case when upper(coalesce("billingInterval",''))='ANNUAL' then p_now+interval '1 year' else p_now+interval '1 month' end,"canceledAt"=null,"updatedAt"=p_now where id=v_sub.id;
   if upper(coalesce(v_sub."productType",''))='RECRUITER' then
     if upper(v_sub."planCode")='PREMIUM' then v_commission_amount:=5000; elsif upper(v_sub."planCode")='PRO' then v_commission_amount:=10000; end if;
     if v_commission_amount>0 then
       select pr."partnerId" into v_partner_id from public."PartnerReferral" pr join public."Partner" pa on pa.id=pr."partnerId" where pr."referredUserId"=v_sub."userId" and pr."accountType"='RECRUITER' and pa."partnerType"='DISTRIBUTOR' limit 1;
       if v_partner_id is not null then
         select * into v_commission from public."Commission" where "partnerId"=v_partner_id and "referredUserId"=v_sub."userId" and "sourceType"='ACQUISITION' limit 1;
         if not found then
           insert into public."Commission"("partnerId",event,amount,currency,status,"sourceType","accountType","planCode","billingInterval","subscriptionId","referredUserId")
           values(v_partner_id,'DISTRIBUTOR_ACQUISITION_'||v_sub."planCode",v_commission_amount,'XAF','GENERATED','ACQUISITION','RECRUITER',v_sub."planCode",v_sub."billingInterval",v_sub.id,v_sub."userId") returning * into v_commission;
         end if;
       end if;
     end if;
   end if;
 elsif v_payment.subscriptionId is not null and p_status='FAILED' then
   update public."Subscription" set status='EXPIRED',"updatedAt"=p_now where id=v_payment.subscriptionId and "userId"=p_user_id;
 end if;
 return jsonb_build_object('payment',to_jsonb(v_payment),'commission',case when v_commission.id is not null then to_jsonb(v_commission) else 'null'::jsonb end,'idempotent',false);
end; $$;
revoke all on function public.finalize_payment(text,text,text,integer,timestamptz,text) from public;
grant execute on function public.finalize_payment(text,text,text,integer,timestamptz,text) to service_role;
