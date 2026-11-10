import { NextRequest, NextResponse } from "next/server";
import { ensureUser, getAuthUser, adminClient } from "@/lib/server-auth";
import { getJiaAvailableEcosystems, isJiaEcosystem } from "@/lib/jia/access";
import { runJiaBrain } from "@/lib/jia/brain";
import { runUnifiedCognitiveCycle } from "@/lib/jia/runtime";
import { getCascadeOpportunities } from "@/lib/opportunityAggregator";
import { runAiGateway } from "@/lib/aiGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });
    const sb = adminClient();
    const user = await ensureUser(sb, auth);
    if (!user.privacyAcceptedAt) {
      return NextResponse.json({ message: "Le consentement de confidentialité est requis pour J’IA." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    const message = typeof body?.message === "string" ? body.message : "";
    const requestedEcosystem = String(body?.ecosystem || "TALENT").toUpperCase();
    if (!isJiaEcosystem(requestedEcosystem)) {
      return NextResponse.json({ message: "Écosystème J’IA invalide." }, { status: 400 });
    }

    const availableEcosystems = await getJiaAvailableEcosystems(sb, user, auth.id);
    if (!availableEcosystems.includes(requestedEcosystem)) {
      return NextResponse.json({ message: "Cet espace J’IA n'est pas autorisé pour ce compte." }, { status: 403 });
    }

    const ecosystem = requestedEcosystem;
    const recentDialogue = Array.isArray(body?.recentDialogue)
      ? body.recentDialogue.filter((value: unknown): value is string => typeof value === "string").slice(-6)
      : [];

    const cognitive = await runUnifiedCognitiveCycle(sb, {
      userId: String(user.id),
      ecosystem,
      path: typeof body?.path === "string" ? body.path : "",
      action,
      message,
      includeInternet: false,
    });

    // The legacy conversational Brain is scoped to Talent, Recruiter and Partner.
    // ADMIN stays on the dedicated CEO/cognitive path and is never downgraded to a
    // personal Talent context.
    const matchingRequested = ecosystem === "TALENT" && (
      ["MATCHING", "MATCH_JOB", "MATCH_OFFERS"].includes(action.toUpperCase()) ||
      /offres? adaptées? à mon profil|correspondance (?:avec|pour)|compatibilité (?:avec|du)|compare(?:r)? mon profil|analyse(?:r)? (?:mon )?matching|match(?:ing)? (?:mon profil|avec cette offre)/i.test(message)
    );
    const result = matchingRequested
      ? { message: "Je compare ton parcours aux offres actives et j’examine la meilleure correspondance.", intent: "MATCHING", confidence: "MEDIUM" as const, provider: "JIA_MATCHING" }
      : ecosystem === "ADMIN"
      ? {
          message: cognitive.recommendations[0]
            ? `Synthèse administrateur prête. Première priorité identifiée : ${cognitive.recommendations[0].title}.`
            : "Espace administrateur connecté. Aucun point prioritaire n’a été identifié dans ce cycle.",
          intent: "ADMIN_OVERVIEW",
          confidence: cognitive.recommendations[0]?.confidence ?? "MEDIUM",
          provider: "JIA_RUNTIME",
        }
      : await runJiaBrain({
          userId: String(user.id),
          ecosystem,
          message,
          path: typeof body?.path === "string" ? body.path : "",
          action: typeof body?.action === "string" ? body.action : "",
          proactive: Boolean(body?.proactive),
          lang: body?.lang === "en" ? "en" : "fr",
          recentDialogue,
        });

    let matching: Record<string, unknown> | null = null;
    let response = result;
    if (matchingRequested) {
      try {
        const ranked = await getCascadeOpportunities(String(user.id));
        const requestedJobId = typeof body?.jobId === "string" ? body.jobId : "";
        const matches = ranked.slice().sort((left, right) => right.matchScore - left.matchScore || right.matchConfidence - left.matchConfidence);
        const selected = requestedJobId ? matches.find((item) => item.id.endsWith(requestedJobId)) || matches[0] : matches[0];
        if (!selected) {
          response = { ...result, message: "Je n’ai pas trouvé d’offre active exploitable à comparer pour le moment. Complète ton CV ou reviens après la prochaine actualisation des offres." };
          matching = { algorithm: "jobly-matching-v2", matches: [], semanticScored: false };
        } else {
          const recordId = selected.id.slice(selected.id.indexOf(":") + 1);
          const { data: job, error: jobError } = selected.sourceType === "discovery"
            ? await sb.from("Job").select("id,title,description").eq("id", recordId).maybeSingle()
            : await sb.from("RecruiterJob").select("id,title,description").eq("id", recordId).maybeSingle();
          if (jobError) throw new Error(jobError.message);
          if (!job) throw new Error("MATCHING_JOB_NOT_FOUND");

          const ai = await runAiGateway(req, "MATCHING", {
            jobId: String(job.id), jobTitle: String(job.title || selected.title),
            jobDescription: String(job.description || ""), matchSignals: selected.matchedSkills.slice(0, 15),
          });
          const semantic = ai.ok && ai.output && typeof ai.output === "object" ? ai.output as Record<string, unknown> : null;
          const semanticScored = semantic?.mode === "ai_semantic" && typeof semantic.score === "number";
          const shortlist = matches.slice(0, 5).map((item) => ({
            id: item.id, title: item.title, company: item.company, score: item.matchScore,
            confidence: item.matchConfidence, coverage: item.matchCoverage,
            matchedSkills: item.matchedSkills, missingSkills: item.missingSkills,
          }));
          const summary = shortlist.slice(0, 3).map((item, index) =>
            `${index + 1}. ${item.title} — ${item.company} : ${item.score}/100 (fiabilité ${item.confidence}/100)`
          ).join("\\n");
          const semanticLine = semanticScored
            ? ` Analyse sémantique J’IA sur la meilleure offre : ${semantic.score}/100, confiance ${String(semantic.confidence || "LOW")}.`
            : " Le score sémantique avancé n’a pas été calculé ; les scores affichés restent ceux du moteur commun déterministe.";
          response = { ...result, intent: "MATCHING",
            message: `Voici les offres les mieux classées selon les informations vérifiables de ton profil :\\n${summary}\\n${semanticLine}`,
            confidence: semanticScored && semantic.confidence === "HIGH" ? "HIGH" : "MEDIUM" };
          matching = { algorithm: "jobly-matching-v2", matches: shortlist, selectedJobId: String(job.id),
            deterministicScore: selected.matchScore, semantic, semanticScored,
            aiCredits: ai.ok ? ai.credits : null, aiUnavailableReason: ai.ok ? null : ai.message };
        }
      } catch (matchingError) {
        response = { ...result, message: matchingError instanceof Error
          ? `Le classement déterministe est disponible, mais l’analyse complète est momentanément interrompue : ${matchingError.message}`
          : "Le matching est momentanément indisponible." };
        matching = { algorithm: "jobly-matching-v2", semanticScored: false, error: true };
      }
    }
    return NextResponse.json({ ok: true, cognitive, ...response, ...(matching ? { matching } : {}) });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "J’IA est temporairement indisponible.",
    }, { status: 500 });
  }
}
