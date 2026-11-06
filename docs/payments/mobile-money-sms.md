# Jobly Mobile Money SMS payment core

## Customer journey
The shared `/abonnement` page is used by Web, PWA and the Jobly Android WebView. Selecting MTN or Orange creates a Jobly subscription/payment order and returns the configured short payment code, merchant account, amount, currency, USSD code and internal Jobly reference. The customer completes the operator flow, then submits the transaction ID from the operator receipt. No PIN is requested or processed by Jobly.

The browser/PWA can display/copy the code and open a `tel:` URI when supported. It cannot read the device SMS inbox. SMS reception is reserved for the paired Android merchant handset in the existing Jobly APK.

## Central administrator configuration
Merchant codes and receiving numbers are **not hardcoded** and do not require a Vercel environment change or application redeployment. A Jobly ADMIN configures each provider in `/admin/payments/sms`; the same screen is available on Web/PWA and inside the existing APK.

The settings are stored in the restricted server-only `PaymentSmsProviderConfig` table. `GET /api/payments/sms/config` returns the configured number and a masked code hint only; `POST /api/payments/sms/config` accepts updates only from the ADMIN role. FINANCE can view the masked configuration. Merchant codes are never returned as standalone fields to ordinary users or written to logs/audit metadata.

- MTN: `*126*16*<merchant-code>*<amount>#`
- Orange: `#150*47*<merchant-code>*<amount>#`

Each new payment snapshots its merchant number on the Payment row and its merchant code in the separate server-only `PaymentSmsOrderConfig` table. The code snapshot is not exposed by customer-readable Payment queries. Changing the central configuration affects **new orders only**; an existing pending order continues using the exact USSD configuration that created it.

Changing the receiving number is a separate operational change: the new SIM/device must be paired in the existing Jobly APK and RECEIVE_SMS must be authorized on that physical handset. Web/PWA cannot read SMS, pair a physical SIM, or grant Android permissions remotely.

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
Activation requires a trusted paired device, exact sender allow-list match, a successful **incoming merchant credit** (never an outgoing payment), XAF amount, unique operator transaction ID, exact customer-submitted transaction ID, matching provider and merchant account, exact amount/currency, and payer match when the SMS contains a payer phone. Orange detailed receipts can contain both the beneficiary merchant number and the payer number; MTN receipts may identify the payer in parentheses or omit it. Local Cameroon mobile numbers are normalized to the `237` prefix. Orange `MP...` success IDs and `PP...` failed IDs are preserved, as are MTN numeric financial transaction IDs. Repeated wording for one transaction is deduplicated by provider + transaction ID. A transaction reference cannot belong to two Jobly orders. The SQL function `finalize_payment_from_sms` locks the receipt and finalizes the existing subscription lifecycle atomically.

No artificial two-minute delay is used. If a receipt has not arrived yet, Jobly records the customer's reference and returns the page to normal use; a later incoming receipt can settle the order automatically.

## Mandatory AI review of every unique merchant SMS
After device authentication and exact sender allow-list verification, each unique SMS is analysed through Jobly's existing AI orchestrator (configured providers such as Groq, Cerebras, Gemini or OpenRouter). The AI classifies the message as a merchant credit, customer debit, reversal, failure, pending notice, promotional message or unknown; it also cross-checks direction, status, confidence and suspicious signals against the deterministic parser.

The AI receives a redacted semantic copy: transaction references, numeric amounts, phone/account numbers and the obvious merchant/payer identity spans are replaced with placeholders. The deterministic parser alone extracts exact payment values. AI output is stored only as structured review metadata; the raw SMS body is not persisted. If the AI output conflicts with the deterministic parser, has confidence below 0.80, reports suspicious signals, or does not identify a successful incoming merchant credit, the receipt is rejected from automatic matching.

A real external AI provider is mandatory for an allow-listed receipt. The deterministic AI fallback is explicitly disabled for this operation. If available AI providers fail or are not configured, the API returns HTTP 503; the APK keeps its locally encrypted SMS and WorkManager retries. This path never silently falls back to a parser-only payment decision. Even a positive AI classification is only one evidence signal: the exact sender, merchant account, amount, customer-submitted transaction reference, payer (when present), transaction uniqueness and atomic billing checks remain mandatory. J’IA and the AI model cannot execute a payment or activate an entitlement by themselves.

## Database rollout
The canonical migration `supabase/migrations/20261106040000_payment_sms_mobile_money_foundation.sql` is versioned in the branch but **has not been applied**. It requires the existing billing lifecycle migration and `finalize_payment` RPC. Validate it on a non-production Supabase project first; applying it to production remains a separate, explicitly authorized deployment step. `supabase/operations/payment_sms_foundation.sql` remains a review copy and must not be executed separately.

## Production enablement blockers
- Exact SMS sender labels as displayed by the real handset inbox are still required for each operator. The pasted message bodies do not include the sender field, so no sender allow-list is fabricated.
- The actual MTN and Orange merchant codes and receiving account/SIM numbers must be entered by a Jobly ADMIN in the central settings screen. The shortcode syntax is implemented, but no sample recipient account (for example a third-party business name in a receipt) is assumed to belong to Jobly.
- Parser tests now cover the supplied MTN/Orange message shapes using redacted sender IDs and business/payer names; the final allow-list still needs confirmation on the paired handset.
- Android SMS receiver, Keystore provisioning, restricted `RECEIVE_SMS` permission and real-handset tests must be completed in the existing `apps/android` project. That project is currently in the unmerged PR #220/#221 dependency stack, so this branch intentionally does not introduce a second Android application.
- Apply and validate the SQL draft before enabling SMS orders in a production environment.
