# Jobly Mobile Money SMS payment core

## Customer journey
The shared `/abonnement` page is used by Web, PWA and the Jobly Android WebView. Selecting MTN or Orange creates a Jobly subscription/payment order and returns the configured short payment code, merchant account, amount, currency, USSD code and internal Jobly reference. The customer completes the operator flow, then submits the transaction ID from the operator receipt. No PIN is requested or processed by Jobly.

The browser/PWA can display/copy the code and open a `tel:` URI when supported. It cannot read the device SMS inbox. SMS reception is reserved for the paired Android merchant handset in the existing Jobly APK.

## Required server environment
Configure these values as protected Vercel environment variables for each environment:

- `JOBLY_MTN_MERCHANT_ACCOUNT`
- `JOBLY_MTN_PAYMENT_CODE`
- `JOBLY_MTN_USSD_CODE`
- `JOBLY_ORANGE_MERCHANT_ACCOUNT`
- `JOBLY_ORANGE_PAYMENT_CODE`
- `JOBLY_ORANGE_USSD_CODE`

No operator shortcode or merchant number is hard-coded. A checkout provider is unavailable until its three values are configured and validated.

## Device provisioning
An authenticated ADMIN or FINANCE user calls `POST /api/payments/sms/devices` with JSON:

```json
{
  "label": "Téléphone marchand MTN",
  "provider": "SMS_MTN",
  "merchantAccount": "2376XXXXXXXX",
  "senderIds": ["<exact sender ID copied from a genuine operator SMS>"]
}
```

The response contains `deviceToken` exactly once. Store it in Android Keystore in the existing Jobly APK; never in SharedPreferences, Web storage, source code, telemetry or logs. Configure the actual sender IDs only after inspecting redacted genuine MTN/Orange SMS samples. Do not guess them.

The paired handset posts received SMS to `POST /api/payments/sms/ingest` with `x-jobly-sms-device: <device id>`, `Authorization: Bearer <device token>`, and JSON `{ "senderId": "...", "smsBody": "..." }`. The API persists parsed fields and cryptographic hashes, not the SMS body.

## Deterministic confirmation rules
Activation requires a trusted paired device, exact sender allow-list match, successful operator wording, XAF amount, unique operator transaction ID, exact customer-submitted transaction ID, matching provider and merchant account, exact amount/currency, and payer match when the SMS contains a payer phone. A transaction reference cannot belong to two Jobly orders. The SQL function `finalize_payment_from_sms` locks the receipt and finalizes the existing subscription lifecycle atomically.

No artificial two-minute delay is used. If a receipt has not arrived yet, Jobly records the customer's reference and returns the page to normal use; a later incoming receipt can settle the order automatically. AI may flag suspicious patterns but never authorizes an entitlement.

## Database rollout
`supabase/operations/payment_sms_foundation.sql` is a draft, not an applied production migration. It must be reviewed, converted into the repo's canonical Supabase migration format, tested on a non-production project, and only then applied through the authorized deployment process. It requires the already-applied billing lifecycle migration and `finalize_payment` RPC.

## Production enablement blockers
- Genuine redacted MTN and Orange receipt samples must be used to validate sender IDs and provider-specific message formats. Current parser fixtures are synthetic tests only.
- The merchant shortcodes, USSD codes and merchant account numbers must be supplied and configured.
- Android SMS receiver, Keystore provisioning, restricted `RECEIVE_SMS` permission and real-handset tests must be completed in the existing `apps/android` project. That project is currently in the unmerged PR #220/#221 dependency stack, so this branch intentionally does not introduce a second Android application.
- Apply and validate the SQL draft before enabling SMS orders in a production environment.
