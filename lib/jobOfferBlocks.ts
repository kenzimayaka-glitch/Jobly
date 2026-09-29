export type OfferBlock = {
  text: string;
  heading: string | null;
  kind: "heading" | "paragraph" | "list" | "table" | "metadata";
  order: number;
};

export type OfferBlockDiagnostics = {
  source: "rendered-html" | "fallback-text";
  candidateScore: number;
  textLength: number;
  blockCount: number;
  removedChrome: number;
  linkDensity: number;
  estimatedRisks: {
    blockLoss: number;
    chromeContamination: number;
    semanticCollision: number;
    applicationLoss: number;
  };
  warnings: string[];
};

export type OfferBlockExtraction = {
  text: string;
  blocks: OfferBlock[];
  diagnostics: OfferBlockDiagnostics;
};

const BOILERPLATE = [
  /aller au contenu principal/i,
  /toggle navigation/i,
  /main navigation/i,
  /poster une offre/i,
  /cookie(?: settings| policy| consent)?/i,
  /newsletter/i,
  /articles similaires/i,
  /popular posts?/i,
  /copyright/i,
  /window\.(?:dataLayer|gtag)/i,
];

const NEGATIVE_CONTAINER = /(?:^|[-_ ])(?:nav|menu|header|footer|sidebar|aside|cookie|consent|modal|popup|advert|ads?|social|share|related|newsletter|breadcrumb)(?:$|[-_ ])/i;
const POSITIVE_CONTAINER = /(?:article|post-content|entry-content|article-content|article-body|post-body|single-post|content-area|main-content|job-description|job-detail|offer-content|offer-detail|job-content|vacancy|career)/i;

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&ndash;|&#8211;/gi, "–")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&bull;|&#8226;/gi, "•");
}

