"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Building2, Check, ExternalLink, RefreshCw, Send, Sparkles, X, Search, SlidersHorizontal, ShoppingBag, CheckSquare, Upload, Pencil, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { companyAvatar } from "@/lib/avatar";
import CompanyLogo from "@/components/CompanyLogo";
import BottomNav, { TALENT_NAV } from "@/components/BottomNav";

type CompanyWebProfile = {
  name: string;
  address: string | null;
  location: { lat: number; lng: number } | null;
  phone: string | null;
  website: string | null;
  mapsUrl: string | null;
  activity: string[];
  status: string | null;
  rating: number | null;
  reviewCount: number | null;
  description: string | null;
  news: Array<{ title: string; link: string; publishedAt: string | null }>;
  source: string[];
  logoUrl?: string | null;
};

type Job = {
  source: "discovery" | "recruiter";
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  remoteMode: string | null;
  company: { id: string | null; name: string; logoUrl: string | null; description: string | null; website: string | null; domain?: string | null; verified: boolean } | null;
  matchPercent: number;
  publishedAt: string | null;
  expirationAt: string | null;
  deadline: string | null;
  applicationReady: boolean;
  applicationProfile: { channel?: string; phoneNumbers?: string[]; comingSoon?: boolean };
  visualUrl: string | null;
  visualSource: string | null;
  matchConfidence?: number;
  matchBreakdown?: Array<{ id: string; label: string; score: number | null; weight: number; required: boolean; status: "MATCH"|"PARTIAL"|"MISMATCH"|"UNKNOWN"; candidateValue?: string | null; expectedValue?: string | null }>;
};

function formatDate(value: string | null) { if (!value) return "Aucune donnée"; return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }

