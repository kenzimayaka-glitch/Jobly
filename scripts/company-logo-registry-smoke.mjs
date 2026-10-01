#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const routePath = resolve("app/api/company-logo/route.ts");
const migrationPath = resolve("supabase/migrations/20261002010000_company_logo_registry.sql");

const route = await readFile(routePath, "utf8");
const migration = await readFile(migrationPath, "utf8");

const checks = [
  ["persistent registry lookup", route.includes('.from("company_logo_registry")')],
  ["domain-first registry key", route.includes('.eq("domain", domain)')],
  ["30-day registry TTL", route.includes("30 * 24 * 60 * 60 * 1000")],
  ["registry write after Logo.dev resolution", route.includes("await saveRegistry({")],
  ["memory cache remains 24h", route.includes("24 * 60 * 60 * 1000")],
  ["Logo.dev brand lookup", route.includes("api.logo.dev/brand/")],
  ["Logo.dev search fallback", route.includes("api.logo.dev/search")],
  ["self-hosting opt-in only", route.includes('process.env.LOGO_DEV_SELF_HOST_ENABLED === "true"')],
  ["Registry RLS enabled", migration.includes("enable row level security")],
  ["anon access revoked", migration.includes("revoke all on public.company_logo_registry from anon, authenticated")],
  ["authenticated access revoked", migration.includes("revoke all on public.company_logo_registry from anon, authenticated")],
  ["service_role access granted", migration.includes("grant all on public.company_logo_registry to service_role")],
  ["no Storage bucket creation in migration", !migration.includes("storage.buckets")],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\\nLogo Registry contract smoke test failed: ${failed} check(s).`);
  process.exit(1);
}

console.log(`\\nLogo Registry contract smoke test passed: ${checks.length}/${checks.length} checks.`);
