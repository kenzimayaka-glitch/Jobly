import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "ofqqrryamslxoqkklraw";
const SUPABASE_URL = "https://" + PROJECT_REF + ".supabase.co";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const FIXTURE_PATH = path.resolve(process.env.E2E_FIXTURE_PATH || ".e2e-fixtures.json");
const REPORT_PATH = path.resolve("artifacts/e2e/authenticated-role-smoke.json");
const runId = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);

const report = {
  createdAt: new Date().toISOString(),
  environment: "JOBLY-E2E",
  projectRef: PROJECT_REF,
  baseURL: BASE_URL,
  status: "BLOCKED",
  checks: [],
  roles: {},
  externalActions: false,
};

function record(role, id, status, httpStatus, detail) {
  report.checks.push({ role, id, status, httpStatus: httpStatus ?? null, detail: String(detail || "").slice(0, 240) });
}

function readE2EAdminKey() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  if (configuredUrl !== SUPABASE_URL) return "";
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
}

function assertE2EAdminKey(key) {
  assert.ok(key.startsWith("sb_secret_") || key.startsWith("eyJ"), "Une clé serveur JOBLY-E2E est requise.");
  if (key.startsWith("eyJ")) {
    let claims;
    try { claims = JSON.parse(Buffer.from(key.split(".")[1] || "", "base64url").toString("utf8")); }
    catch { throw new Error("La clé serveur JWT ne peut pas être vérifiée."); }
    assert.equal(claims.ref, PROJECT_REF, "Clé serveur liée à un autre projet Supabase refusée.");
    assert.equal(claims.role, "service_role", "Clé JWT sans rôle service_role refusée.");
  }
}

