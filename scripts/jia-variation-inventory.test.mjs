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
import { GESTURES } from "../lib/jia/gestures.ts";
import { JIA_100_MOVES } from "../components/jia-avatar/movements.ts";
import {
  JIA_AVATAR_APPEARANCES,
  JIA_AVATAR_FRAMING_VARIATIONS,
  JIA_CONVERSATION_LAYOUT_VARIATIONS,
  JIA_DOCUMENT_PRESENTATIONS,
  JIA_MESSAGE_ENTRANCES,
  JIA_OFFER_PRESENTATIONS,
  JIA_QUESTION_PRESENTATIONS,
  JIA_SCENE_TRANSITIONS,
  JIA_SCENE_VARIATIONS,
  JIA_STICKER_REACTIONS,
} from "../lib/jia/visual-variations.ts";

const root = process.cwd();
const rig = JSON.parse(readFileSync(join(root, "components/jia-avatar/JIA_Rig.json"), "utf8"));
const manifests = ["blue", "white", "yellow"].map((outfit) =>
  JSON.parse(readFileSync(join(root, `components/jia-avatar/clipsManifest.${outfit}.json`), "utf8"))
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
const entries = Object.entries(rig.moves || {});
const moves = entries.map(([, move]) => move);
const facialShapes = unique(moves
  .filter((move) => move.eyes || move.eyebrows || move.mouth)
  .map((move) => JSON.stringify(stable({
    eyes: move.eyes || null,
    eyebrows: move.eyebrows || null,
    mouth: move.mouth || null,
  }))));
const renderedBone = (bone) => {
  if (!bone || typeof bone !== "object") return null;
  const transformKeys = ["x","y","z","rz","rotate","rx","rotateX","ry","rotateY","scale"];
  const transform = Object.fromEntries(transformKeys.filter((key) => bone[key] !== undefined).map((key) => [key, bone[key]]));
  return Object.keys(transform).length ? transform : null;
};
const bodySignature = (move) => ({
  torso: renderedBone(move.torso),
  arm_L: renderedBone(move.arm_L),
  arm_R: renderedBone(move.arm_R),
  hand_L: renderedBone(move.hand_L),
  hand_R: renderedBone(move.hand_R),
});
const bodyGroupsBySignature = new Map();
for (const [key, move] of entries) {
  const name = key.replace(/^\d+_/, "");
  // The neutral idle/focus pose is a baseline, not a produced body gesture.
  if (name === "idle" || name === "focus") continue;
  const body = bodySignature(move);
  if (!Object.values(body).some(Boolean)) continue;
  const signature = JSON.stringify(stable(body));
  if (!bodyGroupsBySignature.has(signature)) bodyGroupsBySignature.set(signature, []);
  bodyGroupsBySignature.get(signature).push(name);
}
const bodyShapes = [...bodyGroupsBySignature.keys()];
const uniqueGestureNames = unique(clipPaths.map((path) => path.split("/").pop().replace(/\.webm$/i, "").replace(/--\d+$/, "")));
const clipGestureNames = new Set(uniqueGestureNames);
const rigOnlyBodyNames = [...bodyGroupsBySignature.values()]
  .filter((names) => !names.some((name) => clipGestureNames.has(name)))
  .map((names) => names[0]);
const bodyGestureCatalog = [
  ...uniqueGestureNames.map((id) => ({ id: "clip:" + id })),
  ...rigOnlyBodyNames.map((id) => ({ id: "rig:" + id })),
];
const variationCatalog = {
  "conversation-layouts": JIA_CONVERSATION_LAYOUT_VARIATIONS,
  "scenes-and-ambiences": JIA_SCENE_VARIATIONS,
  "avatar-appearances": JIA_AVATAR_APPEARANCES,
  "avatar-placement-and-framing": JIA_AVATAR_FRAMING_VARIATIONS,
  "body-gestures": bodyGestureCatalog,
  "facial-expressions": facialShapes.map((id) => ({ id })),
  "scene-transitions": JIA_SCENE_TRANSITIONS,
  "message-entrances": JIA_MESSAGE_ENTRANCES,
  "stickers-and-reactions": JIA_STICKER_REACTIONS,
  "offer-presentations": JIA_OFFER_PRESENTATIONS,
  "interactive-questions": JIA_QUESTION_PRESENTATIONS,
  "documents-and-cv": JIA_DOCUMENT_PRESENTATIONS,
};
const coverage = getJiaVariationCoverage(variationCatalog);

test("variation inventory is computed from actual rig configurations and files", () => {
  assert.equal(JIA_VARIATION_FAMILIES.length, 12);
  assert.equal(JIA_VARIATION_TARGET, 50);
  assert.equal(rig.meta.total_moves, 100);
  assert.equal(moves.length, 100);
  assert.ok(unique(moves.map((move) => JSON.stringify(stable(move)))).length >= 50);
  assert.equal(facialShapes.length, 50);
  assert.equal(bodyShapes.length, 21);
  assert.equal(rigOnlyBodyNames.length, 11);
  assert.equal(bodyGestureCatalog.length, 50);
  assert.equal(clipPaths.length, 54);
  assert.equal(uniqueGestureNames.length, 39);
  assert.deepEqual(manifests.map((manifest) => Object.keys(manifest).length), [42, 8, 4]);
  assert.equal(coverage.length, 12);
});

test("all 50 registered facial expressions have semantic gestures and runnable rig moves", () => {
  const rigNames = new Set(Object.keys(rig.moves).map((key) => key.replace(/^\d+_/, "")));
  const moves = new Set(JIA_100_MOVES);
  const facialMoveNames = new Set(entries.filter(([, move]) => move.eyes || move.eyebrows || move.mouth).map(([key]) => key.replace(/^\d+_/, "")));
  assert.equal(facialShapes.length, 50);
  assert.equal(facialMoveNames.size, 60);
  assert.ok([...facialMoveNames].every((name) => rigNames.has(name) && moves.has(name)));
  const gestureMapping = readFileSync(join(root, "components/jia-avatar/gestureMap.ts"), "utf8");
  const mappedMoves = new Set([...gestureMapping.matchAll(/^\s*[a-z0-9_]+:\s*"([a-z0-9_]+)"[,]?\s*$/gm)].map((match) => match[1]));
  const groups = new Map();
  for (const [key, move] of entries) {
    if (!(move.eyes || move.eyebrows || move.mouth)) continue;
    const name = key.replace(/^\d+_/, "");
    const signature = JSON.stringify(stable({ eyes: move.eyes || null, eyebrows: move.eyebrows || null, mouth: move.mouth || null }));
    if (!groups.has(signature)) groups.set(signature, []);
    groups.get(signature).push(name);
  }
  assert.equal(groups.size, 50);
  assert.equal([...groups.values()].filter(names => names.some(name => mappedMoves.has(name))).length, 50);
  const availableSemanticMoves = Object.entries(GESTURES)
    .filter(([id]) => facialMoveNames.has(id))
    .map(([id]) => id);
  assert.equal(availableSemanticMoves.length, 45);
});

test("the visual variation catalog keeps fifty concrete, non-duplicate presets", () => {
  const lists = [
    JIA_CONVERSATION_LAYOUT_VARIATIONS,
    JIA_SCENE_VARIATIONS,
    JIA_AVATAR_FRAMING_VARIATIONS,
    JIA_SCENE_TRANSITIONS,
    JIA_MESSAGE_ENTRANCES,
    JIA_STICKER_REACTIONS,
    JIA_OFFER_PRESENTATIONS,
    JIA_QUESTION_PRESENTATIONS,
    JIA_DOCUMENT_PRESENTATIONS,
  ];
  for (const list of lists) {
    assert.equal(list.length, 50);
    assert.equal(new Set(list.map((item) => item.id)).size, 50);
    assert.equal(new Set(list.map((item) => JSON.stringify(Object.fromEntries(Object.entries(item).filter(([key]) => key !== "id"))))).size, 50);
  }
});

test("fifty unique portrait appearances remain catalogued but are not loaded by the active conversation surface", () => {
  assert.equal(JIA_AVATAR_APPEARANCES.length, 50);
  assert.equal(new Set(JIA_AVATAR_APPEARANCES.map(item => item.id)).size, 50);
  assert.equal(new Set(JIA_AVATAR_APPEARANCES.map(({id,...item}) => JSON.stringify(item))).size, 50);
  const avatar = readFileSync(join(root, "components/jia-avatar/JIA3D.tsx"), "utf8");
  const surface = readFileSync(join(root, "components/jia/JiaConversationSurface.tsx"), "utf8");
  assert.ok(avatar.includes("JIAAppearanceOverlay"));
  assert.ok(avatar.includes("data-jia-avatar-appearance"));
  assert.equal(surface.includes("JIA3D"), false);
  assert.equal(surface.includes("JIA_AVATAR_APPEARANCES"), false);
  assert.ok(surface.includes("<JiaPresenceMark size=\"lg\""));
});

test("conversation keeps its adaptive layout while using a non-physical presence mark", () => {
  const surface = readFileSync(join(root, "components/jia/JiaConversationSurface.tsx"), "utf8");
  const blocks = readFileSync(join(root, "components/jia/JiaWorkspaceBlocks.tsx"), "utf8");
  for (const token of ["data-jia-scene={sceneVariation.id}","data-jia-layout-variation={layoutVariation.id}","JIA_MESSAGE_ENTRANCES","JIA_STICKER_REACTIONS","data-jia-presence-stage","<JiaPresenceMark size=\"lg\""]) {
    assert.ok(surface.includes(token), "surface must render " + token);
  }
  assert.equal(surface.includes("data-jia-avatar-framing"), false);
  assert.equal(surface.includes("JIA3D"), false);
  for (const token of ["JIA_OFFER_PRESENTATIONS","JIA_DOCUMENT_PRESENTATIONS","JIA_QUESTION_PRESENTATIONS","data-jia-offer-presentation","data-jia-document-presentation","data-jia-question-presentation"]) {
    assert.ok(blocks.includes(token), "workspace blocks must render " + token);
  }
});

test("all 50 body gesture variations resolve to real clip or rig movement assets, excluding the neutral idle baseline", () => {
  assert.equal(bodyGestureCatalog.length, 50);
  assert.equal(bodyGestureCatalog.some((item) => item.id === "rig:idle" || item.id === "rig:focus"), false);
  assert.equal(uniqueGestureNames.length, 39);
  assert.equal(rigOnlyBodyNames.length, 11);
  for (const item of bodyGestureCatalog) {
    if (item.id.startsWith("clip:")) assert.ok(clipGestureNames.has(item.id.slice(5)));
    else assert.ok(rigOnlyBodyNames.includes(item.id.slice(4)));
  }
});

test("the audit never treats theoretical combinations as produced variations", () => {
  const byFamily = Object.fromEntries(coverage.map((item) => [item.family, item]));
  assert.equal(byFamily["conversation-layouts"].available, 50);
  assert.equal(byFamily["scenes-and-ambiences"].available, 50);
  assert.equal(byFamily["avatar-appearances"].available, 50);
  assert.equal(byFamily["avatar-placement-and-framing"].available, 50);
  assert.equal(byFamily["body-gestures"].available, 50);
  assert.equal(byFamily["facial-expressions"].available, 50);
  assert.equal(byFamily["scene-transitions"].available, 50);
  assert.equal(byFamily["message-entrances"].available, 50);
  assert.equal(byFamily["stickers-and-reactions"].available, 50);
  assert.equal(byFamily["offer-presentations"].available, 50);
  assert.equal(byFamily["interactive-questions"].available, 50);
  assert.equal(byFamily["documents-and-cv"].available, 50);
  assert.ok(coverage.every((item) => item.available <= 1000));
  assert.ok(coverage.every((item) => item.complete === (item.available >= JIA_VARIATION_TARGET)));
});

test("coverage report marks incomplete families explicitly instead of manufacturing IDs", () => {
  const incomplete = coverage.filter((item) => !item.complete).map((item) => item.family);
  assert.deepEqual(incomplete, []);
  assert.deepEqual(coverage.filter((item) => item.complete).map((item) => item.family), [
    "conversation-layouts","scenes-and-ambiences","avatar-appearances","avatar-placement-and-framing",
    "body-gestures","facial-expressions","scene-transitions","message-entrances",
    "stickers-and-reactions","offer-presentations","interactive-questions","documents-and-cv",
  ]);
});

console.log("[J’IA 360 variation audit]", JSON.stringify(coverage));
