import { EVENT_DOMAINS } from "./events";

type EventLike = {
  id: string;
  title: string;
  description: string;
  domain: string;
  subdomains?: string[];
  city?: string | null;
  audience?: string[];
  startAt: string;
};

type ProfileLike = {
  targetRoles?: string[] | null;
  targetCities?: string[] | null;
  preferredSectors?: string[] | null;
  location?: string | null;
};

type JourneyLike = { targetRole?: string | null; targetDescription?: string | null };

const normalize = (v: unknown) =>
  String(v ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function overlap(values: string[], haystack: string) {
  const h = normalize(haystack);
  return values.filter((v) => {
    const n = normalize(v);
    return n.length >= 3 && (h.includes(n) || n.includes(h));
  }).length;
}

export function scoreEventForProfile(event: EventLike, profile: ProfileLike, journey?: JourneyLike | null) {
  const text = [event.title, event.description, ...(event.subdomains ?? [])].join(" ");
  const roles = [...(profile.targetRoles ?? []), ...(journey?.targetRole ? [journey.targetRole] : [])];
  const sectors = profile.preferredSectors ?? [];
  const cities = [...(profile.targetCities ?? []), ...(profile.location ? [profile.location] : [])];

  let score = 0;
  score += Math.min(30, overlap(roles, text) * 10);
  score += Math.min(20, overlap(sectors, text) * 10);
  score += Math.min(25, overlap(cities, event.city ?? "") * 25);
  if (event.domain === "EMPLOYMENT_RECRUITMENT" && roles.length) score += 15;
  if (event.domain === "EDUCATION_CAMPUS" && (profile.targetRoles?.length || 0) === 0) score += 8;
  if (event.domain === "MOBILITY" && cities.length) score += 10;
  return Math.min(100, score);
}

export function buildEventEcosystemConnections(event: EventLike) {
  const domain = EVENT_DOMAINS.find((x) => x.value === event.domain);
  return {
    eventSourceOfTruth: true,
    consumers: [
      { key: "COMMUNITY", status: "ADAPTER_READY", reason: "Diffusion ciblée prévue sans duplication de l’événement." },
      { key: "CAMPUS", status: event.domain === "EDUCATION_CAMPUS" ? "RELEVANT" : "AVAILABLE", reason: domain?.label ?? event.domain },
      { key: "MOBILITY", status: event.domain === "MOBILITY" ? "RELEVANT" : "AVAILABLE", reason: "Les événements peuvent alimenter les parcours de mobilité." },
      { key: "OFFERS", status: event.domain === "EMPLOYMENT_RECRUITMENT" ? "RELEVANT" : "AVAILABLE", reason: "Les événements emploi peuvent compléter la découverte d’opportunités." },
      { key: "CAREER_JOURNEY", status: "RELEVANT", reason: "La pertinence peut être calculée à partir du Career Journey sans créer d’état parallèle." },
      { key: "HUB", status: "AVAILABLE", reason: "Les événements institutionnels restent consommables depuis le Hub." },
    ],
  };
}
