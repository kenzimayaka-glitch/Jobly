"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Building2, Check, ExternalLink, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { companyAvatar } from "@/lib/avatar";

type Job = {
  source: "discovery" | "recruiter";
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  remoteMode: string | null;
  company: { id: string | null; name: string; logoUrl: string | null; description: string | null; website: string | null; verified: boolean } | null;
  matchPercent: number;
  publishedAt: string | null;
  expirationAt: string | null;
  deadline: string | null;
  applicationReady: boolean;
  visualUrl: string | null;
};

function formatDate(value: string | null) { if (!value) return "Non indiquée"; return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }

export function JoblyOfferFeed() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [selectedCompany, setSelectedCompany] = useState<Job["company"]>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [feedMeta, setFeedMeta] = useState({ totalAvailable: 0, matchingCount: 0 });

  useEffect(() => { getSupabaseClient().auth.getSession().then(({ data }) => { if (!data.session) { router.replace("/"); return; } setToken(data.session.access_token); }); }, [router]);

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
      if (appsRes.ok) { const body = await appsRes.json(); setApplied(new Set((body.applications || []).map((a: any) => `${a.source}:${a.jobId || a.recruiterJobId}`))); }
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur réseau."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  async function apply(job: Job) {
    if (!token) return; const key = `${job.source}:${job.id}`; if (applied.has(key)) return;
    const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ source: job.source, jobId: job.id }) });
    const body = await res.json().catch(() => ({}));
    if (res.ok || res.status === 409) { setApplied(prev => new Set(prev).add(key)); return; }
    setError(body.message || "La candidature n'a pas pu être envoyée.");
  }

  const featured = useMemo(() => jobs.slice(0, 3), [jobs]);
  const rest = useMemo(() => jobs.slice(3), [jobs]);
  const feedSummary = feedMeta.totalAvailable >= 200 ? "200+ offres personnalisées disponibles" : `${feedMeta.totalAvailable} offres personnalisées disponibles`;

  if (loading && !jobs.length) return <main className="min-h-[100dvh] bg-[#2E3F4F] p-6 text-white"><div className="mx-auto max-w-6xl animate-pulse space-y-6"><div className="h-64 rounded-[36px] bg-white/10"/><div className="h-40 rounded-[28px] bg-white/10"/></div></main>;

  return <main className="min-h-[100dvh] overflow-hidden bg-[#2E3F4F] pb-16 text-[#FFFEFB]">
    <section className="relative mx-auto max-w-6xl px-5 pb-8 pt-7 sm:px-8">
      <motion.div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-[#7A9BB5]/30 blur-3xl" animate={{ x: [0, -30, 0], y: [0, 25, 0], scale: [1, 1.1, 1] }} transition={{ duration: 12, repeat: Infinity }} />
      <div className="relative z-10 flex items-end justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-[2px] text-[#7A9BB5]">JOBLY / OPPORTUNITÉS</span><h1 className="mt-2 text-5xl font-black italic leading-[.82] tracking-[-.06em] sm:text-7xl">Les offres<br/><span className="text-[#FFE135]">auxquelles J’IA</span><br/>peut postuler.</h1><p className="mt-5 max-w-xl text-sm text-white/65">{feedSummary}. Les plus récentes remontent automatiquement ; une offre disparaît lorsqu'elle expire.</p></div><button onClick={() => load(true)} aria-label="Actualiser" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-[#FFE135]"><RefreshCw size={18} className={refreshing ? "animate-spin" : ""}/></button></div>
      {error && <div className="relative z-10 mt-5 rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-sm font-bold">{error}</div>}
      <div className="relative z-10 mt-5 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[1px] text-white/60"><span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Profil matché · {feedMeta.matchingCount}</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Fraîcheur · 60 jours max</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-2">Deadline explicite prioritaire</span></div>
    </section>

    <section className="mx-auto max-w-6xl px-5 sm:px-8">
      {featured.length > 0 && <div className="grid gap-4 lg:grid-cols-3">{featured.map((job, index) => { const key = `${job.source}:${job.id}`; const done = applied.has(key); const visual = job.visualUrl || job.company?.logoUrl || companyAvatar(job.company?.name); return <motion.article key={key} initial={{ opacity: 0, y: 30, rotate: index === 1 ? 1 : index === 2 ? -1 : 0 }} animate={{ opacity: 1, y: 0, rotate: index === 1 ? 1 : index === 2 ? -1 : 0 }} transition={{ delay: index * .1 }} className="relative overflow-hidden rounded-[32px] border border-white/15 bg-white/[.08] p-3 shadow-2xl backdrop-blur-2xl"><div className="relative overflow-hidden rounded-[26px]"><motion.img src={visual} alt={job.company?.name || "Entreprise"} className="aspect-[16/10] w-full object-cover" animate={{ scale: [1, 1.035, 1] }} transition={{ duration: 8, repeat: Infinity }}/><div className="absolute inset-0 bg-gradient-to-t from-[#2E3F4F] via-transparent to-transparent"/><span className="absolute left-3 top-3 rounded-full bg-[#FFE135] px-3 py-1 text-[9px] font-black uppercase tracking-[1.4px] text-[#2E3F4F]">Top match</span><strong className="absolute bottom-3 right-3 text-4xl font-black text-[#FFE135]">{job.matchPercent}%</strong></div><div className="p-3"><p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#7A9BB5]">{job.company?.name || "Entreprise"}</p><h2 className="mt-1 text-2xl font-black leading-none">{job.title}</h2><p className="mt-3 text-xs text-white/60">{[job.location, job.contractType, job.remoteMode].filter(Boolean).join(" · ") || "Toutes localisations"}</p><div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-white/55"><span>Publié · <b className="text-white/80">{formatDate(job.publishedAt)}</b></span><span>Expire · <b className="text-[#FFE135]">{formatDate(job.expirationAt)}</b></span></div><div className="mt-4 flex gap-2"><button onClick={() => apply(job)} disabled={done} className="flex h-12 flex-1 items-center justify-center rounded-full bg-[#FFE135] text-sm font-black text-[#2E3F4F] disabled:bg-white/15 disabled:text-white">{done ? <><Check size={17} className="mr-2"/>Candidature envoyée</> : <><Send size={17} className="mr-2"/>Postuler à cette offre</>}</button><button onClick={() => setSelectedCompany(job.company)} aria-label="Voir l'entreprise" className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 text-[#FFE135]"><Building2 size={18}/></button><button onClick={() => router.push(`/jobs/${job.id}?source=${job.source}`)} aria-label="Voir l'offre" className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 text-[#FFE135]"><ArrowUpRight size={18}/></button></div></div></motion.article>; })}</div>}

      <div className="mt-10 grid gap-4 md:grid-cols-2">{rest.map(job => { const key = `${job.source}:${job.id}`; const done = applied.has(key); const visual = job.visualUrl || job.company?.logoUrl || companyAvatar(job.company?.name); return <motion.article key={key} layout className="rounded-[28px] border border-white/10 bg-white/[.07] p-4 backdrop-blur-xl"><div className="flex gap-4"><img src={visual} alt={job.company?.name || "Entreprise"} className="h-20 w-20 rounded-2xl object-cover"/><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold uppercase tracking-[1.3px] text-[#7A9BB5]">{job.company?.name || "Entreprise"}</p><h2 className="mt-1 text-lg font-black">{job.title}</h2><p className="mt-1 text-xs text-white/55">{[job.location, job.contractType].filter(Boolean).join(" · ")}</p><p className="mt-2 text-[10px] text-white/45">Publié {formatDate(job.publishedAt)} · Expire {formatDate(job.expirationAt)}</p></div><strong className="text-2xl font-black text-[#FFE135]">{job.matchPercent}%</strong></div><div className="mt-4 flex gap-2"><button onClick={() => apply(job)} disabled={done} className="flex-1 rounded-full bg-[#FFE135] py-3 text-xs font-black text-[#2E3F4F] disabled:bg-white/15 disabled:text-white">{done ? "Candidature envoyée" : "Postuler à cette offre"}</button><button onClick={() => setSelectedCompany(job.company)} className="rounded-full border border-white/15 px-4 py-3 text-xs font-bold">Entreprise</button><button onClick={() => router.push(`/jobs/${job.id}?source=${job.source}`)} className="grid w-11 place-items-center rounded-full border border-white/15"><ArrowUpRight size={16}/></button></div></motion.article>; })}</div>
    </section>

    <AnimatePresence>{selectedCompany && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] grid place-items-end bg-black/60 p-3 backdrop-blur-sm sm:place-items-center" onClick={() => setSelectedCompany(null)}><motion.div initial={{ y: 40, opacity: 0, scale: .97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-[32px] border border-white/15 bg-[#2E3F4F] p-6 shadow-2xl"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><img src={selectedCompany.logoUrl || companyAvatar(selectedCompany.name)} alt={selectedCompany.name} className="h-14 w-14 rounded-2xl object-cover"/><div><p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#7A9BB5]">Entreprise</p><h2 className="text-xl font-black">{selectedCompany.name}</h2></div></div><button onClick={() => setSelectedCompany(null)} className="rounded-full border border-white/10 p-2"><X size={18}/></button></div><p className="mt-6 text-sm leading-6 text-white/75">{selectedCompany.description || "Aucun résumé d'activité fourni dans la source de l'offre."}</p>{selectedCompany.website && <a href={selectedCompany.website.startsWith("http") ? selectedCompany.website : `https://${selectedCompany.website}`} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-3 text-xs font-bold">Voir le site de l'entreprise <ExternalLink size={14}/></a>}</motion.div></motion.div>}</AnimatePresence>
    {jobs.length === 0 && !loading && <div className="mx-auto max-w-2xl px-5 py-20 text-center"><Sparkles className="mx-auto text-[#FFE135]"/><h2 className="mt-4 text-2xl font-black">Aucune offre candidate-able pour le moment.</h2><p className="mt-2 text-sm text-white/55">Jobly ne fabrique pas d'offres : nous n'affichons que les opportunités réellement exploitables par J’IA.</p></div>}
  </main>;
}
