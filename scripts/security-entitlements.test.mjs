import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("J'IA proactive prediction uses the shared account and IP limiter before context or LLM work", () => {
  const route = read("../app/api/jia/predict/route.ts");
  assert.match(route, /enforceApiRateLimit/);
  assert.match(route, /scope: "jia-predict"/);
  assert.match(route, /identity: auth\.id/);
  assert.match(route, /accountWindows:[\s\S]*?windowSeconds: 60[\s\S]*?windowSeconds: 3600/);
  assert.match(route, /ipWindows:[\s\S]*?windowSeconds: 60[\s\S]*?windowSeconds: 3600/);
  assert.match(route, /requireIp: true/);
  assert.ok(route.indexOf("if (rateLimited) return rateLimited;") < route.indexOf("buildJiaContext("));
  assert.ok(route.indexOf("if (rateLimited) return rateLimited;") < route.indexOf("generateText("));
  assert.doesNotMatch(route, /rateStore|RATE_WINDOW_MS|RATE_MAX/);
});

test("Career Journey reassessment is a START+ periodic review and has shared abuse limits", () => {
  const route = read("../app/api/career-journey/reassess/route.ts");
  assert.match(route, /getCareerJourneyEntitlements/);
  assert.match(route, /if \(!entitlement\.canPeriodicReview\)/);
  assert.match(route, /requiredPlan: "START"/);
  assert.match(route, /scope: "career-reassess"/);
  assert.match(route, /accountWindows:[\s\S]*?windowSeconds: 86400[\s\S]*?windowSeconds: 604800/);
  assert.match(route, /requireIp: true/);
  assert.ok(route.indexOf("if (rateLimited) return rateLimited;") < route.indexOf("generateJourneyRecommendations("));
  assert.ok(route.indexOf("if (rateLimited) return rateLimited;") < route.indexOf('.from("CareerReview").insert'));
});

test("batch applications cannot bypass per-plan bulk or weekly submission quotas", () => {
  const route = read("../app/api/applications/batch/route.ts");
  assert.match(route, /checkBulkApplicationLimit/);
  assert.match(route, /checkWeeklyApplicationQuota/);
  assert.match(route, /if \(!bulk\.allowed\)/);
  assert.match(route, /if \(!weekly\.allowed \|\| offers\.length > remaining\)/);
  assert.ok(route.indexOf("checkBulkApplicationLimit(") < route.indexOf('.from("ApplicationBatch").insert'));
  assert.ok(route.indexOf("checkWeeklyApplicationQuota(") < route.indexOf('.from("ApplicationBatch").insert'));
  assert.doesNotMatch(route, /body\.offers\) \? body\.offers\.slice\(0, 20\)/);
});

test("Gmail token storage and use require a recruiter role and Premium or Pro entitlement", () => {
  const gmail = read("../lib/gmailServer.ts");
  assert.match(gmail, /getActivePlanCode/);
  assert.match(gmail, /hasRecruiterGmailEntitlement/);
  assert.match(gmail, /new Set\(\["PREMIUM", "PRO"\]\)/);
  assert.match(gmail, /\["RECRUITER", "ADMIN"\]\.includes/);
  assert.match(gmail, /async function assertRecruiterGmailEntitlement/);
  assert.ok(gmail.indexOf("await assertRecruiterGmailEntitlement(context);", gmail.indexOf("export async function saveGmailTokens")) > -1);
  assert.ok(gmail.indexOf("await assertRecruiterGmailEntitlement(context);", gmail.indexOf("export async function getGmailAccessToken")) > -1);
});


