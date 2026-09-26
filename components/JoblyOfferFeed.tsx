"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Building2, Check, ExternalLink, RefreshCw, Send, Sparkles, X, Search, SlidersHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { companyAvatar } from "@/lib/avatar";
import CompanyLogo from "@/components/CompanyLogo";
import BottomNav, { TALENT_NAV } from "@/components/BottomNav";

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
};

function formatDate(value: string | null) { if (!value) return "Non indiquée"; return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }

export function JoblyOfferFeed() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState<Set<string>>(new Set());
  const [selectedCompany, setSelectedCompany] = useState<Job["company"]>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [feedMeta, setFeedMeta] = useState({ totalAvailable: 0, matchingCount: 0 });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Toutes");

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
      if (appsRes.ok) { const body = await appsRes.json(); setApplied(new Set((body.applications || []).filter((a: any) => a.status === "SUBMITTED").map((a: any) => `${a.source}:${a.jobId || a.recruiterJobId}`))); }
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur réseau."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    try { setSaved(new Set(JSON.parse(localStorage.getItem("jobly:jia:saved-offers") || "[]"))); } catch {}
  }, []);

  const toggleSaved = useCallback((job: Job) => {
    const key = `${job.source}:${job.id}`;
    setSaved(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      try { localStorage.setItem("jobly:jia:saved-offers", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  async function apply(job: Job) {
    if (!token) return;
    const key = `${job.source}:${job.id}`;
    if (applied.has(key) || submitting.has(key)) return;
    setSubmitting(prev => new Set(prev).add(key));
    setError("");
    try {
      // EMAIL is currently the only real automated candidate submission channel.
      // Connect Gmail before spending an AI credit on preparation.
      const gmailStatusRes = await fetch("/api/talent/gmail/status", { headers: { Authorization: `Bearer ${token}` } });
      const gmailStatus = await gmailStatusRes.json().catch(() => ({}));
      if (gmailStatusRes.ok && !gmailStatus.connected) {
        window.location.href = "/api/talent/gmail/connect";
        return;
      }

      const prepareRes = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ source: job.source, jobId: job.id }) });
      const preparedBody = await prepareRes.json().catch(() => ({}));
      if (!prepareRes.ok) throw new Error(preparedBody.message || "La candidature n'a pas pu être préparée.");

      const applicationId = preparedBody.application?.id;
      if (!applicationId) throw new Error("La candidature a été préparée sans identifiant exploitable.");

      const submitRes = await fetch(`/api/applications/${applicationId}/submit`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      const submitBody = await submitRes.json().catch(() => ({}));
      if (submitRes.status === 412 && submitBody.requiresGmail) {
        window.location.href = "/api/talent/gmail/connect";
        return;
      }
      if (!submitRes.ok && submitRes.status !== 202) throw new Error(submitBody.message || "La candidature n'a pas pu être envoyée.");
      if (submitBody.submitted) setApplied(prev => new Set(prev).add(key));
      if (submitRes.status === 202) setError(submitBody.message || "Candidature envoyée. Vérification de la preuve en cours.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "La candidature n'a pas pu être envoyée.");
    } finally {
      setSubmitting(prev => { const next = new Set(prev); next.delete(key); return next; });
    }
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
      return matchesQuery && matchesFilter;
    });
    return focusMatch ? [...result].sort((a, b) => b.matchPercent - a.matchPercent) : result;
  }, [jobs, query, filter, focusMatch]);

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


  const rest = useMemo(() => filteredJobs.slice(3), [filteredJobs]);
  const feedSummary = feedMeta.totalAvailable ? `${feedMeta.totalAvailable} opportunité${feedMeta.totalAvailable > 1 ? "s" : ""} actuellement disponible${feedMeta.totalAvailable > 1 ? "s" : ""}` : "Marché en cours de synchronisation";

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

  return <main className="min-h-[100dvh] overflow-hidden bg-[#F5F7F8] pb-28 text-[#17212B]">
    <section className="relative mx-auto max-w-6xl px-5 pb-8 pt-7 sm:px-8">
      <motion.div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-[#7A9BB5]/30 blur-3xl" animate={{ x: [0, -30, 0], y: [0, 25, 0], scale: [1, 1.1, 1] }} transition={{ duration: 12, repeat: Infinity }} />
      <div className="relative z-10 flex items-end justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-[2px] text-slate-400">JOBLY / OPPORTUNITÉS</span><h1 className="mt-2 text-4xl font-black leading-[.95] tracking-[-.045em] sm:text-6xl">Les offres<br/><span className="text-[#B59A00]">auxquelles J’IA</span><br/>peut postuler.</h1><p className="mt-5 max-w-xl text-sm text-slate-500">{feedSummary}. Les plus récentes remontent automatiquement ; une offre disparaît lorsqu'elle expire.</p></div><button onClick={() => load(true)} aria-label="Actualiser" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-slate-200 bg-white/10 text-[#FFE135]"><RefreshCw size={18} className={refreshing ? "animate-spin" : ""}/></button></div>
      {error && <div className="relative z-10 mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm font-bold">{error}</div>}
      <div className="relative z-10 mt-5 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[1px] text-slate-500"><span className="rounded-full border border-slate-200 bg-white/5 px-3 py-2">Profil matché · {feedMeta.matchingCount}</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Fraîcheur · 60 jours max</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Deadline explicite prioritaire</span></div>
    </section>

    <section className="mx-auto max-w-6xl px-5 sm:px-8">
      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Opportunités</p><h2 className="mt-1 text-xl font-black">{filteredJobs.length} résultat{filteredJobs.length > 1 ? "s" : ""}</h2></div><div className="flex flex-col gap-2 sm:flex-row"><label className="flex h-11 min-w-[260px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3"><Search size={16} className="text-slate-400"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Métier, entreprise, ville…" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"/></label><div className="flex gap-2 overflow-x-auto">{["Toutes","CDI","CDD","Stage","Remote"].map(item => <button key={item} onClick={() => setFilter(item)} className={filter === item ? "whitespace-nowrap rounded-2xl bg-[#FFE135] px-4 py-3 text-xs font-black text-[#17212B]" : "whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-500"}>{item}</button>)}</div></div></div>
      {featured.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Top Match</p>
              <p className="mt-1 text-xs text-slate-400">Lecture automatique · une nouvelle offre toutes les 3 secondes</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[1px] text-slate-500">← →</span>
          </div>
          <div
            ref={topMatchRef}
            className="flex snap-x snap-mandatory gap-4 overflow-x-hidden scroll-smooth pb-2"
            aria-label="Top Match — offres en cascade horizontale"
          >
            {featured.map((job, index) => {
              const key = `${job.source}:${job.id}`;
              const done = applied.has(key);
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
                  className="relative min-w-[88%] snap-start overflow-hidden rounded-[32px] border border-white/15 bg-white p-3 shadow-[0_18px_60px_rgba(23,33,43,.10)] sm:min-w-[70%] lg:min-w-[calc((100%-2rem)/3)]"
                >
                  <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-[26px] bg-[#EEF2F6]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,225,53,.28),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(46,63,79,.18),transparent_42%)]"/>
                    {job.visualUrl ? <motion.img src={job.visualUrl} alt="" className="absolute inset-0 h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} animate={{ scale: [1, 1.035, 1] }} transition={{ duration: 8, repeat: Infinity }}/> : null}
                    <div className="relative z-10 grid h-24 w-24 place-items-center rounded-[24px] border border-white/70 bg-white/95 shadow-xl">
                      <CompanyLogo companyName={job.company?.name} logoUrl={job.company?.logoUrl} domain={job.company?.domain} website={job.company?.website} size={68}/>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2E3F4F]/70 via-transparent to-transparent"/>
                    <span className="absolute left-3 top-3 rounded-full bg-[#FFE135] px-3 py-1 text-[9px] font-black uppercase tracking-[1.4px] text-[#2E3F4F]">Top match</span>
                    <strong className="absolute bottom-3 right-3 text-4xl font-black text-[#FFE135]">{job.matchPercent}%</strong>
                  </div>
                  <div className="p-3">
                    <div className="mt-1 flex items-center gap-2">
                      <CompanyLogo companyName={job.company?.name} logoUrl={job.company?.logoUrl} domain={job.company?.domain} website={job.company?.website} size={32}/>
                      <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[1.5px] text-[#7A9BB5]">{job.company?.name || "Entreprise"}</p>
                    </div>
                    <h2 className="mt-1 text-2xl font-black leading-none">{job.title}</h2>
                    <p className="mt-3 text-xs text-slate-500">{[job.location, job.contractType, job.remoteMode].filter(Boolean).join(" · ") || "Toutes localisations"}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-slate-500">
                      <span>Publié · <b className="text-slate-700">{formatDate(job.publishedAt)}</b></span>
                      <span>Expire · <b className="text-[#B59A00]">{formatDate(job.expirationAt)}</b></span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => job.applicationReady ? apply(job) : router.push(`/jobs/${job.id}?source=${job.source}`)} disabled={done || busy} className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#FFE135] text-sm font-black text-[#2E3F4F] disabled:bg-slate-100 disabled:text-slate-400">
                        {done ? <><Check size={17} className="mr-2"/>Candidature envoyée</> : busy ? <><RefreshCw size={17} className="mr-2 animate-spin"/>Envoi en cours…</> : <><Send size={17} className="mr-2"/>{job.applicationReady ? "Postuler avec J’IA" : phoneComingSoon ? "COMING SOON" : "Voir l’offre"}</>}
                      </button>
                      <button onClick={() => setSelectedCompany(job.company)} aria-label="Voir l'entreprise" className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-[#B59A00]"><Building2 size={18}/></button>
                      <button onClick={() => router.push(`/jobs/${job.id}?source=${job.source}`)} aria-label="Voir l'offre" className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-[#B59A00]"><ArrowUpRight size={18}/></button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-10 grid gap-4 md:grid-cols-2">{rest.map(job => { const key = `${job.source}:${job.id}`; const done = applied.has(key); const busy = submitting.has(key); const phoneComingSoon = job.applicationProfile?.channel === "WHATSAPP_PHONE"; return <motion.article key={key} layout className="rounded-[28px] border border-white/10 bg-white p-4 shadow-[0_12px_40px_rgba(23,33,43,.07)]"><div className="flex gap-4"><div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white"><CompanyLogo companyName={job.company?.name} logoUrl={job.company?.logoUrl} domain={job.company?.domain} website={job.company?.website} size={56}/></div><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold uppercase tracking-[1.3px] text-[#7A9BB5]">{job.company?.name || "Entreprise"}</p><h2 className="mt-1 text-lg font-black">{job.title}</h2><p className="mt-1 text-xs text-white/55">{[job.location, job.contractType].filter(Boolean).join(" · ")}</p><p className="mt-2 text-[10px] text-slate-400">Publié {formatDate(job.publishedAt)} · Expire {formatDate(job.expirationAt)}</p></div><strong className="text-2xl font-black text-[#FFE135]">{job.matchPercent}%</strong></div><div className="mt-4 flex gap-2"><button onClick={() => phoneComingSoon ? router.push(`/jobs/${job.id}?source=${job.source}`) : apply(job)} disabled={done || busy} className="flex-1 rounded-full bg-[#FFE135] py-3 text-xs font-black text-[#2E3F4F] disabled:bg-white/15 disabled:text-white">{done ? "Candidature envoyée" : busy ? "Envoi en cours…" : phoneComingSoon ? "COMING SOON" : "Postuler à cette offre"}</button><button onClick={() => setSelectedCompany(job.company)} className="rounded-full border border-white/15 px-4 py-3 text-xs font-bold">Entreprise</button><button onClick={() => router.push(`/jobs/${job.id}?source=${job.source}`)} className="grid w-11 place-items-center rounded-full border border-white/15"><ArrowUpRight size={16}/></button></div></motion.article>; })}</div>
    </section>

    <AnimatePresence>{selectedCompany && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] grid place-items-end bg-black/60 p-3 backdrop-blur-sm sm:place-items-center" onClick={() => setSelectedCompany(null)}><motion.div initial={{ y: 40, opacity: 0, scale: .97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-[32px] border border-white/15 bg-[#2E3F4F] p-6 shadow-2xl"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><CompanyLogo companyName={selectedCompany.name} logoUrl={selectedCompany.logoUrl} domain={selectedCompany.domain} website={selectedCompany.website} size={56}/><div><p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#7A9BB5]">Entreprise</p><h2 className="text-xl font-black">{selectedCompany.name}</h2></div></div><button onClick={() => setSelectedCompany(null)} className="rounded-full border border-white/10 p-2"><X size={18}/></button></div><p className="mt-6 text-sm leading-6 text-white/75">{selectedCompany.description || "Aucun résumé d'activité fourni dans la source de l'offre."}</p>{selectedCompany.website && <a href={selectedCompany.website.startsWith("http") ? selectedCompany.website : `https://${selectedCompany.website}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-3 text-xs font-bold">Voir le site de l'entreprise <ExternalLink size={14}/></a>}</motion.div></motion.div>}</AnimatePresence>
    {jobs.length === 0 && !loading && <div className="mx-auto max-w-2xl px-5 py-20 text-center"><Sparkles className="mx-auto text-[#FFE135]"/><h2 className="mt-4 text-2xl font-black">Aucune offre disponible pour le moment.</h2><p className="mt-2 text-sm text-white/55">Jobly ne fabrique pas d’offres : les opportunités affichées proviennent de sources réelles.</p></div>}
    <BottomNav active="/jobs" items={TALENT_NAV} />
  </main>;
}
