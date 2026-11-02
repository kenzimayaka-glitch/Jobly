# Africa matrix implementation — 2026-10-03

No production write, merge or deployment performed.

## A — source date extraction
The crawler uses JSON-LD JobPosting first, then publication meta tags, then source-specific text adapters for the top-10 active-volume sources: Job Ivoire, Ajirika East, BrighterMonday Kenya, Emplois Cameroun, Job in Cameroun, UNjobnet, JobInfoCamer, Infos Concours Education, Go Africa Jobs and AJAR RDC. Infos Concours and JobInfoCamer were checked against their live public pages; their pages visibly expose publication dates in page text. Emplois Cameroun also exposes day/month/year dates in the public listing.

## B — 30-day fallback
The display layer uses first `JobHarvestCapture.discoveredAt`, otherwise `Job.createdAt`, only when `sourcePublishedAt` is absent. The fallback never overwrites the real source date. `publicationDateEstimated=true` marks estimated dates. A deadline in the past excludes the offer. Freshness is 30 days.

## PR #185 rollout — plan only
1. Migration: apply the publication provenance migration; verify schema/indexes and row counts.
2. Function v2: deploy the validated `job-harvest-process` function from PR #185; keep the cron unchanged.
3. First three cron passages: after each passage query capture status/rejection codes, PROCESSING count, processed captures with Job/Pipeline, new MAX_PROCESS_ATTEMPTS, and sourcePublishedAt fill rate.
4. Rollback: redeploy v1, stop further processing, preserve captures for diagnosis; no blind data rollback.

## Pilots — conditional
UNjobnet Kenya, BrighterMonday Kenya, and JobInfoCamer are candidates only. Before activation, check each source's current robots.txt and terms, crawl only public pages, respect disallow/rate limits, and do not bypass authentication or anti-bot controls. No source is enabled by this branch.
