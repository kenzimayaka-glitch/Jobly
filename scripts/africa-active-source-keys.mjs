import fs from "node:fs";

const registry = fs.readFileSync("supabase/functions/discover-jobs/source-registry.ts", "utf8");
const keys = registry
  .split("\n")
  .filter((line) => line.includes('{key:"') && line.includes('status:"active"') && line.includes('url:'))
  .filter((line) => !line.includes('countries:["CM"]'))
  .map((line) => line.match(/\{key:"([^"]+)"/)?.[1])
  .filter(Boolean);

process.stdout.write([...new Set(keys)].sort().join(","));
