import type { AiProvider, AiProviderId } from "./types";
import {
  deterministicProvider,
  geminiProvider,
  openRouterProvider,
  groqProvider,
  cerebrasProvider,
  togetherProvider,
  huggingFaceProvider,
} from "./providers";

const providers: Record<AiProviderId, AiProvider> = {
  GEMINI: geminiProvider,
  OPENROUTER: openRouterProvider,
  GROQ: groqProvider,
  CEREBRAS: cerebrasProvider,
  TOGETHER: togetherProvider,
  HUGGINGFACE: huggingFaceProvider,
  DETERMINISTIC: deterministicProvider,
};

const secretByProvider: Partial<Record<AiProviderId, string>> = {
  GEMINI: "GEMINI_API_KEY",
  OPENROUTER: "OPENROUTER_API_KEY",
  GROQ: "GROQ_API_KEY",
  CEREBRAS: "CEREBRAS_API_KEY",
  TOGETHER: "TOGETHER_API_KEY",
  HUGGINGFACE: "HF_TOKEN",
};

export function providerSecretName(id: AiProviderId): string | undefined { return secretByProvider[id]; }
export function getProvider(id: AiProviderId): AiProvider { return providers[id]; }
export function listProviders(): Array<{ id: AiProviderId; label: string; enabled: boolean }> {
  return (Object.keys(providers) as AiProviderId[]).map((id) => ({ id, label: providers[id].label, enabled: providers[id].enabled }));
}
