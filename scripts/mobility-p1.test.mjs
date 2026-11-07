import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { calculateMobilityEligibility, DEFAULT_MOBILITY_THRESHOLD_PERCENT } from "../lib/mobilityEligibility.ts";

const establishedUser = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString();
const complete = {
  approvedSalary: 300000,
  salaryCurrency: "XAF",
  costs: [{ category: "TRANSPORT", amount: 90000, currency: "XAF", source: "SYSTEM_ESTIMATE" }],
  companyMobilityAgreementAccepted: true,
  recruiterGuaranteeAccepted: true,
  userCreatedAt: establishedUser,
};

test("le seuil métier canonique est 50 %", () => {
  assert.equal(DEFAULT_MOBILITY_THRESHOLD_PERCENT, 50);
});

test("le dossier est éligible sous le seuil avec toutes les conditions requises", () => {
  const decision = calculateMobilityEligibility(complete);
  assert.equal(decision.status, "ELIGIBLE");
  assert.equal(decision.burdenPercent, 30);
  assert.equal(decision.maximumEligibleCost, 150000);
  assert.equal(decision.repaymentMonths, 3);
});

test("la frontière exacte à 50 % est incluse", () => {
  const decision = calculateMobilityEligibility({
    ...complete,
    costs: [{ category: "TRANSPORT", amount: 150000, currency: "XAF" }],
  });
  assert.equal(decision.status, "ELIGIBLE");
  assert.equal(decision.burdenPercent, 50);
});

test("un coût supérieur à 50 % est inéligible", () => {
  const decision = calculateMobilityEligibility({
    ...complete,
    costs: [{ category: "TRANSPORT", amount: 150001, currency: "XAF" }],
  });
  assert.equal(decision.status, "INELIGIBLE");
  assert.ok((decision.burdenPercent ?? 0) > 50);
});

test("une convention employeur manquante bloque la décision", () => {
  const decision = calculateMobilityEligibility({ ...complete, companyMobilityAgreementAccepted: false });
  assert.equal(decision.status, "NEEDS_INFO");
  assert.ok(decision.missingInformation.includes("COMPANY_MOBILITY_AGREEMENT"));
});

test("une garantie recruteur manquante bloque la décision", () => {
  const decision = calculateMobilityEligibility({ ...complete, recruiterGuaranteeAccepted: false });
  assert.equal(decision.status, "NEEDS_INFO");
  assert.ok(decision.missingInformation.includes("RECRUITER_GUARANTEE"));
});

test("un utilisateur de moins de trois mois est inéligible", () => {
  const decision = calculateMobilityEligibility({
    ...complete,
    userCreatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  });
  assert.equal(decision.status, "INELIGIBLE");
  assert.ok(decision.missingInformation.includes("USER_TENURE_3_MONTHS"));
});

test("une devise incohérente n'est jamais comparée au salaire", () => {
  const decision = calculateMobilityEligibility({
    ...complete,
    costs: [{ category: "TRANSPORT", amount: 90000, currency: "EUR" }],
  });
  assert.equal(decision.status, "NEEDS_INFO");
  assert.equal(decision.burdenPercent, null);
  assert.ok(decision.missingInformation.includes("MOBILITY_COST_CURRENCY_MISMATCH"));
});

test("un montant de coût invalide ne disparaît pas silencieusement", () => {
  const decision = calculateMobilityEligibility({
    ...complete,
    costs: [{ category: "TRANSPORT", amount: -1, currency: "XAF" }],
  });
  assert.equal(decision.status, "NEEDS_INFO");
  assert.ok(decision.missingInformation.includes("INVALID_MOBILITY_COSTS"));
});

test("le Talent ne peut pas fournir le salaire de référence", () => {
  const route = readFileSync(new URL("../app/api/mobility/request/route.ts", import.meta.url), "utf8");
  assert.match(route, /from\("RecruitmentOffer"\)/);
  assert.match(route, /salaryProposed/);
  assert.match(route, /salarySource: "RECRUITER_OFFER"/);
  assert.doesNotMatch(route, /body\.salary|body\["salary"\]/);
});

test("le gate Premium utilise planCode et une liste de plans autorisés", () => {
  const server = readFileSync(new URL("../lib/mobilityServer.ts", import.meta.url), "utf8");
  assert.match(server, /select\("planCode,status,currentPeriodEnd,trialEndsAt"\)/);
  assert.match(server, /new Set\(\["START", "PREMIUM", "PRO"\]\)/);
});