export function JoblyOfferFeed() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [applicationReadyKeys, setApplicationReadyKeys] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<Set<string>>(new Set());
  const [selectedCompany, setSelectedCompany] = useState<Job["company"]>(null);
  const [selectedCompanyLocation, setSelectedCompanyLocation] = useState<string | null>(null);
  const [companyWebProfile, setCompanyWebProfile] = useState<CompanyWebProfile | null>(null);
  const [companyWebLoading, setCompanyWebLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Job | null>(null);
  const [basket, setBasket] = useState<Set<string>>(new Set());
  const [bulkLimit, setBulkLimit] = useState(1);
  const [preparedBulk, setPreparedBulk] = useState<Array<{ id: string; key: string; job: Job; letter: string; tailoredCvText: string; letterSource: "JIA" | "CANDIDATE" }>>([]);
  const [editingLetterId, setEditingLetterId] = useState<string | null>(null);
  const [importingLetterId, setImportingLetterId] = useState<string | null>(null);
  const [bulkPreparing, setBulkPreparing] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [feedMeta, setFeedMeta] = useState({ totalAvailable: 0, matchingCount: 0 });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Toutes");
  const [matchOnly, setMatchOnly] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [topMatchCanScrollLeft, setTopMatchCanScrollLeft] = useState(false);
  const [topMatchCanScrollRight, setTopMatchCanScrollRight] = useState(true);
  const [topMatchHover, setTopMatchHover] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const offersStartRef = useRef<HTMLElement | null>(null);

  // Deep link : /jobs?q=stage (ex. CTA « Chercher un stage » de l’espace Campus).
  useEffect(() => {
    try { const q = new URLSearchParams(window.location.search).get("q"); if (q) setQuery(q.slice(0, 80)); } catch {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    getSupabaseClient().auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.session) {
          router.replace("/");
          return;
        }
        setToken(data.session.access_token);
      })
      .finally(() => {
        if (!cancelled) setSessionLoading(false);
      });
    return () => { cancelled = true; };
  }, [router]);

  const load = useCallback(async (manual = false) => {
    if (!token) return;
    manual ? setRefreshing(true) : setLoading(true); setError("");
    try {
      const [jobsRes, appsRes] = await Promise.all([
        fetch("/api/jobs?limit=200&page=1", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/applications", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const jobsBody = await jobsRes.json(); if (!jobsRes.ok) throw new Error(jobsBody.message || "Impossible de charger les offres.");
      setJobs(jobsBody.jobs || []); setFeedMeta({ totalAvailable: jobsBody.totalAvailable || 0, matchingCount: jobsBody.matchingCount || 0 });
      if (appsRes.ok) { const body = await appsRes.json(); setApplied(new Set((body.applications || []).filter((a: any) => ["SUBMITTED","SUBMITTING"].includes(a.status)).map((a: any) => `${a.source}:${a.jobId || a.recruiterJobId}`))); setApplicationReadyKeys(new Set((body.applications || []).filter((a: any) => ["USER_REVIEW","PREPARED"].includes(a.status)).map((a: any) => `${a.source}:${a.jobId || a.recruiterJobId}`))); }
      const bulkInfoRes = await fetch("/api/applications/bulk-check", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ selectedCount: 0 }) });
      if (bulkInfoRes.ok) { const bulkInfo = await bulkInfoRes.json().catch(() => ({})); setBulkLimit(Number(bulkInfo.bulkApplicationLimit || 1)); }
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur réseau."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    try { setSaved(new Set(JSON.parse(localStorage.getItem("jobly:jia:saved-offers") || "[]"))); } catch {}
    try { setBasket(new Set(JSON.parse(localStorage.getItem("jobly:jia:application-basket") || "[]"))); } catch {}
  }, []);

  useEffect(() => {
    if (!selectedCompany?.name) {
      setCompanyWebProfile(null);
      setSelectedCompanyLocation(null);
      return;
    }
    let cancelled = false;
    setCompanyWebLoading(true);
    setCompanyWebProfile(null);
    const params = new URLSearchParams({
      name: selectedCompany.name,
      website: selectedCompany.website || "",
      location: selectedCompanyLocation || "",
    });
    fetch(`/api/company-profile?${params.toString()}`)
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || "Impossible de récupérer les données de l'entreprise.");
        return body as CompanyWebProfile;
      })
      .then(data => { if (!cancelled) setCompanyWebProfile(data); })
      .catch(() => { if (!cancelled) setCompanyWebProfile(null); })
      .finally(() => { if (!cancelled) setCompanyWebLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCompany, selectedCompanyLocation]);

  const toggleBasket = useCallback((job: Job) => {
    const key = `${job.source}:${job.id}`;
    if (applied.has(key) || applicationReadyKeys.has(key)) return;
    setBasket(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem("jobly:jia:application-basket", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [applied, applicationReadyKeys]);

  const basketJobs = useMemo(() => jobs.filter(job => basket.has(`${job.source}:${job.id}`) && !applied.has(`${job.source}:${job.id}`) && !applicationReadyKeys.has(`${job.source}:${job.id}`)), [jobs, basket, applied, applicationReadyKeys]);

  const toggleSaved = useCallback((job: Job) => {
    const key = `${job.source}:${job.id}`;
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem("jobly:jia:saved-offers", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  async function prepareSingleApplication(job: Job) {
    if (!token || bulkPreparing) return;
    setBulkPreparing(true); setError("");
    try {
      const gmailStatusRes = await fetch("/api/talent/gmail/status", { headers: { Authorization: `Bearer ${token}` } });
      const gmailStatus = await gmailStatusRes.json().catch(() => ({}));
      if (gmailStatusRes.ok && !gmailStatus.connected) { window.location.href = "/api/talent/gmail/connect"; return; }
      const prepareRes = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ source: job.source, jobId: job.id }) });
      const preparedBody = await prepareRes.json().catch(() => ({}));
      if (!prepareRes.ok) throw new Error(preparedBody.message || "La candidature n'a pas pu être préparée.");
      const applicationId = preparedBody.application?.id;
      if (!applicationId) throw new Error("La candidature a été préparée sans identifiant exploitable.");
      setPreparedBulk([{
        id: applicationId, key: `${job.source}:${job.id}`, job,
        letter: String(preparedBody.prepared?.letter || ""), tailoredCvText: String(preparedBody.prepared?.tailoredCvText || ""),
        letterSource: preparedBody.prepared?.letterSource === "CANDIDATE" ? "CANDIDATE" : "JIA",
      }]);
    } catch (e) { setError(e instanceof Error ? e.message : "La préparation de la candidature a échoué."); }
    finally { setBulkPreparing(false); }
  }

  async function apply(job: Job) {
    if (!token) return;
    const key = `${job.source}:${job.id}`;
    if (applied.has(key) || applicationReadyKeys.has(key) || submitting.has(key) || bulkPreparing) return;
    await prepareSingleApplication(job);
  }

  async function prepareBulkApplications() {
    if (!token || basketJobs.length === 0 || bulkPreparing) return;
    setBulkPreparing(true); setError("");
    try {
      const checkRes = await fetch("/api/applications/bulk-check", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ selectedCount: basketJobs.length }) });
      const checkBody = await checkRes.json().catch(() => ({}));
      if (!checkRes.ok) throw new Error(checkBody.message || "La postulation groupée n'est pas disponible avec votre formule.");
      const gmailStatusRes = await fetch("/api/talent/gmail/status", { headers: { Authorization: `Bearer ${token}` } });
      const gmailStatus = await gmailStatusRes.json().catch(() => ({}));
      if (gmailStatusRes.ok && !gmailStatus.connected) { window.location.href = "/api/talent/gmail/connect"; return; }
      const prepared: Array<{ id: string; key: string; job: Job; letter: string; tailoredCvText: string; letterSource: "JIA" | "CANDIDATE" }> = [];
      for (const job of basketJobs) {
        const key = `${job.source}:${job.id}`;
        const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ source: job.source, jobId: job.id }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (prepared.length) { setPreparedBulk(prepared); setBasket(new Set()); try { localStorage.setItem("jobly:jia:application-basket", "[]"); } catch {} }
          throw new Error(body.message || `Impossible de préparer ${job.title}.`);
        }
        const id = body.application?.id;
        if (id) prepared.push({ id, key, job, letter: String(body.prepared?.letter || ""), tailoredCvText: String(body.prepared?.tailoredCvText || ""), letterSource: body.prepared?.letterSource === "CANDIDATE" ? "CANDIDATE" : "JIA" });
      }
      setPreparedBulk(prepared);
      setBasket(new Set());
      try { localStorage.setItem("jobly:jia:application-basket", "[]"); } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : "La préparation groupée a échoué.");
    } finally { setBulkPreparing(false); }
  }

  function editPreparedBulk() {
    setPreparedBulk([]);
    setEditingLetterId(null);
    setImportingLetterId(null);
  }

  async function submitBulkApplications() {
    if (!token || preparedBulk.length === 0 || bulkSubmitting) return;
    setBulkSubmitting(true); setError("");
    const remaining: typeof preparedBulk = [];
    for (const item of preparedBulk) {
      try {
        const res = await fetch(`/api/applications/${item.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ letterText: item.letter }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 202) { remaining.push(item); continue; }
        if (body.submitted || res.status === 202) setApplied(prev => new Set(prev).add(item.key));
      } catch { remaining.push(item); }
    }
    if (remaining.length) {
      setPreparedBulk(remaining);
      setError(`${preparedBulk.length - remaining.length}/${preparedBulk.length} candidatures envoyées. Les autres restent prêtes à être envoyées.`);
    } else setPreparedBulk([]);
    setBulkSubmitting(false);
  }

  const focusMatch = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get("focus") === "match"; } catch { return false; }
  }, []);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = jobs.filter(job => {
      const haystack = [job.title, job.location, job.contractType, job.remoteMode, job.company?.name].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      const matchesFilter = filter === "Toutes" || (filter === "Remote" ? String(job.remoteMode || "").toLowerCase().includes("remote") : String(job.contractType || "").toLowerCase().includes(filter.toLowerCase()));
      return matchesQuery && matchesFilter && (!matchOnly || job.matchPercent >= 50);
    });
    return focusMatch ? [...result].sort((a, b) => b.matchPercent - a.matchPercent) : result;
  }, [jobs, query, filter, focusMatch, matchOnly]);

function normalizeVoice(text: string) { return text.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase(); }

  useEffect(() => {
    const respond = (message: string, gesture: string = "reassure") => {
      window.dispatchEvent(new CustomEvent("jobly:jia-response", { detail: { message, gesture } }));
    };
    const onJiaCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ command?: string; intent?: string }>).detail || {};
      const command = String(detail.command || "").trim();
      const intent = detail.intent || "";
      if (!command) return;
      if (intent === "search_jobs") {
        setQuery("");
        setFilter("Toutes");
        respond("Je recherche les meilleures offres compatibles avec ton profil.", "analyze");
        return;
      }
      if (intent === "filter_jobs") {
        const lower = command.toLowerCase();
        const next = lower.includes("cdi") ? "CDI" : lower.includes("cdd") ? "CDD" : lower.includes("stage") ? "Stage" : lower.includes("remote") || lower.includes("télétravail") ? "Remote" : "Toutes";
        setFilter(next);
        respond(next === "Toutes" ? "Dis-moi le filtre souhaité : CDI, CDD, stage ou télétravail." : "C’est filtré.", "filter");
        return;
      }
      if (intent === "open_job") {
        const indexMatch = command.match(/\\b(premi(?:è|e)re|deuxi(?:è|e)me|troisi(?:è|e)me|[1-9])\\b/i);
        const index = indexMatch ? ({ "premiere": 0, "première": 0, "deuxieme": 1, "deuxième": 1, "troisieme": 2, "troisième": 2 } as Record<string, number>)[normalizeVoice(indexMatch[1])] ?? Number(indexMatch[1]) - 1 : 0;
        const job = filteredJobs[Math.max(0, Math.min(index, filteredJobs.length - 1))];
        if (!job) { respond("Je n’ai aucune offre à ouvrir pour le moment.", "curious"); return; }
        router.push(`/jobs/${job.id}?source=${job.source}`);
        respond("J’ouvre l’offre.", "point");
        return;
      }
      if (intent === "apply_job") {
        if (filteredJobs.length === 1) { void apply(filteredJobs[0]); respond("Je lance la candidature pour cette offre.", "apply"); return; }
        respond("Dis-moi quelle offre : par exemple « J’IA, postule à la deuxième ».", "curious");
        return;
      }
      if (intent === "save_job") {
        respond("Je peux préparer cette sauvegarde, mais le bouton Favori doit être disponible sur l’offre concernée.", "reassure");
        return;
      }
      respond("J’ai reçu ta commande. Je vais te guider dans Jobly.", "analyze");
    };
    window.addEventListener("jobly:jia-command", onJiaCommand);
    return () => window.removeEventListener("jobly:jia-command", onJiaCommand);
  }, [filteredJobs, router, apply, toggleSaved, saved]);
  const featured = useMemo(() => filteredJobs.slice(0, 6), [filteredJobs]);
  const topMatchRef = useRef<HTMLDivElement | null>(null);
  const updateTopMatchArrows = useCallback(() => {
    const container = topMatchRef.current;
    if (!container) return;
    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    setTopMatchCanScrollLeft(container.scrollLeft > 4);
    setTopMatchCanScrollRight(container.scrollLeft < maxScroll - 4);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const syncPointer = () => setCoarsePointer(media.matches);
    syncPointer();
    media.addEventListener?.("change", syncPointer);
    return () => media.removeEventListener?.("change", syncPointer);
  }, []);

  useEffect(() => {
    updateTopMatchArrows();
    const container = topMatchRef.current;
    if (!container) return;
    container.addEventListener("scroll", updateTopMatchArrows, { passive: true });
    window.addEventListener("resize", updateTopMatchArrows);
    return () => {
      container.removeEventListener("scroll", updateTopMatchArrows);
      window.removeEventListener("resize", updateTopMatchArrows);
    };
  }, [featured.length, updateTopMatchArrows]);

  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY < 320) {
        setShowBackToTop(false);
        return;
      }
      const twentiethOffer = document.querySelector<HTMLElement>('[data-offer-index="20"]');
      if (!twentiethOffer) return;
      setShowBackToTop(twentiethOffer.getBoundingClientRect().top <= window.innerHeight * 0.82);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [jobs.length, filteredJobs.length]);

  useEffect(() => {
    const container = topMatchRef.current;
    if (!container || featured.length <= 1) return;

    const timer = window.setInterval(() => {
      const firstCard = container.querySelector<HTMLElement>("[data-top-match-card]");
      if (!firstCard) return;
      const gap = 16;
      const step = firstCard.offsetWidth + gap;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const next = container.scrollLeft + step;
      container.scrollTo({ left: next >= maxScroll - 4 ? 0 : next, behavior: "smooth" });
    }, 3000);

    return () => window.clearInterval(timer);
  }, [featured.length]);


  const rest = useMemo(() => filteredJobs.slice(6), [filteredJobs]);
  const scrollTopMatches = useCallback((direction: number) => {
    topMatchRef.current?.scrollBy({ left: direction * 350, behavior: "smooth" });
  }, []);
  const feedSummary = feedMeta.totalAvailable ? `${feedMeta.totalAvailable} offre${feedMeta.totalAvailable > 1 ? "s" : ""} disponible${feedMeta.totalAvailable > 1 ? "s" : ""} aujourd’hui` : "Marché en cours de synchronisation";

  if (sessionLoading || (loading && !jobs.length)) return (
    <main className="min-h-[100dvh] bg-[#F5F7F8] pb-28 text-[#17212B]">
      <div className="mx-auto max-w-6xl space-y-5 p-5 sm:p-8">
        <div className="animate-pulse rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="h-3 w-32 rounded-full bg-slate-200"/>
          <div className="mt-4 h-10 w-3/4 rounded-xl bg-slate-200"/>
          <div className="mt-3 h-4 w-full max-w-xl rounded-full bg-slate-100"/>
          <div className="mt-8 h-48 rounded-[26px] bg-slate-100"/>
        </div>
        <div className="flex items-center justify-center gap-3 py-4 text-sm font-bold text-slate-500">
          <RefreshCw size={16} className="animate-spin"/>
          <span>Chargement des offres…</span>
        </div>
      </div>
      <BottomNav active="/jobs" items={TALENT_NAV} />
    </main>
  );

  return <main className="min-h-[100dvh] bg-[#F5F7F8] pb-28 text-[#17212B]">
    <section className="relative mx-auto max-w-6xl px-5 pb-8 pt-7 sm:px-8">
      <motion.div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-[#7A9BB5]/30 blur-3xl" animate={{ x: [0, -30, 0], y: [0, 25, 0], scale: [1, 1.1, 1] }} transition={{ duration: 12, repeat: Infinity }} />
      <div className="relative z-10 flex items-end justify-between gap-4"><div><h1 className="mt-2 text-4xl font-black leading-[.95] tracking-[-.045em] text-[#0057B8] sm:text-6xl">Offres</h1><p className="mt-3 max-w-xl text-base font-black text-[#FFE135]">J’IA se charge de tout</p></div><button type="button" onClick={() => load(true)} aria-label="Actualiser les offres d’emploi" title="Actualiser les offres d’emploi" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#FFE135] px-4 text-sm font-black text-[#2E3F4F] shadow-[0_8px_24px_rgba(255,225,53,.28)] transition hover:scale-[1.02] active:scale-[.98] disabled:opacity-60" disabled={refreshing}><RefreshCw size={18} className={refreshing ? "animate-spin" : ""}/><span>{refreshing ? "Actualisation…" : "Actualiser les offres"}</span></button></div>
      {error && <div className="relative z-10 mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm font-bold">{error}</div>}
      <div className="relative z-10 mt-5 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[1px] text-slate-500"><button type="button" onClick={() => setMatchOnly(v => !v)} className={matchOnly ? "rounded-full border border-[#F97316] bg-[#F97316] px-3 py-2 text-white shadow-[0_8px_22px_rgba(249,115,22,.24)]" : "rounded-full border border-[#F97316]/30 bg-[#FFF7ED] px-3 py-2 text-[#C2410C]"}>Les offres qui vous correspondent · {feedMeta.matchingCount}</button></div>
    </section>

    <section ref={offersStartRef} id="jobly-offers-start" className="mx-auto max-w-6xl px-5 scroll-mt-6 sm:px-8">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="mt-1 text-xl font-black text-[#00A6A6]">{feedSummary}</h2></div><div className="flex flex-col gap-2 sm:flex-row"><form onSubmit={e => { e.preventDefault(); setQuery(query.trim()); }} className="flex h-11 min-w-[280px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm"><Search size={16} className="text-[#22448B]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Métier, entreprise, ville…" aria-label="Rechercher une offre" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"/><button type="submit" aria-label="Rechercher" title="Rechercher" className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#22448B] text-white transition hover:bg-[#17346E]"><Search size={14}/></button></form><div className="flex gap-2 overflow-x-auto">{["Toutes","CDI","CDD","Stage","Remote"].map(item => <button key={item} onClick={() => setFilter(item)} className={filter === item ? "whitespace-nowrap rounded-2xl bg-[#FFE135] px-4 py-3 text-xs font-black text-[#17212B]" : "whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-500"}>{item}</button>)}</div></div></div>
      {featured.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Vos meilleurs offres</p>
              <p className="mt-1 text-xs text-slate-400">Les offres qui correspondent le mieux à votre profil actuel</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[1px] text-slate-500">← →</span>
          </div>
          <div className="relative" onMouseEnter={() => setTopMatchHover(true)} onMouseLeave={() => setTopMatchHover(false)}>
            <button type="button" aria-label="Voir les meilleures offres précédentes" onClick={() => scrollTopMatches(-1)} disabled={!topMatchCanScrollLeft} className={topMatchHover || coarsePointer ? "absolute left-1 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/80 text-[#FFE135] shadow-[0_8px_28px_rgba(255,225,53,.45)] backdrop-blur-xl transition-all duration-300" : "absolute left-1 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/80 text-[#FFE135] shadow-[0_8px_28px_rgba(255,225,53,.45)] backdrop-blur-xl transition-all duration-300"}>{<ChevronLeft size={21}/>}</button>
            <button type="button" aria-label="Voir les meilleures offres suivantes" onClick={() => scrollTopMatches(1)} disabled={!topMatchCanScrollRight} className={topMatchHover || coarsePointer ? "absolute right-1 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/80 text-[#FFE135] shadow-[0_8px_28px_rgba(255,225,53,.45)] backdrop-blur-xl transition-all duration-300" : "absolute right-1 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/80 text-[#FFE135] shadow-[0_8px_28px_rgba(255,225,53,.45)] backdrop-blur-xl transition-all duration-300"}>{<ChevronRight size={21}/>}</button>
            <div
              ref={topMatchRef}
              className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3"
              aria-label="Vos meilleures offres — offres en cascade horizontale"
            >
            {featured.map((job, index) => {
              const key = `${job.source}:${job.id}`;
              const done = applied.has(key);
              const ready = applicationReadyKeys.has(key);
              const busy = submitting.has(key);
              const phoneComingSoon = job.applicationProfile?.channel === "WHATSAPP_PHONE";
              return (
                <motion.article
                  key={key}
                  data-top-match-card
                  layout
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * .08 }}
                  className="relative min-w-[88%] snap-start overflow-hidden rounded-[32px] border border-white/15 bg-white p-3 opacity-90 shadow-[0_18px_60px_rgba(23,33,43,.10)] transition-all duration-300 ease-out hover:opacity-100 sm:min-w-[70%] lg:min-w-[calc((100%-2rem)/3)]"
                >
                  <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-[26px] bg-[#EEF2F6]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,225,53,.28),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(46,63,79,.18),transparent_42%)]"/>
                    {job.visualUrl ? <motion.img src={job.visualUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} animate={{ scale: [1, 1.035, 1] }} transition={{ duration: 8, repeat: Infinity }}/> : null}
                    <div className="relative z-10 grid h-24 w-24 place-items-center rounded-[24px] border border-white/70 bg-white/95 shadow-xl">
                      <CompanyLogo companyName={job.company?.name} domain={job.company?.domain} website={job.company?.website} logoUrl={job.company?.logoUrl || (job.visualSource === "COMPANY_LOGO" ? job.visualUrl : null)} size={68}/>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2E3F4F]/70 via-transparent to-transparent"/>
                    <span className="absolute left-3 top-3 rounded-full bg-[#FFE135] px-3 py-1 text-[9px] font-black uppercase tracking-[1.4px] text-[#2E3F4F]">Meilleure offre</span>
                    <button type="button" onClick={() => setSelectedMatch(job)} aria-label={`Voir le score de compatibilité de ${job.matchPercent}%`} title="Voir le détail du score" className="absolute bottom-2 right-2 rounded-2xl px-2 py-1 text-right transition hover:bg-black/15 focus:outline-none focus:ring-2 focus:ring-[#FFE135]"><strong className="block text-4xl font-black text-[#FFE135]">{job.matchPercent}%</strong><span className="text-[8px] font-black uppercase tracking-[1px] text-white/85">Voir mon score</span></button>
                  </div>
                  <div className="p-3">
                    <div className="mt-1 flex items-center gap-2">
                      <CompanyLogo companyName={job.company?.name} domain={job.company?.domain} website={job.company?.website} logoUrl={job.company?.logoUrl || (job.visualSource === "COMPANY_LOGO" ? job.visualUrl : null)} size={32}/>
                      <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[1.5px] text-[#7A9BB5]">{job.company?.name || "Aucune donnée"}</p>
                    </div>
                    <h2 className="mt-1 text-2xl font-black leading-none">{job.title}</h2>
                    <p className="mt-3 text-xs text-slate-500">{[job.location, job.contractType, job.remoteMode].filter(Boolean).join(" · ") || "Toutes localisations"}</p>
                    <div className="mt-3 text-[10px] text-slate-500">Publié · <b className="text-slate-700">{formatDate(job.publishedAt)}</b></div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => job.applicationReady ? apply(job) : router.push(`/jobs/${job.id}?source=${job.source}`)} disabled={done || ready || busy} className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#FFE135] text-sm font-black text-[#2E3F4F] disabled:bg-slate-100 disabled:text-slate-400">
                        {done ? <><Check size={17} className="mr-2"/>Candidature envoyée</> : ready ? "Candidature prête" : busy ? <><RefreshCw size={17} className="mr-2 animate-spin"/>Envoi en cours…</> : <><Send size={17} className="mr-2"/>{job.applicationReady ? "Postuler avec J’IA" : phoneComingSoon ? "COMING SOON" : "Postuler"}</>}
                      </button>
                      <button onClick={() => toggleBasket(job)} aria-label={basket.has(key) ? "Retirer du panier" : "Ajouter au panier"} className={basket.has(key) ? "grid h-12 w-12 place-items-center rounded-full bg-[#FFE135] text-[#2E3F4F]" : "grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-[#B59A00]"}>{basket.has(key) ? <CheckSquare size={18}/> : <ShoppingBag size={18}/>}</button>
                      <button onClick={() => { setSelectedCompany(job.company || { id: null, name: "Aucune donnée", logoUrl: null, description: null, website: null, domain: null, verified: false }); setSelectedCompanyLocation(job.location); }} aria-label="Voir les informations sur l’entreprise" title="Informations sur l’entreprise" className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-[#B59A00]"><Building2 size={18}/></button>
                      <button onClick={() => router.push(`/jobs/${job.id}?source=${job.source}`)} aria-label="Voir l'offre" className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-[#B59A00]"><ArrowUpRight size={18}/></button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-3 md:grid-cols-2">{rest.map((job, index) => { const key = `${job.source}:${job.id}`; const done = applied.has(key); const ready = applicationReadyKeys.has(key); const busy = submitting.has(key); const selected = basket.has(key); const phoneComingSoon = job.applicationProfile?.channel === "WHATSAPP_PHONE"; return <motion.article key={key} data-offer-index={index + 7} layout initial={{ opacity: 0.9, y: 8 }} animate={{ opacity: 0.9, y: 0 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ amount: 0.45 }} whileHover={!coarsePointer ? { scale: 1.03, y: -4, zIndex: 10 } : undefined} className={selected ? "group rounded-[24px] border-2 border-[#FFE135] bg-white p-3 opacity-90 shadow-[0_10px_32px_rgba(23,33,43,.07)] transition-all duration-300 ease-out hover:opacity-100" : "group rounded-[24px] border border-white/10 bg-white p-3 opacity-90 shadow-[0_10px_32px_rgba(23,33,43,.07)] transition-all duration-300 ease-out hover:opacity-100"}><div className="flex gap-3"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white"><CompanyLogo companyName={job.company?.name} logoUrl={job.company?.logoUrl || (job.visualSource === "COMPANY_LOGO" ? job.visualUrl : null)} domain={job.company?.domain} website={job.company?.website} size={46}/></div><div className="min-w-0 flex-1"><p className="line-clamp-2 break-words text-[10px] font-bold uppercase tracking-[1.1px] text-[#7A9BB5]">{job.company?.name || "Aucune donnée"}</p><h2 className="mt-0.5 text-base font-black">{job.title}</h2><p className="mt-1 text-[11px] text-slate-500">{[job.location, job.contractType].filter(Boolean).join(" · ") || "Aucune donnée"}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">Publié {formatDate(job.publishedAt)}</p></div><button type="button" onClick={() => setSelectedMatch(job)} aria-label={`Voir le score de compatibilité de ${job.matchPercent}%`} title="Voir le détail du score" className="rounded-xl px-1 text-right transition hover:bg-[#FFFBE0] focus:outline-none focus:ring-2 focus:ring-[#FFE135]"><strong className="block text-xl font-black text-[#B59A00]">{job.matchPercent}%</strong><span className="text-[8px] font-bold text-slate-400">Mon score</span></button></div><div className="mt-3 flex gap-2"><button onClick={() => toggleBasket(job)} disabled={done || ready} className={selected ? "grid w-11 place-items-center rounded-full bg-[#FFE135] text-[#2E3F4F]" : "grid w-11 place-items-center rounded-full border border-slate-200 text-[#B59A00]"} aria-label={selected ? "Retirer du panier" : "Ajouter au panier"}>{selected ? <CheckSquare size={16}/> : <ShoppingBag size={16}/>}</button><button onClick={() => phoneComingSoon ? router.push(`/jobs/${job.id}?source=${job.source}`) : apply(job)} disabled={done || ready || busy} className="flex-1 rounded-full bg-[#FFE135] py-2.5 text-xs font-black text-[#2E3F4F] disabled:bg-slate-200 disabled:text-slate-500">{done ? "Candidature envoyée" : ready ? "Candidature prête" : busy ? "Préparation…" : phoneComingSoon ? "COMING SOON" : "Postuler"}</button><button onClick={() => { setSelectedCompany(job.company || { id: null, name: "Aucune donnée", logoUrl: null, description: null, website: null, domain: null, verified: false }); setSelectedCompanyLocation(job.location); }} aria-label={`Voir les informations sur ${job.company?.name || "l’entreprise"}`} title="Informations sur l’entreprise" className="max-w-[170px] truncate rounded-full border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-[#22448B]">{job.company?.name || "Aucune donnée"}</button><button onClick={() => router.push(`/jobs/${job.id}?source=${job.source}`)} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#22448B]/20 bg-[#F4F7FF] px-3 py-2.5 text-xs font-black text-[#22448B]"><span>Voir l’offre</span><ArrowUpRight size={14}/></button></div></motion.article>; })}</div>
          </div>
    </section>

    {basketJobs.length > 0 && (
      <div className="fixed bottom-20 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-[24px] border border-[#FFE135] bg-[#2E3F4F] p-3 text-white shadow-2xl sm:bottom-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FFE135] text-[#2E3F4F]"><ShoppingBag size={18}/></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-black">Panier de candidatures · {basketJobs.length}/{bulkLimit}</p><p className="text-[10px] text-white/65">J’IA préparera chaque candidature séparément avant votre validation.</p></div>
          <button onClick={() => void prepareBulkApplications()} disabled={bulkPreparing} className="rounded-full bg-[#FFE135] px-4 py-2.5 text-xs font-black text-[#2E3F4F]">{bulkPreparing ? "Préparation…" : "Préparer avec J’IA"}</button>
          <button
            type="button"
            aria-label="Fermer et vider le panier de candidatures"
            title="Annuler et désélectionner les candidatures"
            onClick={() => {
              setBasket(new Set());
              try { localStorage.setItem("jobly:jia:application-basket", "[]"); } catch {}
            }}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
          ><X size={18}/></button>
        </div>
      </div>
    )}

    <AnimatePresence>{preparedBulk.length > 0 && (
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[110] grid place-items-center bg-black/65 p-3 backdrop-blur-sm">
        <motion.div initial={{y:24,opacity:0}} animate={{y:0,opacity:1}} className="max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-[30px] bg-white p-5 text-[#17212B] shadow-2xl sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[1.8px] text-[#B59A00]">J’IA · revue finale</p><h2 className="mt-1 text-2xl font-black">Candidatures prêtes à envoyer</h2><p className="mt-1 text-xs text-slate-500">{preparedBulk.length} candidature{preparedBulk.length>1?"s":""} préparée{preparedBulk.length>1?"s":""}. Vérifiez-les avant l’envoi.</p></div><button onClick={() => setPreparedBulk([])} className="grid h-9 w-9 place-items-center rounded-full border border-slate-200"><X size={17}/></button></div>
          <div className="mt-5 space-y-3">{preparedBulk.map(item => {
            const isEditing = editingLetterId === item.id;
            const inputId = `letter-upload-${item.id}`;
            return <details key={item.id} open={isEditing || undefined} className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-3">
              <summary className="cursor-pointer list-none"><div className="flex items-center gap-3"><CompanyLogo companyName={item.job.company?.name} logoUrl={item.job.company?.logoUrl} domain={item.job.company?.domain} website={item.job.company?.website} size={38}/><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold uppercase text-slate-400">{item.job.company?.name || "Aucune donnée"}</p><p className="truncate text-sm font-black">{item.job.title}</p></div><span className="rounded-full bg-[#DDF8EA] px-2 py-1 text-[9px] font-black text-[#08733E]">{item.job.matchPercent}% match</span></div></summary>
              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[1px] text-slate-400"><FileText size={14}/> Lettre · {item.letterSource === "CANDIDATE" ? "Votre document" : "Préparée par J’IA"}</div><div className="flex gap-2">
                  <button type="button" onClick={() => setEditingLetterId(isEditing ? null : item.id)} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black"><Pencil size={13}/> {isEditing ? "Fermer" : "Modifier"}</button>
                  <label htmlFor={inputId} className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black"><Upload size={13}/> {importingLetterId === item.id ? "Import…" : "Importer PDF / Word"}</label>
                  <input id={inputId} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={async e => {
                    const file = e.target.files?.[0]; e.currentTarget.value = ""; if (!file || !token) return;
                    setImportingLetterId(item.id); setError("");
                    try { const form = new FormData(); form.append("file", file); const res = await fetch("/api/applications/letter-import", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form }); const body = await res.json().catch(() => ({})); if (!res.ok) throw new Error(body.message || "Impossible d’importer la lettre."); setPreparedBulk(prev => prev.map(x => x.id === item.id ? { ...x, letter: String(body.text || ""), letterSource: "CANDIDATE" } : x)); setEditingLetterId(item.id); }
                    catch (err) { setError(err instanceof Error ? err.message : "Impossible d’importer la lettre."); } finally { setImportingLetterId(null); }
                  }}/>
                </div></div>
                {isEditing ? <textarea value={item.letter} onChange={e => setPreparedBulk(prev => prev.map(x => x.id === item.id ? { ...x, letter: e.target.value, letterSource: "CANDIDATE" } : x))} className="min-h-64 w-full rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-6 outline-none focus:border-[#FFE135]" placeholder="Modifiez librement votre lettre. Vous gardez le dernier mot." aria-label="Lettre de motivation"/> : <p className="whitespace-pre-wrap text-xs leading-5 text-slate-600">{item.letter || "Lettre personnalisée prête à l’envoi."}</p>}
                <p className="mt-2 text-[10px] text-slate-400">J’IA assiste. Vous décidez du texte envoyé.</p>
              </div>
            </details>;
          })}</div>
          <div className="mt-4 rounded-2xl border border-[#FFE135]/50 bg-[#FFFBE0] p-3 text-[11px] font-semibold text-slate-600">Aucune lettre n’est envoyée automatiquement : relisez, modifiez ou remplacez chaque lettre avant de confirmer.</div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button onClick={editPreparedBulk} className="rounded-full border border-slate-200 px-5 py-3 text-xs font-black">Fermer la revue</button><button onClick={() => void submitBulkApplications()} disabled={bulkSubmitting} className="rounded-full bg-[#FFE135] px-5 py-3 text-xs font-black text-[#2E3F4F]">{bulkSubmitting ? "Envoi des candidatures…" : `Confirmer et envoyer ${preparedBulk.length} candidature${preparedBulk.length>1?"s":""}`}</button></div>
        </motion.div>
      </motion.div>
    )}</AnimatePresence>

    <AnimatePresence>{selectedMatch && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[105] grid place-items-end bg-black/60 p-3 backdrop-blur-sm sm:place-items-center" onClick={() => setSelectedMatch(null)}>
      <motion.div initial={{ y: 30, opacity: 0, scale: .97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 30, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-md overflow-hidden rounded-[30px] bg-white text-[#17212B] shadow-2xl">
        <div className="bg-[#2E3F4F] p-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[1.8px] text-[#FFE135]">JOBLY MATCH</p><h2 className="mt-1 text-2xl font-black">Votre score de compatibilité</h2><p className="mt-1 text-xs text-white/65">Analyse de cette offre par rapport aux informations connues de votre profil.</p></div>
            <button type="button" onClick={() => setSelectedMatch(null)} aria-label="Fermer le détail du score" className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/5"><X size={17}/></button>
          </div>
          <div className="mt-5 flex items-center gap-4"><div className="grid h-24 w-24 place-items-center rounded-full border-8 border-[#FFE135] bg-white/10"><span className="text-3xl font-black text-[#FFE135]">{selectedMatch.matchPercent}%</span></div><div className="min-w-0"><p className="text-sm font-black">{selectedMatch.title}</p><p className="mt-1 truncate text-xs text-white/60">{selectedMatch.company?.name || "Aucune donnée"}</p><p className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-[1px]">{selectedMatch.matchPercent >= 85 ? "Très forte compatibilité" : selectedMatch.matchPercent >= 70 ? "Bonne compatibilité" : selectedMatch.matchPercent >= 60 ? "Compatibilité intéressante" : "Compatibilité à renforcer"}</p></div></div>
        </div>
        <div className="p-5">
          <p className="text-[10px] font-black uppercase tracking-[1.5px] text-slate-400">Critères détectés dans l’offre</p>
          <div className="mt-4 space-y-3">
            {(selectedMatch.matchBreakdown || []).map(item => <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500"><span>{item.label}{item.required ? " · requis" : ""}</span><b className={item.status === "MISMATCH" ? "text-red-600" : item.status === "UNKNOWN" ? "text-amber-600" : "text-[#2E3F4F]"}>{item.score == null ? "Non renseigné" : Math.round(item.score * 100) + "%"}</b></div>
              <div className="h-2 overflow-hidden rounded-full bg-white">{item.score != null && <motion.div initial={{ width: 0 }} animate={{ width: Math.round(item.score * 100) + "%" }} transition={{ duration: .45 }} className="h-full rounded-full bg-[#FFE135]"/>}</div>
              <p className="mt-2 text-[10px] leading-4 text-slate-500">{item.status === "MATCH" ? "Correspondance confirmée." : item.status === "PARTIAL" ? "Correspondance partielle à vérifier." : item.status === "MISMATCH" ? "Écart identifié avec l’exigence de l’offre." : "Information non renseignée dans les données connues de votre profil."}</p>
              {item.expectedValue && <p className="mt-1 text-[10px] font-semibold text-slate-600">Attendu : {item.expectedValue}</p>}
              {item.candidateValue && <p className="mt-1 text-[10px] text-slate-400">Profil : {item.candidateValue}</p>}
            </div>)}
          </div>
          <div className="mt-5 rounded-2xl border border-[#FFE135]/60 bg-[#FFFBE0] p-3 text-[10px] leading-5 text-slate-600"><b>Score spécifique à cette offre :</b> seuls les critères détectés dans cette offre influencent le score. Une information absente du profil est signalée comme non renseignée et réduit la confiance plutôt que d’être comptée automatiquement comme un échec.</div>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-[10px] leading-5 text-slate-500"><b className="text-[#2E3F4F]">Confiance de l’analyse : {selectedMatch.matchConfidence ?? 100}%</b> · basée sur les informations réellement disponibles dans votre profil.</div>
          <button type="button" onClick={() => router.push("/cv?mode=adapt&jobId=" + encodeURIComponent(selectedMatch.id) + "&source=" + encodeURIComponent(selectedMatch.source))} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#FFE135] px-5 py-3 text-xs font-black text-[#2E3F4F]"><Sparkles size={15}/> Adapter votre CV pour cette candidature</button>
          <p className="mt-2 text-center text-[10px] text-slate-400">J’IA analyse l’offre et votre CV. Vous validez chaque modification avant utilisation.</p>
        </div></motion.div>
    </motion.div>}</AnimatePresence>

    <AnimatePresence>{selectedCompany && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] grid place-items-end bg-black/60 p-3 backdrop-blur-sm sm:place-items-center" onClick={() => setSelectedCompany(null)}>
      <motion.div initial={{ y: 40, opacity: 0, scale: .97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()} className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-[32px] border border-white/15 bg-[#2E3F4F] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <CompanyLogo companyName={selectedCompany.name} logoUrl={companyWebProfile?.logoUrl || selectedCompany.logoUrl} domain={selectedCompany.domain} website={companyWebProfile?.website || selectedCompany.website} size={56}/>
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#FFE135]">Entreprise</p><h2 className="truncate text-xl font-black">{selectedCompany.name}</h2></div>
          </div>
          <button onClick={() => setSelectedCompany(null)} aria-label="Fermer les informations de l’entreprise" className="rounded-full border border-white/10 p-2"><X size={18}/></button>
        </div>
        {companyWebLoading ? <div className="mt-7 flex items-center gap-3 rounded-2xl bg-white/5 p-4 text-sm text-white/70"><RefreshCw size={16} className="animate-spin"/> Recherche des informations publiques…</div> : companyWebProfile ? <div className="mt-6 space-y-4">
          {companyWebProfile.address && <div><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Localisation</p><p className="mt-1 text-sm">{companyWebProfile.address}</p>{companyWebProfile.mapsUrl && <a href={companyWebProfile.mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center rounded-full bg-white/10 px-3 py-2 text-xs font-bold">Voir sur Google Maps</a>}</div>}
          {companyWebProfile.phone && <div><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Contact</p><a href={`tel:${companyWebProfile.phone}`} className="mt-1 block text-sm font-bold">{companyWebProfile.phone}</a></div>}
          {(companyWebProfile.activity.length>0 || companyWebProfile.status || companyWebProfile.rating!=null) && <div className="grid gap-3 sm:grid-cols-2">
            {companyWebProfile.activity.length>0 && <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Domaine d’activité</p><p className="mt-1 text-sm capitalize">{companyWebProfile.activity.join(" · ")}</p></div>}
            {(companyWebProfile.status || companyWebProfile.rating!=null) && <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Présence Google</p><p className="mt-1 text-sm">{companyWebProfile.status ? companyWebProfile.status.replace(/_/g," ") : ""}{companyWebProfile.rating!=null ? ` · ★ ${companyWebProfile.rating}${companyWebProfile.reviewCount!=null ? ` (${companyWebProfile.reviewCount} avis)` : ""}` : ""}</p></div>}
          </div>}
          {(companyWebProfile.description || selectedCompany.description) && <div><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Présentation</p><p className="mt-1 text-sm leading-6 text-white/75">{companyWebProfile.description || selectedCompany.description}</p></div>}
          {companyWebProfile.website && <a href={companyWebProfile.website.startsWith("http") ? companyWebProfile.website : `https://${companyWebProfile.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-3 text-xs font-bold">Site officiel <ExternalLink size={14}/></a>}
          {companyWebProfile.news.length>0 && <div><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Actualités</p><div className="mt-2 space-y-2">{companyWebProfile.news.map((item,index)=><a key={index} href={item.link} target="_blank" rel="noreferrer" className="block rounded-2xl bg-white/5 p-3 text-sm font-semibold leading-5 hover:bg-white/10">{item.title}<span className="mt-1 block text-[10px] font-normal text-white/45">{item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("fr-FR") : ""}</span></a>)}</div></div>}
        </div> : <div className="mt-7 rounded-2xl bg-white/5 p-4 text-sm text-white/65">Aucune donnée</div>}
        {!companyWebLoading && companyWebProfile && !companyWebProfile.address && !companyWebProfile.phone && !companyWebProfile.website && !companyWebProfile.description && companyWebProfile.news.length===0 && <div className="mt-3 rounded-2xl bg-white/5 p-4 text-sm text-white/65">Aucune donnée</div>}
      </motion.div>
    </motion.div>}</AnimatePresence>

    <AnimatePresence>
      {showBackToTop && <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.82, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.82, y: 12 }}
        transition={{ duration: 0.22 }}
        onClick={() => offersStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        aria-label="Remonter en haut des offres"
        title="Remonter au début des offres"
        className="fixed bottom-24 right-5 z-[75] grid h-12 w-12 place-items-center rounded-full border border-white/55 bg-white/25 text-[#22448B] shadow-[0_10px_30px_rgba(34,68,139,.12)] backdrop-blur-2xl transition hover:bg-white/40 hover:shadow-[0_14px_36px_rgba(34,68,139,.18)] active:scale-95 sm:bottom-8 sm:right-8"
      >
        <span className="absolute inset-1 rounded-full border border-white/30" />
        <span className="relative text-xl font-black leading-none">↑</span>
      </motion.button>}
    </AnimatePresence>
    {jobs.length === 0 && !loading && <div className="mx-auto max-w-2xl px-5 py-20 text-center"><Sparkles className="mx-auto text-[#22448B]"/><h2 className="mt-4 text-2xl font-black">Aucune offre disponible pour le moment.</h2><p className="mt-2 text-sm text-white/55">Jobly ne fabrique pas d’offres : les offres affichées proviennent de sources réelles.</p></div>}
    <BottomNav active="/jobs" items={TALENT_NAV} />
  </main>;
}
