import type { AiProvider, AiTaskRequest } from "../types";
import { JOBLY_PUBLIC_URL } from "../../site";
import { runGemini } from "./gemini";
import { runOpenAICompatible } from "./openaiCompatible";
import { deterministicProvider } from "./deterministic";

const compatible = (
  id: AiProvider["id"],
  label: string,
  apiKeyEnv: string,
  baseUrl: string,
  modelEnv: string,
  defaultModel: string,
  headers?: Record<string, string>,
): AiProvider => ({
  id,
  label,
  enabled: Boolean(process.env[apiKeyEnv]),
  supports: () => true,
  run: (request: AiTaskRequest) => runOpenAICompatible(request, { apiKeyEnv, baseUrl, modelEnv, defaultModel, headers }),
});

export const geminiProvider: AiProvider = {
  id: "GEMINI",
  label: "Google Gemini",
  enabled: Boolean(process.env.GEMINI_API_KEY),
  supports: () => true,
  run: runGemini,
};

export const openRouterProvider = compatible(
  "OPENROUTER",
  "OpenRouter",
  "OPENROUTER_API_KEY",
  "https://openrouter.ai/api/v1",
  "OPENROUTER_MODEL",
  "openai/gpt-oss-120b",
  { "HTTP-Referer": JOBLY_PUBLIC_URL, "X-Title": "JOBLY" },
);

export const groqProvider = compatible(
  "GROQ",
  "Groq",
  "GROQ_API_KEY",
  "https://api.groq.com/openai/v1",
  "GROQ_MODEL",
  "openai/gpt-oss-120b",
);

export const cerebrasProvider = compatible(
  "CEREBRAS",
  "Cerebras",
  "CEREBRAS_API_KEY",
  "https://api.cerebras.ai/v1",
  "CEREBRAS_MODEL",
  "llama3.1-8b",
);

export const togetherProvider = compatible(
  "TOGETHER",
  "Together AI",
  "TOGETHER_API_KEY",
  "https://api.together.xyz/v1",
  "TOGETHER_MODEL",
  "openai/gpt-oss-20b",
);

export const huggingFaceProvider = compatible(
  "HUGGINGFACE",
  "Hugging Face",
  "HF_TOKEN",
  "https://router.huggingface.co/v1",
  "HF_MODEL",
  "openai/gpt-oss-120b:fastest",
);

export { deterministicProvider };
