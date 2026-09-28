export function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    "&nbsp;":" ","&amp;":"&","&quot;":"\"","&#39;":"'","&apos;":"'","&lt;":"<","&gt;":">",
    "&ndash;":"–","&mdash;":"—","&hellip;":"…","&bull;":"•","&middot;":"·",
    "&agrave;":"à","&acirc;":"â","&auml;":"ä","&ccedil;":"ç","&egrave;":"è","&eacute;":"é","&ecirc;":"ê","&euml;":"ë",
    "&icirc;":"î","&iuml;":"ï","&ocirc;":"ô","&ouml;":"ö","&ugrave;":"ù","&ucirc;":"û","&uuml;":"ü",
    "&Agrave;":"À","&Acirc;":"Â","&Auml;":"Ä","&Ccedil;":"Ç","&Egrave;":"È","&Eacute;":"É","&Ecirc;":"Ê","&Euml;":"Ë",
    "&Icirc;":"Î","&Iuml;":"Ï","&Ocirc;":"Ô","&Ouml;":"Ö","&Ugrave;":"Ù","&Ucirc;":"Û","&Uuml;":"Ü",
    "&oelig;":"œ","&OElig;":"Œ","&szlig;":"ß","&copy;":"©","&reg;":"®","&trade;":"™","&lsquo;":"‘","&rsquo;":"’","&ldquo;":"“","&rdquo;":"”","&laquo;":"«","&raquo;":"»","&colon;":":"
  };
  return value
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt|ndash|mdash|hellip|bull|middot);|&#39;/gi, token => named[token.toLowerCase()] || token)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z][a-z0-9]+);/gi, token => named[token.toLowerCase()] || token);
}
function repairUtf8(value: string): string {
  if (!/[ÃÂâ][\x80-\xBF\x20-\x7E]/.test(value)) return value;
  try { const bytes = new Uint8Array([...value].map(ch => ch.charCodeAt(0))); const repaired = new TextDecoder("utf-8",{fatal:false}).decode(bytes); return repaired || value; } catch { return value; }
}
function collapseLine(value: string): string { return value.replace(/\u00a0/g," ").replace(/[ \t]+/g," ").trim(); }

function sanitizeStoredOfferText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/�+/g, " ")
    .replace(/(?:^|\n)\s*(?:Accueil|Home|Search|Sign in|Login|Register|Get help|Password recovery|Recover your email|Facebook|Instagram|Youtube|WhatsApp|Twitter|Pinterest|Groupe vip)\s*(?=\n|$)/gi, "\n")
    .replace(/(?:^|\n)\s*(?:Publié par|Publi[eé] par)\s+[^\n]{1,120}\s*(?=\n|$)/gi, "\n")
    .replace(/(?:^|\n)\s*(?:Share|Partager)\s+(?:Facebook|Twitter|Pinterest|WhatsApp).*?(?=\n|$)/gi, "\n")
    .replace(/\b(?:Sign in|Join|Create an account|Remember me|Read more|Load more|Toggle navigation|Main navigation)\b/gi, " ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
  profile: string[];
  missions: string[];
  formation: string[];
  experience: string[];
  skills: string[];
  qualities: string[];
  benefits: string[];
  application: string[];
};

const SECTION_ALIASES: Record<keyof JobDetailSections, string[]> = {
  description: [
    "description", "presentation", "contexte", "a propos du poste", "le poste",
    "job description", "about the role", "about the job", "overview"
  ],
  missions: [
    "mission", "missions", "missions principales", "responsabilites",
    "responsabilites principales", "taches", "taches principales", "activites",
    "role et responsabilites", "responsibilities", "key responsibilities",
    "main responsibilities", "duties", "what you will do"
  ],
  profile: [
    "profil", "profil recherche", "profil du candidat", "candidat recherche",
    "exigences", "requirements", "qualifications", "candidate profile",
    "your profile", "who you are", "what we are looking for"
  ],
  formation: [
    "formation", "formations", "diplome", "diplomes", "etudes", "education",
    "academic background"
  ],
  experience: [
    "experience", "experiences", "experience professionnelle", "parcours",
    "professional experience", "work experience", "experience required"
  ],
  skills: [
    "competence", "competences", "competences techniques", "savoir faire",
    "skills", "technical skills", "hard skills", "required skills"
  ],
  qualities: [
    "qualite", "qualites", "savoir etre", "soft skills", "aptitudes",
    "qualities", "personal qualities", "behavioral skills"
  ],
  benefits: [
    "avantage", "avantages", "ce que l entreprise offre", "ce que nous offrons",
    "nous offrons", "conditions de travail", "remuneration et avantages",
    "benefits", "what we offer", "we offer", "compensation and benefits"
  ],
  application: [
    "candidature", "pour postuler", "modalites de candidature",
    "comment postuler", "documents a fournir", "documents demandes",
    "application", "how to apply", "how to apply for this position",
    "apply", "application process", "conditions de candidature",
    "conditions de soumission de candidature", "soumission de candidature",
    "modalites de soumission", "dossier de candidature", "pieces a fournir",
    "pieces a joindre", "documents a joindre", "documents requis"
  ],
};

