import { NextRequest, NextResponse } from "next/server";
import { ensureUser, getAuthUser } from "../../../../../lib/server-auth";
import { runAiGateway } from "../../../../../lib/aiGateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (!auth) return NextResponse.json({ message: "Session requise." }, { status: 401 });

    const { adminClient } = await import("../../../../../lib/server-auth");
    const db = adminClient();
    const user = await ensureUser(db, auth);
    if (user.role !== "TALENT" && user.role !== "ADMIN") {
      return NextResponse.json({ message: "Cet outil CV est réservé à l'espace Talent." }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode === "IMPROVE" ? "IMPROVE" : body.mode === "CHAT" ? "CHAT" : "";
    if (!mode) return NextResponse.json({ message: "Mode d'assistance invalide." }, { status: 400 });

    const cv = body.cv && typeof body.cv === "object" ? body.cv as Record<string, unknown> : {};
    const cvText = [
      clean(cv.fullName, 160),
      clean(cv.headline, 200),
      clean(cv.summary, 3500),
      clean(cv.skills, 3000),
      clean(cv.experience, 6500),
      clean(cv.education, 3500),
      Array.isArray(cv.activities) ? cv.activities.map((item) => clean(item, 200)).join(", ") : "",
      Array.isArray(cv.languages) ? cv.languages.map((item) => clean(item, 100)).join(", ") : "",
      Array.isArray(cv.achievements) ? cv.achievements.map((item) => clean(item, 300)).join("\n") : "",
    ].filter(Boolean).join("\n");
    if (cvText.replace(/\s/g, "").length < 40) {
      return NextResponse.json({ message: "Complète ou importe d'abord ton CV pour lancer l'analyse." }, { status: 422 });
    }

    const targetRole = clean(body.targetRole, 160);
    const jobDescription = clean(body.jobDescription, 3000);
    const question = clean(body.question, 1200);
    if (mode === "CHAT" && !question) {
      return NextResponse.json({ message: "Écris une question pour démarrer la conversation ATS." }, { status: 400 });
    }

    const history = Array.isArray(body.history)
      ? body.history.slice(-8).flatMap((item: unknown) => {
          if (!item || typeof item !== "object") return [];
          const row = item as Record<string, unknown>;
          const role = row.role === "assistant" ? "J'IA" : row.role === "user" ? "Talent" : "";
          const text = clean(row.text, 800);
          return role && text ? [`${role}: ${text}`] : [];
        }).join("\n")
      : "";

    const result = await runAiGateway(request, "CV_INTELLIGENCE", {
      cvText,
      targetRole,
      jobDescription,
      mode,
      question,
      conversationHistory: history,
    });
    if (!result.ok) {
      return NextResponse.json({ message: result.message, upgradeSuggestion: result.upgradeSuggestion }, { status: result.status });
    }

    const output = result.output && typeof result.output === "object" ? result.output as Record<string, unknown> : {};
    let safeOutput = output;
    if (mode === "CHAT" && typeof output.reply !== "string") {
      return NextResponse.json({ message: "J'IA n'a pas retourné de réponse conversationnelle exploitable." }, { status: 502 });
    }
    if (mode === "IMPROVE" && (!output.improvedProfile || typeof output.improvedProfile !== "object")) {
      return NextResponse.json({ message: "La proposition d'amélioration du CV n'est pas disponible. Réessaie avec un CV plus complet." }, { status: 502 });
    }
    if (mode === "IMPROVE") {
      const proposedProfile = output.improvedProfile as Record<string, unknown>;
      // J'IA may improve professional wording, but contact and identity fields
      // remain the values supplied by the Talent and cannot be rewritten by AI.
      safeOutput = {
        ...output,
        improvedProfile: {
          ...proposedProfile,
          fullName: clean(cv.fullName, 160),
          email: clean(cv.email, 200),
          phone: clean(cv.phone, 80),
        },
      };
    }

    return NextResponse.json({
      ok: true,
      mode,
      output: safeOutput,
      credits: result.credits,
      remaining: result.remaining,
      provider: result.provider,
    });
  } catch (error) {
    return NextResponse.json({
      message: error instanceof Error ? error.message : "L'assistance CV J'IA est indisponible.",
    }, { status: 500 });
  }
}
