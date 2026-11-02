# Africa audit — 2026-11-02

Production read-only. The 2 November snapshot below supersedes the 3 October figures for current operational decisions. No production writes, migration execution, Supabase function deployment, offer deactivation, or production deployment were performed in this mission.

## Current production snapshot — 2026-11-02

- Scope: 54 countries enabled in `JoblyCountry`.
- Coverage: 52 countries have active offers or capture records. Burkina Faso (BF) and Mauritania (MR) have no active offers or captures in this snapshot.
- `Job`: 5,100 active rows. All 5,100 have `sourceUrl`; 207 have `applicationReady=true`.
- `JobHarvestCapture`: 5,395 rows — 4,141 PROCESSED, 800 PENDING, 397 QUARANTINED, 57 EXPIRED.
- `JobOfferPipeline`: 84 rows — 24 READY and 60 QUARANTINED. 5,054 active Jobs have no corresponding pipeline row.
- `JobSource`: 3 active operational entries (FNE, MinaJobs, UN Cameroon). Their `lastQueuedAt`, `lastRunAt`, and `lastSuccessAt` timestamps are all null.
- Source keys observed across data: 28 distinct keys in Jobs, 18 capture sources, and 26 distinct active source keys.

### Data-quality and processing losses

| Control | Current finding |
|---|---:|
| Active Jobs missing `sourcePublishedAt` | 202 |
| Active Jobs older than 62 days | 118 |
| Active Jobs with an expired application deadline | 2,961 |
| Active Jobs missing `countryCode` | 36 |
| Pending captures without `jobId` | 590 |
| Pending captures linked to a Job | 210 |
| Pending captures with at least 3 attempts | 103 |
| Quarantined captures with at least 3 attempts | 397 |

The 202 active Jobs without `sourcePublishedAt` are distributed as follows: CM 194, NG 5, UNKNOWN 1, BI 1, CD 1. Their `createdAt` values are 30–62 days old, and no linked capture provides a trustworthy `firstHarvestAt`. The 30-day estimated fallback therefore does not make these records visible. The categories in the table can overlap and must not be summed as independent losses.

### Ingestion and traceability

Two ingestion paths exist: `discover-jobs` can insert/update Jobs directly, while the harvest path moves through `JobHarvestCapture` and `JobOfferPipeline`. The current production data contains 5,054 active Jobs without a pipeline row; the deployed worker v1 did not systematically populate that trace. The `JobSource` operational table is also not synchronized with all source keys found in Jobs and captures.

## Corrective changes prepared on `fix/africa-matrix`

- Talent GET is read-only: it no longer creates a user row or updates stale Jobs while serving a request, and filters offers that fail the freshness/deadline gate.
- Freshness policy is centralized: a real source publication date may remain visible for up to 62 days; an estimated fallback is limited to 30 days. The fallback is not written into `sourcePublishedAt`.
- Future publication dates are rejected and quarantined. JSON-LD `dateModified` is not treated as the original publication date.
- Harvest processing records structured rejection reasons and upserts `JobOfferPipeline` for processed captures.
- Country routing uses explicit country paths/filters or a single-country source definition. Generic multi-country URLs without a reliable country filter are unresolved rather than being attributed to the country currently being crawled.
- ReliefWeb, UNjobs and Impactpool are not registered twice for the same country: the original entries remain Cameroon-specific and the `*_africa` variants cover the other countries.
- Shadow-crawl PR runs are report-only. The production ingestion step is restricted to scheduled or `main`-branch runs.

The SQL migrations in this branch are proposals only. They have not been applied to JOBLY-PROD, and no Supabase function or Vercel production deployment has been performed. The current PR remains subject to review and explicit user approval before merge.

---

## Historical baseline — 2026-10-03

The following sections preserve the original 3 October read-only audit and its 54-country matrix. They are retained for comparison only; the counts and zero-capture plan below are not the current 2 November state.

Production read-only. No production write, migration, deactivation, or deployment.

## Evidence — snapshot 2026-10-03

- 54-country scope.
- 30 countries have JobHarvestCapture rows; 24 have zero captures.
- JobSource: 3 rows, all CM and active.
- Job: 1,275 active; 5 active without countryCode.
- JobHarvestCapture: 668 PENDING, 398 PROCESSED, 30 QUARANTINED.
- 191 captures are at MAX_PROCESS_ATTEMPTS.
- JobOfferPipeline: 24 READY, 60 QUARANTINED.

## Cameroon — snapshot 2026-10-03

272 active CM. 194 have no sourcePublishedAt and therefore fail the publication/freshness visibility gate. 0 active CM with a publication date are already >2 months old. 26 have expired deadlines, but deadline changes display status rather than removing visibleRanked. 169 have applicationReady=true and 103=false; applicationReady is not a visibility filter. Reconstructed visible CM stock: 78 before pagination/matching.

