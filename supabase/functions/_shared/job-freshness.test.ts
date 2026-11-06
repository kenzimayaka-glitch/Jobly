import { assertEquals } from "jsr:@std/assert@1";
import { normalizeDeadlineTimestamp, resolveEffectivePublicationDate } from "./job-freshness.ts";

const base = {
  firstHarvestAt: null,
  createdAt: "2026-10-01T00:00:00.000Z",
  deadline: null,
};

Deno.test("source publication is fresh until the exact two-calendar-month expiry instant", () => {
  const atBoundary = resolveEffectivePublicationDate({
    ...base,
    sourcePublishedAt: "2026-09-05T00:00:00.000Z",
    now: "2026-11-05T00:00:00.000Z",
  });
  assertEquals(atBoundary.expiresAt, "2026-11-05T00:00:00.000Z");
  assertEquals(atBoundary.visible, true);

  const afterBoundary = resolveEffectivePublicationDate({
    ...base,
    sourcePublishedAt: "2026-09-05T00:00:00.000Z",
    now: "2026-11-05T00:00:00.001Z",
  });
  assertEquals(afterBoundary.visible, false);
  assertEquals(afterBoundary.rejectionCode, "SOURCE_PUBLICATION_OVER_2_MONTHS");
});

Deno.test("source date on September 5 expires on November 5, even before 62 fixed days", () => {
  const result = resolveEffectivePublicationDate({
    ...base,
    sourcePublishedAt: "2026-09-05T00:00:00.000Z",
    now: "2026-11-05T13:00:00.000Z",
  });
  assertEquals(result.visible, false);
});

Deno.test("calendar-month expiry clamps month-end dates safely", () => {
  const result = resolveEffectivePublicationDate({
    ...base,
    sourcePublishedAt: "2026-08-31T10:15:20.123Z",
    now: "2026-10-31T10:15:20.123Z",
  });
  assertEquals(result.expiresAt, "2026-10-31T10:15:20.123Z");
  assertEquals(result.visible, true);
});

Deno.test("estimated first-harvest dates keep the separate 30-day rule", () => {
  const atBoundary = resolveEffectivePublicationDate({
    sourcePublishedAt: null,
    firstHarvestAt: "2026-10-06T00:00:00.000Z",
    createdAt: null,
    deadline: null,
    now: "2026-11-05T00:00:00.000Z",
  });
  assertEquals(atBoundary.publicationDateEstimated, true);
  assertEquals(atBoundary.publicationDateSource, "FIRST_HARVEST");
  assertEquals(atBoundary.visible, true);
  assertEquals(atBoundary.expiresAt, "2026-11-05T00:00:00.000Z");

  const afterBoundary = resolveEffectivePublicationDate({
    sourcePublishedAt: null,
    firstHarvestAt: "2026-10-06T00:00:00.000Z",
    createdAt: null,
    deadline: null,
    now: "2026-11-05T00:00:00.001Z",
  });
  assertEquals(afterBoundary.visible, false);
  assertEquals(afterBoundary.rejectionCode, "ESTIMATED_PUBLICATION_OVER_30_DAYS");
});

Deno.test("createdAt is an estimated fallback and never a source publication date", () => {
  const result = resolveEffectivePublicationDate({
    sourcePublishedAt: null,
    firstHarvestAt: null,
    createdAt: "2026-10-20T00:00:00.000Z",
    deadline: null,
    now: "2026-11-05T00:00:00.000Z",
  });
  assertEquals(result.effectivePublishedAt, "2026-10-20T00:00:00.000Z");
  assertEquals(result.publicationDateEstimated, true);
  assertEquals(result.publicationDateSource, "JOB_CREATED_AT");
  assertEquals(result.visible, true);
});

Deno.test("offers with no source, harvest or creation date are rejected", () => {
  const result = resolveEffectivePublicationDate({
    sourcePublishedAt: null,
    firstHarvestAt: null,
    createdAt: null,
    deadline: null,
    now: "2026-11-05T00:00:00.000Z",
  });
  assertEquals(result.visible, false);
  assertEquals(result.rejectionCode, "MISSING_PUBLICATION_AND_FALLBACK_DATE");
});

Deno.test("an expired deadline rejects an otherwise fresh offer", () => {
  const result = resolveEffectivePublicationDate({
    sourcePublishedAt: "2026-11-01T00:00:00.000Z",
    firstHarvestAt: null,
    createdAt: null,
    deadline: "2026-11-04T23:59:59.999Z",
    now: "2026-11-05T00:00:00.000Z",
  });
  assertEquals(result.expiredByDeadline, true);
  assertEquals(result.visible, false);
});

Deno.test("future publication dates are rejected", () => {
  const result = resolveEffectivePublicationDate({
    sourcePublishedAt: "2026-11-06T00:00:00.000Z",
    firstHarvestAt: null,
    createdAt: null,
    deadline: null,
    now: "2026-11-05T00:00:00.000Z",
  });
  assertEquals(result.publishedInFuture, true);
  assertEquals(result.visible, false);
});

Deno.test("date-only source deadlines remain valid until the end of the advertised day", () => {
  assertEquals(
    normalizeDeadlineTimestamp("2026-11-06"),
    "2026-11-06T23:59:59.999Z",
  );
  assertEquals(
    normalizeDeadlineTimestamp("2026-11-06T00:00:00.000Z"),
    "2026-11-06T23:59:59.999Z",
  );
  assertEquals(
    normalizeDeadlineTimestamp("2026-11-06T16:00:00.000Z"),
    "2026-11-06T16:00:00.000Z",
  );

  const duringDeadlineDay = resolveEffectivePublicationDate({
    sourcePublishedAt: "2026-10-22T00:00:00.000Z",
    firstHarvestAt: null,
    createdAt: null,
    deadline: "2026-11-06",
    now: "2026-11-06T16:30:00.000Z",
  });
  assertEquals(duringDeadlineDay.visible, true);
  assertEquals(duringDeadlineDay.expiredByDeadline, false);

  const afterDeadlineDay = resolveEffectivePublicationDate({
    sourcePublishedAt: "2026-10-22T00:00:00.000Z",
    firstHarvestAt: null,
    createdAt: null,
    deadline: "2026-11-06",
    now: "2026-11-07T00:00:00.000Z",
  });
  assertEquals(afterDeadlineDay.visible, false);
  assertEquals(afterDeadlineDay.expiredByDeadline, true);
});
