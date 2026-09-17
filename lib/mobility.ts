import { CAMEROON_CITIES, type CameroonCityKey } from "./cities";
import { calculateMobilityCosts, haversineKm } from "./gps";

export { CAMEROON_CITIES, calculateMobilityCosts, haversineKm };
export type { CameroonCityKey };

export const MOBILITY_STEPS = ["Demande créée", "Dossier vérifié", "Garantie recruteur", "Subvention validée", "Pass généré", "Déplacement effectué"] as const;

export function randomPassCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "JOBLY-MOB-";
  for (let i = 0; i < 4; i++) value += chars[Math.floor(Math.random() * chars.length)];
  return value;
}

export function cityKeyFromName(name: string | null | undefined): CameroonCityKey {
  const entry = Object.entries(CAMEROON_CITIES).find(([, c]) => c.name.toLowerCase() === String(name || "").toLowerCase());
  return (entry?.[0] || "YAOUNDE") as CameroonCityKey;
}

export function calculateDistanceBetweenCities(depart: CameroonCityKey, arrivee: CameroonCityKey) {
  const a = CAMEROON_CITIES[depart]; const b = CAMEROON_CITIES[arrivee];
  return Math.round(haversineKm(a.lat, a.lng, b.lat, b.lng));
}
