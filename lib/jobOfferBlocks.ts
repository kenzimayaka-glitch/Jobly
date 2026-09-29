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

type HtmlNode = {
  tag: string;
  attrs: Record<string, string>;
  children: HtmlNode[];
  text: string;
  parent: HtmlNode | null;
};

const BOILERPLATE = [
  /aller au contenu principal/i,
  /toggle navigation/i,
  /main navigation/i,
  /poster une offre/i,
  /cookie(?: settings| policy| consent)?/i,
  /articles similaires/i,
  /popular posts?/i,
  /newsletter/i,
  /copyright/i,
  /window\.(?:dataLayer|gtag)/i,
  /gtag\s*\(/i,
  /fbq\s*\(/i,
];

const EXCLUDED = new Set(["script","style","noscript","template","svg","canvas","nav","header","footer","aside","form","dialog"]);
const BLOCK_TAGS = new Set(["h1","h2","h3","h4","h5","h6","p","li","blockquote","tr","dt","dd"]);

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

function parseAttributes(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of raw.matchAll(re)) attrs[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4] ?? "");
  return attrs;
}

function parseHtml(html: string): HtmlNode {
  const root: HtmlNode = { tag: "root", attrs: {}, children: [], text: "", parent: null };
  const stack: HtmlNode[] = [root];
  const tokenRe = /<!--[\s\S]*?-->|<[^>]+>|[^<]+/g;

  for (const token of html.matchAll(tokenRe)) {
    const value = token[0];
    if (value.startsWith("<!--")) continue;

    if (value.startsWith("<")) {
      const close = value.match(/^<\s*\/\s*([a-z0-9:-]+)/i);
      if (close) {
        const target = close[1].toLowerCase();
        for (let i = stack.length - 1; i > 0; i--) {
          if (stack[i].tag === target) {
            stack.length = i;
            break;
          }
        }
        continue;
      }

      const open = value.match(/^<\s*([a-z0-9:-]+)([^>]*)>/i);
      if (!open) continue;
      const tag = open[1].toLowerCase();
      if (tag === "doctype" || tag.startsWith("!")) continue;

      const node: HtmlNode = { tag, attrs: parseAttributes(open[2] || ""), children: [], text: "", parent: stack[stack.length - 1] };
      stack[stack.length - 1].children.push(node);
      if (!EXCLUDED.has(tag) && !/\/\s*>$/.test(value) && !["br","hr","img","input","meta","link","source","area","base","embed","param","track","wbr"].includes(tag)) {
        stack.push(node);
      }
      continue;
    }

    const current = stack[stack.length - 1];
    if (!EXCLUDED.has(current.tag)) current.text += value;
  }
  return root;
}

function textOf(node: HtmlNode): string {
  if (EXCLUDED.has(node.tag)) return "";
  const children = node.children.map(textOf).filter(Boolean);
  return normalize([node.text, ...children].join(" "));
}

