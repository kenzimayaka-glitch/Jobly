import type { AiOperation } from "../aiEconomics";

export type AiProviderId =
  | "GEMINI"
  | "OPENROUTER"
  | "GROQ"
  | "CEREBRAS"
  | "TOGETHER"
  | "HUGGINGFACE"
  | "DETERMINISTIC";

export type AiPriority = "QUALITY" | "BALANCED" | "SPEED" | "COST";

export type AiTaskRequest = {
  operation: AiOperation;
  input: Record<string, unknown>;
  context: Record<string, unknown>;
  priority?: AiPriority;
};

export type AiProviderResult = {
  output: unknown;
  model?: string;
  metadata?: Record<string, unknown>;
};

export type AiProvider = {
  id: AiProviderId;
  label: string;
  enabled: boolean;
  supports: (operation: AiOperation) => boolean;
  run: (request: AiTaskRequest) => Promise<AiProviderResult>;
};

export type AiOrchestrationResult = {
  provider: AiProviderId;
  model: string;
  output: unknown;
  attempts: AiProviderId[];
  fallbackUsed: boolean;
};
