/**
 * Deterministic parser for genuine Mobile Money merchant receipts.
 *
 * Text, sender names and phone numbers are untrusted. Only a paired handset with
 * an exact allow-listed sender can submit a receipt; this parser never grants access.
 */
export type PaymentSmsProvider = "SMS_MTN" | "SMS_ORANGE";
export type ParsedPaymentSmsStatus = "SUCCESSFUL" | "FAILED" | "PENDING" | "UNKNOWN";
export type PaymentSmsDirection = "INBOUND" | "OUTBOUND" | "UNKNOWN";

export type PaymentSmsParseResult = {
  parserVersion: "0.2.0";
  provider: PaymentSmsProvider | null;
  senderId: string;
  senderTrusted: boolean;
  status: ParsedPaymentSmsStatus;
  direction: PaymentSmsDirection;
  transactionId: string | null;
  amountXaf: number | null;
  currency: "XAF" | null;
  payerPhone: string | null;
  merchantAccount: string | null;
  merchantAccountFromMessage: boolean;
  occurredAt: string | null;
  fraudFlags: string[];
};

export type PaymentSmsParserConfig = {
  senderIds: Partial<Record<PaymentSmsProvider, string[]>>;
  merchantAccount?: string;
  timeZone?: string;
};

function normalizeSender(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase();
}

function providerForSender(senderId: string, config: PaymentSmsParserConfig): PaymentSmsProvider | null {
  const candidate = normalizeSender(senderId);
  if (!candidate) return null;
  const mtn = (config.senderIds.SMS_MTN || []).map(normalizeSender);
  const orange = (config.senderIds.SMS_ORANGE || []).map(normalizeSender);
  const inMtn = mtn.includes(candidate);
  const inOrange = orange.includes(candidate);
  if (inMtn === inOrange) return null;
  return inMtn ? "SMS_MTN" : "SMS_ORANGE";
}

function captureFirst(body: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const value = pattern.exec(body)?.[1]?.trim();
    if (value) return value;
  }
  return null;
}

