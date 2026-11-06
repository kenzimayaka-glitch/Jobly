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
  assert.match(review, /export const dynamic = "force-dynamic"/);
  assert.match(review, /Cache-Control": "private, no-store, max-age=0"/);
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
  assert.ok(usernameLogin.includes('identity: "username:" + username.toLowerCase()'));
  assert.match(usernameLogin, /accountWindows:/);
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


test("recruiter public talent profile gates pitch and advertising video on live plan", () => {
  const route = read("../app/api/recruiter/talents/profile/route.ts");
  assert.match(route, /getActivePlanCode\(supabase, id, "TALENT"\)/);
  assert.match(route, /paidMediaEligible = plan === "PREMIUM" \|\| plan === "PRO"/);
  assert.match(route, /advertisingVideoUrl: paidMediaEligible \? userResult\.data\.advertisingVideoUrl : null/);
  assert.match(route, /pitchVideoUrl: paidMediaEligible \? userResult\.data\.pitchVideoUrl : null/);
  assert.match(route, /scope: "recruiter-talent-profile"/);
  assert.match(route, /publicDiscoverable", true/);
  assert.match(route, /Cache-Control": "private, no-store, max-age=0"/);
});


test("Talent showcase action images are server-gated by active Premium and Pro plan limits", () => {
  const imageUpload = read("../app/api/auth/talent-showcase/image/route.ts");
  const showcase = read("../app/api/auth/talent-showcase/route.ts");
  assert.match(imageUpload, /getActivePlanCode\(supabase, user\.id, "TALENT"\)/);
  assert.match(imageUpload, /plan === "PRO" \? 6 : plan === "PREMIUM" \? 3 : 0/);
  assert.match(imageUpload, /currentImages\.length >= imageLimit/);
  assert.match(showcase, /paidMediaEligible && Array\.isArray\(user\.actionImages\)/);
  assert.match(showcase, /imageLimit = plan === "PRO" \? 6 : plan === "PREMIUM" \? 3 : 0/);
  assert.match(showcase, /candidateImages\.length > imageLimit/);
});


test("Talent profile API is private, bounded and rate-limited", () => {
  const route = read("../app/api/profile/route.ts");
  assert.match(route, /scope: "talent-profile-read"/);
  assert.match(route, /scope: "talent-profile-update"/);
  assert.match(route, /Cache-Control": "private, no-store, max-age=0"/);
  assert.match(route, /contentLength > 128 \* 1024/);
  assert.match(route, /allowedSections/);
  assert.match(route, /length > 50/);
  assert.match(route, /requireIp: true/);
});

test("Recruiter profile cannot be auto-created for an ordinary Talent account", () => {
  const route = read("../app/api/recruiter/profile/route.ts");
  assert.match(route, /\["RECRUITER", "ADMIN"\]\.includes\(role\)/);
  assert.match(route, /if \(!\["RECRUITER", "ADMIN"\]\.includes\(role\) && !profile\)/);
  assert.match(route, /recruiter-profile-read/);
  assert.match(route, /recruiter-profile-update/);
  assert.match(route, /Cache-Control": "private, no-store, max-age=0"/);
  assert.match(route, /profile\.id/);
});

test("recruiter Gmail external actions are separately throttled", () => {
  const connect = read("../app/api/recruiter/gmail/connect/route.ts");
  const send = read("../app/api/recruiter/gmail/send/route.ts");
  const attachment = read("../app/api/recruiter/gmail/attachment/route.ts");
  const importer = read("../app/api/recruiter/gmail/import/route.ts");
  assert.match(connect, /scope: "recruiter-gmail-connect"/);
  assert.match(send, /scope: "recruiter-gmail-send"/);
  assert.match(attachment, /scope: "recruiter-gmail-attachment"/);
  assert.match(importer, /scope: "recruiter-gmail-import"/);
  assert.match(importer, /windowSeconds: 60/);
  assert.match(importer, /windowSeconds: 3600/);
  for (const source of [connect, send, attachment, importer]) {
    assert.match(source, /enforceApiRateLimit/);
    assert.match(source, /requireIp: true/);
  }
});

test("candidate Gmail OAuth and public company lookup are rate-limited", () => {
  const connect = read("../app/api/talent/gmail/connect/route.ts");
  const callback = read("../app/api/talent/gmail/callback/route.ts");
  const company = read("../app/api/company-profile/route.ts");
  assert.match(connect, /scope: "candidate-gmail-connect"/);
  assert.match(callback, /scope: "candidate-gmail-oauth-callback"/);
  assert.match(company, /scope: "public-company-profile-lookup"/);
  assert.match(company, /name.length > 160/);
  for (const source of [connect, callback, company]) {
    assert.match(source, /enforceApiRateLimit/);
    assert.match(source, /requireIp: true/);
  }
});


test("CV import and original PDF storage are rate-limited and validate documents", () => {
  const imported = read("../app/api/talent/cv/import/route.ts");
  const original = read("../app/api/talent/cv/original/route.ts");
  assert.match(imported, /scope: "talent-cv-import"/);
  assert.match(imported, /contentLength > PAID_MAX_BYTES/);
  assert.match(imported, /subarray\(0, 5\)\.toString\("ascii"\) !== "%PDF-"/);
  assert.match(original, /scope: "talent-cv-original-upload"/);
  assert.match(original, /scope: "talent-cv-original-read"/);
  assert.match(original, /scope: "talent-cv-original-delete"/);
  assert.match(original, /createSignedUrl\(user\.cvOriginalStoragePath, 60\)/);
  assert.match(original, /Cache-Control": "private, no-store, max-age=0"/);
  for (const source of [imported, original]) {
    assert.match(source, /enforceApiRateLimit/);
    assert.match(source, /requireIp: true/);
  }
});

test("CV export, paid CV payment and Career Journey evidence are throttled", () => {
  const exportRoute = read("../app/api/talent/cv/export/route.ts");
  const payment = read("../app/api/talent/cv/payment/route.ts");
  const evidence = read("../app/api/talent/cv/career-evidence/route.ts");
  assert.match(exportRoute, /scope: "talent-cv-export"/);
  assert.match(exportRoute, /contentLength > 64 \* 1024/);
  assert.match(payment, /scope: "talent-cv-payment"/);
  assert.match(payment, /getIdempotentResult/);
  assert.match(evidence, /scope: "talent-cv-career-evidence"/);
  assert.match(evidence, /acceptedByUser", true/);
  assert.match(evidence, /verified", true/);
  assert.match(evidence, /Cache-Control": "private, no-store, max-age=0"/);
  for (const source of [exportRoute, payment, evidence]) {
    assert.match(source, /enforceApiRateLimit/);
    assert.match(source, /requireIp: true/);
  }
});


test("admin CEO and Finance routes are role-gated, throttled and non-cacheable", () => {
  const ceo = read("../app/api/admin/jia/ceo/route.ts");
  const intelligence = read("../app/api/admin/jia/intelligence/route.ts");
  const chat = read("../app/api/admin/jia/chat/route.ts");
  const finance = read("../app/api/admin/events/manual-payments/route.ts");
  const review = read("../app/api/admin/events/manual-payments/[submissionId]/review/route.ts");
  assert.match(ceo, /String\(user\.role\)!==\"ADMIN\"/);
  assert.match(ceo, /scope:"admin-jia-ceo-snapshot"/);
  assert.match(ceo, /Cache-Control/);
  assert.match(intelligence, /scope:"admin-jia-transversal-intelligence"/);
  assert.match(intelligence, /Cache-Control/);
  assert.match(chat, /scope:"admin-jia-ceo-chat"/);
  assert.match(chat, /rateLimited/);
  assert.match(chat, /message\.length>12000/);
  assert.match(finance, /\["ADMIN","FINANCE"\]/);
  assert.match(finance, /scope:"admin-event-manual-payment-list"/);
  assert.match(finance, /Cache-Control/);
  assert.match(review, /\["ADMIN","FINANCE"\]/);
  assert.match(review, /scope:"admin-event-manual-payment-review"/);
});

test("Mobility administrative disbursement, program and provider actions are rate-limited and audited", () => {
  const fundingPending = read("../app/api/mobility/admin/funding/pending/route.ts");
  const fundingVerify = read("../app/api/mobility/admin/funding/verify/route.ts");
  const programs = read("../app/api/mobility/admin/programs/route.ts");
  const programVerify = read("../app/api/mobility/admin/programs/verify/route.ts");
  const providers = read("../app/api/mobility/admin/providers/route.ts");
  const providerVerify = read("../app/api/mobility/admin/providers/verify/route.ts");
  const generatePass = read("../app/api/mobility/admin/generate-pass/route.ts");
  assert.match(fundingPending, /scope: "mobility-admin-funding-pending"/);
  assert.match(fundingVerify, /scope: "mobility-admin-funding-verify"/);
  assert.match(fundingVerify, /MOBILITY_FUNDING_DISBURSEMENT_VERIFY_ATTEMPT/);
  assert.match(fundingVerify, /from\("CEOAuditLog"\)\.insert/);
  assert.match(programs, /scope: "mobility-admin-program-list"/);
  assert.match(programVerify, /scope: "mobility-admin-program-verify"/);
  assert.match(programVerify, /MOBILITY_PROGRAM_BUDGET_VERIFY_ATTEMPT/);
  assert.match(providers, /scope: "mobility-admin-provider-list"/);
  assert.match(providerVerify, /scope: "mobility-admin-provider-verify"/);
  assert.match(providerVerify, /MOBILITY_PROVIDER_KYC_REVIEW_ATTEMPT/);
  assert.match(generatePass, /scope:"mobility-admin-generate-pass"/);
  assert.match(generatePass, /MOBILITY_PASS_MANUAL_ISSUE_ATTEMPT/);
  for (const source of [fundingPending,fundingVerify,programs,programVerify,providers,providerVerify,generatePass]) {
    assert.match(source, /enforceApiRateLimit/);
    assert.match(source, /requireIp:true|requireIp: true/);
  }
});


test("Mobility request, program applications and recruiter guarantee enforce shared limits", () => {
  const mobilityRequest = read("../app/api/mobility/request/route.ts");
  const applications = read("../app/api/mobility/program-applications/route.ts");
  const agreement = read("../app/api/mobility/recruiter/agreement/route.ts");
  const guarantee = read("../app/api/mobility/recruiter/guarantee/route.ts");
  const subsidy = read("../app/api/mobility/partner/validate/route.ts");
  assert.match(mobilityRequest, /scope: "mobility-talent-request-read"/);
  assert.match(mobilityRequest, /scope: "mobility-talent-request-create"/);
  assert.match(applications, /scope: "mobility-program-applications-read"/);
  assert.match(applications, /scope: "mobility-program-application-submit"/);
  assert.match(applications, /Cache-Control/);
  assert.match(agreement, /scope: "mobility-recruiter-agreement-read"/);
  assert.match(agreement, /scope: "mobility-recruiter-agreement-accept"/);
  assert.match(agreement, /Cache-Control/);
  assert.match(guarantee, /scope: "mobility-recruiter-guarantee"/);
  assert.match(subsidy, /scope: "mobility-subsidy-validation"/);
  for (const source of [mobilityRequest,applications,agreement,guarantee,subsidy]) {
    assert.match(source, /enforceApiRateLimit/);
    assert.match(source, /requireIp: true/);
  }
});

test("Mobility provider KYC uploads use private storage, ownership prefix and file signatures", () => {
  const route = read("../app/api/mobility/partner/kyc-document/route.ts");
  assert.match(route, /scope: "mobility-provider-kyc-document-upload"/);
  assert.match(route, /public: false/);
  assert.match(route, /storagePath/);
  assert.match(route, /user\.id \+ "\/"/);
  assert.match(route, /validPdf/);
  assert.match(route, /validJpeg/);
  assert.match(route, /validPng/);
  assert.match(route, /updateBucket\(BUCKET, bucketOptions\)/);
  assert.match(route, /requireIp: true/);
});
