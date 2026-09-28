import crypto from "node:crypto";
import { resolveApplicationContact, extractApplicationSubject } from "./applicationEngine";
import { cleanCompanyName, cleanJobDescription, cleanJobTitle, extractCompanyNameFromDescription } from "./jobContent";

type SourceConfig = {
  key: string;
  name: string;
  listingUrls: string[];
  hostnames: string[];
  offerPattern: RegExp;
};

type CandidateLink = { url: string; title: string };

export type CollectedOffer = {
  sourceKey: string;
  externalId: string;
  sourceUrl: string;
  title: string;
  company: string | null;
  location: string | null;
  contractType: string | null;
  description: string;
  deadline: string | null;
  publishedAt: string | null;
  applicationProfile: Record<string, unknown>;
  contentHash: string;
  logoUrl: string | null;
  companyWebsite: string | null;
};

const SOURCES: SourceConfig[] = [
  { key: "minajobs", name: "MinaJobs", listingUrls: ["https://cm2024.minajobs.net/offres-emplois-stages", "https://cameroun.minajobs.net/offres-emplois-stages", "https://minajobs.net/offres-emplois-stages-a/tout-le-cameroun"], hostnames: ["cameroun.minajobs.net", "cm2024.minajobs.net", "minajobs.net"], offerPattern: /\/emplois-stage-recrutement\/(\d+)(?:\/|$)/i },
  { key: "jobinfocamer", name: "JobInfoCamer", listingUrls: ["https://www.jobinfocamer.com/jobs/", "https://www.jobinfocamer.com/fr/"], hostnames: ["www.jobinfocamer.com", "jobinfocamer.com"], offerPattern: /\/(?:job|jobs)\/(\d+)(?:\/|$)/i },
  { key: "infosconcourseducation", name: "Infos Concours Education", listingUrls: ["https://infosconcourseducation.com/category/offre-demploiss/", "https://infosconcourseducation.com/actualite/", "https://infosconcourseducation.com/"], hostnames: ["infosconcourseducation.com", "www.infosconcourseducation.com"], offerPattern: /\/[^/]+\/?$/i },
];

const USER_AGENT = "JoblyOfferCollector/1.0 (+https://jobly-c0651.vercel.app)";
const FETCH_TIMEOUT_MS = 8_000;
const MAX_LISTING_PAGES = 3;
const MAX_OFFERS_PER_SOURCE = 30;
const MAX_DESCRIPTION_CHARS = 30_000;

function normalizeSpace(value: string): string {
  return value.replace(/\r/g, " ").replace(/\n/g, " ").replace(/\t/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {"&nbsp;":" ","&amp;":"&","&quot;":'"',"&#39;":"'","&apos;":"'","&lt;":"<","&gt;":">","&ndash;":"–","&mdash;":"—"};
  return value.replace(/&(?:nbsp|amp|quot|apos|lt|gt|ndash|mdash);|&#39;/gi, token => named[token.toLowerCase()] || token).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function htmlToCleanText(html: string): string {
  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, "\n")
      .replace(/<style[\s\S]*?<\/style>/gi, "\n")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, "\n")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n")
      .replace(/<\/li\s*>/gi, "\n")
      .replace(/<\/(h[1-6]|div|section|article|blockquote|tr|td|th)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
  return text
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .split(/\n+/)
    .map(line => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_DESCRIPTION_CHARS);
}

function metaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    `<meta\\b[^>]+(?:property|name)=['"]${escaped}['"][^>]+content=['"]([^'"]+)['"][^>]*>|<meta\\b[^>]+content=['"]([^'"]+)['"][^>]+(?:property|name)=['"]${escaped}['"][^>]*>`,
    "i"
  );
  const match = html.match(re);
  return match ? decodeEntities(match[1] || match[2] || "").trim() || null : null;
}

function titleFromHtml(html: string): string | null {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const h2 = html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1];
  const title = h1 || h2 || metaContent(html,"og:title") || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return title ? normalizeSpace(decodeEntities(title)).replace(/\s*[-|]\s*(MinaJobs|JobInfoCamer).*$/i,"").trim() : null;
}

function isRelevantInfosConcoursLink(url: URL, title: string): boolean {
  return /infosconcourseducation\.com$/i.test(url.hostname) &&
    /(?:offre|emploi|recrut|stage|commercial|assistant|manager|technicien|agent|chauffeur|vendeur|promotrice|promoteur)/i.test(url.pathname + " " + title);
}

function extractLinks(html: string, baseUrl: string, source: SourceConfig): CandidateLink[] {
  const out: CandidateLink[] = [];
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      const url = new URL(decodeEntities(match[1]),baseUrl).toString(), parsed = new URL(url);
      if (!source.hostnames.includes(parsed.hostname.toLowerCase())) continue;
      const title = normalizeSpace(htmlToCleanText(match[2]));
      if (source.key === "infosconcourseducation") {
        if (!isRelevantInfosConcoursLink(parsed, title)) continue;
      } else if (!source.offerPattern.test(parsed.pathname)) continue;
      if (title.length >= 4) out.push({url,title});
    } catch {}
  }
  return Array.from(new Map(out.map(x => [x.url,x])).values());
}

