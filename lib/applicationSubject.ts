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
