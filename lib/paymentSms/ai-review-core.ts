import type { PaymentSmsParseResult } from "./parser";

export type PaymentSmsAiMessageKind =
  | "MERCHANT_CREDIT" | "CUSTOMER_DEBIT" | "CUSTOMER_CREDIT"
  | "REVERSAL" | "FAILED" | "PENDING" | "PROMOTIONAL" | "UNKNOWN";

export type PaymentSmsAiReview = {
  version: "1.0.0";
  provider: string;
  model: string;
  messageKind: PaymentSmsAiMessageKind;
  status: "SUCCESSFUL" | "FAILED" | "PENDING" | "UNKNOWN";
  direction: "INBOUND" | "OUTBOUND" | "UNKNOWN";
  confidence: number;
  suspiciousSignals: string[];
  accepted: boolean;
  flags: string[];
};

/** Redacts payment identifiers and obvious party-name spans before AI analysis. */
export function redactPaymentSmsForAi(body: string): string {
  let text = String(body || "").normalize("NFKC").slice(0, 5000);

  text = text.replace(
    /\b((?:paiement|payment)\s+de)\s+(.{1,180}?)\s+\b(par)\s+(.{1,140}?)\s+\b(r[eé]ussi|success(?:ful)?)\b/gi,
    "$1 <DETAILS_MARCHAND> $3 <DETAILS_PAYEUR> $5",
  );
  // Short Orange wording puts "reussi" before the payer marker.
  text = text.replace(
    /\b((?:paiement|payment)\s+de)\s+(.{1,180}?)\s+\b(r[eé]ussi|success(?:ful)?)\s+\b(par|by)\s+(.{1,140}?)(?=(?:[.,;]|\bID\s+transaction\b|\btransaction\b|\bmontant\b|$))/gi,
    "$1 <DETAILS_MARCHAND> $3 $4 <DETAILS_PAYEUR>",
  );
  text = text.replace(
    /(\b(?:vous avez re[cç]u|you have received)\b\s+.{0,45}?\bde)\s+(.{1,140}?)\s+(\b(?:sur votre compte|to your account)\b)/gi,
    "$1 <DETAILS_PAYEUR> $3",
  );
  text = text.replace(
    /\b\d[\d\s.,'’]{0,14}\s*(FCFA|XAF|CFA|F\s?CFA)\b/gi,
    "<MONTANT> $1",
  );
  text = text.replace(
    /(\b(?:identifiant\s+(?:de\s+)?(?:la\s+)?transaction(?:\s+financi[eè]re)?|financial\s+transaction\s*(?:id|identifier|reference)|transaction\s*(?:id|no\.?|number|reference|ref)|id\s+transaction|txn\s*(?:id|ref)|r[eé]f[eé]rence\s+transaction)\s*[:#=\-]?\s*)[A-Z0-9][A-Z0-9._-]{4,63}/gi,
    "$1<REFERENCE>",
  );
  text = text.replace(/\+?237[\s-]?(?:[0-9][\s-]?){8,11}|\b[6-9][0-9]{8}\b/g, "<NUMERO>");
  text = text.replace(/\b[0-9]{10,15}\b/g, "<IDENTIFIANT_NUMERIQUE>");
  text = text.replace(/(message\s+de\s+l['’]exp[eé]diteur\s*:\s*)[^.\n]{1,120}/gi, "$1<DETAILS_EXPEDITEUR>");
  return text.slice(0, 5000);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

const MESSAGE_KINDS = new Set<PaymentSmsAiMessageKind>([
  "MERCHANT_CREDIT", "CUSTOMER_DEBIT", "CUSTOMER_CREDIT", "REVERSAL",
  "FAILED", "PENDING", "PROMOTIONAL", "UNKNOWN",
]);
const STATUSES = new Set(["SUCCESSFUL", "FAILED", "PENDING", "UNKNOWN"]);
const DIRECTIONS = new Set(["INBOUND", "OUTBOUND", "UNKNOWN"]);

export function evaluatePaymentSmsAiReview(input: {
  output: unknown;
  provider: string;
  model: string;
  parsed: PaymentSmsParseResult;
}): PaymentSmsAiReview {
  const value = asRecord(input.output);
  const rawKind = String(value?.messageKind || "UNKNOWN").toUpperCase() as PaymentSmsAiMessageKind;
  const rawStatus = String(value?.status || "UNKNOWN").toUpperCase();
  const rawDirection = String(value?.direction || "UNKNOWN").toUpperCase();
  const rawConfidence = Number(value?.confidence);
  const confidence = Number.isFinite(rawConfidence) ? Math.max(0, Math.min(1, rawConfidence)) : 0;
  const suspiciousSignals = Array.isArray(value?.suspiciousSignals)
    ? value.suspiciousSignals.filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_").slice(0, 64))
        .filter(Boolean).slice(0, 8)
    : [];

  const flags: string[] = [];
  if (!MESSAGE_KINDS.has(rawKind)) flags.push("AI_INVALID_MESSAGE_KIND");
  if (!STATUSES.has(rawStatus)) flags.push("AI_INVALID_STATUS");
  if (!DIRECTIONS.has(rawDirection)) flags.push("AI_INVALID_DIRECTION");
  if (rawKind !== "MERCHANT_CREDIT") flags.push("AI_NOT_MERCHANT_CREDIT");
  if (rawStatus !== input.parsed.status) flags.push("AI_STATUS_CONFLICT");
  if (rawDirection !== input.parsed.direction) flags.push("AI_DIRECTION_CONFLICT");
  if (confidence < 0.8) flags.push("AI_LOW_CONFIDENCE");
  if (suspiciousSignals.length) flags.push("AI_SUSPICIOUS_SIGNALS");

  return {
    version: "1.0.0",
    provider: input.provider,
    model: input.model,
    messageKind: MESSAGE_KINDS.has(rawKind) ? rawKind : "UNKNOWN",
    status: STATUSES.has(rawStatus) ? rawStatus as PaymentSmsAiReview["status"] : "UNKNOWN",
    direction: DIRECTIONS.has(rawDirection) ? rawDirection as PaymentSmsAiReview["direction"] : "UNKNOWN",
    confidence,
    suspiciousSignals,
    accepted: flags.length === 0 && input.parsed.senderTrusted &&
      input.parsed.status === "SUCCESSFUL" && input.parsed.direction === "INBOUND",
    flags,
  };
}

