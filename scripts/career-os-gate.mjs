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

// A view-only Career Journey request must never create a Journey or related rows.
const journeyLib = fs.readFileSync("lib/careerJourney.ts", "utf8");
const readOnlyStart = journeyLib.indexOf("export async function getJourneyReadOnly(");
const readOnlyEnd = journeyLib.indexOf("export async function createRecommendation(", readOnlyStart);
if (readOnlyStart < 0 || readOnlyEnd < 0) {
  console.error("Career OS gate failed: read-only Journey loader is missing.");
  process.exit(1);
}
const readOnlyLoader = journeyLib.slice(readOnlyStart, readOnlyEnd);
if (readOnlyLoader.includes('.from("CareerJourney").insert(') || readOnlyLoader.includes('.from("CareerGoal").insert(') || readOnlyLoader.includes('.from("CareerMission").insert(')) {
  console.error("Career OS gate failed: read-only Journey loader contains domain writes.");
  process.exit(1);
}

for (const file of [
  "app/api/career-journey/route.ts",
  "app/api/career-journey/missions/route.ts",
  "app/api/career-journey/assessments/route.ts",
  "app/api/career-journey/portfolio/route.ts",
  "app/api/career-journey/radar/route.ts",
]) {
  const route = fs.readFileSync(file, "utf8");
  const getStart = route.indexOf("export async function GET(");
  if (getStart < 0) {
    console.error("Career OS gate failed: GET handler missing", file);
    process.exit(1);
  }
  const postStart = route.indexOf("export async function POST(", getStart);
  const getHandler = route.slice(getStart, postStart < 0 ? route.length : postStart);
  if (!getHandler.includes("getJourneyReadOnly(") || getHandler.includes("getOrCreateJourney(")) {
    console.error("Career OS gate failed: GET handler must use the non-creating Journey reader", file);
    process.exit(1);
  }
}
