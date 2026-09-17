# JOBLY — P3 Production Cutover Checklist — 13/09/2026

## 1. UAT gates
- [ ] `ICLAN_API_URL` switched to the production endpoint supplied by Eduklan/iClan.
- [ ] Production credentials stored only in the deployment secret manager.
- [ ] Successful token acquisition from the production endpoint.
- [ ] MTN MoMo launch test completed with an approved test account/amount.
- [ ] Orange Money launch test completed with an approved test account/amount.
- [ ] `verify_payment` observed as `PENDING` before customer validation where applicable.
- [ ] `verify_payment` observed as `SUCCESSFUL` after validation.
- [ ] Amount and currency checked against Jobly's server-side catalogue.
- [ ] Subscription becomes `ACTIVE` only after verified success.
- [ ] Entitlements reflect the purchased plan.
- [ ] FAILED path tested: no premium activation.
- [ ] REFUNDED path tested: subscription canceled and entitlement removed.

## 2. Provider/security gates
- [ ] Confirm the production API contract with Eduklan/iClan.
- [ ] Confirm whether production webhook callbacks exist and obtain their signed payload contract before enabling webhook processing.
- [ ] Keep fail-closed behavior if no signed webhook contract is supplied.
- [ ] Verify TLS, timeout and retry behavior at the hosting layer.
- [ ] Confirm provider rate limits and operational contact.
- [ ] Confirm reconciliation procedure and transaction lookup SLA.

## 3. Application gates
- [ ] `npm install` completes in CI/deployment environment.
- [ ] Prisma schema validation passes.
- [ ] Prisma client generation passes.
- [ ] Typecheck passes.
- [ ] Production build passes.
- [ ] Database migration deploy passes against a staging database.
- [ ] E2E candidate purchase flow passes.
- [ ] No secret appears in logs, source, ZIP artifacts, or client bundles.

## 4. Go-live gate
Production billing must remain disabled until every required checkbox above is evidenced by a test result or provider confirmation.
