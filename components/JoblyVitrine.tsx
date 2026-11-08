"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getSupabaseClient } from "../lib/supabase";

type Language = "fr" | "en";
type HomeStats = { talentsCount: number; offersCount: number; updatedAt: string };
type Audience = { accountKey: string | null; role: string | null };
type SuccessEvent = { id: string; occurredAt: string };
type Frequency = "burst" | "regular" | "rare";
type DeliveryState = {
  weekKey: string;
  profile: Frequency;
  dayKey: string;
  dayCount: number;
  weekCount: number;
  nextAt: number;
  seen: string[];
};

const copy = {
  fr: {
    navHome: "Accueil", navEcosystem: "L'écosystème", navVoices: "Témoignages", navImpact: "Notre impact", navPartners: "Partenaires", login: "Connexion", join: "Rejoindre Jobly",
    eyebrow: "La plateforme panafricaine de l'emploi", titleA: "Là où les talents africains rencontrent", titleB: "les opportunités.", lead: "Jobly rapproche les talents, les recruteurs et les partenaires pour faire circuler les opportunités professionnelles à travers l'Afrique.", find: "Trouver une opportunité", recruit: "Recruter avec Jobly", community: "La communauté Jobly", network: "Réseau panafricain", countries: "Talents · recruteurs · partenaires",
    ticker: ["Talent & carrière", "Recrutement", "Mobilité professionnelle", "Partenariats", "Opportunités africaines"],
    ecoEyebrow: "Un écosystème, plusieurs chemins", ecoTitle: "Une plateforme pensée pour faire avancer chaque parcours.", ecoLead: "Que vous cherchiez votre prochaine opportunité, le bon profil ou un partenaire pour agir, Jobly vous connecte au bon réseau.",
    talent: "Pour les talents", talentText: "Valorisez vos compétences, découvrez des offres pertinentes et faites progresser votre carrière au-delà des frontières.", recruiter: "Pour les recruteurs", recruiterText: "Diffusez vos offres, gagnez en visibilité et identifiez des profils qualifiés à l'échelle africaine.", partner: "Pour les partenaires", partnerText: "Associez vos initiatives à un réseau engagé pour l'employabilité, la mobilité et le développement des compétences.",
    pulseEyebrow: "La communauté en mouvement", pulseTitle: "Vous n'avancez pas seul.", pulseText: "Les mêmes chiffres que dans l'application Jobly, synchronisés automatiquement avec ce site.", talents: "Talents inscrits", offers: "Offres d'emploi actives", talentNote: "Comptes Talent avec profil", offerNote: "Offres africaines visibles et à jour", sync: "Synchronisation des données Jobly…", syncError: "Données momentanément indisponibles",
    voiceEyebrow: "Des expériences qui comptent", voiceTitle: "Le meilleur de Jobly, ce sont les parcours qui avancent.", voiceLead: "Des retours authentiques de talents recrutés, de recruteurs et de partenaires — publiés après vérification et accord des témoins.", voiceEmptyTitle: "Les prochaines réussites auront leur place ici.", voiceEmptyText: "Jobly publiera ici des témoignages réels, avec le pays, le rôle et l'organisation du témoin, uniquement après vérification et consentement.",
    impactEyebrow: "L'impact, pas seulement les promesses", impactTitle: "Une même plateforme, des parcours qui avancent.", impactLead: "Jobly rapproche les personnes qui cherchent une opportunité, celles qui recrutent et les organisations qui accompagnent l'emploi en Afrique.", impactTalent: "Talents", impactTalentText: "Des compétences visibles et des opportunités accessibles.", impactRecruiter: "Recruteurs", impactRecruiterText: "Des profils à découvrir et des recrutements à concrétiser.", impactPartner: "Partenaires", impactPartnerText: "Des initiatives qui soutiennent l'employabilité et la mobilité.", impactAfrica: "Afrique", impactAfricaText: "Un réseau ouvert aux talents et aux organisations du continent.",
    networkEyebrow: "Une ambition continentale", networkTitle: "Les opportunités ne devraient pas s'arrêter aux frontières.", networkText: "Jobly construit des passerelles entre talents, entreprises, partenaires et institutions. Une dynamique ouverte, ancrée localement et tournée vers toute l'Afrique.", ctaTitle: "Votre prochaine opportunité peut commencer ici.", ctaText: "Rejoignez un écosystème qui connecte les talents et les opportunités partout en Afrique.", cta: "Découvrir Jobly", footer: "L'écosystème panafricain qui rapproche les talents, les recruteurs et les opportunités.",
    toastTitle: "Une belle réussite Jobly !", talentHire: "Un talent vient de décrocher un emploi grâce à Jobly !", recruiterHire: "Un recruteur vient de recruter un talent grâce à Jobly !", publicHire: "Une embauche vient d'être confirmée grâce à Jobly !", soundOn: "Son activé", soundOff: "Son désactivé", soundLabel: "Activer ou couper le son des notifications"
  },
  en: {
    navHome: "Home", navEcosystem: "Ecosystem", navVoices: "Testimonials", navImpact: "Our impact", navPartners: "Partners", login: "Log in", join: "Join Jobly",
    eyebrow: "The pan-African employment platform", titleA: "Where African talent meets", titleB: "opportunity.", lead: "Jobly brings talent, recruiters and partners together to connect people with professional opportunities across Africa.", find: "Find an opportunity", recruit: "Hire with Jobly", community: "The Jobly community", network: "Pan-African network", countries: "Talent · recruiters · partners",
    ticker: ["Talent & career", "Recruitment", "Professional mobility", "Partnerships", "African opportunities"],
    ecoEyebrow: "One ecosystem, many paths", ecoTitle: "A platform designed to move every career forward.", ecoLead: "Whether you are looking for your next opportunity, the right profile or a partner to take action, Jobly connects you to the right network.",
    talent: "For talent", talentText: "Showcase your skills, discover relevant opportunities and move your career forward across borders.", recruiter: "For recruiters", recruiterText: "Publish opportunities, increase visibility and discover qualified profiles across Africa.", partner: "For partners", partnerText: "Connect your initiatives to a network advancing employability, mobility and skills development.",
    pulseEyebrow: "A community in motion", pulseTitle: "You do not move forward alone.", pulseText: "The same figures as the Jobly app, automatically synchronized with this website.", talents: "Registered talents", offers: "Active job offers", talentNote: "Talent accounts with a profile", offerNote: "Visible and up-to-date African offers", sync: "Synchronizing Jobly data…", syncError: "Data temporarily unavailable",
    voiceEyebrow: "Stories that matter", voiceTitle: "The best of Jobly is seeing careers move forward.", voiceLead: "Authentic feedback from hired talent, recruiters and partners — published after verification and consent.", voiceEmptyTitle: "The next success stories will have their place here.", voiceEmptyText: "Jobly will publish real testimonials here, with the witness country, role and organization, only after verification and consent.",
    impactEyebrow: "Impact, not just promises", impactTitle: "One platform, careers moving forward.", impactLead: "Jobly connects people seeking opportunities, people hiring and organizations supporting employment across Africa.", impactTalent: "Talent", impactTalentText: "Visible skills and accessible opportunities.", impactRecruiter: "Recruiters", impactRecruiterText: "Profiles to discover and hires to make.", impactPartner: "Partners", impactPartnerText: "Initiatives supporting employability and mobility.", impactAfrica: "Africa", impactAfricaText: "A network open to the continent's talent and organizations.",
    networkEyebrow: "A continental ambition", networkTitle: "Opportunities should not stop at borders.", networkText: "Jobly builds bridges between talent, companies, partners and institutions. A movement rooted locally and designed for all of Africa.", ctaTitle: "Your next opportunity could start here.", ctaText: "Join an ecosystem connecting talent and opportunities throughout Africa.", cta: "Discover Jobly", footer: "The pan-African ecosystem connecting talent, recruiters and opportunities.",
    toastTitle: "A Jobly success story!", talentHire: "A talent has just landed a job thanks to Jobly!", recruiterHire: "A recruiter has just hired a talent thanks to Jobly!", publicHire: "A hire has just been confirmed thanks to Jobly!", soundOn: "Sound on", soundOff: "Sound off", soundLabel: "Turn notification sound on or off"
  }
};

