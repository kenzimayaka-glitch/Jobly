import fs from "node:fs";

const registry = fs.readFileSync("supabase/functions/discover-jobs/source-registry.ts", "utf8");
const keys = [];
for (const line of registry.split("\n")) {
  if (!line.includes('status:"active"') || !line.includes('url:')) continue;
  const match = line.match(/\{key:"([^"]+)"/);
  if (match) keys.push(match[1]);
}
process.stdout.write([...new Set(keys)].sort().join(","));