## 54-country matrix — snapshot 2026-10-03

|Code|Country|Captures|Active Jobs|Visible reconstructed|
|---|---|---:|---:|---:|
|DZ|Algeria|1|1|1|
|AO|Angola|0|0|0|
|BJ|Benin|1|1|1|
|BW|Botswana|0|0|0|
|BF|Burkina Faso|0|0|0|
|BI|Burundi|4|5|4|
|CV|Cabo Verde|1|1|1|
|CM|Cameroon|17|272|78|
|CF|Central African Republic|0|0|0|
|TD|Chad|13|13|13|
|KM|Comoros|2|2|2|
|CG|Congo|0|0|0|
|CD|DRC|27|28|27|
|CI|Côte d’Ivoire|320|320|320|
|DJ|Djibouti|1|0|0|
|EG|Egypt|0|0|0|
|GQ|Equatorial Guinea|0|0|0|
|ER|Eritrea|2|2|2|
|SZ|Eswatini|0|0|0|
|ET|Ethiopia|0|0|0|
|GA|Gabon|3|3|3|
|GM|Gambia|0|0|0|
|GH|Ghana|2|2|2|
|GN|Guinea|1|1|1|
|GW|Guinea-Bissau|0|0|0|
|KE|Kenya|229|222|220|
|LS|Lesotho|37|33|33|
|LR|Liberia|0|0|0|
|LY|Libya|0|0|0|
|MG|Madagascar|31|27|27|
|MW|Malawi|4|4|4|
|ML|Mali|2|2|2|
|MR|Mauritania|0|0|0|
|MU|Mauritius|0|0|0|
|MA|Morocco|0|0|0|
|MZ|Mozambique|0|0|0|
|NA|Namibia|44|33|33|
|NE|Niger|0|0|0|
|NG|Nigeria|5|10|5|
|RW|Rwanda|332|271|271|
|ST|São Tomé and Príncipe|0|0|0|
|SN|Senegal|2|2|2|
|SC|Seychelles|1|1|1|
|SL|Sierra Leone|6|6|6|
|SO|Somalia|0|0|0|
|ZA|South Africa|4|4|4|
|SS|South Sudan|1|1|1|
|SD|Sudan|1|1|1|
|TZ|Tanzania|0|0|0|
|TG|Togo|1|1|1|
|TN|Tunisia|0|0|0|
|UG|Uganda|1|1|1|
|ZM|Zambia|0|0|0|
|ZW|Zimbabwe|0|0|0|

Visible reconstructed = active minus active offers with no sourcePublishedAt minus active offers >62 days. Kenya has 2 stale active rows. /api/jobs was not called to avoid its production mutation.

## Proven losses — snapshot 2026-10-03

1. Source productivity is concentrated: Rwanda 332 captures, Côte d’Ivoire 320, Kenya 229.
2. Capture -> processing: 668 pending, including 191 at the retry ceiling.
3. Capture -> pipeline: deployed worker does not systematically create JobOfferPipeline.
4. Cameroon visibility: 194/272 active CM have no publication date.
5. Country normalization: 5 active jobs have no countryCode.
6. Africa scope exclusion remains unchanged.

## The five countryCode-null active jobs — snapshot 2026-10-03

Two Emplois Cameroun offers are in Man; source name alone must not force CM. One is Douala (CM), one Buea (CM), and the Impactpool Economist description says Cairo, Egypt (EG). No production backfill was executed.

## Original branch corrections — snapshot 2026-10-03

- Add countryCode/rejectionCode/rejectionReason to capture and pipeline.
- Backfill only explicit alpha-2 payload codes.
- Canonical worker source adds country normalization, structured rejection reasons, and systematic JobOfferPipeline upsert.
- Add a read-only-by-default country normalization script.
- No source activation, no offer deactivation, no deployment.

## Zero-capture plan — historical snapshot 2026-10-03

24 countries × 2 candidate sources × ~40 captures/source = **~1,920 candidate captures**. This is a test target, not a guarantee. Sources remain pending explicit approval.

Zero-capture countries: AO, BF, BW, CF, CG, EG, ET, GM, GQ, GW, LR, LY, MA, MR, MU, MZ, NE, SO, ST, SZ, TN, TZ, ZM, ZW.

## Code proof

app/api/jobs/route.ts; .github/workflows/africa-harvest-processor.yml; supabase/migrations/20260930173500_job_harvest_capture.sql; supabase/migrations/20260929192739_job_offer_pipeline_architecture_v1.sql; deployed job-harvest-process v1.
