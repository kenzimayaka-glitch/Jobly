import { CAMEROON_CITIES, type CameroonCityKey } from "./cities";

export type { CameroonCityKey };

export { CAMEROON_CITIES };

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function calculateMobilityCosts(departKey: CameroonCityKey, arriveeKey: CameroonCityKey, typeLocal: "CHAMBRE" | "STUDIO" | "APPART", salary: number) {
  const depart = CAMEROON_CITIES[departKey];
  const arrivee = CAMEROON_CITIES[arriveeKey];
  const distanceKm = haversineKm(depart.lat, depart.lng, arrivee.lat, arrivee.lng);
  const transportCost = Math.min(25000, Math.max(4000, Math.round(distanceKm * 30 + 2000)));
  const housingCost = { CHAMBRE: 40000, STUDIO: 65000, APPART: 100000 }[typeLocal];
  const movingCost = { CHAMBRE: 15000, STUDIO: 35000, APPART: 70000 }[typeLocal];
  const total = housingCost * 2 + transportCost + movingCost;
  const monthly = Math.round(total / 3);
  const mobilityFit = Math.max(20, 100 - distanceKm / 10 - (salary > 0 ? housingCost / salary * 50 : 50));
  return { distanceKm: Math.round(distanceKm), transportCost, housingCost, movingCost, total, monthly, mobilityFit: Math.round(mobilityFit) };
}
