import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("WhatsApp submission requires explicit CV validation and required motivation letter validation on the server", () => {
  const route = read("app/api/applications/[id]/whatsapp/route.ts");
  const feed = read("components/JoblyOfferFeed.tsx");
  const preview = read("app/api/cv-share/[token]/route.ts");
  const pdf = read("app/api/cv-share/[token]/pdf/route.ts");
  const letter = read("app/api/cv-share/[token]/letter/route.ts");
  assert.match(route, /body\.cvApproved !== true/);
  assert.match(route, /body\.letterApproved !== true/);
  assert.match(route, /cvApprovedAt/);
  assert.match(route, /letterApprovedAt/);
  assert.match(feed, /cvApproved: item\.cvApproved === true/);
  assert.match(feed, /letterApproved: item\.letterApproved === true/);
  assert.match(preview, /!application\.cvApprovedAt/);
  assert.match(pdf, /!application\?\.cvApprovedAt/);
  assert.match(letter, /!application\.letterApprovedAt/);
});

test("WhatsApp CV and letter links expire at 30-day boundary and preserve the manual-send model", () => {
  const create = read("app/api/applications/[id]/whatsapp/route.ts");
  const preview = read("app/api/cv-share/[token]/route.ts");
  const pdf = read("app/api/cv-share/[token]/pdf/route.ts");
  const feed = read("components/JoblyOfferFeed.tsx");
  assert.match(create, /30 \* 24 \* 60 \* 60 \* 1000/);
  assert.match(preview, /getTime\(\) <= Date\.now\(\)/);
  assert.match(pdf, /getTime\(\) <= Date\.now\(\)/);
  assert.match(feed, /wa\.me/);
  assert.match(feed, /appuie toi-même sur Envoyer/);
});

test("Recruiter phone attribution uses immutable signup phone, preserves provenance and is idempotent", () => {
  const signup = read("app/api/auth/complete-signup/route.ts");
  const claim = read("app/api/recruiter/claim-whatsapp-offer/route.ts");
  const onboarding = read("app/recruiter/onboarding/page.tsx");
  const migration = read("supabase/migrations/20261111003000_whatsapp_recruiter_claim.sql");
  assert.match(signup, /signupPhone: existing\?\.signupPhone \|\| phone/);
  assert.match(claim, /signupPhone/);
  assert.match(claim, /normalizePhoneNumber/);
  assert.match(claim, /PHONE_MISMATCH/);
  assert.match(claim, /status\s*:\s*"PENDING"/);
  assert.match(onboarding, /claim-whatsapp-offer/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /WHATSAPP_ATTRIBUTION/);
  assert.match(migration, /sourceProvenance/);
  assert.match(migration, /sourceShareId/);
  assert.match(migration, /idempotent/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.claim_whatsapp_recruiter_offer/);
});

test("Phone mismatch creates an admin-only manual review queue with an audited approval action", () => {
  const api = read("app/api/admin/recruiter-offer-claims/route.ts");
  const page = read("app/admin/recruiter-offer-claims/page.tsx");
  const migration = read("supabase/migrations/20261111014000_whatsapp_claim_manual_review.sql");
  const shell = read("components/admin/AdminShell.tsx");
  assert.match(api, /AdminIdentity/);
  assert.match(api, /RecruiterOfferClaim/);
  assert.match(api, /review_whatsapp_recruiter_offer_claim/);
  assert.match(page, /Confirmer le rattachement/);
  assert.match(page, /Rejeter la demande/);
  assert.match(migration, /manualPhoneReview/);
  assert.match(migration, /reviewedByUserId/);
  assert.match(shell, /recruiter-offer-claims/);
});

test("A recruiter-created Jobly offer exposes only score cards to free accounts and profile detail to entitled accounts", () => {
  const api = read("app/api/recruiter/jobs/[id]/matching/route.ts");
  const profileApi = read("app/api/recruiter/talents/profile/route.ts");
  const page = read("app/recruiter/jobs/[id]/matching/page.tsx");
  const form = read("components/recruiter/RecruiterJobForm.tsx");
  assert.match(api, /RecruiterJob/);
  assert.match(api, /recruiterUserId/);
  assert.match(api, /score >= 90/);
  assert.match(api, /\.slice\(0, 5\)/);
  assert.match(api, /rank: index \+ 1, matchPercent: item\.score/);
  assert.match(api, /No identity, ID, image, location, CV, or profile field leaves this endpoint for FREE recruiters/);
  assert.match(profileApi, /const ownedJobId = params\.get\("jobId"\)/);
  assert.match(profileApi, /topFiveMatchingProfiles/);
  assert.match(page, /payload\.profileAccess \?/);
  assert.match(page, /talent\.matchPercent/);
  assert.match(form, /Top 5 talents correspondants/);
});

test("Recruiter conversion overlay is centered, animated and offers Fermer and Voir", () => {
  const view = read("components/CvShareView.tsx");
  assert.match(view, /role="dialog"/);
  assert.match(view, /aria-modal="true"/);
  assert.match(view, /grid place-items-center/);
  assert.match(view, /repeat:Infinity/);
  assert.match(view, /Fermer · Lire le CV/);
  assert.match(view, /Voir les talents/);
});
