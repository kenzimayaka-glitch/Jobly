import "react";

function normalizeUnicodeText(value: string): string {
  // Keep French accents as a single Unicode code point where possible.
  // This prevents a decomposed accent (e + combining acute) from being
  // rendered as a missing/blank glyph on some Android/browser font stacks.
  return value.normalize("NFC");
}

export function cleanLine(value: string) {
  return normalizeUnicodeText(value)
    .replace(/^[|>»›•▪◦*✓✔☑\-–—]+\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\s*\|\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