test("les rapports Mobility ne sortent que les dossiers reliés à l'acteur", () => {
  const route = readFileSync(new URL("../app/api/mobility/partner/reports/route.ts", import.meta.url), "utf8");
  assert.match(route, /getRecruiterMobilityRequestIds/);
  assert.match(route, /getUserMobilityInstitutionIds/);
  assert.match(route, /query\.in\("id", ids\)/);
});

test("le prestataire Mobility dispose de son propre registre et d'une preuve KYC privée", () => {
  const route = readFileSync(new URL("../app/api/mobility/partner/me/route.ts", import.meta.url), "utf8");
  assert.match(route, /MobilityServiceProvider/);
  assert.match(route, /kycEvidenceStoragePath/);
  assert.doesNotMatch(route, /MOBILITY_PROVIDER_SCHEMA_NOT_INSTALLED/);
});

test("la validation institutionnelle exige accès, éligibilité et garantie", () => {
  const route = readFileSync(new URL("../app/api/mobility/partner/validate/route.ts", import.meta.url), "utf8");
  assert.match(route, /getUserMobilityInstitutionIds/);
  assert.match(route, /institutionOwnsMobilityRequest/);
  assert.match(route, /request\.eligibilityStatus !== "ELIGIBLE"/);
  assert.match(route, /request\.recruiterGuaranteed !== true/);
});


test("les tables prestataires et les pièces KYC utilisent un coffre privé", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261105171849_mobility_provider_funding_runtime.sql", import.meta.url), "utf8");
  assert.ok(sql.includes('create table if not exists public."MobilityServiceProvider"'));
  assert.ok(sql.includes('create table if not exists public."MobilityProviderService"'));
  assert.ok(sql.includes('create table if not exists public."MobilityProviderAssignment"'));
  assert.ok(sql.includes('create table if not exists public."MobilityProgramApplication"'));
  assert.ok(sql.includes("'mobility-provider-documents'"));
  assert.ok(sql.includes("public = false"));
  assert.ok(sql.includes('alter table public."MobilityServiceProvider" enable row level security'));
  assert.ok(sql.includes('revoke all on public."MobilityServiceProvider" from anon, authenticated'));
  assert.ok(sql.includes('grant all on public."MobilityServiceProvider" to service_role'));
});

test("les allocations imposent une candidature approuvée, une preuve budgétaire et le rejet des DEMO", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261105171849_mobility_provider_funding_runtime.sql", import.meta.url), "utf8");
  assert.ok(sql.includes("MOBILITY_PROGRAM_APPLICATION_NOT_APPROVED"));
  assert.ok(sql.includes("MOBILITY_PROGRAM_BUDGET_EXCEEDED"));
  assert.ok(sql.includes("MOBILITY_PROGRAM_NOT_FUNDING_READY"));
  assert.ok(sql.includes("like '%DEMO%'"));
  assert.ok(sql.includes("for update"));
  assert.ok(sql.includes("revoke all on function public.mobility_approve_funding_allocation"));
  assert.ok(sql.includes("grant execute on function public.mobility_approve_funding_allocation"));
});

test("le décaissement exige une preuve externe et reste en attente avant vérification", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261105171849_mobility_provider_funding_runtime.sql", import.meta.url), "utf8");
  const route = readFileSync(new URL("../app/api/institution/mobility/funding/disburse/route.ts", import.meta.url), "utf8");
  assert.ok(sql.includes("PENDING_VERIFICATION"));
  assert.ok(sql.includes("mobility_verify_funding_disbursement"));
  assert.match(route, /externalReference/);
  assert.match(route, /evidenceUrl/);
  assert.match(route, /idempotencyKey/);
  assert.match(route, /Aucun paiement n'est réputé exécuté/);
});

test("la validation des prestataires est limitée à l'administration et au KYC stocké dans le coffre privé", () => {
  const upload = readFileSync(new URL("../app/api/mobility/partner/kyc-document/route.ts", import.meta.url), "utf8");
  const verify = readFileSync(new URL("../app/api/mobility/admin/providers/verify/route.ts", import.meta.url), "utf8");
  assert.match(upload, /mobility-provider-documents/);
  assert.match(upload, /upsert: false/);
  assert.match(verify, /"ADMIN"/);
  assert.match(verify, /decision === "VERIFY" \? "VERIFIED"/);
  assert.match(verify, /decision === "VERIFY" \? "ACTIVE"/);
  assert.match(verify, /createSignedUrl|storage\.from/);
});

