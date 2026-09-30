import fs from "node:fs";

const registry = fs.readFileSync("supabase/functions/discover-jobs/source-registry.ts", "utf8");
const keys = [...registry.matchAll(/\{key:"([^"]+)"[^\n]*status:"active"[^\n]*url:"([^"]+)"[^\n]*countries:(?:PAN_AFRICA\.filter\(c=>c!=="CM"\)|PAN_AFRICA|\[[^\]]*\])/g)]
  .map(m => m[1]);
process.stdout.write([...new Set(keys)].sort().join(","));
