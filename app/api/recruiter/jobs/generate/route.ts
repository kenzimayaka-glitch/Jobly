import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser, getRecruiterProfileForAuthUser } from "../../../../../lib/server-auth";
import { runAiGateway } from "../../../../../lib/aiGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 30)
    : [];
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const db = adminClient();
    const user = await ensureUser(db, auth);
    const profile = await getRecruiterProfileForAuthUser(db, auth.id, user.id);
    if (user.role !== "RECRUITER" && user.role !== "ADMIN" && !profile) {
      return NextResponse.json({ message: "Espace recruteur requis." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const title = String(body.title || "").trim().replace(/\s+/g, " ");
    if (title.length < 3 || title.length > 120) {
      return NextResponse.json({ message: "Saisis un intitulé de poste de 3 à 120 caractères." }, { status: 400 });
    }

    const result = await runAiGateway(request, "OFFER_INTELLIGENCE", { jobTitle: title });
    if (!result.ok) return NextResponse.json({ message: result.message, upgradeSuggestion: result.upgradeSuggestion }, { status: result.status });

    const output = result.output && typeof result.output === "object" ? result.output as Record<string, unknown> : {};
    const missions = stringList(output.missions);
    const responsibilities = stringList(output.responsibilities);
    const requiredSkills = stringList(output.requiredSkills);
    const skills = requiredSkills.length ? requiredSkills : stringList(output.skills);
    const requiredProfile = typeof output.requiredProfile === "string" ? output.requiredProfile.trim() : "";
    let description = typeof output.description === "string" ? output.description.trim() : "";

    if (!description) {
      const summary = typeof output.summary === "string" ? output.summary.trim() : `Brouillon d'offre pour le poste de ${title}.`;
      description = [
        "PRÉSENTATION DU POSTE",
        summary,
        "",
        "MISSIONS PRINCIPALES",
        ...(missions.length ? missions : responsibilities).map((item) => `- ${item}`),
        "",
        "COMPÉTENCES RECHERCHÉES",
        ...(skills.length ? skills.map((item) => `- ${item}`) : ["À compléter selon les exigences réelles du poste."]),
        "",
        "PROFIL RECHERCHÉ",
        requiredProfile || "À préciser par l'employeur.",
        "",
        "INFORMATIONS À COMPLÉTER",
        ...stringList(output.missingFields).map((item) => `- ${item}`),
      ].join("\n");
    }

    const modelMissingFields = stringList(output.missingFields);
    const requiredCompletionFields = [
      ...(!String(profile?.companyName || "").trim() ? ["Entreprise"] : []),
      "Lieu de travail",
      "Rémunération",
      "Avantages",
      "Type de contrat",
      "Horaires",
      "Date limite",
      "Modalités de candidature",
    ];
    const missingFields = Array.from(new Set([...modelMissingFields, ...requiredCompletionFields]));
    return NextResponse.json({
      ok: true,
      draft: {
        title,
        description,
        skills,
        sector: typeof output.sector === "string" ? output.sector.trim() : "",
        missingFields,
        summary: typeof output.summary === "string" ? output.summary : "",
        confidence: output.confidence === "HIGH" || output.confidence === "MEDIUM" || output.confidence === "LOW" ? output.confidence : "MEDIUM",
      },
      credits: result.credits,
      remaining: result.remaining,
      provider: result.provider,
      aiName: result.aiName,
    });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "Génération de l'offre impossible.",
    }, { status: 500 });
  }
}
