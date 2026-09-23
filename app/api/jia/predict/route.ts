import { generateText } from "ai";
import type { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/server-auth";
import { adminClient } from "@/lib/server-auth";
import { buildJiaContext } from "@/lib/jiaContext";

export const runtime = "nodejs";

const ALLOWED_GESTURES = new Set([
  "welcome", "analyze", "point", "write", "validate", "alert", "apply", "celebrate",
  "wink", "reassure", "encourage", "surprised", "curious", "proud", "handshake",
  "present-chart", "call-hr", "filter", "secure", "goodbye",
]);

type JiaPrediction = {
  message: string;
  gesture: string;
  shouldSpeak: boolean;
  target?: string;
};

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8;
const rateStore = new Map<string, { count: number; resetAt: number }>();

type Lang = "fr" | "en";

// En cas d’échec du modèle : silence (message vide) — pas de phrase générique répétée à l’écran.
const FALLBACK: Record<Lang, JiaPrediction> = {
  fr: { message: "", gesture: "curious", shouldSpeak: false },
  en: { message: "", gesture: "curious", shouldSpeak: false },
};

const SYSTEM_FR = `Tu es J’IA, le personnage central de JOBLY.
Tu accompagnes l’utilisateur avec intelligence, chaleur et discrétion.
Tu ne dois jamais attendre passivement une question : observe le contexte fourni et propose, quand c’est pertinent, UNE intervention courte qui anticipe le prochain besoin.
Tu ne racontes pas ton raisonnement interne.
Réponds exclusivement en JSON valide avec:
{"message":string,"gesture":string,"shouldSpeak":boolean,"target":string}
Règles:
- français naturel, humain, premium, jamais robotique;
- 8 à 22 mots maximum dans message;
- ne pas répéter une intervention récente;
- si aucune intervention n’est utile, message="";
- gestures autorisées: welcome, analyze, point, write, validate, alert, apply, celebrate, wink, reassure, encourage, surprised, curious, proud, handshake, present-chart, call-hr, filter, secure, goodbye;
- target est court et optionnel;
- shouldSpeak=true seulement si message n’est pas vide et mérite une intervention vocale.`;

const SYSTEM_EN = `You are J’IA, the central character of JOBLY.
You support the user with intelligence, warmth and discretion.
Never wait passively for a question: observe the provided context and, when relevant, offer ONE short intervention that anticipates the next need.
Never explain your internal reasoning.
Reply exclusively with valid JSON:
{"message":string,"gesture":string,"shouldSpeak":boolean,"target":string}
Rules:
- natural, human, premium English — never robotic;
- 8 to 22 words maximum in message;
- do not repeat a recent intervention;
- if no intervention is useful, message="";
- allowed gestures: welcome, analyze, point, write, validate, alert, apply, celebrate, wink, reassure, encourage, surprised, curious, proud, handshake, present-chart, call-hr, filter, secure, goodbye;
- target is short and optional;
- shouldSpeak=true only if message is not empty and deserves a spoken intervention.`;

export async function POST(request: NextRequest) {
  let lang: Lang = "fr";
  const proactiveFallback: JiaPrediction = {
    message: "Je suis là. Je peux t’aider à avancer dans Jobly.", gesture: "welcome", shouldSpeak: true,
  };
  try {
    // Endpoint payant (LLM) : session Jobly obligatoire — plus d’appel anonyme.
    const auth = await getAuthUser(request);
    if (!auth) return Response.json({ message: "Session requise." }, { status: 401 });

    const body = await request.json();
    lang = body?.lang === "en" ? "en" : "fr";
    const context = {
      path: typeof body?.path === "string" ? body.path.slice(0, 160) : "/",
      action: typeof body?.action === "string" ? body.action.slice(0, 240) : "",
      visibleText: typeof body?.visibleText === "string" ? body.visibleText.slice(0, 1200) : "",
      recentDialogue: Array.isArray(body?.recentDialogue)
        ? body.recentDialogue.filter((v: unknown) => typeof v === "string").slice(-4)
        : [],
      idleMs: Number.isFinite(body?.idleMs) ? Math.min(Math.max(body.idleMs, 0), 300000) : 0,
    };
    const twin = await buildJiaContext(adminClient(), auth.id, { operation: "PROACTIVE_SIGNAL", input: context });
    const careerContext = twin.context ? {
      readiness: twin.context.readiness,
      gaps: twin.context.gaps.slice(0, 3),
      nextBestAction: twin.context.nextBestAction,
      targetRoles: twin.context.profile.targetRoles,
      recentActivity: twin.context.behavior.recent.slice(0, 5),
    } : null;

    const forwarded = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const ip = forwarded.split(",")[0].trim();
    const now = Date.now();
    const entry = rateStore.get(ip);
    if (!entry || entry.resetAt <= now) {
      rateStore.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    } else if (entry.count >= RATE_MAX) {
      return Response.json(FALLBACK[lang], {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)) },
      });
    } else {
      entry.count += 1;
    }

    const contextFallback: JiaPrediction = careerContext?.gaps[0]
      ? { message: `Je peux t’aider à ${careerContext.nextBestAction.toLowerCase()}.`, gesture: "encourage", shouldSpeak: true }
      : context.path.includes("/jobs")
        ? { message: "Je peux t’aider à trouver une offre adaptée à ton profil.", gesture: "curious", shouldSpeak: true }
        : context.path.includes("/candidatures")
          ? { message: "Je peux vérifier tes candidatures et repérer la prochaine relance utile.", gesture: "analyze", shouldSpeak: true }
          : context.path.includes("/career")
            ? { message: "Je peux t’aider à choisir la prochaine étape de ton parcours.", gesture: "encourage", shouldSpeak: true }
            : proactiveFallback;

    const { text } = await generateText({
      model: "deepseek/deepseek-v4.1-flash",
      system: lang === "en" ? SYSTEM_EN : SYSTEM_FR,
      prompt: JSON.stringify({ ...context, careerContext }),
      maxOutputTokens: 180,
    });

    const parsed = JSON.parse(text.replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/i, "")) as JiaPrediction;
    if (!parsed || typeof parsed.message !== "string" || typeof parsed.gesture !== "string") {
      return Response.json(proactiveFallback);
    }

    const safe: JiaPrediction = {
      message: parsed.message.trim().slice(0, 260),
      gesture: ALLOWED_GESTURES.has(parsed.gesture) ? parsed.gesture : "curious",
      shouldSpeak: parsed.shouldSpeak !== false,
      ...(parsed.target ? { target: String(parsed.target).slice(0, 80) } : {}),
    };
    return Response.json(safe);
  } catch {
    return Response.json(proactiveFallback, { status: 200 });
  }
}
