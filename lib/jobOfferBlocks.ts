export type OfferBlock = {
  id: string;
  text: string;
  heading: string | null;
  level: number;
  order: number;
  tag: string;
  context: string[];
};

const SKIP_TAGS = new Set(["script","style","noscript","svg","template","nav","header","footer","aside","form","dialog"]);
const BLOCK_TAGS = new Set(["p","li","h1","h2","h3","h4","h5","h6","blockquote","pre","dt","dd","td","th","figcaption"]);
const CONTAINER_HINT = /(?:article|post|entry|content|job|offer|vacancy|description|main|single|body)/i;
const NOISE_HINT = /(?:nav|menu|header|footer|sidebar|widget|newsletter|cookie|breadcrumb|social|share|advert|ads|comment|related)/i;

function decode(value: string): string {
  return value.replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&").replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&ndash;|&#8211;/gi, "–").replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&bull;|&#8226;/gi, "•").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function clean(value: string): string {
  return decode(value).replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\u00A0\u202F]/g, " ").replace(/\s+/g, " ").trim();
}

function attr(attrs: string, name: string): string {
  const m = attrs.match(new RegExp("(?:^|\\s)" + name + "\\s*=\\s*([\"'])([\\s\\S]*?)\\1", "i"));
  return m?.[2] || "";
}

function hidden(attrs: string): boolean {
  const value = attr(attrs,"class") + " " + attr(attrs,"id") + " " + attr(attrs,"style");
  return /(?:^|\s)(?:hidden|d-none|display-none|sr-only)(?:\s|$)/i.test(value) ||
    /display\s*:\s*none|visibility\s*:\s*hidden/i.test(value) ||
    attr(attrs,"aria-hidden").toLowerCase() === "true";
}

function normalizeHeading(text: string, tag: string): string | null {
  const value = clean(text);
  if (!value || value.length > 140) return null;
  if (!/^h[1-6]$/i.test(tag) && !/^(?:missions?|responsabilit(?:é|e)s?|profil|exigences?|qualifications?|formation|exp(?:é|e)rience|comp(?:é|e)tences?|aptitudes?|savoir[- ]faire|qualit(?:é|e)s?|avantages?|candidature|comment postuler|modalit(?:é|e)s? de candidature|pour postuler|documents? (?:à|a) (?:fournir|joindre)|pi(?:è|e)ces? (?:à|a) (?:fournir|joindre)|objet(?: du mail| de candidature)?|date limite|localisation|lieu|ville|type de contrat|contrat|salaire)$/i.test(value)) return null;
  return value.replace(/[:：]\s*$/, "").trim();
}

function parseTokens(html: string): OfferBlock[] {
  const tokens = html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) || [];
  const stack: Array<{tag:string; attrs:string; skip:boolean; text:string; level:number; childBlock:boolean; context:string[]}> = [];
  const blocks: OfferBlock[] = [];
  let skipDepth = 0;

  const emit = (frame: typeof stack[number]) => {
    const text = clean(frame.text);
    if (!text || text.length < 2 || frame.skip) return;
    if (!BLOCK_TAGS.has(frame.tag) && frame.childBlock) return;
    if (!BLOCK_TAGS.has(frame.tag) && text.length < 30) return;
    const context = frame.context;
    blocks.push({id:"pending",text,heading:normalizeHeading(text,frame.tag),level:frame.level,order:blocks.length,tag:frame.tag,context});
  };

  for (const token of tokens) {
    if (token.startsWith("<!--")) continue;
    if (token.startsWith("<")) {
      const close = /^<\s*\/\s*([a-z0-9-]+)/i.exec(token);
      if (close) {
        const tag = close[1].toLowerCase();
        const reverseIndex = [...stack].reverse().findIndex(x => x.tag === tag);
        if (reverseIndex >= 0) {
          const index = stack.length - 1 - reverseIndex;
          while (stack.length > index) {
            const frame = stack.pop()!;
            emit(frame);
            if (stack.length && BLOCK_TAGS.has(frame.tag)) stack.at(-1)!.childBlock = true;
            if (frame.skip) skipDepth = Math.max(0, skipDepth - 1);
          }
        }
        continue;
      }
      const open = /^<\s*([a-z0-9-]+)([^>]*)>/i.exec(token);
      if (!open) continue;
      const tag = open[1].toLowerCase();
      const attrs = open[2] || "";
      const isSkip = SKIP_TAGS.has(tag) || hidden(attrs) || NOISE_HINT.test(attr(attrs,"class") + " " + attr(attrs,"id"));
      stack.push({tag,attrs,skip:isSkip,text:"",level:/^h[1-6]$/i.test(tag) ? Number(tag[1]) : stack.length,childBlock:false,context:stack.map(x => clean(attr(x.attrs,"id") + " " + attr(x.attrs,"class"))).filter(Boolean).slice(-3)});
      if (isSkip) skipDepth++;
      if (/\/\s*>$/.test(token)) {
        const frame = stack.pop()!;
        emit(frame);
        if (stack.length && BLOCK_TAGS.has(frame.tag)) stack.at(-1)!.childBlock = true;
        if (frame.skip) skipDepth = Math.max(0, skipDepth - 1);
      }
      continue;
    }
    if (skipDepth === 0 && stack.length) stack.at(-1)!.text += token;
  }
  while (stack.length) { const frame = stack.pop()!; emit(frame); if (stack.length && BLOCK_TAGS.has(frame.tag)) stack.at(-1)!.childBlock = true; }

  const result: OfferBlock[] = [];
  const seen = new Set<string>();
  for (const block of blocks) {
    const signature = clean(block.text).toLowerCase();
    if (seen.has(signature)) continue;
    seen.add(signature);
    result.push({...block,id:"b"+(result.length+1),order:result.length});
  }
  return result;
}

export function extractVisibleOfferBlocks(html: string): OfferBlock[] {
  const all = parseTokens(html);
  const meaningful = all.filter(block => {
    const context = block.context.join(" ");
    return !NOISE_HINT.test(context) && (block.text.length >= 3 || Boolean(block.heading));
  });
  const preferred = meaningful.filter(block => CONTAINER_HINT.test(block.context.join(" ")));
  return (preferred.length >= 2 ? preferred : meaningful).slice(0,400);
}

export function blocksToStructuredText(blocks: OfferBlock[]): string {
  const lines: string[] = [];
  let previousHeading = "";
  for (const block of blocks) {
    if (block.heading && block.heading.toLowerCase() !== previousHeading.toLowerCase()) {
      lines.push(block.heading);
      previousHeading = block.heading;
    }
    lines.push(block.text);
  }
  return lines.join("\n");
}
