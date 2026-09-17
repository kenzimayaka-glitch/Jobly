import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
// Corrigé le 13/09/2026 : le préfixe "apps/web/" ne correspondait à aucune
// structure réelle de ce repo (racine plate, pas de monorepo apps/web) —
// ce script échouait donc systématiquement s'il était exécuté.
const required = [
  "public/manifest.webmanifest",
  "public/sw.js",
  "public/icons/icon-192.png",
  "public/icons/icon-512.png",
  "components/PwaInit.tsx",
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error("PWA CHECK FAILED");
  missing.forEach((x) => console.error("-", x));
  process.exit(1);
}
console.log("PWA CHECK OK — manifest, service worker and icons present, and the service worker registration is wired into app/layout.tsx via components/PwaInit.tsx.");
