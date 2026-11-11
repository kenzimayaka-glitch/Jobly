import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const after = (source, marker) => {
  const index = source.indexOf(marker);
  assert.ok(index >= 0, `Missing source marker: ${marker}`);
  return source.slice(index);
};

test("CV import accepts only PDF uploads and requires an authenticated session before privileged processing", () => {
  const route = read("app/api/talent/cv/import/route.ts");
  const handler = after(route, "export async function POST");
  assert.match(handler, /const contentType = request\.headers\.get\("content-type"\) \|\| ""/);
  assert.match(handler, /contentType\.includes\("multipart\/form-data"\)/);
  assert.ok(handler.indexOf("multipart/form-data") < handler.indexOf("request.formData()"));
  assert.match(handler, /file\.type !== "application\/pdf".*file\.name\.toLowerCase\(\)\.endsWith\("\.pdf"\)/s);
  assert.match(handler, /const authUser = await getAuthUser\(request\)/);
  assert.match(handler, /if \(!authUser\)/);
  assert.ok(handler.indexOf("getAuthUser(request)") < handler.indexOf("adminClient()"));
  assert.ok(handler.indexOf("getAuthUser(request)") < handler.indexOf('import("pdf-parse")'));
  assert.match(handler, /const maxBytes = plan === "FREE" \? FREE_MAX_BYTES : PAID_MAX_BYTES/);
  assert.match(handler, /return NextResponse\.json\(\{\s*error: "PDF_TOO_LARGE"/);
});

test("CV import keeps extraction preview separate from saving the original and preserves deterministic extraction when AI quota is exhausted", () => {
  const route = read("app/api/talent/cv/import/route.ts");
  const handler = after(route, "export async function POST");
  assert.match(handler, /Import is preview-only: durable original-file persistence happens only after the user explicitly clicks "Enregistrer"/);
  assert.match(handler, /const deterministicCv = \{ \.\.\.extractDeterministicCv\(cvText\), photoDataUrl: extractedPhoto \}/);
  assert.match(handler, /if \(ai\.status === 429\)/);
  assert.match(handler, /aiQuotaExceeded: true/);
  assert.match(handler, /cv: deterministicCv/);
  assert.doesNotMatch(handler, /storage\.from\("talent-cvs"\)\.upload/);
});

test("CV Studio refreshes an expired session, sends the bearer token and lets the Talent review extracted fields", () => {
  const page = read("app/cv/page.tsx");
  assert.match(page, /supabase\.auth\.getSession\(\)/);
  assert.match(page, /supabase\.auth\.refreshSession\(\)/);
  assert.match(page, /Authorization: `Bearer \$\{token\}`/);
  assert.match(page, /fetch\("\/api\/talent\/cv\/import"/);
  assert.match(page, /if \(response\.status === 401\)/);
  assert.match(page, /setCv\(\(current\) => \(\{ \.\.\.current, \.\.\.result\.cv \}\)\)/);
  assert.match(page, /Vérifiez et corrigez les informations avant de générer votre version finale/);
  assert.match(page, /value=\{String\(cv\[key\]\)\}/);
});

test("saving the original CV validates the real PDF signature, isolates storage by user and rolls back failed metadata writes", () => {
  const route = read("app/api/talent/cv/original/route.ts");
  const post = after(route, "export async function POST");
  assert.match(post, /getAuthUser\(request\)/);
  assert.match(post, /bytes\.length > 3 \* 1024 \* 1024/);
  assert.match(post, /bytes\.subarray\(0, 5\)\.toString\("ascii"\) !== "%PDF-"/);
  assert.match(post, /const storagePath = `\$\{auth\.id\}\/\$\{crypto\.randomUUID\(\)\}\.pdf`/);
  assert.match(post, /upload\(storagePath, bytes, \{ contentType: "application\/pdf", upsert: false \}\)/);
  assert.match(post, /\.update\(\{[\s\S]*?cvOriginalStoragePath: storagePath[\s\S]*?\}\)\.eq\("id", user\.id\)/);
  assert.ok(post.indexOf('if (updateError)') < post.indexOf('remove([storagePath])'));
  assert.ok(post.indexOf('if (updateError)') < post.indexOf('remove([previousStoragePath])'));
});

test("reading and deleting the original CV are authenticated and limited to the current account record", () => {
  const route = read("app/api/talent/cv/original/route.ts");
  const get = after(route, "export async function GET");
  const remove = after(route, "export async function DELETE");
  assert.match(get, /getAuthUser\(request\)/);
  assert.match(get, /ensureUser\(admin, auth\)/);
  assert.match(get, /createSignedUrl\(user\.cvOriginalStoragePath, 60\)/);
  assert.match(get, /expiresIn: 60/);
  assert.match(remove, /getAuthUser\(request\)/);
  assert.match(remove, /remove\(\[user\.cvOriginalStoragePath\]\)/);
  assert.match(remove, /\.update\(\{ cvOriginalStoragePath: null/);
  assert.match(remove, /\.eq\("id", user\.id\)/);
});

test("CV export is private and requires an owner-matched, correctly scoped, confirmed payment when not included in the plan", () => {
  const route = read("app/api/talent/cv/export/route.ts");
  const handler = after(route, "export async function POST");
  assert.match(handler, /getAuthUser\(request\)/);
  assert.match(handler, /getActivePlanCode\(sb, user\.id, "TALENT"\)/);
  assert.match(handler, /\.eq\("id", paymentId\)/);
  assert.match(handler, /\.eq\("userId", user\.id\)/);
  assert.match(handler, /payment\.currency !== "XAF"/);
  assert.match(handler, /payment\.subscriptionId !== null/);
  assert.match(handler, /payment\.feature !== `CV_\$\{service\}_DOWNLOAD`/);
  assert.match(handler, /payment\.status !== "SUCCESSFUL"/);
  assert.match(handler, /ACCESS_WINDOW_MS/);
  assert.match(handler, /"Content-Type": "application\/pdf"/);
  assert.match(handler, /"Cache-Control": "private, no-store"/);
});

test("Career Journey evidence is a read-only CV source and exposes only verified, candidate-accepted material", () => {
  const route = read("app/api/talent/cv/career-evidence/route.ts");
  assert.match(route, /export async function GET/);
  assert.match(route, /getAuthUser\(request\)/);
  assert.match(route, /\.eq\("userId", user\.id\)/);
  assert.match(route, /\.eq\("acceptedByUser", true\)/);
  assert.match(route, /\.eq\("verified", true\)/);
  assert.match(route, /\.eq\("visibleOnCv", true\)/);
  assert.match(route, /sourceOfTruth: "CareerJourney"/);
  assert.match(route, /readOnly: true/);
  assert.match(route, /cvStudioMustRequestExplicitSelectionBeforePersisting: true/);
  assert.doesNotMatch(route, /\.from\("User"\)\.update\(|\.from\("CareerEvidence"\)\.update\(|\.from\("CareerPortfolioItem"\)\.update\(/);
});

test("Talent discoverability settings require the Talent role and upsert only the authenticated user's preference", () => {
  const route = read("app/api/talent/discoverability/route.ts");
  const handler = after(route, "export async function POST");
  assert.match(handler, /getAuthUser\(req\)/);
  assert.match(handler, /String\(user\.role \|\| ""\)\.toUpperCase\(\) !== "TALENT"/);
  assert.match(handler, /\.from\("Profile"\)\.select\("id"\)\.eq\("userId", user\.id\)/);
  assert.match(handler, /\{ userId: user\.id, publicDiscoverable \}/);
  assert.match(handler, /upsert\(payload, \{ onConflict: "userId" \}\)/);
});

test("application preparation is owner-scoped, requires a minimum CV profile and starts in candidate review", () => {
  const route = read("app/api/applications/route.ts");
  const get = after(route, "export async function GET");
  const post = after(route, "export async function POST");
  assert.match(get, /getAuthUser\(request\)/);
  assert.match(get, /\.from\("Application"\)\.select\("\*"\)\.eq\("userId",user\.id\)/);
  assert.match(post, /getAuthUser\(request\)/);
  assert.match(post, /\.from\("Profile"\)[\s\S]*?\.eq\("userId",user\.id\)/);
  assert.match(post, /\.from\("Experience"\)[\s\S]*?\.eq\("userId",user\.id\)/);
  assert.match(post, /\.from\("Skill"\)[\s\S]*?\.eq\("userId",user\.id\)/);
  assert.match(post, /\.from\("Education"\)[\s\S]*?\.eq\("userId",user\.id\)/);
  assert.match(post, /if \(!hasCvProfileData\)/);
  assert.match(post, /code:"CV_PROFILE_MISSING"/);
  assert.match(post, /status="USER_REVIEW"/);
  assert.match(post, /statusSource:"CANDIDATE",officialListingConsent:false/);
  assert.match(post, /create_application_with_quota/);
  assert.match(post, /DUPLICATE_APPLICATION/);
});

test("candidate application PATCH is owner-scoped and cannot overwrite a recruiter decision", () => {
  const route = read("app/api/applications/[id]/route.ts");
  const handler = after(route, "export async function PATCH");
  assert.match(handler, /getAuthUser\(req\)/);
  assert.match(route, /\.eq\("id", id\)\.eq\("userId", userId\)/);
  assert.match(handler, /existing\.statusSource === "RECRUITER"/);
  assert.match(handler, /payload\.status = b\.status/);
  assert.match(handler, /payload\.statusSource = "CANDIDATE"/);
  assert.match(handler, /existing\.status === "DISCOVERED"/);
  assert.match(handler, /existing\.status === "SUBMITTED" \|\| existing\.status === "ACKNOWLEDGED"/);
  assert.match(handler, /\.eq\("id", id\)\.eq\("userId", user\.id\)/);
});

test("candidate submission rejects external/manual channels before quota claim and Gmail delivery", () => {
  const route = read("app/api/applications/[id]/submit/route.ts");
  const handler = after(route, "export async function POST");
  const channelGuard = handler.indexOf('if (requestedChannel !== "EMAIL")');
  const quotaCheck = handler.indexOf("checkWeeklyApplicationQuota");
  const claim = handler.indexOf('status: "SUBMITTING"');
  assert.match(handler, /getAuthUser\(request\)/);
  assert.match(handler, /\.eq\("id", id\)\.eq\("userId", user\.id\)/);
  assert.ok(channelGuard >= 0 && quotaCheck > channelGuard && claim > channelGuard);
  assert.match(handler, /MANUAL_CHANNEL_REQUIRED/);
  assert.match(handler, /sendGmail\(/);
  assert.match(handler, /emailSent = true/);
});

test("application batches are owner-scoped, capped at 20 and protected by both bulk and weekly quotas", () => {
  const route = read("app/api/applications/batch/route.ts");
  const get = after(route, "export async function GET");
  const post = after(route, "export async function POST");
  const patch = after(route, "export async function PATCH");
  assert.match(get, /getAuthUser\(request\)/);
  assert.match(get, /\.eq\("userId", user\.id\)/);
  assert.match(post, /getAuthUser\(request\)/);
  assert.match(post, /if \(offers\.length > 20\)/);
  assert.match(post, /checkBulkApplicationLimit\(supabase, user\.id, offers\.length\)/);
  assert.match(post, /checkWeeklyApplicationQuota\(supabase, user\.id\)/);
  assert.match(post, /userId: user\.id/);
  assert.match(post, /status: "DRAFT"/);
  assert.match(post, /if \(error\)[\s\S]*?\.delete\(\)\.eq\("id", batchId\)\.eq\("userId", user\.id\)/);
  assert.match(patch, /\["READY_FOR_REVIEW","SENDING","COMPLETED","PARTIAL_FAILURE"\]/);
  assert.match(patch, /\.eq\("id", batchId\)\.eq\("userId", user\.id\)/);
});

test("application-letter import is authenticated, size-limited and restricted to PDF or DOCX", () => {
  const route = read("app/api/applications/letter-import/route.ts");
  const handler = after(route, "export async function POST");
  assert.match(handler, /getAuthUser\(request\)/);
  assert.match(route, /const MAX_BYTES = 5 \* 1024 \* 1024/);
  assert.match(handler, /file\.size > MAX_BYTES/);
  assert.match(handler, /ext === "pdf"/);
  assert.match(handler, /ext === "docx"/);
  assert.match(handler, /ext === "doc"/);
  assert.match(handler, /status: 415/);
  assert.match(handler, /MAX_TEXT/);
});

test("CV Studio exposes original-file save and an actionable PDF download without bypassing plan or payment verification", () => {
  const page = read("app/cv/page.tsx");
  const exportRoute = read("app/api/talent/cv/export/route.ts");
  const paymentRoute = read("app/api/talent/cv/payment/route.ts");
  assert.match(page, /async function authenticatedFetch\(/);
  assert.match(page, /if \(response.status === 401\)/);
  assert.match(page, /async function saveOriginalCv\(\)/);
  assert.match(page, /authenticatedFetch\("\/api\/talent\/cv\/original"/);
  assert.match(page, /async function downloadCv\(/);
  assert.match(page, /downloadCv\(paymentOverride: string \| null = paymentId, allowExistingBusy = false\)/);
  assert.match(page, /downloadCv\(null, true\)/);
  assert.match(page, /downloadCv\(paymentId, true\)/);
  assert.match(page, /authenticatedFetch\("\/api\/talent\/cv\/export"/);
  assert.match(page, /URL\.createObjectURL\(pdf\)/);
  assert.match(page, /link\.download = filename/);
  assert.doesNotMatch(page, /<button type="button" disabled className="cursor-not-allowed rounded-xl bg-slate-200/);
  assert.match(page, /authenticatedFetch\("\/api\/talent\/cv\/payment"/);
  assert.match(page, /Idempotency-Key/);
  assert.match(page, /encodeURIComponent\(paymentId\) \+ "\/verify"/);
  assert.match(exportRoute, /payment\.status !== "SUCCESSFUL"/);
  assert.match(exportRoute, /payment\.feature !==/);
  assert.match(paymentRoute, /CV_ATS_DOWNLOAD/);
  assert.match(paymentRoute, /CV_OPTIMIZED_DOWNLOAD/);
});
