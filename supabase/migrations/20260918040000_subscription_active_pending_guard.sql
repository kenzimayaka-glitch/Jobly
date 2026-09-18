create unique index "Subscription_userId_productType_active_pending_key"
on public."Subscription" ("userId","productType")
where status in ('ACTIVE','PENDING');
