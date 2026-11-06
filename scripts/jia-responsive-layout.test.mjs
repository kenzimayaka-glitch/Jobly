import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getJiaExperienceDevice } from "../lib/jia/experience-engine.ts";

const root = process.cwd();
const surface = readFileSync(root + "/components/jia/JiaConversationSurface.tsx", "utf8");
const blocks = readFileSync(root + "/components/jia/JiaWorkspaceBlocks.tsx", "utf8");

test("J’IA 360 classifies narrow phones, large phones, tablets and desktop at CSS breakpoints", () => {
  for (const width of [280, 320, 360, 375, 390, 414, 639]) {
    assert.equal(getJiaExperienceDevice(width), "mobile", `${width}px must use mobile density`);
  }
  for (const width of [640, 667, 768, 820, 912, 1023]) {
    assert.equal(getJiaExperienceDevice(width), "tablet", `${width}px must use tablet density`);
  }
  for (const width of [1024, 1280, 1366, 1920]) {
    assert.equal(getJiaExperienceDevice(width), "desktop", `${width}px must use desktop density`);
  }
  assert.equal(getJiaExperienceDevice(Number.NaN), "mobile");
});

test("conversation sizing follows the visible viewport and all device safe areas", () => {
  assert.match(surface, /window\.visualViewport/);
  assert.match(surface, /viewport\?\.height/);
  assert.match(surface, /viewport\?\.offsetTop/);
  assert.match(surface, /orientationchange/);
  assert.match(surface, /safe-area-inset-left/);
  assert.match(surface, /safe-area-inset-right/);
  assert.match(surface, /env\(safe-area-inset-top/);
  assert.match(surface, /env\(safe-area-inset-bottom/);
  assert.match(surface, /data-jia-viewport=\{device\}/);
  assert.match(surface, /sm:max-h-\[900px\]/);
  assert.doesNotMatch(surface, /calc\(100%-24px\)/);
});

test("all six presentation controls remain swipe-scrollable and touch friendly", () => {
  assert.match(surface, /aria-label="Présentation de la conversation"/);
  assert.match(surface, /overflow-x-auto/);
  assert.ok((surface.match(/min-h-11 shrink-0 items-center gap-1\.5 rounded-full/g) || []).length >= 2);
  assert.match(surface, /min-h-11 min-w-0 flex-1 resize-none/);
  assert.match(surface, /sm:resize-y/);
  assert.match(surface, /hidden text-\[9px\] font-bold sm:block/);
});

test("long workspace data cannot force the conversation wider than a phone viewport", () => {
  assert.match(surface, /min-w-0 max-w-full rounded-\[21px\]/);
  assert.match(surface, /\[overflow-wrap:anywhere\]/);
  assert.match(blocks, /max-w-\[42%\].*break-words/);
  assert.match(blocks, /flex flex-wrap items-start justify-between/);
  assert.match(blocks, /min-w-0 flex-1 break-words \[overflow-wrap:anywhere\]/);
  assert.match(blocks, /flex-col items-start justify-between gap-1 sm:flex-row/);
});

test("mobile choices, status badges and business cards preserve readable wrapping", () => {
  assert.match(blocks, /flex min-h-11 min-w-0 cursor-pointer items-start/);
  assert.match(blocks, /flex-1 break-words \[overflow-wrap:anywhere\]/);
  assert.match(blocks, /max-w-\[42%\] shrink-0 whitespace-normal break-words/);
  assert.match(blocks, /const primary = "inline-flex min-h-11/);
  assert.match(blocks, /const secondary = "inline-flex min-h-11/);
  assert.match(blocks, /min-h-11 min-w-0 cursor-pointer items-start/);
  assert.match(blocks, /flex flex-wrap items-start justify-between gap-2/);
});
