import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("the desktop setup page detects an actual extension handshake and polls its state", () => {
  const page = read("app/jia/extension/page.tsx");
  const bridge = read("apps/jia-chrome-extension/jobly-bridge.js");
  assert.match(page, /JOBLY_INSTALL_PORTAL/);
  assert.match(page, /not-detected/);
  assert.match(page, /inactive/);
  assert.match(page, /setInterval/);
  assert.match(page, /Activer J’IA/);
  assert.match(bridge, /JOBLY_INSTALL_PORTAL/);
  assert.match(bridge, /JOBLY_EXTENSION/);
  assert.match(bridge, /JOBLY_GET_INSTALL_STATUS/);
});

test("the extension starts paused and exposes an explicit activation state", () => {
  const background = read("apps/jia-chrome-extension/background.js");
  const panel = read("apps/jia-chrome-extension/sidepanel.js");
  const manifest = JSON.parse(read("apps/jia-chrome-extension/manifest.json"));
  assert.equal(manifest.version, "0.2.0");
  assert.equal(manifest.minimum_chrome_version, "116");
  assert.match(background, /assistantEnabled: false/);
  assert.match(background, /JOBLY_SET_ASSISTANT_ENABLED/);
  assert.match(background, /JOBLY_GET_INSTALL_STATUS/);
  assert.match(panel, /Activer J'IA/);
  assert.match(panel, /Mettre J'IA en pause/);
});

test("the Jobly portal provides a versioned beta archive, not a fake web-store URL", () => {
  const route = read("app/api/jia/extension/download/route.ts");
  const page = read("app/jia/extension/page.tsx");
  assert.match(route, /Content-Type.*application\/zip/);
  assert.match(route, /jobly-jia-chrome-extension-0\.2\.0-beta\.zip/);
  assert.match(page, /api\/jia\/extension\/download/);
  assert.match(page, /chrome:\/\/extensions/);
  assert.match(page, /Mode développeur/);
  assert.doesNotMatch(page, /chromewebstore\.google\.com/);
});

test("the J'IA assistant panel links to desktop extension onboarding", () => {
  const presence = read("components/JiaPresence.tsx");
  assert.match(presence, /go\("\/jia\/extension"\)/);
});

test("external form inspection remains opt-in and excludes sensitive values", () => {
  const panel = read("apps/jia-chrome-extension/sidepanel.js");
  assert.match(panel, /chrome\.permissions\.request/);
  assert.match(panel, /password/);
  assert.match(panel, /hidden/);
  assert.match(panel, /file/);
  assert.doesNotMatch(panel, /el\.value|\.value\s*\)/);
});
