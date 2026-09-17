# JOBLY — P2/P3 IMPLEMENTATION REPORT — 13/09/2026

## Locked pricing
- Free: 0 FCFA / 0 FCFA
- Start: 1,800 FCFA/month / 5,000 FCFA/year
- Premium: 3,500 FCFA/month / 15,500 FCFA/year
- Pro: 5,000 FCFA/month / 25,800 FCFA/year

## P2
- Central pricing catalogue
- Subscription UI
- Subscription API
- Entitlements API
- AI quotas and storage limits
- Server-side price authority

## P3 Payment Core v1
- Payment create/list/get
- Idempotency persistence
- Payment state machine
- Refund and reconciliation admin endpoints
- iClan webhook signature verification and replay protection
- Subscription activation only after verified SUCCESSFUL webhook
- Provider abstraction with Mock + iClan boundary

## Database
Migration: `20260913100000_p2_p3_billing`

Adds pricing catalogue, subscription billing fields, payment lifecycle fields, idempotency records and webhook event records.

## Validation status
`npm install --ignore-scripts --no-audit --no-fund` timed out in the execution environment. Therefore no successful dependency-backed `typecheck` or `build` is claimed. Global `tsc` was run and only dependency/type-environment errors were observable because `node_modules` is unavailable.

## Production gates still open
- iClan sandbox credentials + real API contract
- signed webhook UAT
- real Mobile Money payment/reconciliation
- Google Play / Apple billing
- full typecheck/build/E2E after dependency installation

## 13/09/2026 — P3 hardening checkpoint
- Reconciliation admin/finance durcie : transitions d'état contrôlées, raison obligatoire pour `FAILED`, `externalId` vérifié, traitement idempotent si le statut est déjà atteint.
- Une réconciliation `SUCCESSFUL` active désormais la souscription liée avec période courante ; `FAILED` expire une souscription `PENDING` ; `REFUNDED` annule la souscription liée.
- Chaque rapprochement est journalisé dans `AuditLog`.
- Aucun succès de paiement de production n'est fabriqué : le rapprochement reste une opération administrative explicite en attendant le contrat iClan réel et son UAT.
