import crypto from "node:crypto";
import { resolveApplicationContact, extractApplicationSubject } from "./applicationEngine";

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
};

const SOURCES: SourceConfig[] = [
  { key: "MINAJOBS", name: "MinaJobs", listingUrls: ["https://cameroun.minajobs.net/URL_LANDING_SEARCHED", "https://minajobs.net/"], hostnames: ["cameroun.minajobs.net", "minajobs.net"], offerPattern: /\/emplois-stage-recrutement\/(\d+)\//i },
  { key: "JOBINFOCAMER", name: "JobInfoCamer", listingUrls: ["https://www.jobinfocamer.com/jobs/", "https://www.jobinfocamer.com/fr/"], hostnames: ["www.jobinfocamer.com", "jobinfocamer.com"], offerPattern: /\/job\/(\d+)\//i },
];

const USER_AGENT = "JoblyOfferCollector/1.0 (+https://jobly-c0651.vercel.app)";
const FETCH_TIMEOUT_MS = 12_000;
const MAX_LISTING_PAGES = 4;
const MAX_OFFERS_PER_SOURCE = 40;
const MAX_DESCRIPTION_CHARS = 30_000;

function normalizeSpace(value: string): string {
  return value.replace(/\r/g, " ").replace(/\n/g, " ").replace(/\t/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(value: string): string {
  const named: Record<string, string> = {"&nbsp;":" ","&amp;":"&","&quot;":'"',"&#39;":"'","&apos;":"'","&lt;":"<","&gt;":">","&ndash;":"–","&mdash;":"—"};
  return value.replace(/&(?:nbsp|amp|quot|apos|lt|gt|ndash|mdash);|&#39;/gi, token => named[token.toLowerCase()] || token).replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function htmlToCleanText(html: string): string {
  return normalizeSpace(decodeEntities(
    html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi," ").replace(/<svg[\s\S]*?<\/svg>/gi," ")
      .replace(/<br\s*\/?>/gi,"\n").replace(/<\/p\s*>/gi,"\n").replace(/<\/li\s*>/gi,"\n").replace(/<[^>]+>/g," ")
  )).slice(0, MAX_DESCRIPTION_CHARS);
}

function metaContent(html: string, key: string): string | null {
  const escaped = key.replace(/[.*+?^()|[\]\\]/g, "\\$&");
  const re = new RegExp(
    '<meta\\b[^>]+(?:property|name)=["\\']' + escaped + '["\\'][^>]+content=["\\']([^"\\']+)["\\'][^>]*>|<meta\\b[^>]+content=["\\']([^"\\']+)["\\'][^>]+(?:property|name)=["\\']' + escaped + '["\\'][^>]*>',
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

function extractLinks(html: string, baseUrl: string, source: SourceConfig): CandidateLink[] {
  const out: CandidateLink[] = [];
  const re = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    try {
      const url = new URL(decodeEntities(match[1]),baseUrl).toString(), parsed = new URL(url);
      if (!source.hostnames.includes(parsed.hostname.toLowerCase()) || !source.offerPattern.test(parsed.pathname)) continue;
      const title = normalizeSpace(htmlToCleanText(match[2]));
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

function extractOffer(source: SourceConfig,url: string,html: string,listingTitle: string): CollectedOffer | null {
  const clean = htmlToCleanText(html), title = titleFromHtml(html) || listingTitle;
  if (!title || title.length < 3) return null;
  const company = firstMatch(clean,[/(?:Nom de l[’']employeur|Nom de l'employeur|Employeur|Entreprise|Company)\s*[:：-]\s*([^|\n]{2,120})/i,/(?:chez|at)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ0-9 .&'’-]{2,100})/i]);
  const location = firstMatch(clean,[/(?:Lieu|Localisation|Location)\s*[:：-]\s*([^|\n]{2,100})/i]);
  const contractType = firstMatch(clean,[/(?:Type d[’']emploi|Type d'emploi|Contrat|Contract)\s*[:：-]\s*([^|\n]{2,60})/i]);
  const publishedAt = parseDate(firstMatch(clean,[/(?:Date de publication|Posté|Publié(?:e)?)\s*[:：-]\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i]));
  const deadline = parseDate(firstMatch(clean,[/(?:Date expiration|Date limite|Délai|deadline)\s*[:：-]\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i]));
  const contacts = resolveApplicationContact({},clean), applicationUrl = findApplicationUrl(html,url,source);
  const applicationProfile: Record<string,unknown> = {
    channel: contacts.email ? "EMAIL" : contacts.phone ? "PHONE" : applicationUrl ? "EXTERNAL" : "UNSUPPORTED",
    comingSoon: !contacts.email && !contacts.phone && !applicationUrl
  };
  if (contacts.email) applicationProfile.applicationEmail = contacts.email;
  if (contacts.phone) applicationProfile.applicationPhone = contacts.phone;
  if (applicationUrl) applicationProfile.applicationUrl = applicationUrl;
  applicationProfile.subject = extractApplicationSubject(clean,title);
  return {sourceKey:source.key,externalId:externalId(url,source),sourceUrl:url,title:title.slice(0,300),company:company?.replace(/^(le|la|l[’']|the)\s+/i,"").trim()||null,location:location||null,contractType:contractType||null,description:clean,deadline,publishedAt,applicationProfile,contentHash:crypto.createHash("sha256").update(normalizeSpace(clean)).digest("hex")};
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
  return results;
}

export async function collectPublicJobSources() {
  const offers: CollectedOffer[] = [], sources: Record<string,{discovered:number;errors:number}> = {};
  for (const source of SOURCES) {
    try { const found=await collectSource(source); offers.push(...found); sources[source.key]={discovered:found.length,errors:0}; }
    catch { sources[source.key]={discovered:0,errors:1}; }
  }
  return {offers,sources};
}