const SECTION_ORDER: (keyof JobDetailSections)[] = [
  "description", "missions", "profile", "formation", "experience",
  "skills", "qualities", "benefits", "application"
];

function normalizeSectionHeading(value: string): string {
  return repairUtf8(decodeHtmlEntities(value))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function sectionFromHeading(value: string): keyof JobDetailSections | null {
  const h = normalizeSectionHeading(value);
  if (!h) return null;

  for (const key of SECTION_ORDER) {
    for (const alias of SECTION_ALIASES[key]) {
      const a = normalizeSectionHeading(alias);
      if (h === a) return key;
      // Accept natural heading extensions such as:
      // "Missions principales du poste" / "Compétences requises".
      if (h.startsWith(a + " ") || h.endsWith(" " + a)) return key;
    }
  }

  return null;
}

function splitInlineSectionHeadings(value: string): string {
  // Legacy imports sometimes flattened the entire offer into one line.
  const headingPatterns = [
    "Missions principales du poste", "Missions principales", "Missions",
    "Responsabilités principales", "Responsabilités", "Tâches principales", "Tâches",
    "Profil recherché", "Profil du candidat", "Profil", "Exigences", "Qualifications",
    "Formation", "Diplômes", "Expérience professionnelle", "Expérience",
    "Compétences techniques", "Compétences requises", "Compétences", "Savoir-faire",
    "Savoir-être", "Qualités", "Avantages", "Ce que nous offrons",
    "Ce que l'entreprise offre", "Conditions de travail", "Candidature",
    "Pour postuler", "Modalités de candidature", "Comment postuler", "Documents à fournir",
    "Application", "How to apply", "Responsibilities", "Requirements", "Education",
    "Experience", "Skills", "Benefits",
  ];
  const escaped = headingPatterns.map((heading) => heading.replaceAll(" ", "\\s+")).join("|");
  return value
    .replace(new RegExp("(?:^|[\\s|•▪◦])((?:" + escaped + "))(?:\\s*[:：-]\\s*|\\s+)", "giu"), (match) =>
      match.startsWith("\n") ? match : "\n" + match.trimStart()
    )
    .replace(/^\n+/, "")
    .replace(/\n{3,}/g, "\n\n");
}
function isUsefulApplicationLine(value: string): boolean {
  const line = normalizeSectionHeading(value);
  if (!line || line.length < 3) return false;
  if (/^(partager|share|facebook|twitter|whatsapp|instagram|youtube|accueil|home|search|menu|connexion|login|inscription|register|read more|voir plus)$/.test(line)) return false;
  return /candidatur|postuler|soumission|dossier|document|piece|cv|lettre de motivation|email|mail|telephone|whatsapp|contact|adresse|site|plateforme|avant le|date limite|deadline|delai|rejoindre|envoyer|transmettre|deposer|depot|conditions|objet/.test(line);
}

function cleanSectionLine(value: string): string {
  return collapseLine(value)
    .replace(/^(?:[-–—•▪◦*]+)\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^[✓✔☑]\s*/, "")
    .trim();
}

function normalizeSectionItems(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of items) {
    const value = cleanSectionLine(raw);
    if (!value || value.length < 2) continue;

    const key = value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

    if (key.length > 12 && seen.has(key)) continue;
    if (key.length > 12) seen.add(key);
    result.push(value);
  }

  return result;
}

function emptySections(): JobDetailSections {
  return {
    description: [],
    profile: [],
    missions: [],
    formation: [],
    experience: [],
    skills: [],
    qualities: [],
    benefits: [],
    application: [],
  };
}

function addTextToSection(
  result: JobDetailSections,
  section: keyof JobDetailSections,
  value: string
): void {
  const cleaned = cleanSectionLine(value);
  if (cleaned && (section !== "application" || isUsefulApplicationLine(cleaned))) result[section].push(cleaned);
}

