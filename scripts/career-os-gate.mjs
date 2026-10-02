import fs from "node:fs";
import process from "node:process";

const required = [
  "lib/careerBrain.ts",
  "lib/careerOs.ts",
  "app/api/career-brain/route.ts",
  "app/api/career-os/route.ts",
  "app/api/career-journey/reassess/route.ts",
];

const missing = required.filter((file) => !fs.existsSync(file));
if (missing.length) {
  console.error("Career OS gate failed: missing required surfaces", missing);
  process.exit(1);
}

const source = [
  fs.readFileSync("lib/careerOs.ts", "utf8"),
  fs.readFileSync("app/api/career-os/route.ts", "utf8"),
].join("\n");

const forbidden = ["createCareerState", "CareerStateModel", "new CareerState", "insert into CareerState"];
const violations = forbidden.filter((token) => source.includes(token));

if (violations.length) {
  console.error("Career OS gate failed: parallel career state marker detected", violations);
  process.exit(1);
}

for (const token of [
  'sourceOfTruth: "CareerJourney"',
  "parallelCareerState: false",
  "autonomousExternalAction: false",
  "proposalRequired",
]) {
  if (!source.includes(token)) {
    console.error("Career OS gate failed: missing invariant", token);
    process.exit(1);
  }
}

console.log("Career OS G2-G10 architecture gate: PASS");
