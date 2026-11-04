export type ApplicationContact = { email: string | null; phone: string | null };

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const APPLICATION_MARKER = /(?:method of application|how to apply|application instructions|interested and qualified|interested applicants|to apply|apply for this job|application for|applications must be addressed|direct your applications to|direct your application to|applications to|send (?:your )?(?:cv|resume|application)|envoyer (?:leur|votre|son) (?:cv|candidature)|pour postuler|modalit[eé]s de candidature|comment postuler|coordonn[ée]es du recruteur|contact du recruteur|d[ée]p[oô]t de dossiers (?:par voie num[ée]rique )?(?:[àa] l['’]adresse)?|candidature)/gi;
const STOP_MARKER = /(?:related jobs|similar jobs|share this|about us|privacy policy|terms (?:and|&) conditions|copyright|frequently asked questions|about the company|company details|contact details|employer information)/i;
const LABELLED_PHONE_RE = /(?:tel(?:ephone)?|t[eé]l(?:éphone)?|phone(?:\s+number)?|mobile|whats?app|call|contact(?:\s+number)?)[^\r\n\d+]{0,32}?((?:\+|00)?\s*\d[\d\s()./-]{5,20}\d)/gi;

function decodeCloudflareHex(encoded: string): string | null {
  if (!/^[0-9a-f]+$/i.test(encoded) || encoded.length < 4 || encoded.length % 2 !== 0) return null;
  const key = Number.parseInt(encoded.slice(0, 2), 16);
  let decoded = "";
  for (let i = 2; i < encoded.length; i += 2) decoded += String.fromCharCode(Number.parseInt(encoded.slice(i, i + 2), 16) ^ key);
  return EMAIL_RE.test(decoded) ? decoded : null;
}

function expandCloudflareEmails(value: string): string {
  return value.replace(/<[^>]*data-cfemail=["']([0-9a-f]+)["'][^>]*>([\s\S]*?)<\/[^>]+>/gi,
    (_all, encoded: string, label: string) => `${label} ${decodeCloudflareHex(encoded) ?? ""}`);
}

function plainText(value: string): string {
  return value
    .replace(/<a\b[^>]*href=["']mailto:([^"'?]+)[^>]*>([\s\S]*?)<\/a>/gi,
      (_all, address: string, label: string) => label + " " + address)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|section|article|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ").trim();
}

function applicationSection(value: string): string {
  const matches = [...value.matchAll(APPLICATION_MARKER)];
  if (!matches.length) return "";
  const segments: string[] = [];
  for (const match of matches) {
    if (match.index === undefined) continue;
    const tail = value.slice(match.index, match.index + 1800);
    const stop = STOP_MARKER.exec(tail.slice(match[0].length));
    segments.push(stop?.index !== undefined ? tail.slice(0, match[0].length + stop.index) : tail);
  }
  return segments.join(" ");
}

function normalizePhone(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{1,2}[/. -]\d{1,2}[/. -]\d{2,4}$/.test(trimmed)) return null;
  const international = /^\s*(?:\+|00)/.test(trimmed);
  let digits = trimmed.replace(/\D/g, "");
  if (international && digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length < (international ? 8 : 7) || digits.length > 15 || (international && /^0/.test(digits)) || new Set(digits).size === 1) return null;
  return international ? `+${digits}` : digits;
}

export function extractApplicationContact(text: unknown, preferredEmail?: unknown, preferredPhone?: unknown): ApplicationContact {
  const plain = plainText(expandCloudflareEmails(String(text ?? "")));
  const section = applicationSection(plain);
  const explicitEmail = String(preferredEmail ?? "").match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;
  const email = explicitEmail ?? section.match(EMAIL_RE)?.[0]?.toLowerCase() ?? null;
  const explicitPhone = preferredPhone ? normalizePhone(String(preferredPhone)) : null;
  const labelledPhones: string[] = [];
  for (const match of section.matchAll(LABELLED_PHONE_RE)) if (match[1]) labelledPhones.push(match[1]);
  const phone = explicitPhone ?? labelledPhones.map(normalizePhone).find((candidate): candidate is string => Boolean(candidate)) ?? null;
  return { email, phone };
}

export function resolveSourceDisplayModel(sourceKey: string, sourceType: string, captureMode: string, renderRequired = false): string {
  const key = sourceKey.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const family = renderRequired ? "rendered" : captureMode === "rss" ? "rss"
    : captureMode === "api" ? "structured" : sourceType === "institutional" ? "institutional"
    : sourceType === "aggregator" ? "aggregator" : sourceType === "specialized" ? "specialized"
    : sourceType === "pan_africa" ? "pan-africa" : "national";
  return `jobly-${family}-${key}-v1`;
}
