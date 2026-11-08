import assert from "node:assert/strict";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

const PROJECT_REF = "ofqqrryamslxoqkklraw";
const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, "artifacts", "e2e", "authenticated-role-preflight-safe.json");

async function exists(file) {
  try { await access(file); return true; } catch { return false; }
}

function parseEnv(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    result[match[1]] = value;
  }
  return result;
}

function gitValue(args) {
  try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore" ] }).trim() || null; }
  catch { return null; }
}

const config = {};
const configFiles = [];
for (const file of [".env", ".env.local", ".env.e2e.local"]) {
  const full = path.join(ROOT, file);
  if (!(await exists(full))) continue;
  Object.assign(config, parseEnv(await readFile(full, "utf8")));
  configFiles.push(file);
}
Object.assign(config, process.env);

const configuredUrl = config.NEXT_PUBLIC_SUPABASE_URL || config.SUPABASE_URL || "";
let urlMatches = false;
try { urlMatches = new URL(configuredUrl).hostname === PROJECT_REF + ".supabase.co"; } catch {}
const projectRefMatches = config.E2E_PROJECT_REF === PROJECT_REF;
const serviceRoleKeyPresent = typeof config.SUPABASE_SERVICE_ROLE_KEY === "string" && config.SUPABASE_SERVICE_ROLE_KEY.length >= 20;
const secretKeyPresent = typeof config.SUPABASE_SECRET_KEY === "string" && config.SUPABASE_SECRET_KEY.startsWith("sb_secret_");
const privilegedServerKeyPresent = serviceRoleKeyPresent || secretKeyPresent;

let runtimeFilePresent = await exists(path.join(ROOT, ".e2e-fixture-runtime.json"));
let runtimeJsonValid = false;
let runtimeProjectMatches = false;
let runtimeServiceRoleKeyPresent = false;
if (runtimeFilePresent) {
  try {
    const runtime = JSON.parse(await readFile(path.join(ROOT, ".e2e-fixture-runtime.json"), "utf8"));
    runtimeJsonValid = true;
    runtimeProjectMatches = runtime.environment === "JOBLY-E2E" && runtime.projectRef === PROJECT_REF;
    runtimeServiceRoleKeyPresent = typeof runtime.serviceRoleKey === "string" && runtime.serviceRoleKey.length >= 20;
  } catch {}
}

let fixtureFilePresent = await exists(path.join(ROOT, ".e2e-fixtures.json"));
let fixturesValid = false;
if (fixtureFilePresent) {
  try {
    const fixtures = JSON.parse(await readFile(path.join(ROOT, ".e2e-fixtures.json"), "utf8"));
    const expected = [
      ["talent", "TALENT", "jobly-e2e-talent@jobly.test"],
      ["recruiter", "RECRUITER", "jobly-e2e-recruiter@jobly.test"],
      ["partner", "PARTNER", "jobly-e2e-partner@jobly.test"],
    ];
    fixturesValid = fixtures.environment === "JOBLY-E2E" && fixtures.projectRef === PROJECT_REF && Array.isArray(fixtures.accounts) &&
      expected.every(([key, role, email]) => {
        const account = fixtures.accounts.find((item) => item?.key === key && item?.role === role && String(item?.email || "").toLowerCase() === email);
        return Boolean(account && typeof account.password === "string" && account.password.length >= 8 && typeof account.authUserId === "string" && account.authUserId.length > 0);
      });
  } catch {}
}

const branch = gitValue(["branch", "--show-current"]);
const localHead = gitValue(["rev-parse", "HEAD"]);
const recipeHead = gitValue(["rev-parse", "origin/e2e/recette"]);
const localSourceMatchesRecipe = Boolean(localHead && recipeHead && localHead === recipeHead);
const appDependencyPresent = await exists(path.join(ROOT, "node_modules", "next", "package.json"));

const report = {
  createdAt: new Date().toISOString(),
  environment: "JOBLY-E2E",
  projectRef: PROJECT_REF,
  configFilesFound: configFiles,
  supabaseUrlMatchesE2E: urlMatches,
  projectRefMatchesE2E: projectRefMatches,
  privilegedServerKeyConfiguredForNextServer: privilegedServerKeyPresent,
  legacyServiceRoleKeyPresent: serviceRoleKeyPresent,
  modernSecretKeyAcceptedByServerCode: secretKeyPresent,
  fixtureFilePresent: fixtureFilePresent,
  fixturesValid: fixturesValid,
  runtimeFilePresent: runtimeFilePresent,
  runtimeJsonValid: runtimeJsonValid,
  runtimeProjectMatchesE2E: runtimeProjectMatches,
  runtimeServiceRoleKeyPresent: runtimeServiceRoleKeyPresent,
  gitBranch: branch,
  localHead: localHead,
  originRecipeHead: recipeHead,
  localSourceMatchesRecipe: localSourceMatchesRecipe,
  nextDependencyPresent: appDependencyPresent,
  readiness: {
    roleApiServer: urlMatches && projectRefMatches && privilegedServerKeyPresent && fixtureFilePresent && fixturesValid && localSourceMatchesRecipe && appDependencyPresent ? "READY_TO_PREPARE" : "BLOCKED",
    crossRoleApplicationLifecycle: urlMatches && projectRefMatches && privilegedServerKeyPresent && fixtureFilePresent && fixturesValid && localSourceMatchesRecipe && appDependencyPresent ? "READY_TO_PREPARE" : "BLOCKED",
  },
  secretsPrinted: false,
  networkCallsMade: false,
  remoteDataModified: false,
  accountsOrProfilesModified: false,
  notes: [
    "Diagnostic local uniquement : aucune requête Supabase/API ni mutation distante.",
    "lib/server-auth.ts accepte désormais SUPABASE_SECRET_KEY (sb_secret_) ou SUPABASE_SERVICE_ROLE_KEY (legacy), côté serveur uniquement.",
    "Le parcours croisé utilise maintenant la clé serveur JOBLY-E2E issue de l’environnement local ; .e2e-fixture-runtime.json n’est plus un prérequis.",
  ],
};
await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", { encoding: "utf8", mode: 0o600 });
console.log(JSON.stringify(report, null, 2));
console.log("Rapport : artifacts/e2e/authenticated-role-preflight-safe.json");
assert.equal(report.projectRef, PROJECT_REF);