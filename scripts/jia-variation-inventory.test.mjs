import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  JIA_PRESENTATION_MODES,
  JIA_VARIATION_FAMILIES,
  JIA_VARIATION_TARGET,
  getJiaVariationCoverage,
} from "../lib/jia/experience-engine.ts";

const root = process.cwd();
const rig = JSON.parse(readFileSync(join(root, "components/JIA/JIA_Rig.json"), "utf8"));
const manifests = ["blue", "white", "yellow"].map((outfit) =>
  JSON.parse(readFileSync(join(root, `components/JIA/clipsManifest.${outfit}.json`), "utf8"))
);
const outfitDirs = ["blue", "white", "yellow"];
const clipPaths = outfitDirs.flatMap((outfit) =>
  readdirSync(join(root, "public/jia/outfits", outfit, "clips"))
    .filter((name) => name.toLowerCase().endsWith(".webm"))
    .map((name) => outfit + "/" + name)
);
const unique = (values) => [...new Set(values)];
const stable = (value) => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, stable(value[key])]),
  );
  return value;
};
const moves = Object.values(rig.moves || {});
const facialShapes = unique(moves.map((move) => JSON.stringify(stable({
  eyes: move.eyes || null,
  eyebrows: move.eyebrows || null,
  mouth: move.mouth || null,
}))).filter((shape) => shape !== JSON.stringify({ eyes: null, eyebrows: null, mouth: null })));
const bodyShapes = unique(moves.map((move) => JSON.stringify(stable({
  head: move.head || null,
  torso: move.torso || null,
  arm_L: move.arm_L || null,
  arm_R: move.arm_R || null,
  hand_L: move.hand_L || null,
  hand_R: move.hand_R || null,
}))).filter((shape) => shape !== JSON.stringify({ head: null, torso: null, arm_L: null, arm_R: null, hand_L: null, hand_R: null })));
const sceneTransitionExists = readFileSync(join(root, "public/jia-transition-droplet.jpg")).length > 0;
const variationCatalog = {
  "conversation-layouts": JIA_PRESENTATION_MODES.map((id) => ({ id })),
  "scenes-and-ambiences": [{ id: "water-scene" }],
  "avatar-appearances": outfitDirs.map((id) => ({ id })),
  "avatar-placement-and-framing": ["stage-aside", "stage-inline", "compact-launcher", "contextual"].map((id) => ({ id })),
  "body-gestures": clipPaths.map((id) => ({ id })),
  "facial-expressions": facialShapes.map((id) => ({ id })),
  "scene-transitions": sceneTransitionExists ? [{ id: "droplet-transition" }] : [],
  "message-entrances": [{ id: "fade-rise-message" }],
  "stickers-and-reactions": [],
  "offer-presentations": [{ id: "offers-block" }],
  "interactive-questions": [{ id: "standard-mcq" }, { id: "adaptive-mcq" }],
  "documents-and-cv": [{ id: "profile-cv" }, { id: "prepared-application-letter" }],
};
const coverage = getJiaVariationCoverage(variationCatalog);

test("variation inventory is computed from actual rig configurations and files", () => {
  assert.equal(JIA_VARIATION_FAMILIES.length, 12);
  assert.equal(JIA_VARIATION_TARGET, 50);
  assert.equal(rig.meta.total_moves, 100);
  assert.equal(moves.length, 100);
  assert.equal(unique(moves.map((move) => JSON.stringify(stable(move)))).length, 50);
  assert.equal(facialShapes.length, 16);
  assert.equal(bodyShapes.length, 40);
  assert.equal(clipPaths.length, 53);
  assert.deepEqual(manifests.map((manifest) => Object.keys(manifest).length), [42, 8, 4]);
  assert.equal(coverage.length, 12);
});

test("the audit never treats theoretical combinations as produced variations", () => {
  const byFamily = Object.fromEntries(coverage.map((item) => [item.family, item]));
  assert.equal(byFamily["conversation-layouts"].available, 6);
  assert.equal(byFamily["scenes-and-ambiences"].available, 1);
  assert.equal(byFamily["avatar-appearances"].available, 3);
  assert.equal(byFamily["avatar-placement-and-framing"].available, 4);
  assert.equal(byFamily["body-gestures"].available, 53);
  assert.equal(byFamily["facial-expressions"].available, 16);
  assert.equal(byFamily["stickers-and-reactions"].available, 0);
  assert.ok(coverage.every((item) => item.available <= 1000));
  assert.ok(coverage.every((item) => item.complete === (item.available >= JIA_VARIATION_TARGET)));
});

test("coverage report marks incomplete families explicitly instead of manufacturing IDs", () => {
  const incomplete = coverage.filter((item) => !item.complete).map((item) => item.family);
  assert.deepEqual(incomplete, [
    "conversation-layouts",
    "scenes-and-ambiences",
    "avatar-appearances",
    "avatar-placement-and-framing",
    "facial-expressions",
    "scene-transitions",
    "message-entrances",
    "stickers-and-reactions",
    "offer-presentations",
    "interactive-questions",
    "documents-and-cv",
  ]);
  assert.equal(coverage.filter((item) => item.complete).length, 1);
});

console.log("[J’IA 360 variation audit]", JSON.stringify(coverage));
