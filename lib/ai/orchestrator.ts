import type { AiOperation } from "../aiEconomics";
import { getProvider } from "./providerRegistry";
import type { AiOrchestrationResult, AiPriority, AiProviderId, AiTaskRequest } from "./types";

const PROVIDER_ORDER: Record<AiPriority, AiProviderId[]> = {
  QUALITY: ["OPENROUTER", "GEMINI", "TOGETHER", "GROQ", "CEREBRAS", "HUGGINGFACE", "DETERMINISTIC"],
  BALANCED: ["OPENROUTER", "GEMINI", "GROQ", "CEREBRAS", "TOGETHER", "HUGGINGFACE", "DETERMINISTIC"],
  SPEED: ["GROQ", "CEREBRAS", "OPENROUTER", "GEMINI", "TOGETHER", "HUGGINGFACE", "DETERMINISTIC"],
  COST: ["OPENROUTER", "GROQ", "CEREBRAS", "TOGETHER", "HUGGINGFACE", "GEMINI", "DETERMINISTIC"],
};

/**
 * Central decision point for all JOBLY AI operations.
 * Provider adapters are selected by availability and priority; deterministic remains the final safety fallback.
 */
export async function runAiOrchestrator(
  operation: AiOperation,
  input: Record<string, unknown>,
  context: Record<string, unknown>,
  priority: AiPriority = "BALANCED",
): Promise<AiOrchestrationResult> {
  const request: AiTaskRequest = { operation, input, context, priority };
  const attempts: AiProviderId[] = [];

  for (const id of PROVIDER_ORDER[priority]) {
    const provider = getProvider(id);
    if (!provider.enabled || !provider.supports(operation)) continue;
    attempts.push(id);

    try {
      const result = await provider.run(request);
      return {
        provider: id,
        model: result.model || "unknown",
        output: result.output,
        attempts,
        fallbackUsed: id !== PROVIDER_ORDER[priority][0],
      };
    } catch {
      // Provider failures are isolated here. The next provider is attempted.
    }
  }

  throw new Error("Aucun moteur IA JOBLY disponible.");
}
