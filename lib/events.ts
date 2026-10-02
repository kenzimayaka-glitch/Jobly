export const EVENT_MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const EVENT_VIDEO_MAX_SECONDS = 30;
export const EVENT_FEATURED_PRICE = 10000;
export const EVENT_FEATURED_DAYS = 7;
export const EVENT_FEATURED_SLOTS = 6;
export const EVENT_MAX_DAYS = 90;

export const EVENT_DOMAINS = [
  { value: "EMPLOYMENT_RECRUITMENT", label: "Emploi & Recrutement", subs: ["Recrutement", "Career Day", "Forum de l'emploi", "Networking professionnel"] },
  { value: "EDUCATION_CAMPUS", label: "Éducation & Campus", subs: ["Formation", "Orientation", "Bourses", "Université / École"] },
  { value: "TECH_DIGITAL", label: "Technologie & Numérique", subs: ["Développement", "Cybersécurité", "Cloud", "Transformation digitale"] },
  { value: "AI", label: "Intelligence artificielle", subs: ["IA générative", "Data", "Machine Learning", "Automatisation"] },
  { value: "FINTECH", label: "Finance & FinTech", subs: ["Mobile Money", "Paiement digital", "Banque", "Blockchain"] },
  { value: "TELECOM", label: "Télécommunications", subs: ["Mobile", "Réseaux", "Connectivité", "Services digitaux"] },
  { value: "ENTREPRENEURSHIP", label: "Entrepreneuriat & Startups", subs: ["Startup", "Innovation", "Financement", "Incubation"] },
  { value: "MOBILITY", label: "Mobilité professionnelle & internationale", subs: ["Emploi international", "Études à l'étranger", "Mobilité professionnelle", "Programmes internationaux"] },
  { value: "INSTITUTIONAL", label: "Institutionnel & Développement", subs: ["Insertion", "Jeunesse", "Développement", "Politiques publiques"] },
  { value: "NGO_IMPACT", label: "ONG & Impact social", subs: ["Impact social", "Jeunesse", "Inclusion", "Développement durable"] },
  { value: "INDUSTRY_ENGINEERING", label: "Industrie & Ingénierie", subs: ["Industrie", "Ingénierie", "Maintenance", "Production"] },
  { value: "HEALTH", label: "Santé", subs: ["Santé", "Pharma", "Santé numérique", "Prévention"] },
  { value: "AGRICULTURE", label: "Agriculture & Agro-industrie", subs: ["Agritech", "Agro-industrie", "Élevage", "Transformation"] },
  { value: "ENERGY_ENVIRONMENT", label: "Énergie & Environnement", subs: ["Énergie", "Climat", "Environnement", "Transition"] },
  { value: "COMMERCE_MARKETING", label: "Commerce & Marketing", subs: ["Commerce", "Marketing", "Vente", "Communication"] },
  { value: "CULTURE_CREATIVE", label: "Culture & Industries créatives", subs: ["Culture", "Design", "Média", "Création"] },
  { value: "SPORT_YOUTH", label: "Sport & Jeunesse", subs: ["Sport", "Jeunesse", "Leadership", "Programmes jeunesse"] },
  { value: "RESEARCH_INNOVATION", label: "Recherche & Innovation", subs: ["Recherche", "Innovation", "Laboratoires", "Conférences"] },
  { value: "OTHER", label: "Autre", subs: ["Autre"] },
] as const;

export function getEventDomain(value: string) {
  return EVENT_DOMAINS.find((d) => d.value === value) ?? null;
}

export function getEventPricing(days: number) {
  const durationDays = Math.max(1, Math.min(EVENT_MAX_DAYS, Math.floor(days)));
  const pricePerDay = durationDays >= 30 ? 1000 : durationDays >= 10 ? 1500 : 2000;
  return { durationDays, pricePerDay, total: durationDays * pricePerDay };
}

export function estimateEventAudience(input: { domain: string; secondaryDomains?: string[]; city?: string | null; audience?: string[] }) {
  const domainIndex = Math.max(1, EVENT_DOMAINS.findIndex((d) => d.value === input.domain) + 1);
  const secondary = Math.min(3, input.secondaryDomains?.length ?? 0);
  const audienceBoost = Math.min(6, input.audience?.length ?? 0);
  const communities = Math.min(40, 3 + (domainIndex % 6) + secondary + audienceBoost);
  const talents = 1200 + communities * 510 + domainIndex * 73;
  const recruiters = Math.max(5, Math.round(talents * 0.0045));
  const partners = Math.max(3, Math.round(communities * 1.15));
  return { communities, talents, recruiters, partners, cityScoped: Boolean(input.city) };
}

export function validateEventMedia(input: { mediaType?: string | null; mediaSizeBytes?: number | null; mediaDurationSeconds?: number | null }) {
  const type = input.mediaType ?? null;
  if (!type) return { ok: true };
  if (!["IMAGE", "FLYER", "VIDEO"].includes(type)) return { ok: false, error: "Type de média invalide." };
  if (!Number.isFinite(Number(input.mediaSizeBytes)) || Number(input.mediaSizeBytes) <= 0 || Number(input.mediaSizeBytes) > EVENT_MEDIA_MAX_BYTES) return { ok: false, error: "Le média doit peser au maximum 10 MB." };
  if (type === "VIDEO" && (Number(input.mediaDurationSeconds) <= 0 || Number(input.mediaDurationSeconds) > EVENT_VIDEO_MAX_SECONDS)) return { ok: false, error: "La vidéo doit durer au maximum 30 secondes." };
  return { ok: true };
}

export const EVENT_SAFETY_RULES = [
  "Aucune activité illégale, fraude, escroquerie ou usurpation d'identité.",
  "Aucune fausse offre d'emploi, collecte trompeuse de données ou phishing.",
  "Aucun contenu violent, haineux, discriminatoire ou sexuellement explicite.",
  "L'organisateur doit disposer des droits nécessaires sur les contenus et médias publiés.",
  "Jobly peut suspendre ou retirer un événement qui enfreint ses règles ou présente un risque.",
];