const AFRICAN_FLAGS = ["🇨🇲", "🇨🇮", "🇸🇳", "🇰🇪", "🇷🇼", "🇬🇭"];
const STORAGE_PREFIX = "jobly:success-moments:v1:";

const DOUALA_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Douala", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});
function doualaParts(date = new Date()) {
  return Object.fromEntries(DOUALA_FORMATTER.formatToParts(date).map((part) => [part.type, part.value]));
}
function dayKey(date = new Date()) { const p = doualaParts(date); return `${p.year}-${p.month}-${p.day}`; }
function weekKey(date = new Date()) {
  const start = new Date(`${dayKey(date)}T12:00:00+01:00`);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return `week-${start.toISOString().slice(0, 10)}`;
}
function randomBetween(min: number, max: number) { return Math.floor(min + Math.random() * (max - min + 1)); }
function randomProfile(): Frequency { const n = Math.random(); return n < 0.2 ? "burst" : n < 0.65 ? "regular" : "rare"; }
function fitInWindow(timestamp: number) {
  const date = new Date(timestamp);
  for (let index = 0; index < 9 * 24 * 60; index += 1) {
    const hour = Number(doualaParts(date).hour);
    if (hour >= 10 && hour < 20) return date.getTime();
    date.setTime(date.getTime() + 60_000);
  }
  return timestamp + 24 * 60 * 60_000;
}
function scheduleNext(profile: Frequency, from = Date.now()) {
  const delay = profile === "burst"
    ? randomBetween(75, 260) * 60_000
    : profile === "regular"
      ? randomBetween(18, 68) * 60 * 60_000
      : randomBetween(5, 8) * 24 * 60 * 60_000;
  return fitInWindow(from + delay);
}
function visitorKey() {
  try {
    let key = localStorage.getItem("jobly:success-moments:visitor");
    if (!key) { key = window.crypto?.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem("jobly:success-moments:visitor", key); }
    return key;
  } catch { return "session-visitor"; }
}
function loadDeliveryState(key: string): DeliveryState {
  let state: DeliveryState | null = null;
  try { state = JSON.parse(localStorage.getItem(key) || "null") as DeliveryState | null; } catch { state = null; }
  const currentWeek = weekKey();
  if (!state || state.weekKey !== currentWeek) {
    const profile = randomProfile();
    state = { weekKey: currentWeek, profile, dayKey: dayKey(), dayCount: 0, weekCount: 0, nextAt: scheduleNext(profile), seen: [] };
  }
  if (!Array.isArray(state.seen)) state.seen = [];
  if (state.dayKey !== dayKey()) { state.dayKey = dayKey(); state.dayCount = 0; }
  if (!Number.isFinite(state.nextAt)) state.nextAt = scheduleNext(state.profile);
  return state;
}
function saveDeliveryState(key: string, state: DeliveryState) {
  try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* Session-only fallback. */ }
}

