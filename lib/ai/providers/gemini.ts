import type { AiProviderResult, AiTaskRequest } from "../types";

function prompt(request: AiTaskRequest) {
  return `Tu es le moteur IA de JOBLY pour l'opération ${request.operation}. Utilise uniquement les données fournies. N'invente aucune information personnelle ou professionnelle. Réponds en français sauf si le contenu principal est dans une autre langue. Retourne uniquement un JSON valide, sans markdown.\n\n${JSON.stringify({ operation: request.operation, input: request.input, context: request.context })}`;
}

export async function runGemini(request: AiTaskRequest): Promise<AiProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquant");
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt(request) }] }],
      generationConfig: { temperature: 0.2, responseMimeType: "application/json", maxOutputTokens: 1800 },
    }),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${String(data?.error?.message || "API error").slice(0, 300)}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || "").join("") || "";
  if (!text) throw new Error("Gemini réponse vide");
  return { output: parseJson(text), model: data?.modelVersion || model, metadata: { usage: data?.usageMetadata || null } };
}

function parseJson(text: string): unknown {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(clean); } catch { return { text: clean }; }
}
