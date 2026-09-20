import { generateText } from "ai";

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

const FALLBACK: JiaPrediction = {
  message: "Je regarde ce que tu fais pour anticiper la prochaine étape utile.",
  gesture: "curious",
  shouldSpeak: true,
};

const SYSTEM = `Tu es J’IA, le personnage central de JOBLY.
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const context = {
      path: typeof body?.path === "string" ? body.path.slice(0, 160) : "/",
      action: typeof body?.action === "string" ? body.action.slice(0, 240) : "",
      visibleText: typeof body?.visibleText === "string" ? body.visibleText.slice(0, 1200) : "",
      recentDialogue: Array.isArray(body?.recentDialogue)
        ? body.recentDialogue.filter((v: unknown) => typeof v === "string").slice(-4)
        : [],
      idleMs: Number.isFinite(body?.idleMs) ? Math.min(Math.max(body.idleMs, 0), 300000) : 0,
    };

    const { text } = await generateText({
      model: "deepseek/deepseek-v4.1-flash",
      system: SYSTEM,
      prompt: JSON.stringify(context),
      maxOutputTokens: 180,
    });

    const parsed = JSON.parse(text.replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/i, "")) as JiaPrediction;
    if (!parsed || typeof parsed.message !== "string" || typeof parsed.gesture !== "string") {
      return Response.json(FALLBACK);
    }

    const safe: JiaPrediction = {
      message: parsed.message.trim().slice(0, 260),
      gesture: parsed.gesture,
      shouldSpeak: parsed.shouldSpeak !== false,
      ...(parsed.target ? { target: String(parsed.target).slice(0, 80) } : {}),
    };
    return Response.json(safe);
  } catch {
    return Response.json(FALLBACK, { status: 200 });
  }
}
