import { auditRegistry } from "./source-engine.ts";

const report = auditRegistry();
if (report.invalid.length) {
  console.error(JSON.stringify(report,null,2));
  process.exit(1);
}
console.log(JSON.stringify(report,null,2));
