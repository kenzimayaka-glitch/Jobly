const PRIVATE_QUESTION_KEYS = new Set([
  "answer",
  "answers",
  "acceptedanswer",
  "acceptedanswers",
  "answerkey",
  "answerkeys",
  "correct",
  "correctanswer",
  "correctanswers",
  "correctchoice",
  "correctchoices",
  "explanation",
  "explanations",
  "feedback",
  "grading",
  "gradingrubric",
  "iscorrect",
  "modelanswer",
  "modelanswers",
  "scoring",
  "solution",
  "solutions",
]);

function isPrivateQuestionKey(key: string): boolean {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return PRIVATE_QUESTION_KEYS.has(normalized);
}

export function sanitizeTestQuestionOptions(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeTestQuestionOptions);
  if (value && typeof value === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (!isPrivateQuestionKey(key)) clean[key] = sanitizeTestQuestionOptions(nested);
    }
    return clean;
  }
  return value;
}

export function isAutoGradableTestQuestionType(value: unknown): boolean {
  const type = String(value ?? "").trim().toUpperCase();
  return type === "SINGLE_CHOICE" || type === "NUMBER";
}