function pageLinks(html: string, baseUrl: string, source: SourceConfig): string[] {
  const out: string[] = [];
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const label = normalizeSpace(htmlToCleanText(match[2]));
    if (!/^([2-9]|10)$/.test(label) && !/^(next|»|suivant)$/i.test(label)) continue;
    try {
      const url = new URL(decodeEntities(match[1]),baseUrl).toString();
      if (source.hostnames.includes(new URL(url).hostname.toLowerCase())) out.push(url);
    } catch {}
  }
  return Array.from(new Set(out));
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(),FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url,{headers:{"user-agent":USER_AGENT,accept:"text/html,application/xhtml+xml"},redirect:"follow",signal:controller.signal,cache:"no-store"});
    if (!response.ok) throw new Error("HTTP_" + response.status);
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html") && !type.includes("application/xhtml")) throw new Error("SOURCE_NOT_HTML");
    return await response.text();
  } finally { clearTimeout(timer); }
}

function externalId(url: string, source: SourceConfig): string {
  return new URL(url).pathname.match(source.offerPattern)?.[1] || crypto.createHash("sha1").update(url).digest("hex").slice(0,20);
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) { const match = text.match(pattern); if (match?.[1]) return normalizeSpace(match[1]); }
  return null;
}

function parseDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value.replace(/(\d{2})-(\d{2})-(\d{4})/,"$3-$2-$1"));
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function extractCompanyWebsite(html: string, pageUrl: string): string | null {
  const links = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi));
  const scored: { url: string; score: number }[] = [];
  for (const match of links) {
    const label = normalizeSpace(htmlToCleanText(match[2]));
    if (!/(site officiel|website|site web|official website|entreprise|company)/i.test(label)) continue;
    try {
      const u = new URL(decodeEntities(match[1]), pageUrl);
      if (/^https?:$/.test(u.protocol) && u.hostname !== new URL(pageUrl).hostname) scored.push({ url: u.toString(), score: /site officiel|website|official/i.test(label) ? 3 : 1 });
    } catch {}
  }
  scored.sort((a,b) => b.score - a.score);
  return scored[0]?.url || null;
}

