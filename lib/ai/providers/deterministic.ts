import type { AiProvider, AiTaskRequest } from "../types";
import type { AiOperation } from "../../aiEconomics";

function deterministic(op: AiOperation, c: Record<string, any>) {
  const p = c.profile || {};
  const skills = (c.skills || []).map((x: any) => x.name).filter(Boolean);
  const roles = p.targetRoles || [];

  if (op === "INTERVIEW") {
    return {
      mode: "deterministic",
      questions: [
        `Présente une réalisation concrète liée à ${roles[0] || "ton objectif professionnel"}.`,
        "Quelle compétence veux-tu renforcer dans les 3 prochains mois ?",
        "Quel résultat mesurable peux-tu apporter ?",
      ],
      focus: [...skills.slice(0, 3), ...(roles.length ? [`Cible : ${roles[0]}`] : [])],
    };
  }

  if (op === "LEARNING") {
    return {
      mode: "deterministic",
      objectives: (c.gaps || []).slice(0, 4).map((g: string) => ({
        objective: g,
        priority: "HIGH",
        checkpoint: "Ajouter une preuve vérifiable au profil",
      })),
      effort: "2 à 4 h/semaine",
    };
  }

  if (op === "APPLICATION_COPILOT") {
    return {
      mode: "deterministic",
      warnings: [
        ...(skills.length ? [] : ["Ajouter des compétences vérifiables"]),
        ...(p.summary ? [] : ["Compléter le résumé professionnel"]),
      ],
      cvSuggestions: [
        `Mettre en avant les compétences pertinentes pour ${roles[0] || "le poste ciblé"}.`,
        "Quantifier uniquement les réalisations réelles.",
      ],
      coverLetterOutline: [
        "Accroche liée au poste",
        "Preuves issues du parcours réel",
        "Motivation spécifique",
        "Disponibilité / prochaine étape",
      ],
      submission: "USER_REQUIRED",
    };
  }

  return {
    mode: "deterministic",
    summary: c.nextBestAction,
    nextActions: [c.nextBestAction, "Consulter les opportunités", "Suivre les candidatures"].slice(0, 3),
    readiness: c.readiness,
  };
}

export const deterministicProvider: AiProvider = {
  id: "DETERMINISTIC",
  label: "JOBLY Deterministic Fallback",
  enabled: true,
  supports: () => true,
  async run(request: AiTaskRequest) {
    return {
      output: deterministic(request.operation, request.context),
      model: "fallback-v1",
    };
  },
};
