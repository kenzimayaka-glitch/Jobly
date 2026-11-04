export type ApplicationContact = { email: string | null; phone: string | null };

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const INTERNATIONAL_PHONE_RE = /(?:\+\s?\d{1,3}|00\s?\d{1,3})[\s()./-]*(?:\d[\s()./-]*){6,12}/g;
const LABELLED_PHONE_RE = /(?:tel(?:ephone)?|t[eé]l(?:éphone)?|phone|mobile|whats?app|call|contact(?:\s+number)?)[^\r\n\d+]{0,28}?((?:\+|00)?\s*\d[\d\s()./-]{5,18}\d)/gi;

function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4}$/.test(trimmed)) return null;
  const international = /^\s*(?:\+|00)/.test(trimmed);
  let digits = trimmed.replace(/\D/g, "");
  if (international && digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length < 7 || digits.length > 15 || new Set(digits).size === 1) return null;
  return international ? `+${digits}` : digits;
}

export function extractApplicationContact(
  text: unknown,
  preferredEmail?: unknown,
  preferredPhone?: unknown,
): ApplicationContact {
  const content = [String(preferredEmail ?? ""), String(text ?? "")].join("\n");
  const email = content.match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;

  const phoneText = [
    preferredPhone ? `Telephone: ${String(preferredPhone)}` : "",
    String(text ?? ""),
  ].join("\n");
  const internationalCandidates = phoneText.match(INTERNATIONAL_PHONE_RE) ?? [];
  const labelledCandidates: string[] = [];
  for (const match of phoneText.matchAll(LABELLED_PHONE_RE)) {
    if (match[1]) labelledCandidates.push(match[1]);
  }
  const phone = [...internationalCandidates, ...labelledCandidates]
    .map(normalizePhone)
    .find((candidate): candidate is string => Boolean(candidate)) ?? null;

  return { email, phone };
}

export function resolveSourceDisplayModel(
  sourceKey: string,
  sourceType: string,
  captureMode: string,
  renderRequired = false,
): string {
  const key = sourceKey.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const family = renderRequired ? "rendered" : captureMode === "rss" ? "rss"
    : captureMode === "api" ? "structured" : sourceType === "institutional" ? "institutional"
    : sourceType === "aggregator" ? "aggregator" : sourceType === "specialized" ? "specialized"
    : sourceType === "pan_africa" ? "pan-africa" : "national";
  return `jobly-${family}-${key}-v1`;
}