function normalize(value: string): string {
  return decodeEntities(value)
    .replace(/\u00a0|\u202f/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function signature(value: string): string {
  return normalize(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function stripExcluded(html: string): { html: string; removed: number } {
  let removed = 0;
  const excluded = /<(script|style|noscript|template|svg|canvas|nav|header|footer|aside|form|dialog)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
  const cleaned = html.replace(excluded, () => {
    removed++;
    return "\n";
  });
  return { html: cleaned, removed };
}

function attr(tag: string, name: string): string {
  const match = tag.match(new RegExp("\\b" + name + "\\s*=\\s*[\\\"']([^\\\"']*)[\\\"']", "i"));
  return match?.[1] || "";
}
function visibleText(fragment: string): string {
  return normalize(
    fragment
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/\s*(?:p|div|section|article|li|h[1-6]|tr|td|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s*\n\s*/g, "\n"),
  );
}

function linkDensity(fragment: string): number {
  const total = visibleText(fragment).length;
  if (!total) return 1;
  const linked = Array.from(fragment.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi))
    .map(match => visibleText(match[1] || "").length)
    .reduce((sum, length) => sum + length, 0);
  return Math.min(1, linked / total);
}

type Candidate = { html: string; score: number; density: number };

function candidatesFromHtml(html: string): Candidate[] {
  const candidates: Candidate[] = [{ html, score: 0, density: linkDensity(html) }];
  const pattern = /<(main|article|section|div)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
  for (const match of html.matchAll(pattern)) {
    const open = match[0].slice(0, match[0].indexOf(">") + 1);
    const body = match[3] || "";
    const text = visibleText(body);
    if (text.length < 120) continue;
    const classes = `${attr(open, "class")} ${attr(open, "id")}`;
    const density = linkDensity(body);
    const headings = (body.match(/<h[1-6]\b/gi) || []).length;
    const paragraphs = (body.match(/<(?:p|li|blockquote|tr)\b/gi) || []).length;
    const positive = POSITIVE_CONTAINER.test(classes) ? 24 : 0;
    const negative = NEGATIVE_CONTAINER.test(classes) ? 42 : 0;
    const chrome = BOILERPLATE.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
    const score =
      Math.min(55, text.length / 90) +
      Math.min(20, headings * 4) +
      Math.min(20, paragraphs * 1.5) +
      positive -
      negative -
      density * 35 -
      chrome * 14;
    candidates.push({ html: body, score, density });
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, 8);
}

function extractBlocks(html: string): OfferBlock[] {
  const blocks: OfferBlock[] = [];
  let currentHeading: string | null = null;
  const blockPattern = /<(h[1-6]|p|li|blockquote|tr|dt|dd)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;
  for (const match of html.matchAll(blockPattern)) {
    const tag = String(match[1] || "").toLowerCase();
    const text = visibleText(match[2] || "");
    if (text.length < 2) continue;
    if (BOILERPLATE.some(re => re.test(text))) continue;
    if (/^h[1-6]$/.test(tag)) {
      currentHeading = text;
      blocks.push({ text, heading: null, kind: "heading", order: blocks.length });
      continue;
    }
    const kind = tag === "li" || tag === "tr" ? "list" : "paragraph";
    blocks.push({ text, heading: currentHeading, kind, order: blocks.length });
  }

  if (blocks.length === 0) {
    const text = visibleText(html);
    return text.split(/\n+/).map(value => normalize(value)).filter(Boolean).map((text, order) => ({
      text,
      heading: null,
      kind: "paragraph" as const,
      order,
    }));
  }

  const seen = new Set<string>();
  return blocks.filter(block => {
    const key = signature(block.text);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function risk(value: number): number {
  return Number(Math.max(0, Math.min(1, value)).toFixed(3));
}

export function extractOfferBlocks(renderedHtml: string, fallbackText = "", title = ""): OfferBlockExtraction {
  const sourceHtml = String(renderedHtml || "").trim();
  if (!sourceHtml) {
    const fallback = normalize(fallbackText);
    const blocks = fallback ? fallback.split(/\n+/).map((text, order) => ({
      text: normalize(text),
      heading: null,
      kind: "paragraph" as const,
      order,
    })).filter(block => block.text.length >= 2) : [];
    return {
      text: blocks.map(block => block.text).join("\n"),
      blocks,
      diagnostics: {
        source: "fallback-text",
        candidateScore: 0,
        textLength: fallback.length,
        blockCount: blocks.length,
        removedChrome: 0,
        linkDensity: 0,
        estimatedRisks: {
          blockLoss: risk(fallback ? 0.38 : 1),
          chromeContamination: risk(fallback ? 0.28 : 0),
          semanticCollision: risk(fallback ? 0.32 : 0),
          applicationLoss: risk(fallback ? 0.34 : 1),
        },
        warnings: fallback ? ["rendered_html_missing"] : ["rendered_html_missing", "content_missing"],
      },
    };
  }

  const stripped = stripExcluded(sourceHtml);
  const candidates = candidatesFromHtml(stripped.html);
  const winner = candidates[0] || { html: stripped.html, score: 0, density: linkDensity(stripped.html) };
  const blocks = extractBlocks(winner.html);
  const titleKey = signature(title);
  const filteredBlocks = blocks.filter(block => !titleKey || signature(block.text) !== titleKey);
  const text = filteredBlocks.map(block => block.text).join("\n");
  const boilerplateHits = BOILERPLATE.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
  const shortBlocks = filteredBlocks.filter(block => block.text.length < 35).length;
  const headingCount = filteredBlocks.filter(block => block.kind === "heading").length;

  const warnings: string[] = [];
  if (winner.score < 35) warnings.push("weak_main_candidate");
  if (winner.density > 0.45) warnings.push("high_link_density");
  if (boilerplateHits > 0) warnings.push("residual_chrome");
  if (headingCount === 0) warnings.push("heading_structure_missing");
  if (shortBlocks > Math.max(4, filteredBlocks.length * 0.55)) warnings.push("fragmented_content");

  return {
    text,
    blocks: filteredBlocks,
    diagnostics: {
      source: "rendered-html",
      candidateScore: Number(winner.score.toFixed(2)),
      textLength: text.length,
      blockCount: filteredBlocks.length,
      removedChrome: stripped.removed,
      linkDensity: Number(winner.density.toFixed(3)),
      estimatedRisks: {
        blockLoss: risk(
          (winner.score < 25 ? 0.42 : winner.score < 45 ? 0.22 : 0.08) +
          (filteredBlocks.length < 5 ? 0.22 : 0) +
          (winner.density > 0.45 ? 0.12 : 0),
        ),
        chromeContamination: risk(
          (winner.density > 0.45 ? 0.30 : 0) +
          boilerplateHits * 0.16 +
          (winner.score < 25 ? 0.18 : 0),
        ),
        semanticCollision: risk(
          (headingCount === 0 ? 0.16 : 0) +
          (shortBlocks > Math.max(4, filteredBlocks.length * 0.55) ? 0.18 : 0),
        ),
        applicationLoss: risk(
          (filteredBlocks.some(block => /(?:candidature|comment postuler|modalit[ée]s|envoyer|envoyez|objet du mail|recrutement)/i.test(block.text)) ? 0 : 0.32) +
          (headingCount === 0 ? 0.12 : 0),
        ),
      },
      warnings,
    },
  };
}
