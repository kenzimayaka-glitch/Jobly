const PRIVATE_QUESTION_KEYS = new Set([
  "correct", "answer", "correctAnswer", "acceptedAnswers", "explanation", "solution", "grading",
]);

export function sanitizeTestQuestionOptions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeTestQuestionOptions);
  if (value && typeof value === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (!PRIVATE_QUESTION_KEYS.has(key)) clean[key] = sanitizeTestQuestionOptions(nested);
    }
    return clean;
  }
  return value;
}

export function isAutoGradableTestQuestionType(value: unknown): boolean {
  const type = String(value ?? "").trim().toUpperCase();
  return type === "SINGLE_CHOICE" || type === "NUMBER";
}