async function request(token, route, method = "GET", body = undefined) {
  const response = await fetch(new URL(route, BASE_URL), {
    method,
    headers: {
      Authorization: "Bearer " + token,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      // The smoke runs against a loopback Next server, not a reverse proxy.
      // Supply its actual client address so production-mode IP guards can run.
      "x-real-ip": "127.0.0.1",
      "Cache-Control": "no-store",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30000),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function runCheck(role, id, action, expectedStatuses = [200]) {
  try {
    const result = await action();
    const ok = expectedStatuses.includes(result.status);
    record(role, id, ok ? "PASS" : "FAIL", result.status, ok ? "Réponse API conforme." : JSON.stringify(result.payload?.message || result.payload || {}));
    return result;
  } catch (error) {
    record(role, id, "FAIL", null, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function main() {
  assert.equal(process.env.E2E_PROJECT_REF, PROJECT_REF, "Projet E2E inattendu.");
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL, "URL Supabase non-E2E refusée.");
  assert.ok(PUBLISHABLE_KEY.startsWith("sb_publishable_"), "Clé publishable JOBLY-E2E absente.");
  const fixtures = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  assert.equal(fixtures.environment, "JOBLY-E2E");
  assert.equal(fixtures.projectRef, PROJECT_REF);

  const expected = [
    { key: "talent", role: "TALENT" },
    { key: "recruiter", role: "RECRUITER" },
    { key: "partner", role: "PARTNER" },
  ];

  for (const item of expected) {
    const account = fixtures.accounts?.find((candidate) => candidate.key === item.key && candidate.role === item.role);
    assert.ok(account?.email && account?.password, "Fixture absente pour " + item.role);
    const supabase = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    try {
      const login = await supabase.auth.signInWithPassword({ email: account.email, password: account.password });
      assert.equal(login.error, null, login.error?.message);
      const user = login.data.user;
      const token = login.data.session?.access_token;
      assert.ok(user?.id && token, "Session Auth incomplète pour " + item.role);
      assert.equal(user.app_metadata?.e2e_fixture, true);
      assert.equal(user.app_metadata?.e2e_role, item.role);
      record(item.role, item.role + "-AUTH-LOGIN", "PASS", 200, "Connexion Supabase Auth réelle.");
      const verified = await supabase.auth.getUser(token);
      assert.equal(verified.error, null, verified.error?.message);
      assert.equal(verified.data.user?.id, user.id);
      record(item.role, item.role + "-AUTH-GET-USER", "PASS", 200, "Jeton vérifié par Supabase Auth.");

      if (item.role === "TALENT") {
        // E2E-READONLY-TALENT-START — toutes les vérifications Talent sont strictement en lecture seule.
        const profile = await runCheck(item.role, "TALENT-PROFILE-READ", () => request(token, "/api/profile"));
        await runCheck(item.role, "TALENT-APPLICATIONS-READ", () => request(token, "/api/applications"));

        const localFeed = await request(token, "/api/jobs?scope=local&limit=10");
        const localFeedOk = localFeed.status === 200 &&
          Array.isArray(localFeed.payload?.jobs) &&
          Number.isFinite(localFeed.payload?.totalAvailable) &&
          localFeed.payload.totalAvailable >= localFeed.payload.jobs.length &&
          localFeed.payload?.market?.scope === "local";
        record(item.role, "TALENT-JOBS-FEED-READ", localFeedOk ? "PASS" : "FAIL", localFeed.status,
          localFeedOk ? "Flux local authentifié : structure et compteurs cohérents." : "Le flux local ne respecte pas son contrat de lecture.");

        const africaFeed = await request(token, "/api/jobs?scope=africa&limit=10");
        const africaFeedOk = africaFeed.status === 200 &&
          Array.isArray(africaFeed.payload?.jobs) &&
          Number.isFinite(africaFeed.payload?.totalAvailable) &&
          africaFeed.payload.totalAvailable >= africaFeed.payload.jobs.length &&
          africaFeed.payload?.market?.scope === "africa";
        record(item.role, "TALENT-AFRICA-FEED-READ", africaFeedOk ? "PASS" : "FAIL", africaFeed.status,
          africaFeedOk ? "Flux Afrique authentifié : structure et compteurs cohérents." : "Le flux Afrique ne respecte pas son contrat de lecture.");

        const referenceOffer = (localFeed.payload?.jobs || []).find((job) =>
          typeof job?.id === "string" && ["discovery", "recruiter"].includes(job.source)
        ) || (africaFeed.payload?.jobs || []).find((job) =>
          typeof job?.id === "string" && ["discovery", "recruiter"].includes(job.source)
        );
        if (referenceOffer && localFeedOk && africaFeedOk) {
          const detail = await request(token,
            "/api/jobs/" + encodeURIComponent(referenceOffer.id) + "?source=" + encodeURIComponent(referenceOffer.source));
          const expectedActiveDetail = referenceOffer.source === "discovery"
            ? detail.payload?.job?.offerStatus === "ACTIVE"
            : typeof detail.payload?.job?.title === "string" && detail.payload.job.title.length > 0;
          const detailOk = detail.status === 200 &&
            detail.payload?.source === referenceOffer.source &&
            detail.payload?.job?.id === referenceOffer.id &&
            expectedActiveDetail;
          record(item.role, "TALENT-JOB-DETAIL-READ", detailOk ? "PASS" : "FAIL", detail.status,
            detailOk ? "Détail de l'offre active relu sans mutation." : "Le détail de l'offre ne correspond pas à l'offre du flux.");
        } else {
          record(item.role, "TALENT-JOB-DETAIL-READ", "BLOCKED", null,
            "Aucune offre active exploitable dans les flux local/Afrique pour ce run.");
        }

        const originalCv = await request(token, "/api/talent/cv/original");
        const originalCvOk = originalCv.status === 404
          ? originalCv.payload?.error === "CV_NOT_FOUND"
          : originalCv.status === 200 && originalCv.payload?.ok === true &&
            originalCv.payload?.expiresIn === 60 && typeof originalCv.payload?.url === "string";
        record(item.role, "TALENT-CV-ORIGINAL-READ", originalCvOk ? "PASS" : "FAIL", originalCv.status,
          originalCvOk
            ? originalCv.status === 200 ? "Lien privé de 60 secondes généré ; contenu du CV non téléchargé." : "Aucun CV original enregistré ; absence retournée proprement."
            : "Lecture du CV original : réponse ou portée de propriété invalide.");

        const careerJourney = await request(token, "/api/career-journey");
        const careerJourneyOk = careerJourney.status === 200 &&
          careerJourney.payload?.ok === true &&
          Array.isArray(careerJourney.payload?.evidence) &&
          Array.isArray(careerJourney.payload?.portfolio);
        record(item.role, "TALENT-CAREER-JOURNEY-READ", careerJourneyOk ? "PASS" : "FAIL", careerJourney.status,
          careerJourneyOk ? "Career Journey chargé en lecture seule, sans création d'état." : "Lecture Career Journey non conforme.");

        // E2E-READONLY-TALENT-END
      }

      if (item.role === "RECRUITER") {
        await runCheck(item.role, "RECRUITER-PROFILE-READ", () => request(token, "/api/recruiter/profile"));
        await runCheck(item.role, "RECRUITER-JOBS-LIST", () => request(token, "/api/recruiter/jobs"));
        await runCheck(item.role, "RECRUITER-APPLICATIONS-LIST", () => request(token, "/api/recruiter/applications?markViewed=0"));
        await runCheck(item.role, "RECRUITER-TALENTS-LIST", () => request(token, "/api/recruiter/talents"));
        await runCheck(item.role, "RECRUITMENT360-APPLICATIONS-LIST", () => request(token, "/api/recruitment360/applications"));
        await runCheck(item.role, "RECRUITMENT360-DECISIONS-LIST", () => request(token, "/api/recruitment360/decisions"));

        // E2E-READONLY-RECRUITER-START — refus attendus, aucune ligne insérée.
        const unownedRecruitment = await request(token,
          "/api/recruitment360/applications?recruitmentId=00000000-0000-4000-8000-000000000001");
        const unownedRecruitmentOk = unownedRecruitment.status === 403;
        record(item.role, "RECRUITMENT360-DENY-UNOWNED-ID", unownedRecruitmentOk ? "PASS" : "FAIL",
          unownedRecruitment.status,
          unownedRecruitmentOk ? "Un recruitmentId non détenu est refusé avant lecture des candidatures." : "Un recrutement non détenu n'a pas été refusé.");

        const missingApplicationDocument = await request(token, "/api/recruitment360/applications", "POST", {
          action: "document",
          applicationId: "00000000-0000-4000-8000-000000000002",
          kind: "E2E_TEST",
          url: "https://example.invalid/e2e-document-placeholder.pdf",
          fileName: "e2e-placeholder.pdf",
          mimeType: "application/pdf",
          fileSize: 128,
        });
        const missingApplicationDocumentOk = missingApplicationDocument.status === 404;
        record(item.role, "RECRUITMENT360-DOCUMENT-MISSING-APPLICATION",
          missingApplicationDocumentOk ? "PASS" : "FAIL", missingApplicationDocument.status,
          missingApplicationDocumentOk
            ? "Application inexistante refusée avant toute insertion du document."
            : "La création de document n'a pas été arrêtée pour une candidature inexistante.");

        // E2E-READONLY-RECRUITER-END

        const draftTitle = "JOBLY E2E — brouillon " + runId;
        let created;
        try {
          created = await request(token, "/api/recruiter/jobs", "POST", {
            title: draftTitle,
            description: "Offre synthétique de test automatisé. Aucune candidature externe ne sera envoyée.",
            companyName: "Jobly E2E Test Company",
            location: "Yaoundé, Cameroun",
            countryCode: "CM",
            distributionScope: "COUNTRY",
            targetCountryCodes: ["CM"],
            mode: "Hybride",
            contract: "CDD",
            salary: "0",
            sector: "Technology",
            tags: ["E2E", "TEST"],
            status: "draft",
          });
        } catch (error) {
          record(item.role, "RECRUITER-DRAFT-CREATE", "FAIL", null, error instanceof Error ? error.message : String(error));
        }
        if (created?.status === 201 && created.payload?.job?.id) {
          record(item.role, "RECRUITER-DRAFT-CREATE", "PASS", 201, "Offre brouillon synthétique créée.");
          const jobId = created.payload.job.id;
          try {
            await runCheck(item.role, "RECRUITER-DRAFT-DETAIL", () => request(token, "/api/recruiter/jobs/" + encodeURIComponent(jobId)));
            await runCheck(item.role, "RECRUITER-DRAFT-UPDATE", () => request(token, "/api/recruiter/jobs/" + encodeURIComponent(jobId), "PATCH", {
              title: draftTitle + " — modifié",
            }));
          } finally {
            await runCheck(item.role, "RECRUITER-DRAFT-CLEANUP", () => request(token, "/api/recruiter/jobs/" + encodeURIComponent(jobId), "DELETE"));
          }
        } else if (created?.status === 403) {
          record(item.role, "RECRUITER-DRAFT-CREATE", "BLOCKED", 403, created.payload?.message || "Règle d'éligibilité métier : création de brouillon refusée.");
        } else if (created && created.status !== 201) {
          record(item.role, "RECRUITER-DRAFT-CREATE", "FAIL", created.status, created.payload?.message || JSON.stringify(created.payload));
        }
      }

      if (item.role === "PARTNER") {
        await runCheck(item.role, "PARTNER-PROFILE-READ", () => request(token, "/api/partner/profile"));
        await runCheck(item.role, "PARTNER-COMMISSIONS-READ", () => request(token, "/api/partner/commissions"));
        await runCheck(item.role, "PARTNER-BA-ONBOARDING-READ", () => request(token, "/api/partner/ba-onboarding"));
      }
      report.roles[item.role] = "EXECUTED";
    } catch (error) {
      record(item.role, item.role + "-RUNTIME", "FAIL", null, error instanceof Error ? error.message : String(error));
      report.roles[item.role] = "FAIL";
    } finally {
      await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    }
  }


async function runCrossRoleApplicationLifecycle(fixtures) {
  const talentAccount = fixtures.accounts?.find((item) => item.key === "talent" && item.role === "TALENT");
  const recruiterAccount = fixtures.accounts?.find((item) => item.key === "recruiter" && item.role === "RECRUITER");
  let talentClient = null;
  let recruiterClient = null;
  let admin = null;
  let talentToken = null;
  let recruiterToken = null;
  let talentInternalUserId = null;
  let recruiterInternalUserId = null;
  let recruiterJobId = null;
  let applicationId = null;
  let deletionAttempted = false;

  try {
    assert.ok(talentAccount?.email && talentAccount?.password, "Fixture Talent absente.");
    assert.ok(recruiterAccount?.email && recruiterAccount?.password, "Fixture Recruteur absente.");

    const adminKey = readE2EAdminKey();
    if (!adminKey) {
      record("TALENT", "CROSS-ROLE-APPLICATION-LIFECYCLE-ENVIRONMENT", "BLOCKED", null, "Clé privée serveur JOBLY-E2E absente de l'environnement local ; aucun parcours croisé ni aucune mutation créés.");
      record("RECRUITER", "CROSS-ROLE-APPLICATION-LIFECYCLE-ENVIRONMENT", "BLOCKED", null, "Clé privée serveur JOBLY-E2E absente de l'environnement local ; aucun parcours croisé ni aucune mutation créés.");
      return;
    }
    assertE2EAdminKey(adminKey);

    admin = createClient(SUPABASE_URL, adminKey, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    talentClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });
    recruiterClient = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    });

    const [talentLogin, recruiterLogin] = await Promise.all([
      talentClient.auth.signInWithPassword({ email: talentAccount.email, password: talentAccount.password }),
      recruiterClient.auth.signInWithPassword({ email: recruiterAccount.email, password: recruiterAccount.password }),
    ]);
    assert.equal(talentLogin.error, null, talentLogin.error?.message);
    assert.equal(recruiterLogin.error, null, recruiterLogin.error?.message);
    assert.equal(talentLogin.data.user?.app_metadata?.e2e_fixture, true);
    assert.equal(talentLogin.data.user?.app_metadata?.e2e_role, "TALENT");
    assert.equal(recruiterLogin.data.user?.app_metadata?.e2e_fixture, true);
    assert.equal(recruiterLogin.data.user?.app_metadata?.e2e_role, "RECRUITER");
    talentToken = talentLogin.data.session?.access_token ?? null;
    recruiterToken = recruiterLogin.data.session?.access_token ?? null;
    assert.ok(talentToken && recruiterToken, "Sessions Talent/Recruteur incomplètes.");

    const [talentUser, recruiterUser] = await Promise.all([
      admin.from("User").select("id").eq("authUserId", talentLogin.data.user.id).maybeSingle(),
      admin.from("User").select("id").eq("authUserId", recruiterLogin.data.user.id).maybeSingle(),
    ]);
    if (talentUser.error) throw new Error(talentUser.error.message);
    if (recruiterUser.error) throw new Error(recruiterUser.error.message);
    assert.ok(talentUser.data?.id && recruiterUser.data?.id, "Correspondance Auth/User interne introuvable.");
    talentInternalUserId = talentUser.data.id;
    recruiterInternalUserId = recruiterUser.data.id;

    const title = "JOBLY E2E — parcours Talent-Recruteur " + runId;
    const created = await request(recruiterToken, "/api/recruiter/jobs", "POST", {
      title,
      description: "Offre synthétique réservée à la recette JOBLY-E2E. Aucun contact réel. Aucun envoi externe.",
      companyName: "Entreprise fictive JOBLY-E2E",
      location: "Yaoundé, Cameroun",
      countryCode: "CM",
      distributionScope: "LOCAL",
      targetCountryCodes: [],
      mode: "Hybride",
      contract: "CDD",
      salary: "0",
      sector: "Technology",
      tags: ["E2E", "TEST"],
      status: "published",
    });
    if (created.status !== 201 || !created.payload?.job?.id) {
      record("RECRUITER", "CROSS-ROLE-APPLICATION-LIFECYCLE-OFFER-CREATE", "FAIL", created.status, created.payload?.message || "Création de l'offre synthétique publiée refusée.");
      return;
    }
    recruiterJobId = created.payload.job.id;
    record("RECRUITER", "CROSS-ROLE-APPLICATION-LIFECYCLE-OFFER-CREATE", "PASS", 201, "Offre locale synthétique créée via l'API Recruteur.");

    // L'API de création ne propose pas de champ contact. On renseigne donc
    // uniquement le canal E2E fictif directement sur l'offre créée par ce run.
    const seededContact = await admin.from("RecruiterJob")
      .update({
        applicationProfile: {
          channel: "EMAIL",
          applicationEmail: "jobly-e2e-inbox@example.invalid",
        },
      })
      .eq("id", recruiterJobId)
      .eq("recruiterUserId", recruiterInternalUserId)
      .select("id,status,applicationReady,applicationProfile")
      .single();
    if (seededContact.error) throw new Error(seededContact.error.message);
    const ready = seededContact.data?.status === "published" &&
      seededContact.data?.applicationReady === true &&
      seededContact.data?.applicationProfile?.channel === "EMAIL" &&
      seededContact.data?.applicationProfile?.applicationEmail === "jobly-e2e-inbox@example.invalid";
    record("RECRUITER", "CROSS-ROLE-APPLICATION-LIFECYCLE-OFFER-CONTACT", ready ? "PASS" : "FAIL", 200, ready
      ? "Canal EMAIL fictif et applicationReady confirmés sur l'offre E2E."
      : "L'offre E2E n'est pas prête à recevoir une candidature.");

    if (!ready) return;

    const profile = await request(talentToken, "/api/profile");
    const hasProfile = profile.status === 200 && Boolean(profile.payload?.profile?.summary || profile.payload?.profile?.headline);
    record("TALENT", "CROSS-ROLE-APPLICATION-LIFECYCLE-PROFILE", hasProfile ? "PASS" : "FAIL", profile.status, hasProfile
      ? "Profil professionnel Talent disponible pour préparer la candidature."
      : "Le profil Talent ne contient pas de résumé ou de titre professionnel exploitable.");
    if (!hasProfile) return;

    const prepared = await request(talentToken, "/api/applications", "POST", {
      source: "recruiter",
      jobId: recruiterJobId,
      letterText: "Candidature fictive créée pour la recette automatisée JOBLY-E2E. Ne pas envoyer.",
      locale: "fr",
    });
    if (prepared.status !== 200 || !prepared.payload?.application?.id) {
      const blocked = prepared.status === 429;
      record("TALENT", "CROSS-ROLE-APPLICATION-LIFECYCLE-PREPARE", blocked ? "BLOCKED" : "FAIL", prepared.status, prepared.payload?.message || "Préparation de candidature non conforme.");
      return;
    }
    applicationId = prepared.payload.application.id;
    const initialStatus = prepared.payload.application.status === "USER_REVIEW";
    record("TALENT", "CROSS-ROLE-APPLICATION-LIFECYCLE-PREPARE", initialStatus ? "PASS" : "FAIL", prepared.status, initialStatus
      ? "Candidature préparée ; statut USER_REVIEW ; aucun envoi déclenché."
      : "La candidature n'est pas restée en attente de validation du candidat.");

    const talentList = await request(talentToken, "/api/applications");
    const talentVisible = talentList.status === 200 &&
      talentList.payload?.applications?.some((item) => item.id === applicationId && item.recruiterJobId === recruiterJobId);
    record("TALENT", "CROSS-ROLE-APPLICATION-LIFECYCLE-TALENT-READ", talentVisible ? "PASS" : "FAIL", talentList.status, talentVisible
      ? "La candidature est visible dans l'espace Talent avec la bonne offre."
      : "La candidature préparée n'est pas retrouvée dans l'espace Talent.");

    const recruiterInbox = await request(recruiterToken, "/api/recruiter/applications?markViewed=0");
    const received = recruiterInbox.status === 200 &&
      recruiterInbox.payload?.applications?.some((item) => item.id === applicationId && item.recruiterJobId === recruiterJobId);
    record("RECRUITER", "CROSS-ROLE-APPLICATION-LIFECYCLE-INBOX", received ? "PASS" : "FAIL", recruiterInbox.status, received
      ? "La même candidature apparaît dans la boîte de réception du Recruteur."
      : "La candidature Talent n'apparaît pas dans la boîte de réception du propriétaire de l'offre.");

    const interviewAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const interview = await request(recruiterToken, "/api/recruiter/applications/" + encodeURIComponent(applicationId), "PATCH", { interviewAt });
    const interviewOk = interview.status === 200 &&
      interview.payload?.application?.status === "INTERVIEW" &&
      interview.payload?.application?.statusSource === "RECRUITER";
    record("RECRUITER", "CROSS-ROLE-APPLICATION-LIFECYCLE-INTERVIEW", interviewOk ? "PASS" : "FAIL", interview.status, interviewOk
      ? "Le Recruteur fait évoluer la candidature vers INTERVIEW et enregistre la date."
      : interview.payload?.message || "Transition vers entretien non confirmée.");

    const decision = await request(recruiterToken, "/api/recruiter/applications/" + encodeURIComponent(applicationId), "PATCH", { status: "OFFER" });
    const decisionOk = decision.status === 200 &&
      decision.payload?.application?.status === "OFFER" &&
      decision.payload?.application?.statusSource === "RECRUITER";
    record("RECRUITER", "CROSS-ROLE-APPLICATION-LIFECYCLE-DECISION", decisionOk ? "PASS" : "FAIL", decision.status, decisionOk
      ? "La décision recruteur OFFER est persistée avec statusSource=RECRUITER."
      : decision.payload?.message || "Décision finale du Recruteur non confirmée.");

    const candidateConflict = await request(talentToken, "/api/applications/" + encodeURIComponent(applicationId), "PATCH", { status: "REJECTED" });
    const conflictOk = candidateConflict.status === 200 &&
      candidateConflict.payload?.application?.status === "OFFER" &&
      candidateConflict.payload?.application?.statusSource === "RECRUITER";
    record("TALENT", "CROSS-ROLE-APPLICATION-LIFECYCLE-DECISION-GUARD", conflictOk ? "PASS" : "FAIL", candidateConflict.status, conflictOk
      ? "La tentative de modification Talent ne remplace pas la décision finale du Recruteur."
      : "La règle de priorité de la décision Recruteur n'a pas été respectée.");

    const finalTalentList = await request(talentToken, "/api/applications");
    const finalApplication = finalTalentList.payload?.applications?.find((item) => item.id === applicationId);
    const finalVisible = finalTalentList.status === 200 &&
      finalApplication?.status === "OFFER" &&
      finalApplication?.statusSource === "RECRUITER";
    record("TALENT", "CROSS-ROLE-APPLICATION-LIFECYCLE-FINAL-STATE", finalVisible ? "PASS" : "FAIL", finalTalentList.status, finalVisible
      ? "L'espace Talent reflète la décision finale OFFER prise côté Recruteur."
      : "La décision finale n'est pas reflétée dans l'espace Talent.");
  } catch (error) {
    record("TALENT", "CROSS-ROLE-APPLICATION-LIFECYCLE-RUNTIME", "FAIL", null, error instanceof Error ? error.message : String(error));
  } finally {
    if (recruiterJobId && recruiterToken && admin) {
      deletionAttempted = true;
      let removed;
      try {
        removed = await request(recruiterToken, "/api/recruiter/jobs/" + encodeURIComponent(recruiterJobId), "DELETE");
      } catch (error) {
        removed = { status: 0, payload: { message: error instanceof Error ? error.message : "Erreur réseau pendant le nettoyage API." } };
      }
      const apiCleanupOk = removed.status === 200;
      record("RECRUITER", "CROSS-ROLE-APPLICATION-LIFECYCLE-CLEANUP-API", apiCleanupOk ? "PASS" : "FAIL", removed.status, apiCleanupOk
        ? "Suppression de l'offre synthétique via l'API Recruteur."
        : removed.payload?.message || "La suppression API de l'offre synthétique a échoué.");

      if (!apiCleanupOk) {
        if (applicationId && talentInternalUserId) {
          await admin.from("Application")
            .delete()
            .eq("id", applicationId)
            .eq("userId", talentInternalUserId)
            .eq("recruiterJobId", recruiterJobId);
        }
        await admin.from("RecruiterJob")
          .delete()
          .eq("id", recruiterJobId)
          .eq("recruiterUserId", recruiterInternalUserId);
      }

      const [jobCheck, applicationCheck] = await Promise.all([
        admin.from("RecruiterJob").select("id", { count: "exact", head: true }).eq("id", recruiterJobId),
        admin.from("Application").select("id", { count: "exact", head: true }).eq("recruiterJobId", recruiterJobId),
      ]);
      const cleanupOk = !jobCheck.error && !applicationCheck.error && jobCheck.count === 0 && applicationCheck.count === 0;
      record("RECRUITER", "CROSS-ROLE-APPLICATION-LIFECYCLE-CLEANUP-DB", cleanupOk ? "PASS" : "FAIL", 200, cleanupOk
        ? "Vérification DB : offre et candidature synthétiques supprimées."
        : "Des données synthétiques subsistent après le nettoyage.");
    } else if (recruiterJobId && !deletionAttempted) {
      record("RECRUITER", "CROSS-ROLE-APPLICATION-LIFECYCLE-CLEANUP-DB", "BLOCKED", null, "Le nettoyage automatique n'a pas pu démarrer ; vérifier manuellement le rapport E2E.");
    }

    await talentClient?.auth.signOut({ scope: "local" }).catch(() => undefined);
    await recruiterClient?.auth.signOut({ scope: "local" }).catch(() => undefined);
  }
}

  await runCrossRoleApplicationLifecycle(fixtures);

  const failed = report.checks.some((check) => check.status === "FAIL");
  const blocked = report.checks.some((check) => check.status === "BLOCKED");
  report.status = failed ? "FAIL" : blocked ? "PARTIAL" : report.checks.length >= 15 ? "PASS" : "PARTIAL";
  report.summary =
    report.checks.filter((check) => check.status === "PASS").length + "/" + report.checks.length +
    " contrôles API authentifiés PASS ; " +
    report.checks.filter((check) => check.status === "BLOCKED").length + " BLOCKED ; " +
    report.checks.filter((check) => check.status === "FAIL").length + " FAIL.";
}

try {
  await main();
} catch (error) {
  report.status = "BLOCKED";
  report.error = error instanceof Error ? error.message : String(error);
  report.summary = "Parcours authentifiés non exécutés : " + report.error;
}

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log(JSON.stringify({
  ...report,
  credentials: "not included",
}, null, 2));
if (report.status === "FAIL") process.exitCode = 1;