function extractCompanyLogo(html: string, pageUrl: string): string | null {
  const jsonLogo = html.match(/["']logo["']\s*:\s*["'](https?:\/\/[^"']+)["']/i)?.[1];
  if (jsonLogo) return decodeEntities(jsonLogo);
  const itemLogo = html.match(/<[^>]+itemprop=["']logo["'][^>]+(?:src|content)=["']([^"']+)["']/i)?.[1];
  if (itemLogo) { try { return new URL(decodeEntities(itemLogo), pageUrl).toString(); } catch {} }
  const icon = html.match(/<link\b[^>]+rel=["'][^"']*(?:icon|apple-touch-icon)[^"']*["'][^>]+href=["']([^"']+)["']/i)?.[1];
  if (icon) { try { return new URL(decodeEntities(icon), pageUrl).toString(); } catch {} }
  const og = html.match(/<meta\b[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1];
  if (og) { try { return new URL(decodeEntities(og), pageUrl).toString(); } catch {} }
  return null;
}

function findApplicationUrl(html: string, pageUrl: string, source: SourceConfig): string | null {
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  const candidates: {url:string;score:number}[] = [];
  while ((match = re.exec(html))) {
    if (!/(postuler|candidature|apply|submit|candidate|soumettre)/i.test(normalizeSpace(htmlToCleanText(match[2])))) continue;
    try {
      const url = new URL(decodeEntities(match[1]),pageUrl);
      if (!/^https?:$/.test(url.protocol)) continue;
      candidates.push({url:url.toString(),score:source.hostnames.includes(url.hostname.toLowerCase())?1:3});
    } catch {}
  }
  candidates.sort((a,b)=>b.score-a.score);
  return candidates[0]?.url || null;
}

function editorialText(clean: string, title: string): string {
  const start = Math.max(0, clean.toLowerCase().indexOf(title.toLowerCase()));
  let text = start >= 0 ? clean.slice(start) : clean;
  for (const marker of ["Offres d'emploi récentes", "REJOIGNEZ MinaJobs", "Envoyez moi des offres d'emploi", "Événements", "Vus récemment"]) {
    const index = text.toLowerCase().indexOf(marker.toLowerCase());
    if (index > 200) text = text.slice(0, index);
  }
  return text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_DESCRIPTION_CHARS);
}

function extractOffer(source: SourceConfig,url: string,html: string,listingTitle: string): CollectedOffer | null {
  const rawClean = htmlToCleanText(html), title = cleanJobTitle(titleFromHtml(html) || listingTitle);
  if (!title || title.length < 3) return null;
  const clean = cleanJobDescription(editorialText(rawClean, title), title);
  const company = cleanCompanyName(firstMatch(clean,[/(?:Nom de l[’']employeur|Nom de l'employeur|Employeur|Entreprise|Company)\s*[:：-]\s*([^|\n]{2,120})/i,/(?:chez|at)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ0-9 .&'’-]{2,100})/i])) || extractCompanyNameFromDescription(clean);
  const location = firstMatch(clean,[/(?:Lieu|Localisation|Location)\s*[:：-]\s*([^|\n]{2,100})/i]);
  const contractType = firstMatch(clean,[/(?:Type d[’']emploi|Type d'emploi|Contrat|Contract)\s*[:：-]\s*([^|\n]{2,60})/i]);
  const publishedAt = parseDate(firstMatch(clean,[/(?:Date de publication|Posté|Publié(?:e)?)\s*[:：-]\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i]));
  const deadline = parseDate(firstMatch(clean,[/(?:Date expiration|Date limite|Délai|deadline)\s*[:：-]\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i]));
  const contacts = resolveApplicationContact({},clean), applicationUrl = findApplicationUrl(html,url,source);
  const companyWebsite = extractCompanyWebsite(html,url);
  const logoUrl = extractCompanyLogo(html,url);
  const applicationProfile: Record<string,unknown> = {
    channel: contacts.email ? "EMAIL" : contacts.phone ? "PHONE" : applicationUrl ? "EXTERNAL" : "UNSUPPORTED",
    comingSoon: !contacts.email && !contacts.phone && !applicationUrl
  };
  if (contacts.email) applicationProfile.applicationEmail = contacts.email;
  if (contacts.phone) applicationProfile.applicationPhone = contacts.phone;
  if (applicationUrl) applicationProfile.applicationUrl = applicationUrl;
  applicationProfile.subject = extractApplicationSubject(clean,title);
  return {sourceKey:source.key,externalId:externalId(url,source),sourceUrl:url,title:title.slice(0,300),company:company?.replace(/^(le|la|l[’']|the)\s+/i,"").trim()||null,location:location||null,contractType:contractType||null,description:clean,deadline,publishedAt,applicationProfile,contentHash:crypto.createHash("sha256").update(normalizeSpace(clean)).digest("hex"),logoUrl,companyWebsite};
}

async function collectWordPressOffers(source: SourceConfig): Promise<CollectedOffer[]> {
  if (source.key !== "infosconcourseducation") return [];
  try {
    const response = await fetch("https://infosconcourseducation.com/wp-json/wp/v2/posts?per_page=30&orderby=date&order=desc&_fields=link,title,content,date", {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return [];
    const posts = await response.json();
    if (!Array.isArray(posts)) return [];
    const out: CollectedOffer[] = [];
    for (const post of posts) {
      const link = typeof post?.link === "string" ? post.link : "";
      const title = typeof post?.title?.rendered === "string" ? htmlToCleanText(post.title.rendered) : "";
      if (!link || !title || !isRelevantInfosConcoursLink(new URL(link), title)) continue;
      const html = typeof post?.content?.rendered === "string" ? post.content.rendered : "";
      if (!html) continue;
      try {
        const offer = extractOffer(source, link, html, title);
        if (offer) out.push(offer);
      } catch {}
    }
    return out;
  } catch {
    return [];
  }
}

async function collectSource(source: SourceConfig): Promise<CollectedOffer[]> {
  const seenPages = new Set<string>(), candidates = new Map<string,CandidateLink>();
  for (const firstUrl of source.listingUrls) {
    let current = firstUrl;
    for (let page=0;page<MAX_LISTING_PAGES && current && !seenPages.has(current);page++) {
      seenPages.add(current);
      try {
        const html = await fetchHtml(current);
        for (const candidate of extractLinks(html,current,source)) candidates.set(candidate.url,candidate);
        current = pageLinks(html,current,source).find(x=>!seenPages.has(x)) || "";
      } catch { current=""; }
    }
  }
  const results: CollectedOffer[] = [];
  for (const candidate of Array.from(candidates.values()).slice(0,MAX_OFFERS_PER_SOURCE)) {
    try { const offer=extractOffer(source,candidate.url,await fetchHtml(candidate.url),candidate.title); if(offer) results.push(offer); } catch {}
  }
  if (results.length < 5) {
    const fallback = await collectWordPressOffers(source);
    for (const offer of fallback) {
      if (!results.some(existing => existing.sourceUrl === offer.sourceUrl)) results.push(offer);
      if (results.length >= MAX_OFFERS_PER_SOURCE) break;
    }
  }
  return results.slice(0,MAX_OFFERS_PER_SOURCE);
}

export async function collectPublicJobSources() {
  const results = await Promise.all(SOURCES.map(async source => {
    try {
      const found = await collectSource(source);
      return { source, found, error: false };
    } catch {
      return { source, found: [] as CollectedOffer[], error: true };
    }
  }));
  const offers = results.flatMap(item => item.found);
  const sources: Record<string,{discovered:number;errors:number}> = {};
  for (const item of results) sources[item.source.key] = { discovered: item.found.length, errors: item.error ? 1 : 0 };
  return { offers, sources };
}
