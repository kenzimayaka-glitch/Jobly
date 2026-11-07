-- Persist the in-app notification preference at account level.
alter table public."User"
  add column if not exists "notificationsEnabled" boolean not null default true;

comment on column public."User"."notificationsEnabled" is
  'Controls delivery in the in-app Jobly notification center. Notification history remains persisted while disabled.';
