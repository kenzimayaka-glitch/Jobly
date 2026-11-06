-- Android hardware-backed key attestation: challenges are one-use and attestations
-- are service-role-only. No client-side access is granted to these records.
create table if not exists public."AndroidAttestationChallenge" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" text not null references public."User"("id") on delete cascade,
  "deviceId" text not null,
  "challengeHash" text not null,
  "purpose" text not null default 'REGISTER',
  "expiresAt" timestamptz not null,
  "usedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  constraint "AndroidAttestationChallenge_device_length" check (length("deviceId") between 1 and 160),
  constraint "AndroidAttestationChallenge_hash_length" check (length("challengeHash") = 64),
  constraint "AndroidAttestationChallenge_purpose_check" check ("purpose" in ('REGISTER', 'REQUEST'))
);

create index if not exists "AndroidAttestationChallenge_user_device_idx"
  on public."AndroidAttestationChallenge" ("userId", "deviceId", "createdAt" desc);

create index if not exists "AndroidAttestationChallenge_expiry_idx"
  on public."AndroidAttestationChallenge" ("expiresAt");

create table if not exists public."AndroidDeviceAttestation" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" text not null references public."User"("id") on delete cascade,
  "deviceId" text not null,
  "publicKeyPem" text not null,
  "certificateFingerprintSha256" text not null,
  "securityLevel" text not null,
  "verifiedBootState" text not null,
  "deviceLocked" boolean not null,
  "packageName" text not null,
  "verifiedAt" timestamptz not null,
  "expiresAt" timestamptz not null,
  "revokedAt" timestamptz,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  constraint "AndroidDeviceAttestation_device_key" unique ("userId", "deviceId"),
  constraint "AndroidDeviceAttestation_security_level_check"
    check ("securityLevel" in ('TRUSTED_ENVIRONMENT', 'STRONGBOX')),
  constraint "AndroidDeviceAttestation_boot_state_check"
    check ("verifiedBootState" = 'VERIFIED'),
  constraint "AndroidDeviceAttestation_package_check"
    check ("packageName" = 'com.jobly.android'),
  constraint "AndroidDeviceAttestation_fingerprint_check"
    check (length("certificateFingerprintSha256") = 95)
);

create index if not exists "AndroidDeviceAttestation_active_idx"
  on public."AndroidDeviceAttestation" ("userId", "deviceId", "expiresAt")
  where "revokedAt" is null;

alter table public."AndroidAttestationChallenge" enable row level security;
alter table public."AndroidDeviceAttestation" enable row level security;
revoke all on table public."AndroidAttestationChallenge" from public, anon, authenticated;
revoke all on table public."AndroidDeviceAttestation" from public, anon, authenticated;
grant all on table public."AndroidAttestationChallenge" to service_role;
grant all on table public."AndroidDeviceAttestation" to service_role;
