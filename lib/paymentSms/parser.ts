/**
 * Deterministic parser for Mobile Money confirmation SMS.
 *
 * Sender IDs and body text are untrusted input. A parse result is never, by itself,
 * authorization to activate an entitlement: the server must also match an unused
 * payment order, merchant account, amount, currency, payer and transaction ID.
 *
 * Provider-specific message formats must be verified against redacted live samples
 * before automatic production activation is enabled.
 */
export type PaymentSmsProvider = "SMS_MTN" | "SMS_ORANGE";
export type ParsedPaymentSmsStatus = "SUCCESSFUL" | "FAILED" | "PENDING" | "UNKNOWN";

export type PaymentSmsParseResult = {
  parserVersion: "0.1.0";
  provider: PaymentSmsProvider | null;
  senderId: string;
  senderTrusted: boolean;
  status: ParsedPaymentSmsStatus;
  transactionId: string | null;
  amountXaf: number | null;
  currency: "XAF" | null;
  payerPhone: string | null;
  merchantAccount: string | null;
  occurredAt: string | null;
  fraudFlags: string[];
};

export type PaymentSmsParserConfig = {
  senderIds: Partial<Record<PaymentSmsProvider, string[]>>;
};

function normalizeSender(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase();
}

function providerForSender(
  senderId: string,
  config: PaymentSmsParserConfig,
): PaymentSmsProvider | null {
  const candidate = normalizeSender(senderId);
  if (!candidate) return null;
  const mtn = (config.senderIds.SMS_MTN || []).map(normalizeSender);
  const orange = (config.senderIds.SMS_ORANGE || []).map(normalizeSender);
  const inMtn = mtn.includes(candidate);
  const inOrange = orange.includes(candidate);
  // An ambiguous allow-list configuration is not trusted.
  if (inMtn === inOrange) return null;
  return inMtn ? "SMS_MTN" : "SMS_ORANGE";
}

function captureFirst(body: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = pattern.exec(body);
    const value = match?.[1]?.trim();
    if (value) return value;
  }
  return null;
}

function parseIntegerAmount(value: string | null): number | null {
  if (!value) return null;
  const digits = value.replace(/[\s.,'’]/g, "");
  if (!/^\d{2,10}$/.test(digits)) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 15) return null;
  return trimmed.startsWith("+") ? "+" + digits : digits;
}

function parseStatus(body: string): ParsedPaymentSmsStatus {
  const text = body.normalize("NFKC").toLocaleLowerCase("fr");
  if (/\b(echec|échec|failed|failure|annul[eé]|rejet[eé]|declined|refus[eé])\b/.test(text)) {
    return "FAILED";
  }
  if (/\b(en cours|pending|processing|traitement en cours)\b/.test(text)) {
    return "PENDING";
  }
  if (/\b(successful|success|réussi|reussi|effectué|effectue|pay[eé]|paid|reçu|recu|received|credited|confirm[eé])\b/.test(text)) {
    return "SUCCESSFUL";
  }
  return "UNKNOWN";
}

function parseOccurredAt(body: string): string | null {
  // Operator SMS timestamps without an explicit timezone are intentionally not
  // converted: the server timezone must never be guessed from message text.
  const iso = captureFirst(body, [
    /\\b((?:20\\d{2})-(?:0?[1-9]|1[0-2])-(?:0?[1-9]|[12]\\d|3[01])[ T](?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?(?:Z|[+-](?:0\\d|1[0-4]):[0-5]\\d))\\b/i,
  ]);
  if (!iso) return null;
  const normalized = iso.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parsePaymentSms(
  input: { senderId: string; body: string },
  config: PaymentSmsParserConfig,
): PaymentSmsParseResult {
  const senderId = normalizeSender(input.senderId).slice(0, 120);
  const body = String(input.body || "").normalize("NFKC").slice(0, 5000);
  const provider = providerForSender(senderId, config);
  const status = parseStatus(body);

  const transactionId = captureFirst(body, [
    /\b(?:transaction\s*(?:id|no\.?|number|reference|ref)|txn\s*(?:id|ref)|id\s+de\s+transaction|référence\s+transaction|reference\s+transaction)\s*[:#=\-]?\s*([A-Z0-9][A-Z0-9_-]{4,63})\b/i,
    /\b(?:référence|reference|ref)\s*(?:transaction)?\s*[:#=\-]\s*([A-Z0-9][A-Z0-9_-]{4,63})\b/i,
  ]);

  const amountText = captureFirst(body, [
    /\b(?:montant|amount|somme|total|crédit|credit|reçu|received)\s*(?:de|of|:|=)?\s*([0-9][0-9\s.,'’]{0,15})\s*(?:FCFA|XAF|CFA|F\s?CFA)\b/i,
    /\b([0-9][0-9\s.,'’]{0,15})\s*(?:FCFA|XAF|CFA|F\s?CFA)\b/i,
  ]);
  const amountXaf = parseIntegerAmount(amountText);

  const payerText = captureFirst(body, [
    /\b(?:de|from|payer|payeur|num[eé]ro\s+payeur|t[eé]l[eé]phone\s+payeur)\s*[:#=\-]?\s*((?:\+?237)?[0-9][0-9\s-]{7,18})\b/i,
  ]);
  const merchantText = captureFirst(body, [
    /\b(?:vers|to|marchand|merchant|compte\s+marchand|num[eé]ro\s+marchand|merchant\s+account)\s*[:#=\-]?\s*((?:\+?237)?[0-9][0-9\s-]{7,18})\b/i,
  ]);

  const fraudFlags: string[] = [];
  if (!provider) fraudFlags.push("UNTRUSTED_OR_AMBIGUOUS_SENDER");
  if (status !== "SUCCESSFUL") fraudFlags.push("MESSAGE_NOT_CONFIRMED_SUCCESS");
  if (!transactionId) fraudFlags.push("TRANSACTION_ID_MISSING");
  if (!amountXaf) fraudFlags.push("AMOUNT_MISSING_OR_INVALID");
  if (!normalizePhone(payerText)) fraudFlags.push("PAYER_PHONE_MISSING_OR_INVALID");
  if (!normalizePhone(merchantText)) fraudFlags.push("MERCHANT_ACCOUNT_MISSING_OR_INVALID");

  return {
    parserVersion: "0.1.0",
    provider,
    senderId,
    senderTrusted: provider !== null,
    status,
    transactionId: transactionId?.toUpperCase() || null,
    amountXaf,
    currency: amountXaf === null ? null : "XAF",
    payerPhone: normalizePhone(payerText),
    merchantAccount: normalizePhone(merchantText),
    occurredAt: parseOccurredAt(body),
    fraudFlags,
  };
}
