# JOBLY — RECRUTEMENT 360° — AUDIT FINAL 1–14 — 2026-10-02

Rule: an unproved score is not treated as 10. Scores below 10 are either corrected where technically possible or documented as runtime/infrastructure limits.

| # | Criterion | Score | Evidence / limit |
|---|---|---:|---|
| 1 | Completeness vs Partie B | 7/10 | Lots 8/10/11/9 backend foundations present; full export/runtime/mobile acceptance remains unproved. |
| 2 | Recruiter ↔ Talent coherence | 8/10 | Recruitment360↔RecruiterJob↔Application membership enforced; individual actions reused. UI E2E not proven. |
| 3 | Security / RLS | 9/10 | Recruitment tables have RLS enabled; Lot10 sensitive DML grants were hardened; public-link access is token+expiry gated. Remaining tables with service-only semantics need full policy review. |
| 4 | Locked steps / state machine | 9/10 | Lot10 now blocks locked applications; Lot2 publish/extend/close enforce state constraints. Full cross-lot state-machine E2E remains unproven. |
| 5 | Test reliability | 7/10 | Idempotency and test-session uniqueness verified; A/C/E passed. D/F/G/H cannot be runtime-certified without linked production applications, so no fake fixture was persisted. |
| 6 | Notifications / double-check / unique codes | 8/10 | Per-application notification targeting and batch idempotency exist; notification isolation runtime test remains blocked by missing linked application fixture. |
| 7 | AI fairness / transparency | 6/10 | Existing architecture is explainable/non-decisive; complete Recruitment360 fairness/anonymization audit was not re-executed in this pass. |
| 8 | Mobile UX / accessibility / FR-EN | 0/10 | No current real-device E2E evidence in this pass. Per rule, unproved is 0. |
| 9 | Performance / weak network | 0/10 | No controlled weak-network/runtime benchmark executed. |
| 10 | No regressions | 0/10 | No complete production E2E/build/browser regression pass executed after the latest changes. |
| 11 | Native app / integrated video | 6/10 | Native-video session/start/finalize authorization layer implemented; actual LiveKit runtime, camera/mic and mobile call UI not certified. |
| 12 | Free mode → production | 0/10 | Not revalidated end-to-end in this pass. |
| 13 | Grouped recruitment | 8/10 | Lot10 batch orchestration, idempotency, per-item isolation, partial-failure model and locked-state guard implemented. D/F/G/H runtime coverage remains blocked. |
| 14 | Official listings | 7/10 | Official listing JSON/CSV-v2, expirable public-link schema, immutable-block schema, consent/errata/export metadata schemas implemented. PDF/XLSX/JPEG/WEB generation and exact 1:2/8K/QR acceptance remain unproved. |

## Corrections executed during final pass

1. Added APPLICATION_LOCKED protection to Lot10.
2. Hardened sensitive Lot10/test/proctoring table grants.
3. Added Lot11 official listing read/export foundation.
4. Added Lot11 public-link expiry/revocation foundation.
5. Added Lot11 immutable Jobly-block, consent, errata/history and export metadata structures.
6. Corrected CSV-v2 generation with proper double-quoted CSV fields.
7. Added Lot9 native-video create/start/participant-finalize controls.
8. Aligned Lot9 persisted video provider with the existing LIVEKIT database constraint.
9. No Vercel deployment.
10. No persistent fake test fixtures.

## Final technical verdict

Recruitment360 is not yet 20/20 certified.

The blocking gaps are now clearly separated from implemented architecture:
- real E2E fixture coverage for Lot10 D/F/G/H;
- PDF/XLSX/JPEG/WEB asset generation and acceptance tests for Lot11;
- actual LiveKit runtime/native video;
- real mobile/accessibility/weak-network validation;
- complete regression/build validation;
- final Free→production validation.

This report does not claim those items as passed.