export default function JoblyVitrine() {
  const [lang, setLang] = useState<Language>("fr");
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [statsUnavailable, setStatsUnavailable] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>({ accountKey: null, role: null });
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const reduceMotion = useReducedMotion();
  const audioReady = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextCopy = copy[lang];

  const refreshStats = useCallback(async (sessionToken: string | null) => {
    try {
      const response = await fetch("/api/public/home-stats", { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("stats unavailable");
      const payload = await response.json() as Partial<HomeStats>;
      if (!Number.isSafeInteger(payload.talentsCount) || (payload.talentsCount ?? -1) < 0 ||
          !Number.isSafeInteger(payload.offersCount) || (payload.offersCount ?? -1) < 0 || typeof payload.updatedAt !== "string") {
        throw new Error("invalid stats payload");
      }

      // A signed-in visitor gets the exact total returned by the Talent offer
      // feed in its pan-African view. This reuses the same server-side filters,
      // freshness rules and recruiter-offer inclusion as /jobs.
      let offersCount = payload.offersCount as number;
      if (sessionToken) {
        const feedResponse = await fetch("/api/jobs?limit=1&page=1&scope=africa", {
          cache: "no-store",
          headers: { Accept: "application/json", Authorization: `Bearer ${sessionToken}` },
        });
        if (!feedResponse.ok) throw new Error("talent feed unavailable");
        const feedPayload = await feedResponse.json() as { totalAvailable?: unknown };
        if (!Number.isSafeInteger(feedPayload.totalAvailable) || (feedPayload.totalAvailable as number) < 0) {
          throw new Error("invalid talent feed total");
        }
        offersCount = feedPayload.totalAvailable as number;
      }

      setStats({ ...(payload as HomeStats), offersCount });
      setStatsUnavailable(false);
    } catch {
      setStatsUnavailable(true);
      // Keep last verified values only when already loaded; never invent a fallback.
    }
  }, []);

  useEffect(() => {
    let active = true;
    let supabase: ReturnType<typeof getSupabaseClient> | null = null;
    let subscription: { unsubscribe: () => void } | null = null;
    const resolveContext = async (accessToken?: string | null) => {
      if (!accessToken) { if (active) { setAccessToken(null); setAudience({ accountKey: null, role: null }); } return; }
      if (active) setAccessToken(accessToken);
      try {
        const response = await fetch("/api/public/site-context", { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
        const context = response.ok ? await response.json() as Audience : null;
        if (active) setAudience({
          accountKey: typeof context?.accountKey === "string" ? context.accountKey : null,
          role: typeof context?.role === "string" ? context.role : null,
        });
      } catch { if (active) setAudience({ accountKey: null, role: null }); }
    };
    try {
      supabase = getSupabaseClient();
      void supabase.auth.getSession().then(({ data, error }) => { if (!error) void resolveContext(data.session?.access_token ?? null); });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => { void resolveContext(session?.access_token ?? null); });
      subscription = data.subscription;
    } catch { setAudience({ accountKey: null, role: null }); }
    return () => { active = false; subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      document.querySelectorAll(".jv-reveal").forEach((node) => node.classList.add("jv-in"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("jv-in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    document.querySelectorAll(".jv-reveal").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [reduceMotion]);

  useEffect(() => {
    void refreshStats(accessToken);
    // The authenticated feed has a stricter rate limit than the public counter;
    // refresh every three minutes and immediately when the tab becomes visible.
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void refreshStats(accessToken); }, 180_000);
    const onVisible = () => { if (document.visibilityState === "visible") void refreshStats(accessToken); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [accessToken, refreshStats]);

  useEffect(() => {
    try { setSoundEnabled(localStorage.getItem("jobly:success-moments:sound") !== "0"); } catch { /* Default on. */ }
    const unlock = () => { audioReady.current = true; };
    document.addEventListener("pointerdown", unlock, { once: true, passive: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => { document.removeEventListener("pointerdown", unlock); document.removeEventListener("keydown", unlock); };
  }, []);

  useEffect(() => {
    let active = true;
    const storageKey = STORAGE_PREFIX + (audience.accountKey || visitorKey());
    const playChime = () => {
      if (!soundEnabled || !audioReady.current) return;
      try {
        const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;
        const context = new AudioContextClass();
        const start = context.currentTime;
        [659.25, 783.99, 987.77].forEach((frequency, index) => {
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          const at = start + index * 0.065;
          oscillator.type = "sine";
          oscillator.frequency.setValueAtTime(frequency, at);
          gain.gain.setValueAtTime(0.0001, at);
          gain.gain.exponentialRampToValueAtTime(0.055, at + 0.018);
          gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.23);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(at);
          oscillator.stop(at + 0.24);
        });
        window.setTimeout(() => void context.close(), 650);
      } catch { /* The visual toast remains available if audio is blocked. */ }
    };
    const deliver = (event: SuccessEvent, state: DeliveryState) => {
      const age = Date.now() - new Date(event.occurredAt).getTime();
      const isRecent = age <= 24 * 60 * 60_000;
      const message = audience.role === "TALENT"
        ? (isRecent ? nextCopy.talentHire : (lang === "fr" ? "Un talent a récemment décroché un emploi grâce à Jobly !" : "A talent recently landed a job thanks to Jobly!"))
        : audience.role === "RECRUITER"
          ? (isRecent ? nextCopy.recruiterHire : (lang === "fr" ? "Un recruteur a récemment recruté un talent grâce à Jobly !" : "A recruiter recently hired a talent thanks to Jobly!"))
          : (isRecent ? nextCopy.publicHire : (lang === "fr" ? "Une embauche a récemment été confirmée grâce à Jobly !" : "A hire was recently confirmed thanks to Jobly!"));
      setSuccessToast(message);
      playChime();
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setSuccessToast(null), 3_000);
      state.seen = [...state.seen, event.id].slice(-160);
      state.dayKey = dayKey(); state.dayCount += 1;
      state.weekKey = weekKey(); state.weekCount += 1;
      state.nextAt = scheduleNext(state.profile);
      if (state.dayCount >= (state.profile === "burst" ? 2 : 1)) state.nextAt = fitInWindow(Date.now() + 24 * 60 * 60_000);
      saveDeliveryState(storageKey, state);
    };
    const poll = async () => {
      if (!active || document.visibilityState !== "visible") return;
      try {
        const response = await fetch("/api/public/success-moments", { cache: "no-store", headers: { Accept: "application/json" } });
        if (!response.ok) return;
        const payload = await response.json() as { events?: SuccessEvent[] };
        const events = Array.isArray(payload.events) ? payload.events.filter((event) =>
          typeof event.id === "string" && typeof event.occurredAt === "string" && Number.isFinite(new Date(event.occurredAt).getTime()),
        ) : [];
        const state = loadDeliveryState(storageKey);
        const hour = Number(doualaParts().hour);
        if (hour < 10 || hour >= 20 || Date.now() < state.nextAt) return;
        if (state.dayKey !== dayKey()) { state.dayKey = dayKey(); state.dayCount = 0; }
        if (state.weekKey !== weekKey()) { state.weekKey = weekKey(); state.profile = randomProfile(); state.weekCount = 0; }
        const dailyLimit = state.profile === "burst" ? 2 : 1;
        const weeklyLimit = state.profile === "burst" ? 8 : state.profile === "regular" ? 3 : 1;
        if (state.dayCount >= dailyLimit || state.weekCount >= weeklyLimit) return;
        const unseen = events.filter((event) => !state.seen.includes(event.id));
        if (unseen.length) deliver(unseen[randomBetween(0, unseen.length - 1)], state);
      } catch {
        // No placeholder toast: an unavailable/empty event feed produces no notification.
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 180_000);
    const onVisible = () => { if (document.visibilityState === "visible") void poll(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener("visibilitychange", onVisible); };
  }, [audience.accountKey, audience.role, lang, nextCopy, soundEnabled]);

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const toggleSound = () => {
    setSoundEnabled((current) => {
      const next = !current;
      try { localStorage.setItem("jobly:success-moments:sound", next ? "1" : "0"); } catch { /* Keep in memory. */ }
      return next;
    });
  };

  const number = (value?: number) => typeof value === "number" ? value.toLocaleString(lang === "fr" ? "fr-FR" : "en-US") : "—";
  const updatedTime = stats?.updatedAt ? new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-US", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Douala" }).format(new Date(stats.updatedAt)) : null;
  const closeMenu = () => setMenuOpen(false);

  return (
    <main className="jobly-vitrine" lang={lang}>
      <header className="jv-header">
        <a className="jv-brand" href="#accueil" aria-label="Jobly — accueil"><span className="jv-brand-mark">J</span><span>jobly<span className="jv-dot">.</span></span></a>
        <nav className="jv-nav" aria-label="Navigation principale">
          <a href="#accueil">{nextCopy.navHome}</a><a href="#ecosysteme">{nextCopy.navEcosystem}</a><a href="#temoignages">{nextCopy.navVoices}</a><a href="#impact">{nextCopy.navImpact}</a>
        </nav>
        <div className="jv-header-actions"><button className="jv-lang" onClick={() => setLang(lang === "fr" ? "en" : "fr")} aria-label="Switch language">{lang === "fr" ? "EN" : "FR"}</button><a className="jv-login" href="/">{nextCopy.login}</a><a className="jv-button jv-button-yellow jv-header-cta" href="/">{nextCopy.join}<span>↗</span></a></div>
        <button className="jv-menu-button" onClick={() => setMenuOpen((open) => !open)} aria-expanded={menuOpen} aria-label="Ouvrir le menu">{menuOpen ? "×" : "☰"}</button>
      </header>
      <AnimatePresence>{menuOpen && <motion.nav className="jv-mobile-nav" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}><a href="#accueil" onClick={closeMenu}>{nextCopy.navHome}</a><a href="#ecosysteme" onClick={closeMenu}>{nextCopy.navEcosystem}</a><a href="#temoignages" onClick={closeMenu}>{nextCopy.navVoices}</a><a href="#impact" onClick={closeMenu}>{nextCopy.navImpact}</a><a href="/" onClick={closeMenu}>{nextCopy.join} ↗</a></motion.nav>}</AnimatePresence>

      <section className="jv-hero" id="accueil">
        <div className="jv-hero-glow" />
        <div className="jv-hero-inner">
          <motion.div className="jv-hero-copy" initial={reduceMotion ? false : { opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65 }}>
            <span className="jv-eyebrow"><i />{nextCopy.eyebrow}</span>
            <h1>{nextCopy.titleA} <em>{nextCopy.titleB}</em></h1>
            <p>{nextCopy.lead}</p>
            <div className="jv-hero-actions"><a className="jv-button jv-button-yellow" href="/">{nextCopy.find}<span>↗</span></a><a className="jv-button jv-button-outline" href="/">{nextCopy.recruit}<span>↗</span></a></div>
            <div className="jv-hero-note"><span>TA</span><span>RE</span><span>PA</span><small>Un même espace. Des parcours, des métiers et des pays différents.</small></div>
          </motion.div>
          <motion.div className="jv-hero-map" initial={reduceMotion ? false : { opacity: 0, scale: .94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .9, delay: .15 }}>
            <div className="jv-orbit" /><div className="jv-map-glow" />
            <svg viewBox="0 0 480 520" role="img" aria-label="Carte stylisée de l'Afrique reliée par des points" className="jv-africa-svg"><defs><linearGradient id="jvAfrica" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd60a"/><stop offset="1" stopColor="#2878e5"/></linearGradient></defs><path fill="url(#jvAfrica)" opacity=".86" d="M215 24 C249 18 270 37 296 48 L322 52 341 73 371 87 381 110 408 128 403 153 423 172 410 193 390 205 376 234 365 254 356 282 342 307 331 339 315 368 304 397 286 421 273 461 249 495 230 478 215 450 200 428 187 399 171 371 157 342 143 312 128 286 115 259 108 230 93 206 81 178 91 153 103 132 109 105 135 94 150 73 175 57 195 34Z"/><g fill="none" stroke="#e9f4ff" strokeWidth="2" opacity=".5"><path d="M117 180 Q235 83 345 180 T390 302 M122 247 Q225 150 344 247 T307 377 M153 320 Q244 220 357 312"/></g><g fill="#fff" stroke="#2878e5" strokeWidth="4"><circle cx="132" cy="176" r="8"/><circle cx="225" cy="125" r="9"/><circle cx="285" cy="213" r="8"/><circle cx="349" cy="270" r="9"/><circle cx="245" cy="333" r="8"/><circle cx="295" cy="389" r="7"/></g></svg>
            <div className="jv-map-pin jv-pin-cm"><b>🇨🇲</b><span>CAMEROUN<small>Talents & opportunités</small></span></div><div className="jv-map-pin jv-pin-ci"><b>🇨🇮</b><span>CÔTE D'IVOIRE<small>Recrutement</small></span></div><div className="jv-map-pin jv-pin-ke"><b>🇰🇪</b><span>KENYA<small>Mobilité</small></span></div>
            <div className="jv-community-card"><div><strong>{nextCopy.community}</strong><span>{nextCopy.network}</span></div><p>{AFRICAN_FLAGS.map((flag) => <b key={flag}>{flag}</b>)}</p><small>{nextCopy.countries}</small></div>
          </motion.div>
        </div>
      </section>

      <div className="jv-ticker"><div>{[...nextCopy.ticker, ...nextCopy.ticker].map((item, index) => <span key={`${item}-${index}`}>{item}<i /></span>)}</div></div>

      <section className="jv-section" id="ecosysteme">
        <div className="jv-section-head jv-reveal"><span className="jv-section-eyebrow">{nextCopy.ecoEyebrow}</span><h2>{nextCopy.ecoTitle}</h2><p>{nextCopy.ecoLead}</p></div>
        <div className="jv-eco-grid"><article className="jv-eco-card jv-reveal"><div className="jv-eco-media"><img src="/images/jobly-vitrine/talent-learning.webp" alt={lang === "fr" ? "Trois jeunes talents collaborent autour d’un projet" : "Three young talents collaborating on a project"} loading="lazy" decoding="async" /></div><div className="jv-eco-icon">♙</div><h3>{nextCopy.talent}</h3><p>{nextCopy.talentText}</p><a href="/">{nextCopy.find} ↗</a></article><article className="jv-eco-card jv-reveal"><div className="jv-eco-media"><img src="/images/jobly-vitrine/recruiter-focus.webp" alt={lang === "fr" ? "Une professionnelle travaille sur un ordinateur portable" : "A professional working on a laptop"} loading="lazy" decoding="async" /></div><div className="jv-eco-icon">▣</div><h3>{nextCopy.recruiter}</h3><p>{nextCopy.recruiterText}</p><a href="/">{nextCopy.recruit} ↗</a></article><article className="jv-eco-card jv-reveal"><div className="jv-eco-media"><img src="/images/jobly-vitrine/partner-network.webp" alt={lang === "fr" ? "Des professionnelles échangent avec leurs dossiers" : "Professionals discussing their work with folders"} loading="lazy" decoding="async" /></div><div className="jv-eco-icon">⌘</div><h3>{nextCopy.partner}</h3><p>{nextCopy.partnerText}</p><a href="#partenaires">{nextCopy.navPartners} ↗</a></article></div>
      </section>

      <section className="jv-pulse-wrap"><div className="jv-pulse jv-reveal"><div className="jv-pulse-copy"><span className="jv-section-eyebrow">{nextCopy.pulseEyebrow}</span><h2>{nextCopy.pulseTitle}</h2><p>{nextCopy.pulseText}</p></div><div className="jv-stats"><div className="jv-stat"><small><i />{nextCopy.talents}</small><strong>{number(stats?.talentsCount)}</strong><span>{nextCopy.talentNote}</span></div><div className="jv-stat"><small><i />{nextCopy.offers}</small><strong>{number(stats?.offersCount)}</strong><span>{nextCopy.offerNote}</span></div></div><div className="jv-pulse-foot">{statsUnavailable ? nextCopy.syncError : updatedTime ? `${lang === "fr" ? "Données synchronisées" : "Data synchronized"} · ${updatedTime} · Africa/Douala` : nextCopy.sync}</div></div></section>

      <section className="jv-section jv-voices" id="temoignages"><div className="jv-section-head jv-reveal"><span className="jv-section-eyebrow">{nextCopy.voiceEyebrow}</span><h2>{nextCopy.voiceTitle}</h2><p>{nextCopy.voiceLead}</p></div><div className="jv-voice-empty jv-reveal"><span className="jv-quote-mark">“</span><div><h3>{nextCopy.voiceEmptyTitle}</h3><p>{nextCopy.voiceEmptyText}</p></div><strong>🇨🇲 🇨🇮 🇸🇳 🇰🇪 🇷🇼</strong></div></section>

      <section className="jv-impact" id="impact"><div className="jv-impact-inner"><div className="jv-section-head jv-reveal"><span className="jv-section-eyebrow">{nextCopy.impactEyebrow}</span><h2>{nextCopy.impactTitle}</h2><p>{nextCopy.impactLead}</p></div><div className="jv-impact-grid"><article className="jv-reveal"><strong>{nextCopy.impactTalent}</strong><p>{nextCopy.impactTalentText}</p></article><article className="jv-reveal"><strong>{nextCopy.impactRecruiter}</strong><p>{nextCopy.impactRecruiterText}</p></article><article className="jv-reveal"><strong>{nextCopy.impactPartner}</strong><p>{nextCopy.impactPartnerText}</p></article><article className="jv-reveal"><strong>{nextCopy.impactAfrica}</strong><p>{nextCopy.impactAfricaText}</p></article></div></div></section>

      <section className="jv-network" id="partenaires"><div className="jv-network-inner jv-reveal"><div><span className="jv-section-eyebrow">{nextCopy.networkEyebrow}</span><h2>{nextCopy.networkTitle}</h2><p>{nextCopy.networkText}</p></div><div className="jv-network-flags">{AFRICAN_FLAGS.map((flag, index) => <span key={flag} style={{ animationDelay: `${index * .12}s` }}>{flag}</span>)}</div></div></section>

      <section className="jv-final"><div><h2>{nextCopy.ctaTitle}</h2><p>{nextCopy.ctaText}</p></div><a href="/" className="jv-button jv-button-yellow">{nextCopy.cta} <span>↗</span></a></section>
      <footer className="jv-footer"><a className="jv-brand" href="#accueil"><span className="jv-brand-mark">J</span><span>jobly<span className="jv-dot">.</span></span></a><p>{nextCopy.footer}</p><span>© {new Date().getFullYear()} Jobly. {lang === "fr" ? "Tous droits réservés." : "All rights reserved."}</span></footer>

      <AnimatePresence>{successToast && <motion.aside className="jv-success-toast" role="status" aria-live="polite" initial={{ opacity: 0, x: 22, y: 10, scale: .98 }} animate={{ opacity: 1, x: 0, y: 0, scale: 1 }} exit={{ opacity: 0, x: 15, y: 8 }} transition={{ duration: .28 }}><span className="jv-toast-icon">✦</span><div><strong>{nextCopy.toastTitle}</strong><p>{successToast}</p><button onClick={toggleSound} aria-label={nextCopy.soundLabel} aria-pressed={soundEnabled}>{soundEnabled ? nextCopy.soundOn : nextCopy.soundOff}</button></div><button className="jv-toast-close" onClick={() => setSuccessToast(null)} aria-label="Close notification">×</button><span className="jv-toast-progress" /></motion.aside>}</AnimatePresence>
    </main>
  );
}