test("recruiter talent discovery does not expose expired paid-media entitlements and is rate-limited", () => {
  const route = read("../app/api/recruiter/talents/route.ts");
  assert.match(route, /isEligibleSubscription\(subscription, now\.getTime\(\)\)/);
  assert.match(route, /currentPeriodEnd,trialEndsAt/);
  assert.match(route, /status", \["ACTIVE", "TRIAL"\]/);
  assert.match(route, /PromoRedemption/);
  assert.match(route, /grantedplan/);
  assert.match(route, /startsat/);
  assert.match(route, /endsat/);
  assert.match(route, /revokedat/);
  assert.match(route, /scope: "recruiter-talents"/);
  assert.match(route, /accountWindows:/);
  assert.match(route, /ipWindows:/);
  assert.match(route, /requireIp: true/);
  assert.match(route, /advertisingEligible: isPaidMediaEligible/);
});


test("Brand Ambassador onboarding never self-verifies identity and admin review is audited", () => {
  const onboarding = read("../app/api/partner/ba-onboarding/route.ts");
  const review = read("../app/api/admin/partners/kyc/route.ts");
  const reviewUi = read("../app/admin/partners/kyc/page.tsx");
  const partnerUi = read("../app/partner/onboarding/page.tsx");
  assert.match(onboarding, /status: "SUBMITTED"/);
  assert.match(onboarding, /kycStatus: "PENDING"/);
  assert.doesNotMatch(onboarding, /kycStatus: "VERIFIED"/);
  assert.match(onboarding, /storage\.updateBucket\(BUCKET, options\)/);
  assert.match(onboarding, /public: false/);
  assert.match(onboarding, /fileSizeLimit: 10 \* 1024 \* 1024/);
  assert.match(onboarding, /scope: "partner-ba-kyc-read"/);
  assert.match(onboarding, /scope: "partner-ba-kyc-submit"/);
  assert.match(onboarding, /accountWindows:/);
  assert.match(onboarding, /ipWindows:/);
  assert.match(onboarding, /contentLength > 22 \* 1024 \* 1024/);

  assert.match(review, /String\(user\.role\)\.toUpperCase\(\) !== "ADMIN"/);
  assert.match(review, /previousPartner\.partnerType && previousPartner\.partnerType !== "BRAND_AMBASSADOR"/);
  assert.match(review, /\.eq\("status", "SUBMITTED"\)/);
  assert.match(review, /\["VERIFIED", "REJECTED"\]/);
  assert.match(review, /createSignedUrl/);
  assert.match(review, /from\("CEOAuditLog"\)\.insert/);
  assert.match(review, /PARTNER_KYC_APPROVED/);
  assert.match(review, /PARTNER_KYC_REJECTED/);
  assert.match(review, /decision === "REJECTED" && note\.length < 8/);
  assert.match(reviewUi, /Valider l’identité/);
  assert.match(partnerUi, /vérification humaine en attente/);
});


test("Distributor metrics count only currently eligible subscriptions and are rate-limited", () => {
  const route = read("../app/api/partner/distributor/route.ts");
  assert.match(route, /isEligibleSubscription/);
  assert.match(route, /currentPeriodEnd,trialEndsAt/);
  assert.match(route, /activeSubscriptions = subscriptions\.filter/);
  assert.match(route, /scope: "partner-distributor-dashboard"/);
  assert.match(route, /accountWindows:/);
  assert.match(route, /ipWindows:/);
  assert.match(route, /requireIp: true/);
});


test("partner profile and commission endpoints have separate shared account and IP limits", () => {
  const profile = read("../app/api/partner/profile/route.ts");
  const commissions = read("../app/api/partner/commissions/route.ts");
  assert.match(profile, /scope: "partner-profile-read"/);
  assert.match(profile, /scope: "partner-profile-update"/);
  assert.match(commissions, /scope: "partner-commissions-read"/);
  for (const source of [profile, commissions]) {
    assert.match(source, /accountWindows:/);
    assert.match(source, /ipWindows:/);
    assert.match(source, /requireIp: true/);
  }
});


test("auth, username and WhatsApp OTP routes use shared anti-abuse controls", () => {
  const usernameCheck = read("../app/api/auth/username/check/route.ts");
  const usernameLogin = read("../app/api/auth/username/login/route.ts");
  const signup = read("../app/api/auth/complete-signup/route.ts");
  const whatsappRequest = read("../app/api/auth/whatsapp/request/route.ts");
  const whatsappVerify = read("../app/api/auth/whatsapp/verify/route.ts");
  assert.match(usernameCheck, /scope: "auth-username-check"/);
  assert.match(usernameLogin, /scope: "auth-username-login"/);
  assert.match(signup, /scope: "auth-complete-signup"/);
  assert.match(whatsappRequest, /scope: "auth-whatsapp-otp-request"/);
  assert.match(whatsappVerify, /scope: "auth-whatsapp-otp-verify"/);
  for (const source of [usernameCheck, usernameLogin, signup, whatsappRequest, whatsappVerify]) {
    assert.match(source, /enforceApiRateLimit/);
    assert.match(source, /requireIp: true/);
  }
  assert.match(whatsappRequest, /identity: "phone:" \+ phoneKey/);
  assert.match(whatsappVerify, /identity: "phone:" \+ phoneKey/);
  assert.match(whatsappVerify, /\^\\d\{4,8\}\$/);
});

test("Premium talent media routes resolve live entitlements and rate-limit uploads", () => {
  const ad = read("../app/api/auth/talent-ad/route.ts");
  const pitch = read("../app/api/auth/video-pitch/route.ts");
  const showcase = read("../app/api/auth/talent-showcase/route.ts");
  const showcaseImage = read("../app/api/auth/talent-showcase/image/route.ts");
  assert.match(ad, /getActivePlanCode\(supabase, user\.id, "TALENT"\)/);
  assert.match(pitch, /getActivePlanCode\(supabase, user\.id, "TALENT"\)/);
  assert.match(showcase, /getActivePlanCode\(supabase, user\.id, "TALENT"\)/);
  assert.doesNotMatch(ad + pitch + showcase, /\.select\("plan,updatedAt"\)/);
  for (const source of [ad, pitch, showcase, showcaseImage]) {
    assert.match(source, /enforceApiRateLimit/);
    assert.match(source, /accountWindows:/);
    assert.match(source, /ipWindows:/);
    assert.match(source, /requireIp: true/);
  }
  assert.match(ad, /hasValidVideoSignature/);
  assert.match(pitch, /hasValidVideoSignature/);
  assert.match(showcaseImage, /hasValidImageSignature/);
});

test("profile photo uploads are allow-listed, signature checked, and rate-limited", () => {
  const route = read("../app/api/auth/profile-photo/route.ts");
  assert.match(route, /scope: "auth-profile-photo-upload"/);
  assert.match(route, /allowedImageTypes/);
  assert.match(route, /hasJpeg/);
  assert.match(route, /hasPng/);
  assert.match(route, /hasWebp/);
  assert.match(route, /requireIp: true/);
});
