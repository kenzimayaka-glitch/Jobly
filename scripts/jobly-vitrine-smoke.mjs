#!/usr/bin/env node
/**
 * Public Jobly vitrine smoke test.
 * Usage: JOBLY_VITRINE_BASE_URL=https://<preview>.vercel.app node scripts/jobly-vitrine-smoke.mjs
 * No credentials are required. The script checks only public GET endpoints.
 */
const baseUrl = new URL(process.env.JOBLY_VITRINE_BASE_URL || "http://localhost:3000");
const failures = [];
const passed = [];
async function request(path) {
  const target = new URL(path, baseUrl);
  // Preserve Vercel's temporary share parameter on each same-origin test request.
  for (const [key, value] of baseUrl.searchParams) target.searchParams.set(key, value);
  return fetch(target, {
    method: "GET",
    headers: { Accept: path.endsWith(".webp") ? "image/webp,*/*" : "application/json,text/html,*/*" },
    signal: AbortSignal.timeout(20_000),
    redirect: "follow",
  });
}
function pass(name, detail = "") { passed.push({ name, detail }); }
function fail(name, detail = "") { failures.push({ name, detail }); }
async function check(name, path, validate) {
  try {
    const response = await request(path);
    await validate(response);
  } catch (error) {
    fail(name, error instanceof Error ? error.message : String(error));
  }
}
await check("Page vitrine HTTP 200", "/vitrine", async (res) => {
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  for (const marker of [
    'class="jobly-vitrine"', 'id="accueil"', 'id="ecosysteme"',
    'id="temoignages"', 'id="impact"', 'id="partenaires"', "Les opportunités",
  ]) if (!html.includes(marker)) throw new Error(`HTML marker absent: ${marker}`);
  for (const image of ["talent-learning.webp", "recruiter-focus.webp", "partner-network.webp"]) {
    if (!html.includes(`/images/jobly-vitrine/${image}`)) throw new Error(`Card image absent: ${image}`);
  }
  pass("Page vitrine HTTP 200", "HTML complet, sections et images des trois cartes");
});
await check("Entrée application conservée", "/", async (res) => {
  if (![200, 302, 307].includes(res.status)) throw new Error(`HTTP ${res.status}`);
  pass("Entrée application conservée", `HTTP ${res.status}`);
});
for (const name of ["hero-community.webp","talent-learning.webp","recruiter-focus.webp","community-celebration.webp","career-friends.webp","partner-network.webp"]) {
  await check(`Image ${name}`, `/images/jobly-vitrine/${name}`, async (res) => {
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    if (!(res.headers.get("content-type") || "").includes("image/webp")) throw new Error("Content-Type incorrect");
    const bytes = (await res.arrayBuffer()).byteLength;
    if (bytes < 1_000) throw new Error(`Fichier trop petit: ${bytes} octets`);
    pass(`Image ${name}`, `${bytes} octets WebP`);
  });
}
await check("API compteurs synchronisés", "/api/public/home-stats", async (res) => {
  if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 180)}`);
  const data = await res.json();
  if (!Number.isSafeInteger(data.talentsCount) || data.talentsCount < 0) throw new Error("talentsCount invalide");
  if (!Number.isSafeInteger(data.offersCount) || data.offersCount < 0) throw new Error("offersCount invalide");
  if (typeof data.updatedAt !== "string" || Number.isNaN(Date.parse(data.updatedAt))) throw new Error("updatedAt invalide");
  pass("API compteurs synchronisés", `talents=${data.talentsCount}; offres=${data.offersCount}`);
});
await check("API Jobly Success Moments", "/api/public/success-moments", async (res) => {
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.events)) throw new Error("events n'est pas un tableau");
  for (const event of data.events) {
    if (typeof event.id !== "string" || typeof event.occurredAt !== "string" || Number.isNaN(Date.parse(event.occurredAt))) {
      throw new Error("Événement incomplet ou invalide");
    }
    if (Object.keys(event).some((key) => !["id", "occurredAt"].includes(key))) throw new Error("Champ public inattendu");
  }
  pass("API Jobly Success Moments", `${data.events.length} événement(s) anonyme(s)`);
});
await check("Contexte visiteur anonyme", "/api/public/site-context", async (res) => {
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.accountKey !== null || data.role !== null) throw new Error("Le visiteur anonyme ne doit recevoir aucune identité");
  pass("Contexte visiteur anonyme", "aucun identifiant ni rôle retourné");
});
console.log(`\nJobly vitrine smoke test — ${baseUrl}\n`);
for (const item of passed) console.log(`PASS  ${item.name}${item.detail ? " — " + item.detail : ""}`);
for (const item of failures) console.error(`FAIL  ${item.name}${item.detail ? " — " + item.detail : ""}`);
console.log(`\nRésultat : ${passed.length} PASS · ${failures.length} FAIL`);
if (failures.length) process.exitCode = 1;
