import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const feed = readFileSync(new URL("../components/JoblyOfferFeed.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../app/jobs/[id]/page.tsx", import.meta.url), "utf8");
const watermark = readFileSync(new URL("../components/JoblyOfferWatermark.tsx", import.meta.url), "utf8");

test("watermark component is decorative and cannot intercept user input", () => {
  assert.match(watermark, /aria-hidden="true"/);
  assert.match(watermark, /pointer-events-none/);
  assert.match(watermark, /absolute inset-0 z-0/);
});

test("offer feed keeps its existing horizontal clipping and layers content above the watermark", () => {
  const start = feed.indexOf('<section ref={offersStartRef} id="jobly-offers-start"');
  assert.notEqual(start, -1);
  const close = feed.indexOf("</section>", start);
  assert.ok(close > start);
  const section = feed.slice(start, close);
  const opening = section.slice(0, section.indexOf(">") + 1);
  assert.equal((opening.match(/className=/g) || []).length, 1, "offer feed section must have a single className");
  assert.match(opening, /relative isolate/);
  assert.match(opening, /overflow-x-clip/);
  assert.doesNotMatch(opening, /overflow-hidden/);
  assert.match(section, /<JoblyOfferWatermark\s*\/>/);
  assert.match(section, /<div className="relative z-10">/);
});

test("canonical offer detail keeps its content above the watermark", () => {
  assert.match(detail, /import JoblyOfferWatermark from "@\/components\/JoblyOfferWatermark";/);
  assert.match(detail, /<section className="relative isolate overflow-hidden/);
  assert.match(detail, /<JoblyOfferWatermark\s*\/>/);
  assert.match(detail, /<div className="relative z-10 p-5 sm:p-8">/);
});
