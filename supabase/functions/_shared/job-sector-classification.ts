export type JobSector =
  | "Sales & Marketing"
  | "Finance & Accounting"
  | "Engineering & Industry"
  | "NGO & Development"
  | "Technology & Data"
  | "Logistics & Transport"
  | "Health & Social"
  | "Education & Training"
  | "Administration & HR"
  | "Communication & Media"
  | "Legal & Compliance"
  | "Hospitality & Tourism"
  | "Agriculture & Environment"
  | "Customer Service"
  | "Construction & Real Estate"
  | "Security"
  | "Research & Science"
  | "Retail & Distribution"
  | "Other";

type SectorRule = { sector: JobSector; patterns: RegExp[] };

const RULES: SectorRule[] = [
  { sector: "NGO & Development", patterns: [/\bngo\b/, /\bong\b/, /humanitarian/, /development (?:project|program|programme)/, /community development/, /livelihoods?/, /protection officer/, /wash coordinator/, /grant(?:s)? management/] },
  { sector: "Health & Social", patterns: [/\bhealth(?:care)?\b/, /medical/, /doctor|physician/, /nurs(?:e|ing)/, /infirmier|infirmiere/, /medecin/, /sage femme|midwi(?:fe|very)/, /pharmacist|pharmacie/, /social worker|travailleur social/] },
  { sector: "Education & Training", patterns: [/\bteacher\b/, /enseignant|enseignante/, /professor|professeur/, /trainer|formateur|formatrice/, /training officer/, /education|educational/, /school|scolaire/, /tutor|tutoring/, /academic/] },
  { sector: "Agriculture & Environment", patterns: [/agricultur|agronom|farming|farmer|farm manager/, /agro[- ]?industry/, /environmental|environment/, /forestry|forest/, /wildlife|conservation/, /livestock|veterinary|veterinaire/] },
  { sector: "Construction & Real Estate", patterns: [/construction|building|batiment|btp/, /real estate|immobilier|property manager/, /architect|architecture/, /quantity surveyor/, /site engineer|chef de chantier/, /civil works/] },
  { sector: "Hospitality & Tourism", patterns: [/hospitality|hotel|hotelier/, /tourism|tourisme|travel agency/, /restaurant|catering/, /chef de cuisine|receptionist|receptionniste/, /housekeeping|front desk/] },
  { sector: "Legal & Compliance", patterns: [/\blegal\b|lawyer|attorney|avocat|juriste/, /compliance|conformite/, /regulatory|reglementaire/, /paralegal|legal counsel/, /contract law|droit des affaires/] },
  { sector: "Security", patterns: [/security officer|security guard|security supervisor/, /\bsafety officer\b|health and safety/, /security|securite|surete/, /fire safety|surveillance/] },
  { sector: "Research & Science", patterns: [/research(?:er|ers)?|recherche/, /scientist|scientifique/, /laboratory|laboratoire|\blab technician\b/, /\br\s*&\s*d\b/, /statistician|epidemiologist/] },
  { sector: "Retail & Distribution", patterns: [/\bretail\b|distribution/, /cashier|caissier|caissiere/, /store manager|shop manager|magasinier/, /merchandis(?:er|ing)/, /point of sale|point de vente/] },
  { sector: "Customer Service", patterns: [/customer service|service client/, /customer support|support client/, /call cent(?:er|re)|centre d.?appel/, /customer care|relation client/, /hotline|helpdesk/] },
  { sector: "Logistics & Transport", patterns: [/logistic|logistique/, /supply chain|chaine logistique/, /transport|chauffeur|driver/, /fleet|flotte/, /warehouse|entrepot/, /shipping|dispatch/] },
  { sector: "Engineering & Industry", patterns: [/engineer|ingenieur|ingenieure/, /engineering|ingenierie/, /industrial|industrie|manufacturing/, /mechanic|mecanicien|maintenance/, /electrical|electricien|electricite/, /technician|technicien|technicienne/, /production supervisor|quality control/] },
  { sector: "Finance & Accounting", patterns: [/account(?:ant|ing)|comptab(?:le|ilite)/, /finance|financial/, /bank(?:er|ing)?|banque|microfinance/, /audit(?:or)?|auditeur/, /treasury|tresorerie|tax|fiscal/, /insurance|assurance|credit analyst/] },
  { sector: "Technology & Data", patterns: [/\b(it|ict)\b|informatique/, /software|developer|developpeur|developpeuse|programmer/, /data analyst|data engineer|data scientist|business intelligence/, /cyber.?security|cybersecurite|devops|cloud engineer/, /database|network engineer|system administrator/, /web developer|mobile developer|\bqa engineer\b/] },
  { sector: "Communication & Media", patterns: [/journalis[mt]|journaliste|reporter/, /communication officer|communications? manager/, /public relations|relations publiques/, /media|medias|press officer/, /content creator|content editor|copywriter/, /videographer|photographer|graphic designer/] },
  { sector: "Administration & HR", patterns: [/human resources|\bhr manager\b|rh manager|ressources humaines/, /recruit(?:er|ment)|recruteur|recrutement/, /administrative assistant|assistant administratif/, /office manager|office administrator/, /payroll|paie|secretary|secretaire/, /administration officer|administrateur/] },
  { sector: "Sales & Marketing", patterns: [/\bsales\b|vente|commercial|commerciale/, /marketing|brand manager|trade marketing/, /business development|account manager/, /sales representative|sales executive|sales manager/, /prospection|lead generation|growth manager/] },
];

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(patterns: RegExp[], value: string): number {
  return patterns.reduce((count, pattern) => count + (pattern.test(value) ? 1 : 0), 0);
}

/**
 * Deterministic fallback used only when no trustworthy sector has already
 * been supplied by the source/AI normalizer. Title and tags weigh more than
 * free-text description to avoid classifying an offer from incidental words.
 */
export function classifyJobSector(
  title: unknown,
  description: unknown = "",
  tags: unknown = [],
): JobSector {
  const titleText = normalize(title);
  const tagText = normalize(Array.isArray(tags) ? tags.join(" ") : tags);
  const descriptionText = normalize(String(description ?? "").slice(0, 2400));

  let best: { sector: JobSector; score: number } = { sector: "Other", score: 0 };
  for (const rule of RULES) {
    const score =
      countMatches(rule.patterns, titleText) * 4 +
      countMatches(rule.patterns, tagText) * 3 +
      Math.min(2, countMatches(rule.patterns, descriptionText));
    if (score > best.score) best = { sector: rule.sector, score };
  }

  return best.score >= 3 ? best.sector : "Other";
}
