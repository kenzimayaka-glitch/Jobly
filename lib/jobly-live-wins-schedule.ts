const TIME_ZONE = "Africa/Douala";
const START_MINUTE = 10 * 60;
const END_MINUTE = 20 * 60;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const DOUALA_UTC_OFFSET_MINUTES = 60;

type RandomSource = () => number;
type DoualaParts = { year: number; month: number; day: number; hour: number; minute: number };

function randomUnit(random: RandomSource): number {
  const value = random();
  if (!Number.isFinite(value)) return 0.5;
  return Math.max(0, Math.min(0.999999999, value));
}

function getDoualaParts(timestamp: number): DoualaParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function nextLocalDate(parts: DoualaParts) {
  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
  return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() };
}

function doualaWallTimeToTimestamp(year: number, month: number, day: number, minuteOfDay: number) {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return Date.UTC(year, month - 1, day, hour, minute) - DOUALA_UTC_OFFSET_MINUTES * MINUTE_MS;
}

/** Returns the local calendar day key, independent of the visitor's device timezone. */
export function getDoualaDayKey(timestamp: number): string {
  const parts = getDoualaParts(timestamp);
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

/** Jobly Live Wins may only appear from 10:00 inclusive to 20:00 exclusive in Africa/Douala. */
export function isWithinLiveWinsWindow(timestamp: number): boolean {
  const parts = getDoualaParts(timestamp);
  const minuteOfDay = parts.hour * 60 + parts.minute;
  return minuteOfDay >= START_MINUTE && minuteOfDay < END_MINUTE;
}

/**
 * Weighted intervals deliberately vary from under an hour to one week:
 * some accounts can see a few wins in one day, while others may wait several days.
 */
export function pickLiveWinsDelayMs(random: RandomSource = Math.random): number {
  const roll = randomUnit(random);
  const fraction = randomUnit(random);
  let minimum: number;
  let maximum: number;

  if (roll < 0.18) {
    minimum = 45 * MINUTE_MS;
    maximum = 4 * HOUR_MS;
  } else if (roll < 0.4) {
    minimum = 4 * HOUR_MS;
    maximum = 14 * HOUR_MS;
  } else if (roll < 0.7) {
    minimum = 14 * HOUR_MS;
    maximum = 2 * DAY_MS;
  } else if (roll < 0.9) {
    minimum = 2 * DAY_MS;
    maximum = 4 * DAY_MS;
  } else {
    minimum = 4 * DAY_MS;
    maximum = 7 * DAY_MS;
  }

  return Math.round(minimum + fraction * (maximum - minimum));
}

/**
 * Moves a target to an allowed local time when it falls outside the display window.
 * Before 10:00 it stays on the same local day; at/after 20:00 it moves to the next day.
 */
export function normalizeLiveWinsDisplayTime(
  targetTimestamp: number,
  random: RandomSource = Math.random,
): number {
  const parts = getDoualaParts(targetTimestamp);
  if (isWithinLiveWinsWindow(targetTimestamp)) return targetTimestamp;

  const minuteOfDay = parts.hour * 60 + parts.minute;
  const date = minuteOfDay < START_MINUTE
    ? { year: parts.year, month: parts.month, day: parts.day }
    : nextLocalDate(parts);
  const chosenMinute = START_MINUTE + Math.floor(randomUnit(random) * (END_MINUTE - START_MINUTE));

  return doualaWallTimeToTimestamp(date.year, date.month, date.day, chosenMinute);
}

/** Picks an account-specific interval, then normalizes it to the 10:00–20:00 window. */
export function nextLiveWinsAt(now: number, random: RandomSource = Math.random): number {
  return normalizeLiveWinsDisplayTime(now + pickLiveWinsDelayMs(random), random);
}

/** Enforces the daily cap by scheduling the next opportunity on the following local day. */
export function nextLiveWinsOnFollowingDay(now: number, random: RandomSource = Math.random): number {
  const tomorrow = nextLocalDate(getDoualaParts(now));
  const chosenMinute = START_MINUTE + Math.floor(randomUnit(random) * (END_MINUTE - START_MINUTE));
  return doualaWallTimeToTimestamp(tomorrow.year, tomorrow.month, tomorrow.day, chosenMinute);
}

export const LIVE_WINS_DAILY_CAP = 3;
export const LIVE_WINS_TIME_ZONE_NAME = TIME_ZONE;
