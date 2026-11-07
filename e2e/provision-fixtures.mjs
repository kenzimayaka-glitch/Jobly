import { randomUUID } from "node:crypto";
import { chmod, writeFile } from "node:fs/promises";
import path from "node:path";

const expectedRef = "ofqqrryamslxoqkklraw";
const expectedUrl = "https://" + expectedRef + ".supabase.co";
const ref = process.env.E2E_PROJECT_REF ?? "";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const output = path.resolve(".e2e-fixtures.json");

if (ref !== expectedRef || url !== expectedUrl) {
  throw new Error("Refus de provisionner : seul JOBLY-E2E est autorisé.");
}
if (!key.startsWith("sb_publishable_")) {
  throw new Error("Clé publishable JOBLY-E2E absente.");
}

const sessionFile = await import("node:fs/promises").then(({ readFile }) =>
  readFile(path.resolve(".e2e-admin-session.json"), "utf8").then(JSON.parse).catch(() => null)
);
const adminAccessToken = process.env.E2E_ADMIN_ACCESS_TOKEN ?? sessionFile?.access_token ?? "";
if (!adminAccessToken) {
  throw new Error("SESSION_ADMIN_E2E_REQUISE : aucun token Admin JOBLY-E2E n'est disponible dans E2E_ADMIN_ACCESS_TOKEN ou .e2e-admin-session.json.");
}

const runId = randomUUID();
const response = await fetch(expectedUrl + "/functions/v1/e2e-fixture-provision", {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: "Bearer " + adminAccessToken,
    "Content-Type": "application/json",
    "x-e2e-run-id": runId,
  },
  body: JSON.stringify({ runId }),
  signal: AbortSignal.timeout(45000),
  cache: "no-store",
});

const body = await response.json().catch(() => ({}));
if (!response.ok || body.status !== "PASS" || body.projectRef !== expectedRef || body.runId !== runId) {
  const detail = typeof body.detail === "string" ? body.detail : body.error ?? "Réponse de provisionnement invalide";
  throw new Error("Provisionnement JOBLY-E2E refusé (HTTP " + response.status + ") : " + detail);
}

const roles = ["TALENT", "RECRUITER", "PARTNER"];
if (!Array.isArray(body.accounts) || body.accounts.length !== roles.length ||
    roles.some((role) => !body.accounts.some((account) => account.role === role && typeof account.password === "string"))) {
  throw new Error("Le provisionneur n'a pas retourné exactement les trois comptes métier attendus.");
}

const fixtureFile = {
  schemaVersion: 1,
  environment: "JOBLY-E2E",
  projectRef: expectedRef,
  runId,
  createdAt: new Date().toISOString(),
  accounts: body.accounts,
};
await writeFile(output, JSON.stringify(fixtureFile, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
if (process.platform !== "win32") await chmod(output, 0o600);

console.log(JSON.stringify({
  status: "PASS",
  gate: "JOBLY-E2E-FIXTURE-PROVISION",
  runId,
  accounts: body.accounts.map(({ key: accountKey, role }) => ({ key: accountKey, role })),
  credentialsStoredLocally: true,
  externalMessagesSent: false,
}, null, 2));
