export type SemanticField =
  | "company"
  | "contract"
  | "location"
  | "salary"
  | "experience"
  | "education"
  | "deadline"
  | "application";

export type SemanticValidation = {
  accepted: boolean;
  confidence: number;
  reason: string;
  competingField: SemanticField | null;
};

function semantic(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const CONTRACT = /\b(?:cdi|cdd|stage|interim|interim|freelance|consultant|alternance|apprentissage|temps partiel|temps plein|contrat)\b/i;
const DURATION = /\b\d+(?:[,.]\d+)?\s*(?:mois|ans?|annees?|semaines?|jours?)\b/i;
const EXPERIENCE = /\b(?:\d+(?:[,.]\d+)?\s*(?:ans?|annees?)\s*(?:d['’]?experience|d['’]?exp|minimum)?|experience\s+(?:requise|professionnelle|de)?)\b/i;
const EDUCATION = /\b(?:bac(?:\s*\+\s*\d+)?|bep|cap|bts|dut|licence|master|mba|doctorat|phd|diplome|formation|ingenieur)\b/i;
const SALARY = /(?:\b(?:fcfa|xof|xaf|eur|usd|€|\$)\b|\b\d[\d .]*\s*(?:fcfa|xof|xaf|eur|usd)\b|\b(?:salaire|remuneration)\b)/i;
const DATE = /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2}|avant le|date limite|deadline)\b/i;
const APPLICATION = /(?:@|\b(?:postuler|candidature|envoyer|envoyez|adressez|transmettez|cv|lettre de motivation|apply)\b)/i;
const GENERIC = /^(?:offre|offre d'emploi|poste|emploi|candidature|profil|mission|entreprise|employeur|organisation|societe|société|non precise|non précisé)$/i;

function hasCompanyEvidence(value: string, context: string): boolean {
  const text = semantic(context);
  const candidate = semantic(value);
  if (new RegExp(`\\b(?:nom de l'employeur|employeur|entreprise|company|organisation|societe|société)\\s*[:：-]\\s*${escapeRegex(candidate)}\\b`, "i").test(text)) return true;
  if (new RegExp(`\\b(?:chez|au sein de|aupres de|auprès de)\\s+${escapeRegex(candidate)}\\b`, "i").test(text)) return true;
  return new RegExp(`\\b(?:ong|association|fondation|groupe|societe|société|entreprise|organisation)\\s+(?:[a-zà-ÿ-]+\\s+){0,2}${escapeRegex(candidate)}\\b`, "i").test(text);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^$()|[\\]\\\\]/g, "\\$&");
}

export function validateSemanticField(
  field: SemanticField,
  value: unknown,
  context = "",
): SemanticValidation {
  const raw = typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  if (!raw) return { accepted: false, confidence: 0, reason: "empty", competingField: null };

  const normalized = semantic(raw);
  const normalizedContext = semantic(context);

  if (field === "company") {
    if (GENERIC.test(normalized)) return { accepted: false, confidence: 0, reason: "generic_company_value", competingField: null };
    if (CONTRACT.test(normalized) || DURATION.test(normalized)) {
      return { accepted: false, confidence: 0.02, reason: "value_conflicts_with_contract_semantics", competingField: "contract" };
    }
    if (SALARY.test(normalized)) return { accepted: false, confidence: 0.01, reason: "value_conflicts_with_salary_semantics", competingField: "salary" };
    if (EDUCATION.test(normalized)) return { accepted: false, confidence: 0.01, reason: "value_conflicts_with_education_semantics", competingField: "education" };
    if (EXPERIENCE.test(normalized)) return { accepted: false, confidence: 0.01, reason: "value_conflicts_with_experience_semantics", competingField: "experience" };
    if (DATE.test(normalized)) return { accepted: false, confidence: 0.01, reason: "value_conflicts_with_date_semantics", competingField: "deadline" };
    const explicit = hasCompanyEvidence(raw, normalizedContext);
    const lexical = /\b(?:ong|association|fondation|groupe|societe|société|entreprise|organisation|university|universite|université|bank|banque)\b/i.test(normalized);
    const titleEvidence = normalizedContext.includes(normalized);
    const confidence = Math.min(1, 0.35 + (explicit ? 0.45 : 0) + (lexical ? 0.12 : 0) + (titleEvidence ? 0.08 : 0));
    if (explicit || lexical || titleEvidence) return { accepted: true, confidence, reason: explicit ? "explicit_company_evidence" : "contextual_company_evidence", competingField: null };
    return { accepted: false, confidence: 0.18, reason: "insufficient_company_evidence", competingField: null };
  }

  if (field === "contract") {
    const confidence = Math.min(1, (CONTRACT.test(normalized) ? 0.75 : 0) + (DURATION.test(normalized) ? 0.2 : 0) + (/\b(?:contrat|type de contrat)\b/i.test(normalizedContext) ? 0.05 : 0));
    return confidence >= 0.75
      ? { accepted: true, confidence, reason: "contract_semantics", competingField: null }
      : { accepted: false, confidence, reason: "insufficient_contract_evidence", competingField: null };
  }

  if (field === "salary") {
    return SALARY.test(normalized)
      ? { accepted: true, confidence: 0.9, reason: "salary_semantics", competingField: null }
      : { accepted: false, confidence: 0, reason: "not_salary_semantics", competingField: null };
  }

  if (field === "experience") {
    return EXPERIENCE.test(normalized)
      ? { accepted: true, confidence: 0.9, reason: "experience_semantics", competingField: null }
      : { accepted: false, confidence: 0, reason: "not_experience_semantics", competingField: null };
  }

  if (field === "education") {
    return EDUCATION.test(normalized)
      ? { accepted: true, confidence: 0.9, reason: "education_semantics", competingField: null }
      : { accepted: false, confidence: 0, reason: "not_education_semantics", competingField: null };
  }

  if (field === "deadline") {
    return DATE.test(normalized)
      ? { accepted: true, confidence: 0.9, reason: "date_semantics", competingField: null }
      : { accepted: false, confidence: 0, reason: "not_date_semantics", competingField: null };
  }

  if (field === "application") {
    return APPLICATION.test(normalized)
      ? { accepted: true, confidence: 0.8, reason: "application_semantics", competingField: null }
      : { accepted: false, confidence: 0, reason: "not_application_semantics", competingField: null };
  }

  // Location is deliberately conservative: the source-specific parser remains
  // responsible for geography; this guard only rejects values that clearly
  // belong to another semantic family.
  if (CONTRACT.test(normalized) || SALARY.test(normalized) || EDUCATION.test(normalized)) {
    return { accepted: false, confidence: 0.01, reason: "value_conflicts_with_other_field", competingField: CONTRACT.test(normalized) ? "contract" : SALARY.test(normalized) ? "salary" : "education" };
  }
  return { accepted: true, confidence: 0.5, reason: "location_unambiguous", competingField: null };
}