function parseIntegerAmount(value: string | null): number | null {
  if (!value) return null;
  const digits = value.replace(/[\s.,'’]/g, "");
  if (!/^\d{1,10}$/.test(digits)) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function normalizePhone(value: string | null): string | null {
  if (!value) return null;
  const digits = value.trim().replace(/\D/g, "");
  if (digits.length === 9) return "237" + digits;
  if (digits.length === 12 && digits.startsWith("237")) return digits;
  if (digits.length < 9 || digits.length > 15) return null;
  return digits;
}

function parseStatus(body: string): ParsedPaymentSmsStatus {
  const text = body.normalize("NFKC").toLocaleLowerCase("fr");
  if (/\b(?:non|pas|not)\s+(?:été\s+)?(?:réussi|reussi|effectué|effectue|payé|payee|paid|successful|confirmed|confirmé|reçu|recu)\b/.test(text)
    || /\b(transaction\s+failed|failed|failure|echec|échec|annul[eé]|rejet[eé]|declined|refus[eé])\b/.test(text)) {
    return "FAILED";
  }
  if (/\b(en cours|en attente|pending|processing|traitement en cours|awaiting confirmation)\b/.test(text)) {
    return "PENDING";
  }
  if (/\b(successful|success|réussi|reussi|effectué|effectue|finalis[eé]|completed|complete|pay[eé]|paid|reçu|recu|received|credited|confirm[eé])\b/.test(text)) {
    return "SUCCESSFUL";
  }
  return "UNKNOWN";
}

function parseDirection(body: string): PaymentSmsDirection {
  const text = body.normalize("NFKC").toLocaleLowerCase("fr");
  // Outgoing/debit notifications must never activate a merchant subscription.
  if (/\b(?:votre paiement|your payment|payment of|paiement successintegral|vous avez envoy[eé]|vous avez transf[eé]r[eé]|vous avez pay[eé]|vous avez effectu[eé] un paiement|you sent|you have paid|you paid|payment sent|transfer sent|transfert sortant|debit(?:ed)?)\b/.test(text)
    || /\b(?:a ete|a été)\s+finalis[eé]\b/.test(text)) {
    return "OUTBOUND";
  }

  // MTN merchant wallet credit notification.
  if (/\b(?:vous avez re[cç]u|you have received|payment received|credited to your account)\b/.test(text)) {
    return "INBOUND";
  }

  // Orange merchant receipt: receiver/merchant first, payer introduced by "par",
  // or same content where "réussi" appears before "par".
  if (/\b(?:paiement|payment)\s+de\s+.{1,180}\bpar\s+.{1,40}\b(?:r[eé]ussi|success|successful)\b/.test(text)
    || /\b(?:paiement|payment)\s+de\s+.{1,180}\b(?:r[eé]ussi|success|successful)\b.{0,80}\bpar\s+/.test(text)) {
    return "INBOUND";
  }
  return "UNKNOWN";
}

function localDateTimeToIso(value: string, timeZone: string): string | null {
  const normalized = value.normalize("NFKC").trim();
  const dayFirst = /^(\d{1,2})[/. -](\d{1,2})[/. -](20\d{2})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(normalized);
  const yearFirst = /^(20\d{2})-(\d{1,2})-(\d{1,2})[ T]+(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(normalized);
  if (!dayFirst && !yearFirst) return null;

  const year = Number(dayFirst ? dayFirst[3] : yearFirst![1]);
  const month = Number(dayFirst ? dayFirst[2] : yearFirst![2]);
  const day = Number(dayFirst ? dayFirst[1] : yearFirst![3]);
  const hour = Number(dayFirst ? dayFirst[4] : yearFirst![4]);
  const minute = Number(dayFirst ? dayFirst[5] : yearFirst![5]);
  const second = Number((dayFirst ? dayFirst[6] : yearFirst![6]) || 0);
  const calendarCheck = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (calendarCheck.getUTCFullYear() !== year || calendarCheck.getUTCMonth() !== month - 1 ||
      calendarCheck.getUTCDate() !== day || calendarCheck.getUTCHours() !== hour ||
      calendarCheck.getUTCMinutes() !== minute || calendarCheck.getUTCSeconds() !== second) return null;

  try {
    const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    let instant = targetAsUtc;
    const formatter = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const parts = Object.fromEntries(formatter.formatToParts(new Date(instant))
        .filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
      const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
      const corrected = targetAsUtc - (representedAsUtc - instant);
      if (corrected === instant) break;
      instant = corrected;
    }
    const finalParts = Object.fromEntries(formatter.formatToParts(new Date(instant))
      .filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    if (finalParts.year !== year || finalParts.month !== month || finalParts.day !== day ||
        finalParts.hour !== hour || finalParts.minute !== minute || finalParts.second !== second) return null;
    return new Date(instant).toISOString();
  } catch {
    return null;
  }
}

function parseOccurredAt(body: string, timeZone?: string): string | null {
  // Explicit offsets are authoritative. Local operator timestamps are interpreted
  // only in the timezone configured for the paired merchant handset.
  const iso = captureFirst(body, [
    /\b((?:20\d{2})-(?:0?[1-9]|1[0-2])-(?:0?[1-9]|[12]\d|3[01])[ T](?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d))\b/i,
  ]);
  if (iso) {
    const date = new Date(iso.replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (!timeZone) return null;
  const local = captureFirst(body, [
    /\b((?:0?[1-9]|[12]\d|3[01])[/. -](?:0?[1-9]|1[0-2])[/. -]20\d{2}[ T]+(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?)\b/i,
    /\b(20\d{2}-(?:0?[1-9]|1[0-2])-(?:0?[1-9]|[12]\d|3[01])[ T]+(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?)\b/i,
  ]);
  return local ? localDateTimeToIso(local, timeZone) : null;
}

export function parsePaymentSms(
  input: { senderId: string; body: string },
  config: PaymentSmsParserConfig,
): PaymentSmsParseResult {
  const senderId = normalizeSender(input.senderId).slice(0, 120);
  const body = String(input.body || "").normalize("NFKC").slice(0, 5000);
  const provider = providerForSender(senderId, config);
  const status = parseStatus(body);
  const direction = parseDirection(body);

  const transactionId = captureFirst(body, [
    /\b(?:financial\s+transaction\s+id|financial\s+transaction\s*(?:identifier|reference)|identifiant\s+de\s+la?\s+transaction(?:\s+financi[eè]re)?|transaction\s*(?:id|no\.?|number|reference|ref)|txn\s*(?:id|ref)|id\s+(?:de\s+)?transaction(?:\s+financi[eè]re)?|r[eé]f[eé]rence\s+transaction|reference\s+transaction)\s*[:#=\-]?\s*([A-Z0-9][A-Z0-9._-]{4,63})\b/i,
    /\b(?:r[eé]f[eé]rence|reference|ref)\s*(?:transaction)?\s*[:#=\-]\s*([A-Z0-9][A-Z0-9._-]{4,63})\b/i,
  ]);

  const amountText = captureFirst(body, [
    /\b(?:montant\s+transaction|montant|amount|somme|total|cr[eé]dit|credit)\s*(?:de|of|:|=)?\s*([0-9][0-9\s.,'’]{0,15})\s*(?:FCFA|XAF|CFA|F\s?CFA)\b/i,
    /\b([0-9][0-9\s.,'’]{0,15})\s*(?:FCFA|XAF|CFA|F\s?CFA)\b/i,
  ]);
  const amountXaf = parseIntegerAmount(amountText);

  // Detailed Orange receipts identify the recipient business account before its
  // business name and the payer after "par". Both are captured independently.
  const structuredMerchantPayment = /\b(?:paiement|payment)\s+de\s+((?:\+?237)?[0-9][0-9\s-]{7,18})\s+.{1,100}?\s+\bpar\s+((?:\+?237)?[0-9][0-9\s-]{7,18})\b/i.exec(body);
  const payerText = structuredMerchantPayment?.[2] || captureFirst(body, [
    /\b(?:par|payer|payeur|from|num[eé]ro\s+payeur|t[eé]l[eé]phone\s+payeur)\s*[:#=\-]?\s*((?:\+?237)?[0-9][0-9\s-]{7,18})\b/i,
    /\(((?:\+?237)?[0-9][0-9\s-]{7,18})\)/,
  ]);
  const merchantTextFromMessage = structuredMerchantPayment?.[1] || captureFirst(body, [
    /\b(?:vers|to|marchand|merchant|compte\s+marchand|num[eé]ro\s+marchand|merchant\s+account)\s*[:#=\-]?\s*((?:\+?237)?[0-9][0-9\s-]{7,18})\b/i,
  ]);
  const merchantAccountFromMessage = Boolean(merchantTextFromMessage);
  const merchantText = merchantTextFromMessage || config.merchantAccount || null;

  const fraudFlags: string[] = [];
  if (!provider) fraudFlags.push("UNTRUSTED_OR_AMBIGUOUS_SENDER");
  if (status !== "SUCCESSFUL") fraudFlags.push("MESSAGE_NOT_CONFIRMED_SUCCESS");
  if (direction !== "INBOUND") fraudFlags.push(direction === "OUTBOUND" ? "OUTGOING_PAYMENT_NOT_MERCHANT_RECEIPT" : "PAYMENT_DIRECTION_UNCONFIRMED");
  if (!transactionId) fraudFlags.push("TRANSACTION_ID_MISSING");
  if (!amountXaf) fraudFlags.push("AMOUNT_MISSING_OR_INVALID");
  const parsedMerchantAccount = normalizePhone(merchantText);
  const configuredMerchantAccount = normalizePhone(config.merchantAccount || null);
  if (!parsedMerchantAccount) fraudFlags.push("MERCHANT_ACCOUNT_MISSING_OR_INVALID");
  else if (configuredMerchantAccount && parsedMerchantAccount !== configuredMerchantAccount) {
    fraudFlags.push("SMS_MERCHANT_ACCOUNT_MISMATCH");
  }

  return {
    parserVersion: "0.2.0",
    provider,
    senderId,
    senderTrusted: provider !== null,
    status,
    direction,
    transactionId: transactionId?.toUpperCase() || null,
    amountXaf,
    currency: amountXaf === null ? null : "XAF",
    payerPhone: normalizePhone(payerText),
    merchantAccount: parsedMerchantAccount,
    merchantAccountFromMessage,
    occurredAt: parseOccurredAt(body, config.timeZone),
    fraudFlags,
  };
}