function collectStructuredValue(
  value: unknown,
  result: JobDetailSections,
  fallback: keyof JobDetailSections = "description",
  depth = 0
): void {
  if (depth > 8 || value == null) return;

  if (typeof value === "string") {
    const text = cleanJobDescription(value);
    if (text) addTextToSection(result, fallback, text);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectStructuredValue(item, result, fallback, depth + 1);
    return;
  }

  if (typeof value !== "object") return;

  const object = value as Record<string, unknown>;

  for (const [rawKey, rawValue] of Object.entries(object)) {
    const key = normalizeSectionHeading(rawKey);

    const mapped =
      sectionFromHeading(key) ??
      (key === "job description" || key === "jobdescription" || key === "job description text"
        ? "description"
        : key === "responsibilities" || key === "key responsibilities"
          ? "missions"
          : key === "requirements" || key === "candidate requirements"
            ? "profile"
            : key === "education" || key === "academic background"
              ? "formation"
              : key === "work experience" || key === "professional experience"
                ? "experience"
                : key === "technical skills" || key === "required skills"
                  ? "skills"
                  : key === "soft skills"
                    ? "qualities"
                    : key === "benefits" || key === "compensation and benefits"
                      ? "benefits"
                      : key === "application" || key === "how to apply"
                        ? "application"
                        : null);

    if (mapped) {
      collectStructuredValue(rawValue, result, mapped, depth + 1);
      continue;
    }

    // Preserve useful nested fields instead of returning only the first one.
    if (typeof rawValue === "string" || Array.isArray(rawValue) || (rawValue && typeof rawValue === "object")) {
      collectStructuredValue(rawValue, result, fallback, depth + 1);
    }
  }
}

function stripChromeFromHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "\n")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "\n")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "\n")
    .replace(/<(nav|header|footer|aside|form|dialog)\b[^>]*>[\s\S]*?<\/\1>/gi, "\n")
    .replace(
      /<([a-z0-9]+)\b[^>]*(?:id|class)=["'][^"']*(?:nav|menu|sidebar|breadcrumb|cookie|advert|ads|social|login|register|newsletter|pagination|share|search)[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi,
      "\n"
    )
    .replace(/<h[1-6]\b[^>]*>/gi, "\n\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/(p|div|section|article|blockquote|tr|td|th)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ");
}

function htmlToCandidateBlocks(html: string): string[] {
  const candidates: string[] = [];
  const add = (value: string) => {
    const text = repairUtf8(decodeHtmlEntities(stripChromeFromHtml(value))).trim();
    if (text.length >= 80) candidates.push(text);
  };

  const broad = /<(article|main)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(broad)) add(match[2] || "");

  const semantic =
    /<([a-z0-9]+)\b[^>]*(?:id|class)=["'][^"']*(?:job|offer|posting|description|content|detail|responsibilit|mission|requirement|profile)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi;
  for (const match of html.matchAll(semantic)) add(match[2] || "");

  return candidates;
}

