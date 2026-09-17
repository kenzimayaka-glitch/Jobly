# P3 — iClan/Eduklan UAT configuration — 13/09/2026

## Provider contract implemented

- Base URL: `ICLAN_API_URL` (UAT default: `https://test.api.eduklan.com`)
- Token: `POST /api/client/token`
- Payment: `POST /api/test/make_payment`
- Verification: `POST /api/test/verify_payment`
- Methods: `MTN MoMo`, `Orange Money`
- Provider reference: Jobly payment UUID as `external_id`
- Provider status: `SUCCESSFUL`, `FAILED`, `PENDING`

The implementation follows the supplied Eduklan UAT documentation.

## Secrets

The supplied UAT username/password are intentionally **not written into the repository or ZIP**. Configure them at runtime as `ICLAN_USERNAME` and `ICLAN_PASSWORD` using the deployment/server secret manager.

## Runtime flow

1. Jobly creates a PENDING subscription and CREATED payment.
2. iClan token is requested and cached for less than its 5-minute lifetime.
3. `make_payment` is called with phone, method, XAF amount and unique external ID.
4. User validates Mobile Money request.
5. `POST /api/payments/[id]/verify` calls iClan `verify_payment`.
6. Only a verified `SUCCESSFUL` response with matching amount can activate the subscription.
7. `PENDING` remains pending; `FAILED` expires the subscription.

## Network validation

The execution environment used for this build could not resolve `test.api.eduklan.com`, so live credential authentication could not be executed here. This is an environment/network limitation, not a simulated success.
