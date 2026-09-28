export function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {"&nbsp;":" ","&amp;":"&","&quot;":"\"","&#39;":"'","&apos;":"'","&lt;":"<","&gt;":">","&ndash;":"–","&mdash;":"—"};
  return value.replace(/&(?:nbsp|amp|quot|apos|lt|gt|ndash|mdash);|&#39;/gi, token => named[token.toLowerCase()] || token).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}
function repairUtf8(value: string): string {
  if (!/[ÃÂâ][\x80-\xBF\x20-\x7E]/.test(value)) return value;
  try { const bytes = new Uint8Array([...value].map(ch => ch.charCodeAt(0))); const repaired = new TextDecoder("utf-8",{fatal:false}).decode(bytes); return repaired || value; } catch { return value; }
}
function collapseLine(value: string): string { return value.replace(/\u00a0/g," ").replace(/[ \t]+/g," ").trim(); }

export function cleanJobDescription(value: unknown, titleHint?: string | null): string {
  let raw = typeof value === "string" ? value : "";
  if (!raw && value && typeof value === "object") {
    try { raw = JSON.stringify(value); } catch { raw = ""; }
  }
  raw = raw.trim();
  if (!raw) return "";

  try {
    const parsed = JSON.parse(raw);
    const preferred = ["description","content","text","summary","details","responsibilities","requirements","profile","missions","about","jobDescription","job_description"];
    const pick = (node: any, depth = 0): string => {
      if (typeof node === "string") return node.trim();
      if (Array.isArray(node)) return node.map(x => pick(x, depth + 1)).filter(Boolean).join("\n\n");
      if (!node || typeof node !== "object" || depth > 7) return "";
      const direct = preferred.map(k => pick(node[k], depth + 1)).filter(Boolean);
      return direct.length ? direct.join("\n\n") : Object.values(node).map(x => pick(x, depth + 1)).filter(Boolean).join("\n\n");
    };
    const extracted = pick(parsed);
    if (extracted) raw = extracted;
  } catch {}

  const title = typeof titleHint === "string" ? repairUtf8(decodeHtmlEntities(titleHint)).trim() : "";
  const looksHtml = /<\/?[a-z][\s\S]*>/i.test(raw);
  if (looksHtml) {
    raw = raw
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "\n");

    const candidates: string[] = [];
    const blockRe = /<(article|main)\b[^>]*>([\s\S]*?)<\/\1>/gi;
    for (const match of raw.matchAll(blockRe)) {
      const body = match[2] || "";
      if (body.length > 250) candidates.push(body);
    }
    const semanticRe = /<([a-z0-9]+)\b[^>]*(?:id|class)=["'][^"']*(?:job|offer|description|content|posting|detail|responsibilit|mission)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
    for (const match of raw.matchAll(semanticRe)) {
      const body = match[2] || "";
      if (body.length > 180) candidates.push(body);
    }
    if (candidates.length) {
      const titleNeedle = title.toLowerCase();
      const best = candidates
        .map(x => ({ x, score: (titleNeedle && x.toLowerCase().includes(titleNeedle) ? 100000 : 0) + Math.min(x.length, 60000) }))
        .sort((a,b) => b.score - a.score)[0];
      raw = best.x;
    }

    raw = raw
      .replace(/<(nav|header|footer|aside|form|dialog)\b[^>]*>[\s\S]*?<\/\1>/gi, "\n")
      .replace(/<([a-z0-9]+)\b[^>]*(?:id|class)=["'][^"']*(?:nav|menu|sidebar|breadcrumb|cookie|advert|ads|login|register|social)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, "\n")
      .replace(/<(h[1-6])[^>]*>/gi, "\n\n")
      .replace(/<\/(h[1-6])>/gi, "\n\n")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<li[^>]*>/gi, "\n• ")
      .replace(/<\/(li)>/gi, "\n")
      .replace(/<\/(p|div|section|article|tr|blockquote)>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ");
  }

  raw = repairUtf8(decodeHtmlEntities(raw))
    .replace(/(?:window\.(?:dataLayer|a2a_config)|var\s+esadt\s*=|function\s+gtag\s*\(|adsbygoogle|document\.createElement|sspjs\.eskimi)[\s\S]*?(?=Email:|Téléphone|Whatsapp|Contact|Candidature|Postuler|Mission|Description|Profil|Compétences|Qualifications|\n\n|$)/gi, "")
    .replace(/(?:Aller au contenu principal|Toggle navigation|Main navigation|Menu Bar|Français\s+English|Poster une offre|Publier une offre d'emploi gratuitement)[\s\S]{0,700}?/gi, "")
    .replace(/(?:Se Connecter|Se connecter|Rejoindre le groupe Whatsapp de ICE|Welcome!\s*Log into your account|your username|your password|Forgot your password\??|Remember me|Log in|Login|Register|Sign up|Create an account|Welcome!)[\s\S]{0,900}?/gi, "")
    .replace(/(?:Envoyez moi des offres d'emploi|Nous continuerons de rechercher des offres.*?Adresse email)[\s\S]*$/i, "")
    .replace(/(?:Most Read|Most Popular|LES PLUS CONSULTES|CATEGORIES POPULAIRES|A PROPOS DE NOUS)[\s\S]*$/i, "")
    .replace(/\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*[^\n]{0,500}/g, "")
    .replace(/\{\{[\s\S]*?\}\}|\$\{[\s\S]*?\}/g, "")
    .replace(/\x60{3}[\w-]*|\x60{3}/g, "")
    .replace(/^\s*[>|]+\s*/gm, "");

  if (title) {
    const idx = raw.toLowerCase().indexOf(title.toLowerCase());
    if (idx >= 0 && idx < 16000) raw = raw.slice(idx);
  }

  const lines = repairUtf8(raw).split(/\r?\n/).map(collapseLine);
  const out: string[] = [];
  let blank = false;
  const seen = new Set<string>();
  for (const line of lines) {
    if (!line) {
      if (!blank && out.length) out.push("");
      blank = true;
      continue;
    }
    blank = false;
    const normalizedLine = line.toLowerCase().replace(/[^a-z0-9à-ÿ]+/gi, " ").trim();
    if (/^(?:email|b\.p\.|©|copyright|powered by)\s*:/i.test(line) && out.length > 2) continue;
    if (/^(?:français|english|search|sign in|join|accueil|home|read more|load more|share|partager)$/i.test(line)) continue;
    if (/^(?:recrutement|bourses? d études?|bourse d (?:afrique|amérique|europe|asie)|se connecter|welcome log into your account|your username|your password|forgot your password|remember me|log in|login|register|sign up|create an account)$/i.test(normalizedLine)) continue;
    if (normalizedLine.length > 24 && seen.has(normalizedLine)) continue;
    if (normalizedLine.length > 24) seen.add(normalizedLine);
    out.push(line);
  }

  let text = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (title && text && text.toLowerCase().indexOf(title.toLowerCase()) < 0) text = title + "\n\n" + text;
  return text.slice(0, 30000);
}
export function cleanJobTitle(value: unknown): string {
  let raw = typeof value === "string" ? value : "";
  raw = repairUtf8(decodeHtmlEntities(raw)).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
  try { const parsed=JSON.parse(raw); if(typeof parsed==="string") raw=parsed.trim(); else if(parsed&&typeof parsed==="object") raw=String((parsed as any).title||(parsed as any).name||raw).trim(); } catch {}
  raw=raw.replace(/^\s*[>|•\-–—]+\s*/g,"").replace(/\s*\|\s*(?:Job in Cameroun|JobInfoCamer(?:\.com)?|MinaJobs.*)$/i,"").replace(/\s*[-–—]\s*(?:JobInfoCamer(?:\.com)?|MinaJobs.*)$/i,"").replace(/^(?:offre d['’]emploi|avis de recrutement|recrutement)\s*[:：-]\s*/i,"").replace(/\s+/g," ").trim();
  if(!raw||/^(?:\{|\[|const\s|let\s|var\s|window\.|function\s)/i.test(raw)) return "Offre d'emploi";
  return raw.slice(0,240);
}

export function cleanCompanyName(value: unknown): string | null {
  if(typeof value!=="string") return null;
  let raw=repairUtf8(decodeHtmlEntities(value)).trim();
  try { const parsed=JSON.parse(raw); if(typeof parsed==="string") raw=parsed.trim(); else if(parsed&&typeof parsed==="object") raw=String((parsed as any).name||(parsed as any).companyName||(parsed as any).displayName||(parsed as any).legalName||"").trim(); } catch {}
  raw=raw.replace(/^(?:name|companyname|displayname|legalname)\s*[:=]\s*/i,"").replace(/^[\"'\s]+|[\"'\s},]+$/g,"").replace(/\s+/g," ").trim();
  if(!raw||/^(?:\{|\[|const\s|let\s|var\s|window\.)/i.test(raw)) return null;
  if(/^(?:entreprise|entreprise de la place|employeur non précisé|employeur non precise|non précisé|non precise)$/i.test(raw)) return null;
  return raw.slice(0,160);
}

export function extractCompanyNameFromDescription(description: string): string | null {
  const text=cleanJobDescription(description);
  const patterns=[/(?:nom de l[’']employeur|employeur|entreprise|company|organisation|société|societe)\s*[:：-]\s*([^\n|]{2,120})/i,/(?:chez|au sein de|auprès de)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ0-9 .&'’()/-]{2,100})/];
  for(const pattern of patterns){ const name=cleanCompanyName(text.match(pattern)?.[1]||null); if(name) return name; }
  return null;
}
