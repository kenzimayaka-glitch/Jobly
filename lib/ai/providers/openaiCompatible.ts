import type { AiProviderResult, AiTaskRequest } from "../types";

export type OpenAICompatibleConfig = {
  apiKeyEnv: string;
  baseUrl: string;
  modelEnv: string;
  defaultModel: string;
  headers?: Record<string, string>;
};

function buildPrompt(request: AiTaskRequest) {
  const system = `Tu es un moteur IA de JOBLY. Tu aides sur l'opération ${request.operation}. Utilise uniquement les informations fournies dans le contexte et l'entrée. N'invente pas de faits personnels, d'expériences, de diplômes ou de résultats. Réponds en français sauf si l'entrée est principalement dans une autre langue. Retourne un JSON valide, sans markdown, avec une structure utile à l'opération.`;
  const user = JSON.stringify({ operation: request.operation, input: request.input, context: request.context });
  return { system, user };
}

export async function runOpenAICompatible(
  request: AiTaskRequest,
  config: OpenAICompatibleConfig,
): Promise<AiProviderResult> {
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) throw new Error(`${config.apiKeyEnv} manquant`);

  const model = process.env[config.modelEnv] || config.defaultModel;
  const { system, user } = buildPrompt(request);
  const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...(config.headers || {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 1800,
      stream: false,
    }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${config.baseUrl} ${response.status}: ${String(data?.error?.message || data?.message || "API error").slice(0, 300)}`);
  }

  const text = data?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("Réponse IA vide");

  return {
    output: parseJsonOrText(text),
    model: data?.model || model,
    metadata: {
      usage: data?.usage || null,
      finishReason: data?.choices?.[0]?.finish_reason || null,
    },
  };
}

function parseJsonOrText(text: string): unknown {
  const clean = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(clean); } catch { return { text: clean }; }
}
