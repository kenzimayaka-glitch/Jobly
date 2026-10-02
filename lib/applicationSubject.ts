function cleanApplicationSubject(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt);/gi, match => ({
      "&nbsp;": " ", "&amp;": "&", "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">"
    }[match.toLowerCase()] || " "))
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\"'“”«»\s]+|[\"'“”«»\s]+$/g, "")
    .trim();
}

export function extractApplicationSubject(text: string, _jobTitle = ""): string {
  const pattern = /(?:objet(?: de (?:la )?candidature| du mail| de l['’]email)?|subject|email subject|mail subject|indiquer en objet|mettre en objet|avec pour objet|mentionner en objet)\s*[:：-]\s*[\"'“”«»]?([^\r\n<]{3,180})/i;
  const match = text.match(pattern);
  const subject = match?.[1] ? cleanApplicationSubject(match[1]) : "";
  return subject;
}


export function extractApplicationEmail(text: string): string | null {
  const matches = Array.from(new Set(
    (text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [])
      .map((value) => value.trim().replace(/[),.;:]+$/, ""))
  ));
  if (!matches.length) return null;

  const lower = text.toLowerCase();
  let best: { email: string; score: number } | null = null;
  for (const email of matches) {
    const index = lower.indexOf(email.toLowerCase());
    const context = lower.slice(
      Math.max(0, index - 240),
      Math.min(lower.length, index + email.length + 240),
    );
    let score = 0;
    if (/(candidature|candidater|postuler|recrutement|cv|curriculum|lettre|envoyer|envoyez|dossier|adresse de candidature|modalites de candidature|apply)/i.test(context)) score += 8;
    if (/(email|mail|e-mail)/i.test(context)) score += 1;
    if (/^(aide|info|support|hello|admin|contact)@/i.test(email)) score -= 3;
    if (score > 0 && (!best || score > best.score)) best = { email, score };
  }
  return best?.email || null;
}