function chooseHtmlCandidates(html: string, titleHint?: string | null): string {
  const candidates = htmlToCandidateBlocks(html);
  if (!candidates.length) return "";

  const title = titleHint ? normalizeSectionHeading(titleHint) : "";
  const ranked = candidates
    .map((text) => {
      const normalized = normalizeSectionHeading(text);
      const sectionHits = SECTION_ORDER.filter((key) =>
        text.toLowerCase().includes(key === "profile" ? "profil" : key)
      ).length;
      const titleHit = title && normalized.includes(title) ? 100000 : 0;
      const lengthScore = Math.min(text.length, 30000) / 100;
      return { text, score: titleHit + sectionHits * 50 + lengthScore };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.text || stripChromeFromHtml(html);
}

function rawOfferText(value: unknown, titleHint?: string | null): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (/^\s*[\[{]/.test(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          const structured = emptySections();
          collectStructuredValue(parsed, structured);
          const joined = SECTION_ORDER.flatMap((key) => structured[key]).join("\n");
          if (joined.trim()) return joined;
        }
      } catch {
        // Continue as raw text/HTML.
      }
    }
    return trimmed;
  }

  if (value && typeof value === "object") {
    const structured = emptySections();
    collectStructuredValue(value, structured);
    const joined = SECTION_ORDER.flatMap((key) => structured[key]).join("\n");
    if (joined.trim()) return joined;

    try {
      return JSON.stringify(value);
    } catch {
      return "";
    }
  }

  return "";
}

export function cleanJobDescription(value: unknown, titleHint?: string | null): string {
  let raw = rawOfferText(value, titleHint);
  if (!raw) return "";

  if (/^\s*[<{[]/.test(raw) && /<\/?[a-z][\s\S]*>/i.test(raw)) {
    raw = chooseHtmlCandidates(raw, titleHint);
  }

  raw = sanitizeStoredOfferText(repairUtf8(decodeHtmlEntities(raw)))
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const lines = splitInlineSectionHeadings(raw).split(/\n+/).map(collapseLine).filter(Boolean);
  const seen = new Set<string>();
  const output: string[] = [];

  for (const line of lines) {
    const normalized = normalizeSectionHeading(line);
    if (!normalized) continue;

    if (/^(francais|english|search|sign in|login|register|sign up|create an account|remember me|read more|load more|share|partager|toggle navigation|main navigation)$/.test(normalized)) {
      continue;
    }

    if (/^(window|document|function|const|let|var|adsbygoogle|datalayer)/i.test(line)) continue;

    if (normalized.length > 18 && seen.has(normalized)) continue;
    if (normalized.length > 18) seen.add(normalized);

    output.push(line);
  }

  return output.join("\n").slice(0, 30000);
}

export function parseJobDetailSections(value: unknown, titleHint?: string | null): JobDetailSections {
  const result = emptySections();

  // First pass: preserve native structured data whenever the source already
  // contains explicit fields. This prevents description from swallowing
  // responsibilities/requirements/benefits.
  if (value && typeof value === "object" && !Array.isArray(value)) {
    collectStructuredValue(value, result);
  }

  const structuredHasData = SECTION_ORDER.some((key) => result[key].length > 0);

  // Keep native structured sections intact. Re-parsing a flattened
  // structured payload would collapse missions, profile and benefits
  // back into the description.
  const text = structuredHasData ? "" : cleanJobDescription(value, titleHint);

  if (!structuredHasData) {
    let current: keyof JobDetailSections = "description";
    const lines = splitInlineSectionHeadings(text).split(/\r?\n/).map(cleanSectionLine).filter(Boolean);

    for (const rawLine of lines) {
      if (
        titleHint &&
        normalizeSectionHeading(rawLine) === normalizeSectionHeading(titleHint)
      ) {
        continue;
      }

      // Recognize same-line headings:
      // "Missions principales : gérer..., suivre..."
      const colonMatch = rawLine.match(/^(.{2,90}?)\s*[:：]\s*(.+)$/);
      if (colonMatch) {
        const section = sectionFromHeading(colonMatch[1]);
        if (section) {
          current = section;
          addTextToSection(result, current, colonMatch[2]);
          continue;
        }
      }

      const exactSection = sectionFromHeading(rawLine);
      if (exactSection) {
        current = exactSection;
        continue;
      }

      addTextToSection(result, current, rawLine);
    }
  }

  // A frequent source format stores the entire offer as one long
  // "description" field, even when that field itself contains headings such
  // as "Missions", "Profil", "Avantages". Re-parse description items so
  // those headings cannot leak into one giant paragraph.
  if (result.description.length) {
    const reparsed = emptySections();
    for (const item of result.description) {
      const cleaned = cleanJobDescription(item, titleHint);
      if (!cleaned) continue;

      let current: keyof JobDetailSections = "description";
      const lines = splitInlineSectionHeadings(cleaned).split(/\r?\n/).map(cleanSectionLine).filter(Boolean);

      for (const rawLine of lines) {
        if (titleHint && normalizeSectionHeading(rawLine) === normalizeSectionHeading(titleHint)) continue;

        const colonMatch = rawLine.match(/^(.{2,90}?)\s*[:：]\s*(.+)$/);
        if (colonMatch) {
          const section = sectionFromHeading(colonMatch[1]);
          if (section) {
            current = section;
            addTextToSection(reparsed, current, colonMatch[2]);
            continue;
          }
        }

        const exactSection = sectionFromHeading(rawLine);
        if (exactSection) {
          current = exactSection;
          continue;
        }

        addTextToSection(reparsed, current, rawLine);
      }
    }

    const reparsedHasSections = SECTION_ORDER.some(
      (key) => key !== "description" && reparsed[key].length > 0
    );

    if (reparsedHasSections) {
      // Keep explicitly structured sections, while replacing the flattened
      // description with the correctly classified text.
      result.description = reparsed.description;
      for (const key of SECTION_ORDER) {
        if (key === "description") continue;
        if (reparsed[key].length && !result[key].length) {
          result[key] = reparsed[key];
        }
      }
    }
  }

  for (const key of SECTION_ORDER) {
    result[key] = normalizeSectionItems(result[key]);
  }

  // Jobly presents one single "Profil recherché" section. Formation,
  // expérience, compétences and qualités are only profile sub-elements; they
  // are never searched for independently elsewhere in the source page.
  const profileParts = [
    ...result.profile,
    ...result.formation,
    ...result.experience,
    ...result.skills,
    ...result.qualities,
  ];
  result.profile = normalizeSectionItems(profileParts);

  // Formation/experience/skills/qualities are implementation buckets only.
  // They must not create their own UI sections or trigger fallback extraction.
  result.formation = [];
  result.experience = [];
  result.skills = [];
  result.qualities = [];

  return result;
}
