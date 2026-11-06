import assert from "node:assert/strict";
import test from "node:test";
import {
  JIA_PALETTE_ALLOCATION,
  JIA_PRESENTATION_MODES,
  JIA_VARIATION_FAMILIES,
  JIA_VARIATION_TARGET,
  getJiaVariationCoverage,
  pickJiaVariation,
  resolveJiaExperience,
} from "../lib/jia/experience-engine.ts";

test("J’IA 360 exposes the six agreed presentation modes", () => {
  assert.deepEqual(JIA_PRESENTATION_MODES, [
    "messenger",
    "gallery",
    "stage",
    "workspace",
    "explorer",
    "interactive",
  ]);
});

test("the requested palette distribution includes the derived 10 percent", () => {
  const total = Object.values(JIA_PALETTE_ALLOCATION).reduce((sum, value) => sum + value, 0);
  assert.equal(total, 100);
  assert.equal(JIA_PALETTE_ALLOCATION.canaryBlue, 30);
  assert.equal(JIA_PALETTE_ALLOCATION.canaryYellow, 30);
  assert.equal(JIA_PALETTE_ALLOCATION.white, 20);
  assert.equal(JIA_PALETTE_ALLOCATION.orange, 5);
  assert.equal(JIA_PALETTE_ALLOCATION.green, 5);
  assert.equal(JIA_PALETTE_ALLOCATION.derivedSurfaces, 10);
});

test("all twelve variation families require fifty distinct registered variants", () => {
  assert.equal(JIA_VARIATION_FAMILIES.length, 12);
  assert.ok(JIA_VARIATION_FAMILIES.every((family) => Boolean(family)));
  assert.equal(JIA_VARIATION_TARGET, 50);
  const coverage = getJiaVariationCoverage({});
  assert.equal(coverage.length, 12);
  assert.ok(coverage.every((item) => item.available === 0 && item.required === 50 && !item.complete));
});

test("variation coverage counts unique IDs rather than duplicated entries", () => {
  const firstFamily = JIA_VARIATION_FAMILIES[0];
  const catalog = {
    [firstFamily]: [
      ...Array.from({ length: 49 }, (_, index) => ({ id: `variant-${index}` })),
      { id: "variant-0", label: "duplicate" },
      { id: "variant-49" },
    ],
  };
  const coverage = getJiaVariationCoverage(catalog);
  assert.equal(coverage[0].available, 50);
  assert.equal(coverage[0].complete, true);
  assert.ok(coverage.slice(1).every((item) => !item.complete));
});

test("variation selection avoids the most recent choices", () => {
  const variants = ["a", "b", "c", "d"].map((id) => ({ id }));
  const selected = pickJiaVariation(variants, ["a", "b", "c"], () => 0);
  assert.equal(selected?.id, "d");
});

test("variation selection does not mutate caller arrays and clamps random values", () => {
  const variants = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const history = ["a"];
  const selected = pickJiaVariation(variants, history, () => 1);
  assert.equal(selected?.id, "c");
  assert.deepEqual(history, ["a"]);
  assert.deepEqual(variants.map((item) => item.id), ["a", "b", "c"]);
});

test("variation selection safely handles duplicates and empty catalogues", () => {
  assert.equal(pickJiaVariation([], [], () => 0), undefined);
  const selected = pickJiaVariation(
    [{ id: "same", label: "first" }, { id: "same", label: "second" }],
    [],
    () => 0,
  );
  assert.equal(selected?.label, "first");
});

test("context selects a presentation without modifying conversation data", () => {
  const modes = [
    ["opportunities", "gallery"],
    ["document", "workspace"],
    ["questionnaire", "interactive"],
    ["mobility", "explorer"],
    ["presentation", "stage"],
    ["conversation", "messenger"],
  ];
  for (const [intent, expected] of modes) {
    const resolved = resolveJiaExperience({
      role: "TALENT",
      intent,
      device: "desktop",
    });
    assert.equal(resolved.layout, expected);
    assert.equal(resolved.preserveConversationState, true);
  }
});

test("a user-locked presentation takes precedence over contextual layout", () => {
  const resolved = resolveJiaExperience({
    role: "RECRUITER",
    intent: "candidate_search",
    device: "desktop",
    lockedLayout: "messenger",
  });
  assert.equal(resolved.layout, "messenger");
});

test("mobile stage uses an inline avatar and compact density", () => {
  const resolved = resolveJiaExperience({
    role: "TALENT",
    intent: "presentation",
    device: "mobile",
  });
  assert.equal(resolved.layout, "stage");
  assert.equal(resolved.density, "compact");
  assert.equal(resolved.avatarPresentation, "stage-inline");
});

test("reduced motion disables decorative movement and uses reduced transitions", () => {
  const resolved = resolveJiaExperience({
    role: "ADMIN",
    intent: "analytics",
    device: "desktop",
    systemReducedMotion: true,
  });
  assert.equal(resolved.motionPreference, "reduced");
  assert.equal(resolved.decorativeMotionEnabled, false);
  assert.equal(resolved.transition, "reduced");
});

test("compact avatar preference is honored regardless of layout", () => {
  const resolved = resolveJiaExperience({
    role: "PARTNER",
    intent: "presentation",
    device: "tablet",
    compactAvatar: true,
  });
  assert.equal(resolved.avatarPresentation, "compact-launcher");
});
