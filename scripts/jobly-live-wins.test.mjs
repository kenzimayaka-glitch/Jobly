import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  getDoualaDayKey,
  isWithinLiveWinsWindow,
  nextLiveWinsAt,
  nextLiveWinsOnFollowingDay,
  normalizeLiveWinsDisplayTime,
  pickLiveWinsDelayMs,
  LIVE_WINS_DAILY_CAP,
} from "../lib/jobly-live-wins-schedule.ts";
import { isEligibleLiveWin, LIVE_WINS_LOOKBACK_MS } from "../lib/live-wins-eligibility.ts";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-11-08T17:00:00.000Z");

test("Africa/Douala window is inclusive at 10:00 and exclusive at 20:00", () => {
  assert.equal(isWithinLiveWinsWindow(Date.parse("2026-11-08T08:59:00.000Z")), false);
  assert.equal(isWithinLiveWinsWindow(Date.parse("2026-11-08T09:00:00.000Z")), true);
  assert.equal(isWithinLiveWinsWindow(Date.parse("2026-11-08T18:59:00.000Z")), true);
  assert.equal(isWithinLiveWinsWindow(Date.parse("2026-11-08T19:00:00.000Z")), false);
});

test("the day key is based on Africa/Douala, not the device timezone", () => {
  assert.equal(getDoualaDayKey(Date.parse("2026-11-08T22:30:00.000Z")), "2026-11-08");
  assert.equal(getDoualaDayKey(Date.parse("2026-11-08T23:30:00.000Z")), "2026-11-09");
});

test("random intervals cover frequent same-day events through a one-week pause", () => {
  const cases = [
    { roll: 0.1, minimum: 45 * 60 * 1000, maximum: 4 * HOUR },
    { roll: 0.2, minimum: 4 * HOUR, maximum: 14 * HOUR },
    { roll: 0.5, minimum: 14 * HOUR, maximum: 2 * DAY },
    { roll: 0.8, minimum: 2 * DAY, maximum: 4 * DAY },
    { roll: 0.95, minimum: 4 * DAY, maximum: 7 * DAY },
  ];
  for (const item of cases) {
    const values = [item.roll, 0.999];
    const delay = pickLiveWinsDelayMs(() => values.shift() ?? 0);
    assert.ok(delay >= item.minimum && delay <= item.maximum);
  }
});

test("a target before 10:00 is moved later that same day", () => {
  const target = Date.parse("2026-11-08T08:30:00.000Z"); // 09:30 in Douala
  const normalized = normalizeLiveWinsDisplayTime(target, () => 0.5);
  assert.equal(normalized, Date.parse("2026-11-08T14:00:00.000Z")); // 15:00 in Douala
  assert.equal(isWithinLiveWinsWindow(normalized), true);
});

test("a target at or after 20:00 is moved to a random time the next day", () => {
  const target = Date.parse("2026-11-08T19:30:00.000Z"); // 20:30 in Douala
  const normalized = normalizeLiveWinsDisplayTime(target, () => 0);
  assert.equal(normalized, Date.parse("2026-11-09T09:00:00.000Z")); // 10:00 in Douala
  assert.equal(isWithinLiveWinsWindow(normalized), true);
});

test("a target already in the display window is not moved", () => {
  const target = Date.parse("2026-11-08T13:30:00.000Z");
  assert.equal(normalizeLiveWinsDisplayTime(target, () => 0.8), target);
  assert.ok(nextLiveWinsAt(NOW, () => 0) > NOW);
});

test("the daily cap defers the next event to the following local day", () => {
  assert.equal(LIVE_WINS_DAILY_CAP, 3);
  const tomorrow = nextLiveWinsOnFollowingDay(NOW, () => 0);
  assert.equal(getDoualaDayKey(tomorrow), "2026-11-09");
  assert.equal(isWithinLiveWinsWindow(tomorrow), true);
});

const validCandidate = {
  id: "application-1",
  userId: "talent-2",
  status: "OFFER",
  statusSource: "RECRUITER",
  updatedAt: new Date(NOW - HOUR).toISOString(),
  recruiterJob: { recruiterUserId: "recruiter-2" },
};

test("only a recent recruiter-confirmed offer between other users is eligible", () => {
  assert.equal(isEligibleLiveWin(validCandidate, "viewer-1", NOW), true);
  assert.equal(isEligibleLiveWin({ ...validCandidate, userId: "viewer-1" }, "viewer-1", NOW), false);
  assert.equal(isEligibleLiveWin({ ...validCandidate, recruiterJob: { recruiterUserId: "viewer-1" } }, "viewer-1", NOW), false);
  assert.equal(isEligibleLiveWin({ ...validCandidate, status: "INTERVIEW" }, "viewer-1", NOW), false);
  assert.equal(isEligibleLiveWin({ ...validCandidate, statusSource: "CANDIDATE" }, "viewer-1", NOW), false);
  assert.equal(isEligibleLiveWin({ ...validCandidate, updatedAt: new Date(NOW - LIVE_WINS_LOOKBACK_MS - 1).toISOString() }, "viewer-1", NOW), false);
  assert.equal(isEligibleLiveWin({ ...validCandidate, updatedAt: new Date(NOW + 1000).toISOString() }, "viewer-1", NOW), false);
  assert.equal(isEligibleLiveWin({ ...validCandidate, recruiterJob: null }, "viewer-1", NOW), false);
});

test("API endpoint is authenticated, private and excludes the current candidate and recruiter", () => {
  const route = readFileSync(new URL("../app/api/live-wins/route.ts", import.meta.url), "utf8");
  assert.match(route, /getAuthUser\(request\)/);
  assert.match(route, /ensureUser\(db, auth\)/);
  assert.match(route, /\.eq\("status", "OFFER"\)/);
  assert.match(route, /\.eq\("statusSource", "RECRUITER"\)/);
  assert.match(route, /\.neq\("userId", user\.id\)/);
  assert.match(route, /\.neq\("recruiterJob\.recruiterUserId", user\.id\)/);
  assert.match(route, /private, no-store/);
  assert.doesNotMatch(route, /\.select\([^)]*(?:email|displayName|phone|profilePhotoUrl)/);
});

test("the global overlay and toast keep audio opt-in to social notifications", () => {
  const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
  const toast = readFileSync(new URL("../components/JoblyToast.tsx", import.meta.url), "utf8");
  const liveWins = readFileSync(new URL("../components/JoblyLiveWins.tsx", import.meta.url), "utf8");
  const schedule = readFileSync(new URL("../lib/jobly-live-wins-schedule.ts", import.meta.url), "utf8");
  assert.match(layout, /<JoblyLiveWins\s*\/>/);
  assert.match(liveWins, /duration=\{2500\}/);
  assert.match(liveWins, /sound="pop"/);
  assert.match(schedule, /Africa\/Douala/);
  assert.match(toast, /new window\.AudioContext\(\)/);
  assert.match(toast, /oscillator\.stop\(now \+ 0\.2\)/);
  assert.match(toast, /onToggleSound/);
});
