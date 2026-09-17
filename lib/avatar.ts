// Génère un visuel d'entreprise déterministe (initiales + couleur stable)
// quand aucune photo/logo réel n'est disponible (pas de clé Brandfetch,
// entreprise non vérifiée, etc.). Le but : que chaque carte d'offre affiche
// quelque chose de spécifique à l'entreprise plutôt qu'un visuel générique
// identique partout.

const PALETTE = [
  ["#0B5FFF", "#FFE135"],
  ["#2E3F4F", "#7A9BB5"],
  ["#0B5FFF", "#7A9BB5"],
  ["#1E293B", "#FFE135"],
  ["#0EA5E9", "#2E3F4F"],
  ["#7A9BB5", "#0B5FFF"],
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "J";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Retourne une image SVG (data URI) avec les initiales de `name` sur un
 * dégradé de couleur choisi de façon stable à partir du nom — même
 * entreprise = même visuel à chaque affichage, sans appel réseau.
 */
export function companyAvatar(name: string | null | undefined): string {
  const safeName = name?.trim() || "JOBLY";
  const idx = hashString(safeName) % PALETTE.length;
  const [c1, c2] = PALETTE[idx];
  const letters = initials(safeName);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c1}"/>
        <stop offset="1" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="225" fill="url(#g)"/>
    <text x="200" y="128" font-family="Arial, sans-serif" font-size="64" font-weight="900" fill="#FFFEFB" text-anchor="middle">${letters}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
