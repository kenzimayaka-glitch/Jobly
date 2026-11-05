-- One Mobility provider account per authenticated Jobly user.
-- A provider account represents one legal service-provider entity/type. Multiple employees
-- of the same provider should be onboarded as dedicated provider users with their own membership.
alter table public."MobilityServiceProvider"
  drop constraint if exists "MobilityServiceProvider_userId_providerType_key";

create unique index if not exists "MobilityServiceProvider_userId_key"
  on public."MobilityServiceProvider" ("userId");
