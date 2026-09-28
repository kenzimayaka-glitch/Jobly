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


export type JobDetailSections = {
  description: string[];
  missions: string[];
  formation: string[];
  experience: string[];
  skills: string[];
  qualities: string[];
  benefits: string[];
  application: string[];
};

function normalizeSectionHeading(value: string): string {
  return repairUtf8(decodeHtmlEntities(value))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sectionFromHeading(value: string): keyof JobDetailSections | null {
  const h = normalizeSectionHeading(value);
  if (!h) return null;
  if (/^(description|presentation|contexte|a propos du poste|le poste)$/.test(h)) return "description";
  if (/^(missions?|missions principales?|responsabilites?|responsabilites principales?|taches?|activites?|role et responsabilites?)$/.test(h)) return "missions";
  if (/^(profil|profil recherche|profil du candidat|candidat recherche|exigences?|requirements?|qualifications?)$/.test(h)) return "description";
  if (/^(formation|diplomes?|etudes|education)$/.test(h)) return "formation";
  if (/^(experience|experiences?|parcours|experience professionnelle)$/.test(h)) return "experience";
  if (/^(competences?|competences techniques?|savoir faire|skills|technical skills)$/.test(h)) return "skills";
  if (/^(qualites?|savoir etre|soft skills|aptitudes|qualities)$/.test(h)) return "qualities";
  if (/^(avantages?|ce que l entreprise offre|ce que nous offrons|nous offrons|conditions de travail|remuneration et avantages?|benefits|what we offer)$/.test(h)) return "benefits";
  if (/^(candidature|pour postuler|modalites? de candidature|comment postuler|documents? a fournir|documents? demandes?|application|how to apply)$/.test(h)) return "application";
  return null;
}

function cleanSectionLine(value: string): string {
  return collapseLine(value)
    .replace(/^(?:[-–—•▪◦*]+)\s*/, "")
    .trim();
}

/**
 * Converts cleaned offer text into conservative display sections.
 * It only creates a section when a recognizable heading is present and
 * never invents missing content.
 */
export function parseJobDetailSections(value: unknown, titleHint?: string | null): JobDetailSections {
  const empty = (): JobDetailSections => ({
    description: [], missions: [], formation: [], experience: [],
    skills: [], qualities: [], benefits: [], application: [],
  });
  const text = cleanJobDescription(value, titleHint);
  if (!text) return empty();

  const result = empty();
  let current: keyof JobDetailSections = "description";
  const lines = text.split(/\r?\n/).map(cleanSectionLine).filter(Boolean);

  for (const rawLine of lines) {
    // Handle headings followed by content on the same line:
    // "Missions principales : gérer..., suivre..." .
    const colon = rawLine.search(/\s*[:：]\s*/);
    if (colon > 0) {
      const before = rawLine.slice(0, colon).trim();
      const section = sectionFromHeading(before);
      if (section) {
        current = section;
        const after = rawLine.slice(colon + 1).trim();
        if (after) result[current].push(after);
        continue;
      }
    }

    const section = sectionFromHeading(rawLine);
    if (section) {
      current = section;
      continue;
    }

    // Don't let the offer title become the description.
    if (titleHint && normalizeSectionHeading(rawLine) === normalizeSectionHeading(titleHint)) continue;
    result[current].push(rawLine);
  }

  // A "Profil recherché" heading is a container, not a description.
  // If its content has no explicit subheading, keep it in description only
  // when no dedicated profile fields were detected; this avoids data loss.
  return result;
}
