export type JiaQcmOption = {
  id: string;
  label: string;
  value: string;
};

export type JiaQcmQuestion = {
  id: string;
  prompt: string;
  multiple: boolean;
  options: JiaQcmOption[];
  other: {
    id: "other";
    label: string;
    placeholder: string;
  };
  voiceEnabled: true;
  maxVisibleOptions: 4;
};

const OTHER = {
  id: "other" as const,
  label: "Autre…",
  placeholder: "Précise ta réponse…",
};

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function createJiaQcmQuestion(input: {
  id: string;
  prompt: string;
  options: JiaQcmOption[];
  multiple?: boolean;
}): JiaQcmQuestion {
  return {
    id: input.id,
    prompt: input.prompt,
    multiple: Boolean(input.multiple),
    options: input.options.slice(0, 4),
    other: OTHER,
    voiceEnabled: true,
    maxVisibleOptions: 4,
  };
}

export function parseJiaQcmAnswer(
  answer: string,
  options: JiaQcmOption[],
): { selectedIds: string[]; freeText: string; raw: string } {
  const raw = answer.trim();
  const lower = raw.toLocaleLowerCase("fr-FR");
  const selectedIds = options
    .filter((option) => {
      const label = option.label.toLocaleLowerCase("fr-FR");
      const value = option.value.toLocaleLowerCase("fr-FR");
      return lower.includes(label) || lower.includes(value);
    })
    .map((option) => option.id);

  const freeText = selectedIds.length
    ? ""
    : raw;

  return { selectedIds: unique(selectedIds), freeText, raw };
}

export function mergeJiaQcmSelections(
  currentIds: string[],
  nextIds: string[],
  multiple: boolean,
) {
  return multiple ? unique([...currentIds, ...nextIds]) : nextIds.slice(0, 1);
}

/**
 * Canonical first-step QCM for conversational monitoring.
 * The same UX contract can be reused by other J'IA questionnaires.
 */
export const WATCH_INTENT_QCM = createJiaQcmQuestion({
  id: "watch-scope",
  prompt: "Que veux-tu que je surveille ?",
  multiple: true,
  options: [
    { id: "jobs", label: "Offres d’emploi", value: "jobs" },
    { id: "companies", label: "Entreprises", value: "companies" },
    { id: "skills", label: "Compétences recherchées", value: "skills" },
    { id: "market", label: "Marché de l’emploi", value: "market" },
  ],
});