function allNodes(root: HtmlNode): HtmlNode[] {
  const result: HtmlNode[] = [];
  const visit = (node: HtmlNode) => {
    if (node.tag !== "root") result.push(node);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return result;
}

function classKey(node: HtmlNode): string {
  return [node.attrs.class, node.attrs.id, node.attrs.role, node.attrs.itemprop].filter(Boolean).join(" ");
}

function linkDensity(node: HtmlNode): number {
  const total = textOf(node).length;
  if (!total) return 1;
  const linked = allNodes(node).filter(child => child.tag === "a").reduce((sum, child) => sum + textOf(child).length, 0);
  return Math.min(1, linked / total);
}

function scoreCandidate(node: HtmlNode): number {
  const text = textOf(node);
  if (text.length < 120) return -Infinity;
  const key = classKey(node);
  const headings = allNodes(node).filter(child => /^h[1-6]$/.test(child.tag)).length;
  const blocks = allNodes(node).filter(child => ["p","li","blockquote","tr"].includes(child.tag)).length;
  const chromeHits = BOILERPLATE.reduce((n, pattern) => n + (pattern.test(text) ? 1 : 0), 0);
  const positive = /(article|entry-content|post-content|article-content|article-body|post-body|single-post|content-area|main-content|job-description|job-detail|offer-content|offer-detail|job-content|vacancy|career)/i.test(key) ? 30 : 0;
  const negative = /(nav|menu|header|footer|sidebar|aside|cookie|consent|modal|popup|advert|ads|social|share|related|newsletter|breadcrumb|widget)/i.test(key) ? 60 : 0;
  return Math.min(60, text.length / 80) +
    Math.min(18, headings * 3) +
    Math.min(20, blocks * 1.25) +
    positive -
    negative -
    linkDensity(node) * 45 -
    chromeHits * 16;
}

function bestContentNode(root: HtmlNode): { node: HtmlNode; score: number } {
  const candidates = allNodes(root).filter(node => ["main","article","section","div","body"].includes(node.tag));
  const ranked = candidates.map(node => ({ node, score: scoreCandidate(node) })).sort((a,b) => b.score - a.score);
  return ranked[0] || { node: root, score: 0 };
}

function collectBlocks(node: HtmlNode): OfferBlock[] {
  const blocks: OfferBlock[] = [];
  let currentHeading: string | null = null;

  const visit = (current: HtmlNode) => {
    if (EXCLUDED.has(current.tag)) return;
    if (BLOCK_TAGS.has(current.tag)) {
      const value = textOf(current);
      if (value.length >= 2 && !BOILERPLATE.some(pattern => pattern.test(value))) {
        if (/^h[1-6]$/.test(current.tag)) {
          currentHeading = value;
          blocks.push({ text: value, heading: null, kind: "heading", order: blocks.length });
        } else {
          blocks.push({
            text: value,
            heading: currentHeading,
            kind: current.tag === "li" || current.tag === "tr" ? "list" : "paragraph",
            order: blocks.length,
          });
        }
      }
      return;
    }
    for (const child of current.children) visit(child);
  };

  visit(node);

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
    const blocks = fallback
      ? fallback.split(/\n+/).map((value, order) => ({ text: normalize(value), heading: null, kind: "paragraph" as const, order })).filter(block => block.text.length >= 2)
      : [];
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
          blockLoss: risk(fallback ? 0.45 : 1),
          chromeContamination: risk(fallback ? 0.35 : 0),
          semanticCollision: risk(fallback ? 0.35 : 0),
          applicationLoss: risk(fallback ? 0.4 : 1),
        },
        warnings: fallback ? ["rendered_html_missing"] : ["rendered_html_missing","content_missing"],
      },
    };
  }

  const root = parseHtml(sourceHtml);
  const { node: winner, score } = bestContentNode(root);
  const titleKey = signature(title);
  const all = collectBlocks(winner).filter(block => !titleKey || signature(block.text) !== titleKey);
  const text = all.map(block => block.text).join("\n");
  const chromeHits = BOILERPLATE.reduce((n, pattern) => n + (pattern.test(text) ? 1 : 0), 0);
  const headingCount = all.filter(block => block.kind === "heading").length;
  const linkRisk = linkDensity(winner);

  const warnings: string[] = [];
  if (score < 35) warnings.push("weak_main_candidate");
  if (linkRisk > 0.45) warnings.push("high_link_density");
  if (chromeHits) warnings.push("residual_chrome");
  if (!headingCount) warnings.push("heading_structure_missing");
  if (!all.length) warnings.push("no_blocks");

  return {
    text,
    blocks: all,
    diagnostics: {
      source: "rendered-html",
      candidateScore: Number(score.toFixed(2)),
      textLength: text.length,
      blockCount: all.length,
      removedChrome: allNodes(root).filter(node => EXCLUDED.has(node.tag)).length,
      linkDensity: Number(linkRisk.toFixed(3)),
      estimatedRisks: {
        blockLoss: risk(score < 25 ? 0.45 : score < 40 ? 0.25 : score < 60 ? 0.12 : 0.05),
        chromeContamination: risk((linkRisk > 0.45 ? 0.25 : 0) + chromeHits * 0.12 + (score < 25 ? 0.2 : 0)),
        semanticCollision: risk((headingCount ? 0.04 : 0.18) + (all.length < 5 ? 0.2 : 0)),
        applicationLoss: risk(all.some(block => /(?:candidature|comment postuler|modalit[ée]s|pour postuler|envoyer|envoyez|objet du mail|recrutement)/i.test(block.text)) ? 0.04 : 0.32),
      },
      warnings,
    },
  };
}