test("une affectation prestataire requiert éligibilité, garantie, allocation et KYC vérifié", () => {
  const route = readFileSync(new URL("../app/api/institution/mobility/providers/assign/route.ts", import.meta.url), "utf8");
  assert.match(route, /kycStatus !== "VERIFIED"/);
  assert.match(route, /status !== "ACTIVE"/);
  assert.match(route, /eligibilityStatus !== "ELIGIBLE"/);
  assert.match(route, /recruiterGuaranteed !== true/);
  assert.match(route, /APPROVED/);
});

test("le parcours institutionnel de programme est restreint aux administrateurs actifs", () => {
  const dashboard = readFileSync(new URL("../app/api/institution/mobility/dashboard/route.ts", import.meta.url), "utf8");
  const review = readFileSync(new URL("../app/api/institution/mobility/applications/route.ts", import.meta.url), "utf8");
  assert.match(dashboard, /getUserMobilityInstitutionIds/);
  assert.match(review, /getUserMobilityInstitutionIds/);
  assert.match(review, /PROGRAM_APPLICATION_/);
});

test("le contrat employeur est versionné et exige un représentant habilité", () => {
  const route = readFileSync(new URL("../app/api/mobility/recruiter/agreement/route.ts", import.meta.url), "utf8");
  assert.match(route, /JOBLY-MOBILITY-EMPLOYER-2026-11-05-v1/);
  assert.match(route, /authorizedRepresentative !== true/);
  assert.match(route, /eq\("recruiterUserId", user\.id\)/);
  assert.match(route, /acceptanceUserAgent/);
});

test("le schéma Prisma expose les modèles et colonnes Mobility P1", () => {
  const schema = readFileSync(new URL("../packages/database/prisma/schema.prisma", import.meta.url), "utf8");
  for (const model of [
    "MobilityServiceProvider", "MobilityProviderService", "MobilityProviderAssignment",
    "MobilityProgram", "MobilityProgramApplication", "MobilityFundingAllocation",
    "MobilityFundingTransaction", "MobilityEligibilityDecision", "MobilityCompanyAgreement",
  ]) assert.match(schema, new RegExp("model " + model + " \\{"));
  assert.match(schema, /eligibilityThresholdPercent Decimal/);
});

test("la règle de seuil ne valide jamais un coût supérieur à 50 % masqué par un arrondi", () => {
  const engine = readFileSync(new URL("../lib/mobilityEligibility.ts", import.meta.url), "utf8");
  assert.match(engine, /roundPercent/);
  const decision = calculateMobilityEligibility({
    ...complete,
    costs: [{ category: "TRANSPORT", amount: 150001, currency: "XAF" }],
  });
  assert.equal(decision.status, "INELIGIBLE");
  assert.ok((decision.burdenPercent ?? 0) > 50);
});

test("la migration aligne MobilityRequest.recruiterGuaranteed avec le modèle Prisma", () => {
  const sql = readFileSync(new URL("../supabase/migrations/20261105171849_mobility_provider_funding_runtime.sql", import.meta.url), "utf8");
  const schema = readFileSync(new URL("../packages/database/prisma/schema.prisma", import.meta.url), "utf8");
  assert.match(sql, /alter table public\."MobilityRequest"[\s\S]*add column if not exists "recruiterGuaranteed" boolean not null default false/);
  assert.match(schema, /recruiterGuaranteed Boolean\s+@default\(false\)/);
});

test("la demande Mobility transmet la session Talent au contrôle de candidature acceptée", () => {
  const page = readFileSync(new URL("../app/bons-plans/mobility/talent/request/page.tsx", import.meta.url), "utf8");
  const api = readFileSync(new URL("../app/api/matches/last-accepted/route.ts", import.meta.url), "utf8");
  assert.match(page, /getSupabaseClient\(\)\.auth\.getSession\(\)/);
  assert.ok(page.includes("Authorization: `Bearer ${token}`"));
  assert.match(page, /cache:\s*"no-store"/);
  assert.ok(api.includes("authUser(req)"));
  assert.ok(api.includes("status:401"));
});
