"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Building2, Check, ExternalLink, RefreshCw, Send, Sparkles, X, Search, SlidersHorizontal, ShoppingBasket, CheckSquare, Upload, Pencil, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { companyAvatar } from "@/lib/avatar";
import CompanyLogo from "@/components/CompanyLogo";
import BottomNav, { TALENT_NAV } from "@/components/BottomNav";
import { cleanCompanyName, cleanJobTitle, cleanJobDescription, cleanDisplayText } from "@/lib/jobContent";
import ScoreRing from "@/components/ScoreRing";
import ScoreDonut from "@/components/ScoreDonut";
import { AnchoredNotice } from "@/components/AnchoredNotice";

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
  summary: string | null;
  source: string[];
  logoUrl?: string | null;
};

type Job = {
  source: "discovery" | "recruiter";
  countryCode?: string | null;
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
  deadlineExpired?: boolean;
  offerStatus?: "ACTIVE" | "EXPIRED";
  applicationReady: boolean;
  sourceUrl?: string | null;
  applicationProfile: { channel?: string; phoneNumbers?: string[]; applicationEmail?: string; applicationPhone?: string; email?: string; phone?: string; comingSoon?: boolean; applicationUrl?: string; applyUrl?: string; url?: string; sourceUrl?: string };
  visualUrl: string | null;
  visualSource: string | null;
  matchConfidence?: number;
  matchBreakdown?: Array<{ id: string; label: string; score: number | null; weight: number; required: boolean; status: "MATCH"|"PARTIAL"|"MISMATCH"|"UNKNOWN"; candidateValue?: string | null; expectedValue?: string | null }>;
};


function formatDate(value: string | null) { if (!value) return "Aucune donnée"; return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)); }
function countryFlag(code: string | null | undefined) { const flags: Record<string,string> = { CM:"🇨🇲", SN:"🇸🇳", GA:"🇬🇦", CG:"🇨🇬", CF:"🇨🇫", TD:"🇹🇩", GQ:"🇬🇶", BJ:"🇧🇯", BF:"🇧🇫", CI:"🇨🇮", GN:"🇬🇳", GW:"🇬🇼", ML:"🇲🇱", NE:"🇳🇪", TG:"🇹🇬", NG:"🇳🇬", GH:"🇬🇭", RW:"🇷🇼", ZA:"🇿🇦", ZM:"🇿🇲", UG:"🇺🇬", LR:"🇱🇷", SS:"🇸🇸", SZ:"🇸🇿" }; return flags[String(code || "").toUpperCase()] || "🌍"; }
function countryName(code: string | null | undefined) { const names: Record<string,string> = { CM:"Cameroun", SN:"Sénégal", GA:"Gabon", CG:"Congo", CF:"République centrafricaine", TD:"Tchad", GQ:"Guinée équatoriale", BJ:"Bénin", BF:"Burkina Faso", CI:"Côte d’Ivoire", GN:"Guinée", GW:"Guinée-Bissau", ML:"Mali", NE:"Niger", TG:"Togo", NG:"Nigeria", GH:"Ghana", RW:"Rwanda", ZA:"Afrique du Sud", ZM:"Zambie", UG:"Ouganda", LR:"Liberia", SS:"Soudan du Sud", SZ:"Eswatini" }; return names[String(code || "").toUpperCase()] || "Pays non renseigné"; }
function GmailIcon({size=18}:{size?:number}) { return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13A2.5 2.5 0 0 1 18.5 21H5.5A2.5 2.5 0 0 1 3 18.5v-13Z" fill="white"/><path d="M4.5 6.2 12 12l7.5-5.8V18a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V6.2Z" fill="#EA4335"/><path d="M4.5 6.2 12 12l7.5-5.8-1.1-1.6L12 9.4 5.6 4.6 4.5 6.2Z" fill="#4285F4"/><path d="M4.5 6.2V18c0 .55.45 1 1 1h2V8.12L4.5 6.2Z" fill="#34A853"/><path d="M19.5 6.2V18c0 .55-.45 1-1 1h-2V8.12l3-1.92Z" fill="#FBBC04"/></svg>; }
function WhatsAppIcon({size=18}:{size?:number}) { return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#25D366"/><path d="M8.7 7.6c.3-.3.7-.3 1 0l1.2 1.4c.25.3.25.7.02 1l-.55.72c.5 1 1.35 1.85 2.35 2.35l.72-.55c.3-.23.7-.23 1 .02l1.4 1.2c.3.25.3.7 0 1-.65.75-1.6 1.2-2.65 1.05-1.65-.23-3.4-1.3-4.8-2.7s-2.47-3.15-2.7-4.8c-.15-1.05.3-2 1.05-2.65Z" fill="white"/></svg>; }

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
  const modalHistoryRef = useRef(false);
  const [selectedMatch, setSelectedMatch] = useState<Job | null>(null);
  const [basket, setBasket] = useState<Set<string>>(new Set());
  const [bulkLimit, setBulkLimit] = useState(1);
  const [preparedBulk, setPreparedBulk] = useState<Array<{ id: string; key: string; job: Job; letter: string; tailoredCvText: string; letterSource: "JIA" | "CANDIDATE"; batchId?: string }>>([]);
  const [editingLetterId, setEditingLetterId] = useState<string | null>(null);
  const [importingLetterId, setImportingLetterId] = useState<string | null>(null);
  const [bulkPreparing, setBulkPreparing] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expiredNoticeOpen, setExpiredNoticeOpen] = useState(false);
  const [feedMeta, setFeedMeta] = useState({ totalAvailable: 0, matchingCount: 0 });
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Toutes");
  const [marketScope, setMarketScope] = useState<"local" | "africa">("local");
  const [market, setMarket] = useState<{ scope: "local" | "africa"; countryCode: string | null; countryName: string | null; userCountryCode: string | null }>({ scope: "local", countryCode: "CM", countryName: "Cameroun", userCountryCode: "CM" });
  const [matchOnly, setMatchOnly] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [topMatchCanScrollLeft, setTopMatchCanScrollLeft] = useState(false);
  const [topMatchCanScrollRight, setTopMatchCanScrollRight] = useState(true);
  const [topMatchHover, setTopMatchHover] = useState(false);
  const [coarsePointer, setCoarsePointer] = useState(false);
  const [focusedOfferKey, setFocusedOfferKey] = useState<string | null>(null);
  const [basketHistoryOpen, setBasketHistoryOpen] = useState(false);
  const [basketHistory, setBasketHistory] = useState<Array<{id:string; title:string; company:string; score:number; sentAt:string}>>([]);
  const offersStartRef = useRef<HTMLElement | null>(null);
  const lastTapRef = useRef<HTMLElement | null>(null);
  const [noticeAnchor, setNoticeAnchor] = useState<{ top: number; bottom: number; left: number; width: number } | null>(null);

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
      if (manual) {
        try {
          const ingestRes = await fetch("/api/jobs/ingest/sources", { method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
          if (!ingestRes.ok) {
            const ingestBody = await ingestRes.json().catch(() => ({}));
            setError(ingestBody.message || "Impossible d'actualiser les sources d'offres : les offres déjà disponibles sont affichées.");
          } else {
            await fetch("/api/jobs/ingest/sources?mode=reprocess&limit=20&offset=0", { method: "POST", headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) }).catch(() => {});
          }
        } catch {
          setError("L'actualisation des sources prend plus de temps que prévu : les offres déjà disponibles sont affichées.");
        }
      }
      const [jobsRes, appsRes] = await Promise.all([
        fetch(`/api/jobs?limit=200&page=1&scope=${marketScope}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/applications", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const jobsBody = await jobsRes.json(); if (!jobsRes.ok) throw new Error(jobsBody.message || "Impossible de charger les offres.");
      setJobs(jobsBody.jobs || []); setFeedMeta({ totalAvailable: jobsBody.totalAvailable || 0, matchingCount: jobsBody.matchingCount || 0 }); if (jobsBody.market) setMarket(jobsBody.market);
      if (appsRes.ok) { const body = await appsRes.json(); setApplied(new Set((body.applications || []).filter((a: any) => ["SUBMITTED","SUBMITTING"].includes(a.status)).map((a: any) => `${a.source}:${a.jobId || a.recruiterJobId}`))); setApplicationReadyKeys(new Set((body.applications || []).filter((a: any) => ["USER_REVIEW","PREPARED"].includes(a.status)).map((a: any) => `${a.source}:${a.jobId || a.recruiterJobId}`))); }
      const bulkInfoRes = await fetch("/api/applications/bulk-check", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ selectedCount: 0 }) });
      if (bulkInfoRes.ok) { const bulkInfo = await bulkInfoRes.json().catch(() => ({})); setBulkLimit(Number(bulkInfo.bulkApplicationLimit || 1)); }
    } catch (e) { setError(e instanceof Error ? e.message : "Erreur réseau."); }
    finally { setLoading(false); setRefreshing(false); }
  }, [token, marketScope]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("button,a,[role='button']") as HTMLElement | null;
      if (el) lastTapRef.current = el;
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, []);
  useEffect(() => {
    if (!error) { setNoticeAnchor(null); return; }
    const el = lastTapRef.current;
    const r = el && el.isConnected ? el.getBoundingClientRect() : null;
    setNoticeAnchor(r ? { top: r.top, bottom: r.bottom, left: r.left, width: r.width } : null);
  }, [error]);


  useEffect(() => {
    try { setSaved(new Set(JSON.parse(localStorage.getItem("jobly:jia:saved-offers") || "[]"))); } catch {}
    try { setBasket(new Set(JSON.parse(localStorage.getItem("jobly:jia:application-basket") || "[]"))); } catch {}
    try { setBasketHistory(JSON.parse(localStorage.getItem("jobly:jia:application-history") || "[]")); } catch {}
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
      name: cleanCompanyName(selectedCompany.name) || "",
      website: selectedCompany.website || "",
      description: selectedCompany.description || "",
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

  const closeOfferModal = useCallback((kind: "match" | "company") => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setFocusedOfferKey(null);
    if (modalHistoryRef.current) {
      modalHistoryRef.current = false;
      window.history.back();
    } else {
      if (kind === "match") setSelectedMatch(null);
      else setSelectedCompany(null);
    }
  }, []);

  useEffect(() => {
    if (!selectedMatch && !selectedCompany) return;
    modalHistoryRef.current = true;
    const stateKey = "jobly-offers-modal";
    window.history.pushState({ ...(window.history.state || {}), [stateKey]: true }, "", window.location.href);
    const onPopState = () => {
      modalHistoryRef.current = false;
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      setFocusedOfferKey(null);
      setSelectedMatch(null);
      setSelectedCompany(null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [selectedMatch, selectedCompany]);

  const toggleBasket = useCallback((job: Job) => {
    const key = `${job.source}:${job.id}`;
    if (applied.has(key)) { setError("Vous avez déjà postulé à cette offre : elle ne peut plus être ajoutée au panier."); return; }
    if (applicationReadyKeys.has(key)) { setError("Cette candidature est déjà préparée et attend votre validation : retrouvez-la dans l’onglet Candidatures."); return; }
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

  function openEmail(job: Job) {
    const email = applicationEmail(job);
    if (!email) return;
    const subject = encodeURIComponent(`Candidature — ${cleanJobTitle(job.title)}`);
    const body = encodeURIComponent(`Bonjour,\n\nJe souhaite vous soumettre ma candidature au poste de ${cleanJobTitle(job.title)}.${job.company?.name ? `\n\nEntreprise : ${cleanCompanyName(job.company.name) || ""}` : ""}\n\nOffre Jobly : ${window.location.origin}/jobs/${job.id}?source=${job.source}\n\nCordialement.`);
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${subject}&body=${body}`, "_blank", "noopener,noreferrer");
  }

  async function prepareSingleApplication(job: Job) {
    if (!token || bulkPreparing) return;
    setBulkPreparing(true); setError("");
    try {
      const prepareRes = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ source: job.source, jobId: job.id, readinessScoreAtApply: job.matchPercent, locale: typeof navigator !== "undefined" && navigator.language.startsWith("en") ? "en" : "fr" }) });
      const preparedBody = await prepareRes.json().catch(() => ({}));
      if (!prepareRes.ok) throw new Error(preparedBody.message || "La candidature n'a pas pu être préparée.");
      const applicationId = preparedBody.application?.id;
      if (!applicationId) throw new Error("La candidature a été préparée sans identifiant exploitable.");
      setPreparedBulk([{
        id: applicationId, key: `${job.source}:${job.id}`, job,
        letter: String(preparedBody.prepared?.letter || ""), tailoredCvText: String(preparedBody.prepared?.tailoredCvText || ""),
        letterSource: preparedBody.prepared?.letterSource === "CANDIDATE" ? "CANDIDATE" : "JIA",
      }]);
    } catch (e) { setError(e instanceof Error ? e.message : "La préparation de la candidature a échoué.");  }
    finally { setBulkPreparing(false); }
  }

  function applicationEmail(job: Job) {
    return String(job.applicationProfile?.applicationEmail || job.applicationProfile?.email || "").trim();
  }
  function applicationPhone(job: Job) {
    return String(job.applicationProfile?.applicationPhone || job.applicationProfile?.phone || job.applicationProfile?.phoneNumbers?.[0] || "").trim();
  }
  async function applyViaWhatsApp(job: Job) {
    const raw = applicationPhone(job);
    const digits = raw.replace(/\D/g, "");
    const phone = digits.startsWith("237") ? digits : digits.length === 9 ? "237" + digits : "";
    if (!phone) { router.push(`/jobs/${job.id}?source=${job.source}`); return; }
    if (!token) { setError("Votre session Jobly a expiré. Reconnectez-vous pour postuler.");  return; }
    try {
      const res = await fetch("/api/cv-share", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ source: job.source, jobId: job.id }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Impossible de préparer la candidature WhatsApp.");
      const company = cleanCompanyName(job.company?.name);
      const message = `Bonjour, je suis ${body.candidateName}. Je souhaite vous soumettre ma candidature au poste de ${job.title}${company !== "Aucune donnée" ? ` chez ${company}` : ""}.\n\n📄 CV ${body.candidateName} — Candidature ${company !== "Aucune donnée" ? company : job.title}\n${window.location.origin}/cv/share/${body.token}`;
      window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible de préparer la candidature WhatsApp.");  }
  }
  function handleApplyClick(job: Job, state: { done: boolean; ready: boolean; busy: boolean }) { if (state.busy) { setError("Envoi en cours : patientez quelques secondes."); return; } if (state.done) { setError("Candidature déjà envoyée pour cette offre. Retrouvez-la dans l’onglet Candidatures."); return; } if (state.ready) { setError("Candidature déjà préparée : elle attend votre validation dans l’onglet Candidatures."); return; } void apply(job); }
  async function apply(job: Job) {
    if (job.deadlineExpired) { setExpiredNoticeOpen(true); return; }
    const email = applicationEmail(job);
    const phone = applicationPhone(job);
    if (phone && !email) { await applyViaWhatsApp(job); return; }
    if (email) { await prepareSingleApplication(job); return; }
    router.push(`/jobs/${job.id}?source=${job.source}`);
  }

  async function prepareBulkApplications() {
    if (!token || basketJobs.length === 0 || bulkPreparing) return;
    setBulkPreparing(true); setError("");
    try {
      const batchRes = await fetch("/api/applications/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ offers: basketJobs.map(job => ({ offerId: job.source === "discovery" ? job.id : null })) }),
      });
      const batchBody = await batchRes.json().catch(() => ({}));
      if (!batchRes.ok) throw new Error(batchBody.message || "Impossible de créer le lot de candidatures.");
      const batchId = String(batchBody.batch?.id || "");
      const prepared: Array<{ id: string; key: string; job: Job; letter: string; tailoredCvText: string; letterSource: "JIA" | "CANDIDATE"; batchId?: string }> = [];
      for (const job of basketJobs) {
        const key = `${job.source}:${job.id}`;
        const res = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ source: job.source, jobId: job.id }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (prepared.length) { setPreparedBulk(prepared); setBasket(new Set()); try { localStorage.setItem("jobly:jia:application-basket", "[]"); } catch {} }
          throw new Error(body.message || `Impossible de préparer ${job.title}.`);
        }
        const id = body.application?.id;
        if (id) prepared.push({ id, key, job, letter: String(body.prepared?.letter || ""), tailoredCvText: String(body.prepared?.tailoredCvText || ""), letterSource: body.prepared?.letterSource === "CANDIDATE" ? "CANDIDATE" : "JIA", batchId });
      }
      if (batchId) await fetch("/api/applications/batch", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ batchId, status: "READY_FOR_REVIEW" }) });
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
    try {
      const checkRes = await fetch("/api/applications/bulk-check", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ selectedCount: preparedBulk.length }) });
      const checkBody = await checkRes.json().catch(() => ({}));
      if (!checkRes.ok) throw new Error(checkBody.message || "La postulation groupée n'est pas disponible avec votre formule.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "La postulation groupée n'est pas disponible avec votre formule.");
      setBulkSubmitting(false);
      return;
    }
    const remaining: typeof preparedBulk = [];
    const batchId = preparedBulk[0]?.batchId;
    if (batchId) await fetch("/api/applications/batch", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ batchId, status: "SENDING" }) });
    const sentHistory: typeof basketHistory = []; 
    for (const item of preparedBulk) {
      try {
        const res = await fetch(`/api/applications/${item.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ letterText: item.letter }) });
        const body = await res.json().catch(() => ({}));
        if (!res.ok && res.status !== 202) { remaining.push(item); continue; }
        if (body.submitted || res.status === 202) {
          setApplied(prev => new Set(prev).add(item.key));
          sentHistory.push({ id: item.id, title: cleanJobTitle(item.job.title), company: cleanCompanyName(item.job.company?.name) || "Entreprise non renseignée", score: item.job.matchPercent, sentAt: new Date().toISOString() });
        }
      } catch { remaining.push(item); }
    }
    if (sentHistory.length) {
      setBasketHistory(prev => {
        const next = [...sentHistory, ...prev].slice(0, 50);
        try { localStorage.setItem("jobly:jia:application-history", JSON.stringify(next)); } catch {}
        return next;
      });
    }
    if (remaining.length) {
      if (batchId) await fetch("/api/applications/batch", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ batchId, status: "PARTIAL_FAILURE" }) });
      setPreparedBulk(remaining);
      setError(`${preparedBulk.length - remaining.length}/${preparedBulk.length} candidatures envoyées. Les autres restent prêtes à être envoyées.`);
    } else {
      if (batchId) await fetch("/api/applications/batch", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ batchId, status: "COMPLETED" }) });
      setPreparedBulk([]);
    }
    setBulkSubmitting(false);
  }

  const focusMatch = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get("focus") === "match"; } catch { return false; }
  }, []);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = jobs.filter(job => {
      const haystack = [job.title, job.location, job.contractType, job.remoteMode, cleanCompanyName(job.company?.name)].filter(Boolean).join(" ").toLowerCase();
      const matchesQuery = !q || haystack.includes(q);
      const matchesFilter = filter === "Toutes"
        || (filter === "En cours" ? !job.deadlineExpired : String(job.contractType || "").toLowerCase().includes(filter.toLowerCase()));
      return matchesQuery && matchesFilter && (!matchOnly || job.matchPercent >= 50);
    });
    return focusMatch ? [...result].sort((a, b) => b.matchPercent - a.matchPercent) : result;
  }, [jobs, query, filter, focusMatch, matchOnly]);

function normalizeVoice(text: string) { return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

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
        const next = lower.includes("en cours") ? "En cours" : lower.includes("cdi") ? "CDI" : lower.includes("cdd") ? "CDD" : lower.includes("stage") ? "Stage" : "Toutes";
        setFilter(next);
        respond(next === "Toutes" ? "Dis-moi le filtre souhaité : En cours, CDI, CDD ou stage." : "C’est filtré.", "filter");
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
  const featured = useMemo(() => filteredJobs.filter(job => !job.deadlineExpired).slice(0, 10), [filteredJobs]);
  const rest = useMemo(() => filteredJobs.filter(job => !featured.some(featuredJob => featuredJob.source === job.source && featuredJob.id === job.id)), [filteredJobs, featured]);
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
    let frame = 0;
    const syncBackToTop = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const card = document.querySelector<HTMLElement>('[data-offer-number="30"]');
        if (!card) { setShowBackToTop(window.scrollY > window.innerHeight * 1.5); return; }
        const threshold = card.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.9;
        setShowBackToTop(window.scrollY >= Math.max(0, threshold));
      });
    };
    syncBackToTop();
    window.addEventListener("scroll", syncBackToTop, { passive: true });
    window.addEventListener("resize", syncBackToTop, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncBackToTop);
      window.removeEventListener("resize", syncBackToTop);
    };
  }, [filteredJobs.length, featured.length]);

  useEffect(() => {
    const updateVerticalFocus = () => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-offer-index]'));
      if (!cards.length) {
        setFocusedOfferKey(null);
        return;
      }

      const focusTop = window.innerHeight * 0.28;
      const focusBottom = window.innerHeight * 0.72;
      let closest: { key: string; distance: number } | null = null;

      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        const visibleTop = Math.max(rect.top, focusTop);
        const visibleBottom = Math.min(rect.bottom, focusBottom);
        if (visibleBottom <= visibleTop) continue;

        const key = card.dataset.offerKey;
        if (!key) continue;

        const distance = Math.abs(rect.top + rect.height / 2 - window.innerHeight * 0.5);
        if (!closest || distance < closest.distance) closest = { key, distance };
      }

      setFocusedOfferKey(closest?.key || null);
    };

    updateVerticalFocus();
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateVerticalFocus();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [rest.length]);

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


  const scrollTopMatches = useCallback((direction: number) => {
    const container = topMatchRef.current;
    if (!container) return;
    const firstCard = container.querySelector<HTMLElement>("[data-top-match-card]");
    const gap = 16;
    const step = (firstCard?.getBoundingClientRect().width || container.clientWidth * 0.86) + gap;
    container.scrollBy({ left: direction * step, behavior: "smooth" });
  }, []);
  const marketLabel = marketScope === "africa" ? "🌍 Explorer l’Afrique" : `${countryFlag(market.countryCode)} ${market.countryName || "Cameroun"}`;
  const feedSummary = feedMeta.totalAvailable ? `${feedMeta.totalAvailable} offre${feedMeta.totalAvailable > 1 ? "s" : ""} disponible${feedMeta.totalAvailable > 1 ? "s" : ""} aujourd’hui` : "Marché en cours de synchronisation";

  if (sessionLoading || (loading && !jobs.length)) return (
    <main className="min-h-[100dvh] overflow-x-clip bg-[#F5F7F8] pb-28 text-[#17212B]">
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

  return <main className="min-h-[100dvh] w-full bg-[#F5F7F8] pb-28 text-[#17212B]">
    <section className="relative mx-auto max-w-6xl px-5 pb-8 pt-7 sm:px-8">
      <motion.div className="absolute -right-20 top-0 h-72 w-72 rounded-full bg-[#7A9BB5]/30 blur-3xl" animate={{ x: [0, -30, 0], y: [0, 25, 0], scale: [1, 1.1, 1] }} transition={{ duration: 12, repeat: Infinity }} />
      <div className="relative z-10 flex items-end justify-between gap-4"><div><h1 className="mt-2 text-4xl font-black leading-[.95] tracking-[-.045em] text-[#0057B8] sm:text-6xl">Offres</h1><p className="mt-3 max-w-xl text-base font-black text-[#FFE135] font-black">J’IA se charge de tout</p></div><button type="button" onClick={() => load(true)} aria-label="Actualiser les offres d’emploi" title="Actualiser les offres d’emploi" className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[#FFE135] px-4 text-sm font-black text-[#2E3F4F] shadow-[0_8px_24px_rgba(255,225,53,.28)] transition hover:scale-[1.02] active:scale-[.98] disabled:opacity-60" disabled={refreshing}><RefreshCw size={18} className={refreshing ? "animate-spin" : ""}/><span>{refreshing ? "Actualisation…" : "Actualiser les offres"}</span></button></div>
      {error && <AnchoredNotice message={error} anchor={noticeAnchor} onDone={() => setError("")} />}
      <div className="relative z-10 mt-5 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[1px] text-slate-500"><button type="button" onClick={() => setMatchOnly(v => !v)} className={matchOnly ? "rounded-full border border-[#F97316] bg-[#F97316] px-3 py-2 text-white shadow-[0_8px_22px_rgba(249,115,22,.24)]" : "rounded-full border border-[#F97316]/30 bg-[#FFF7ED] px-3 py-2 text-[#C2410C]"}>Les offres qui vous correspondent : <span className="text-xs font-black text-[#FFE135]">{feedMeta.matchingCount}</span></button></div>
    </section>

    <section ref={offersStartRef} id="jobly-offers-start" className="mx-auto w-full max-w-full min-w-0 overflow-x-clip px-5 scroll-mt-6 sm:px-8 lg:max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[1.8px] text-[#7A9BB5]">{marketLabel}</p>
          <h2 className="mt-1 text-xl font-black text-[#00A6A6]">{feedSummary}</h2>
        </div>
        <form onSubmit={e => { e.preventDefault(); setQuery(query.trim()); }} className="flex h-11 min-w-[280px] items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm"><Search size={16} className="text-[#22448B]"/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Métier, entreprise, ville…" aria-label="Rechercher une offre" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"/><button type="submit" aria-label="Rechercher" title="Rechercher" className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#22448B] text-white transition hover:bg-[#17346E]"><Search size={14}/></button></form>
      </div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 justify-start gap-2 overflow-x-auto px-1">
          {["Toutes","En cours","CDI","CDD","Stage"].map(item => <button key={item} onClick={() => setFilter(item)} className={filter === item ? "whitespace-nowrap rounded-2xl bg-[#FFE135] px-4 py-3 text-xs font-black text-[#17212B]" : "whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-500"}>{item}</button>)}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => { setMarketScope("local"); setFilter("Toutes"); }} className={marketScope === "local" ? "shrink-0 rounded-2xl bg-[#22448B] px-4 py-3 text-xs font-black text-white shadow-sm" : "shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-600"}>{countryFlag(market.countryCode)} {market.countryName || "Cameroun"}</button>
          <button type="button" onClick={() => { setMarketScope("africa"); setFilter("Toutes"); }} className={marketScope === "africa" ? "shrink-0 rounded-2xl bg-[#22448B] px-4 py-3 text-xs font-black text-white shadow-sm" : "shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-600"}>🌍 Explorer l’Afrique</button>
        </div>
      </div>
      {featured.length > 0 && (
        <div className="relative" onMouseEnter={() => setTopMatchHover(true)} onMouseLeave={() => setTopMatchHover(false)}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[2px] text-[#FFE135]">MEILLEURES OFFRES</p>
              <p className="mt-1 text-xs text-slate-400">Les offres qui correspondent le mieux à votre profil actuel</p>
            </div>
          </div>
          <button type="button" aria-label="Voir les meilleures offres précédentes" onClick={() => scrollTopMatches(-1)} disabled={!topMatchCanScrollLeft} className={topMatchHover || coarsePointer ? "absolute left-1 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/80 text-[#FFE135] shadow-[0_8px_28px_rgba(255,225,53,.45)] backdrop-blur-xl" : "absolute left-1 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/80 text-[#FFE135] shadow-[0_8px_28px_rgba(255,225,53,.45)] backdrop-blur-xl"}><ChevronLeft size={21}/></button>
          <button type="button" aria-label="Voir les meilleures offres suivantes" onClick={() => scrollTopMatches(1)} disabled={!topMatchCanScrollRight} className={topMatchHover || coarsePointer ? "absolute right-1 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/80 text-[#FFE135] shadow-[0_8px_28px_rgba(255,225,53,.45)] backdrop-blur-xl" : "absolute right-1 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/80 bg-white/80 text-[#FFE135] shadow-[0_8px_28px_rgba(255,225,53,.45)] backdrop-blur-xl"}><ChevronRight size={21}/></button>
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
              const emailChannel = Boolean(job.applicationProfile?.applicationEmail || job.applicationProfile?.email);
              const phoneChannel = Boolean(job.applicationProfile?.applicationPhone || job.applicationProfile?.phone || job.applicationProfile?.phoneNumbers?.length);
              return (
                <article
                  key={key}
                  data-top-match-card
                  className="relative w-[86%] min-w-[86%] max-w-[86%] flex-none snap-start overflow-hidden rounded-[20px] border border-white/15 bg-white p-2 shadow-[0_14px_36px_rgba(23,33,43,.10)] sm:w-[48%] sm:min-w-[48%] sm:max-w-[48%] lg:w-[31%] lg:min-w-[31%] lg:max-w-[31%]"
                >
                  <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden rounded-[18px] bg-[#EEF2F6]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,225,53,.28),transparent_38%),radial-gradient(circle_at_80%_80%,rgba(46,63,79,.18),transparent_42%)]"/>
                    <div className="pointer-events-none absolute inset-0 z-[1] flex min-w-0 items-center justify-center overflow-hidden px-4">
                      <div className="flex h-full w-full min-w-0 items-center justify-center opacity-100">
                        <div className="flex h-full w-full min-w-0 items-center justify-center">
                          <CompanyLogo companyName={cleanCompanyName(job.company?.name)} domain={job.company?.domain} website={job.company?.website} logoUrl={job.company?.logoUrl} size={640} className="company-logo-fill-frame !h-full !w-full !rounded-none !border-0 !bg-transparent !p-0"/>
                        </div>
                      </div>
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-24 bg-gradient-to-t from-[#2E3F4F]/60 via-[#2E3F4F]/15 to-transparent"/>
                    <span className="absolute left-3 top-3 z-10 rounded-full bg-[#FFE135] px-3 py-1 text-[9px] font-black uppercase tracking-[1.4px] text-[#2E3F4F] shadow-[0_6px_18px_rgba(23,33,43,.18)]">Meilleures offres</span>
                    <button type="button" onClick={() => setSelectedMatch(job)} aria-label={`Voir le score de compatibilité de ${job.matchPercent}%`} title="Voir le détail du score" className="absolute bottom-2 right-2 z-10 rounded-2xl px-2 py-1 text-right transition [@media(hover:hover)]:hover:bg-black/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE135] [-webkit-tap-highlight-color:transparent]"><strong className="block text-4xl font-black text-[#FFE135]">{job.matchPercent}%</strong><span className="text-[8px] font-black uppercase tracking-[1px] text-white/85">Voir mon score</span></button>
                  </div>
                  <div className="p-3">
                    <div className="mt-1 flex items-center gap-2">
                      <CompanyLogo companyName={cleanCompanyName(job.company?.name)} domain={job.company?.domain} website={job.company?.website} logoUrl={job.company?.logoUrl} size={36}/>
                      <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[1.5px] text-[#7A9BB5]">{(() => { const companyName = cleanCompanyName(job.company?.name) || ""; return companyName.length > 20 ? `${companyName.slice(0, 17)}...` : companyName; })()}</p>
                    </div>
                    <h2 className="mt-1 text-xl font-black leading-tight">{job.title}</h2>
                    <p className="mt-3 text-xs text-slate-500">{[marketScope === "africa" && job.countryCode ? `${countryFlag(job.countryCode)} ${countryName(job.countryCode)}` : null, job.location, job.contractType, job.remoteMode].map(cleanDisplayText).filter(Boolean).join(" · ") || "Toutes localisations"}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">Publié · <b className="text-slate-700">{formatDate(job.publishedAt)}</b>{job.deadlineExpired && <span className="rounded-full bg-red-50 px-2 py-1 font-black uppercase tracking-[.8px] text-red-600">Offre expirée</span>}</div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => handleApplyClick(job, { done, ready, busy })} aria-disabled={done || ready || busy} className={`flex h-12 min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full px-3 text-sm font-black leading-none text-[#17212B] disabled:bg-slate-200 disabled:text-[#17212B] ${ready ? "bg-[#7CFC00]" : "bg-[#FFE135]"}`}>
                        {done ? <><Check size={17} className="mr-2"/>Candidature envoyée</> : ready ? "Candidature prête" : busy ? <><RefreshCw size={17} className="mr-2 animate-spin"/>Envoi en cours…</> : <>{emailChannel ? <GmailIcon size={18}/> : phoneChannel ? <WhatsAppIcon size={18}/> : <Send size={17}/>}<span>Postuler</span></>}
                      </button>
                      <button type="button" onClick={() => { setSelectedCompany(job.company || { id: null, name: "Aucune donnée", logoUrl: null, description: null, website: null, domain: null, verified: false }); setSelectedCompanyLocation(job.location); }} aria-label="En savoir plus sur l’entreprise" title="En savoir +" className="inline-flex h-12 items-center justify-center whitespace-nowrap rounded-full bg-[#00A6E8] px-4 text-xs font-black text-white shadow-[0_8px_20px_rgba(0,166,232,.22)] transition hover:bg-[#008FC8] active:scale-[.98]">En savoir +</button>
                      <button type="button" onClick={() => router.push(`/jobs/${job.id}?source=${job.source}`)} aria-label="Voir l'offre" title="Voir l’offre" className="inline-flex h-12 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[#7C3AED]/25 bg-[#F3E8FF] px-3 text-xs font-black text-[#6D28D9] transition hover:bg-[#EDE9FE]"><span>Voir l’offre</span><ArrowUpRight size={17}/></button>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button onClick={() => toggleBasket(job)} aria-label={basket.has(key) ? "Retirer du panier" : "Ajouter au panier"} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FFE135] px-3 text-[10px] font-black text-[#2E3F4F] transition hover:brightness-95">
                        {basket.has(key) ? <CheckSquare size={15}/> : <ShoppingBasket size={15}/>}
                        {basket.has(key) ? "Retirer du panier" : "Ajouter au panier"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <div className="mx-auto mt-10 grid w-full min-w-0 max-w-full grid-cols-1 gap-3 md:grid-cols-2">{rest.map((job, index) => { const key = `${job.source}:${job.id}`; const done = applied.has(key); const ready = applicationReadyKeys.has(key); const busy = submitting.has(key); const selected = basket.has(key); const emailChannel = Boolean(job.applicationProfile?.applicationEmail || job.applicationProfile?.email); const phoneChannel = Boolean(job.applicationProfile?.applicationPhone || job.applicationProfile?.phone || job.applicationProfile?.phoneNumbers?.length); const focused = focusedOfferKey === key; return <article key={key} data-offer-index={index + featured.length + 1} data-offer-number={index + featured.length + 1} data-offer-key={key} style={{ touchAction: "pan-y" }} className={`group min-w-0 max-w-full transform-gpu transition-[transform,box-shadow] duration-300 ease-out will-change-transform ${focused ? "relative z-10 -translate-y-3 shadow-[0_18px_44px_rgba(255,225,53,.48)] md:-translate-y-2" : "relative z-0 translate-y-0 shadow-[0_10px_32px_rgba(23,33,43,.07)]"} ${selected ? "rounded-[24px] border-2 border-[#FFE135] bg-white p-3 opacity-90" : "rounded-[24px] border border-white/10 bg-white p-3 opacity-90"}`}><div className="flex gap-3"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white"><CompanyLogo companyName={cleanCompanyName(job.company?.name)} domain={job.company?.domain} website={job.company?.website} size={50}/></div><div className="min-w-0 flex-1"><p className="line-clamp-2 break-words text-[10px] font-bold uppercase tracking-[1.1px] text-[#7A9BB5]">{cleanCompanyName(job.company?.name) || "Aucune donnée"}</p><h2 className="mt-0.5 text-base font-black">{job.title}</h2><p className="mt-1 text-[11px] text-slate-500">{[marketScope === "africa" && job.countryCode ? `${countryFlag(job.countryCode)} ${countryName(job.countryCode)}` : null, job.location, job.contractType].map(cleanDisplayText).filter(Boolean).join(" · ") || "Aucune donnée"}</p><p className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-400">Publié {formatDate(job.publishedAt)} {job.deadlineExpired && <span className="rounded-full bg-red-50 px-2 py-0.5 font-black uppercase tracking-[.7px] text-red-600">Offre expirée</span>}</p></div><button type="button" onClick={() => setSelectedMatch(job)} aria-label={`Voir le score de compatibilité de ${job.matchPercent}%`} title="Voir le détail du score" className="rounded-xl px-1 text-right transition [@media(hover:hover)]:hover:bg-[#FFFBE0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFE135] [-webkit-tap-highlight-color:transparent]"><strong className="block text-xl font-black text-[#FFE135]">{job.matchPercent}%</strong><span className="text-[8px] font-black text-[#FFE135]">Mon score</span></button></div><div className="mt-3 flex gap-2"><button onClick={() => toggleBasket(job)} aria-disabled={done || ready} className={selected ? "grid w-11 place-items-center rounded-full bg-[#FFE135] text-[#2E3F4F]" : "grid w-11 place-items-center rounded-full border border-slate-200 text-[#B59A00]"} aria-label={selected ? "Retirer du panier" : "Ajouter au panier"}>{selected ? <CheckSquare size={16}/> : <ShoppingBasket size={16}/>}</button><button type="button" onClick={() => handleApplyClick(job, { done, ready, busy })} aria-disabled={done || ready || busy} className={`flex min-w-0 flex-1 items-center justify-center whitespace-nowrap rounded-full px-2.5 py-2.5 text-xs font-black leading-none text-[#17212B] disabled:bg-slate-200 disabled:text-[#17212B] ${ready ? "bg-[#7CFC00]" : "bg-[#FFE135]"}`}>{done ? "Candidature envoyée" : ready ? "Candidature prête" : busy ? "Préparation…" : <>{emailChannel ? <GmailIcon size={16}/> : phoneChannel ? <WhatsAppIcon size={16}/> : <Send size={15}/>}<span>Postuler</span></>}</button><button onClick={() => { setSelectedCompany(job.company || { id: null, name: "Aucune donnée", logoUrl: null, description: null, website: null, domain: null, verified: false }); setSelectedCompanyLocation(job.location); }} aria-label={`En savoir plus sur ${cleanCompanyName(job.company?.name) || "l’entreprise"}`} title="En savoir +" className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-[#00A6E8] px-3.5 py-2.5 text-xs font-black text-white shadow-[0_8px_20px_rgba(0,166,232,.18)] transition hover:bg-[#008FC8] active:scale-[.98]">En savoir +</button><button onClick={() => router.push(`/jobs/${job.id}?source=${job.source}`)} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#7C3AED]/25 bg-[#F3E8FF] px-3 py-2.5 text-xs font-black text-[#6D28D9]"><span>Voir l’offre</span><ArrowUpRight size={14}/></button></div></article>; })}</div>
    </section>

    {basketJobs.length > 0 && (
      <div className="fixed bottom-20 left-1/2 z-[80] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-[24px] border border-[#3B4652] bg-[#2E3F4F] p-4  text-white shadow-2xl sm:bottom-6">
        <div className="relative flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#FFE135] text-[#2E3F4F]"><ShoppingBasket size={18}/></div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">Panier de candidature ({basketJobs.length}/{bulkLimit})</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => void prepareBulkApplications()} disabled={bulkPreparing} className="rounded-full bg-[#FFE135] px-4 py-2.5 text-xs font-black text-[#2E3F4F]">{bulkPreparing ? "Préparation…" : "Préparer avec J’IA"}</button>
              <button type="button" onClick={() => setBasketHistoryOpen(true)} className="rounded-full bg-[#7C3AED] px-3 py-2.5 text-[10px] font-black text-white shadow-sm transition hover:bg-[#6D28D9]">Historique</button>
            </div>
          </div>
          <button type="button" aria-label="Fermer et vider le panier de candidatures" title="Annuler et désélectionner les candidatures" onClick={() => { setBasket(new Set()); try { localStorage.setItem("jobly:jia:application-basket", "[]"); } catch {} }} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"><X size={18}/></button>
          <p className="mt-3 text-center text-[11px] font-semibold leading-4 text-white/60">J’IA prépare chaque candidature séparément avant votre validation.</p>
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
              <summary className="cursor-pointer list-none"><div className="flex items-center gap-3"><CompanyLogo companyName={cleanCompanyName(item.job.company?.name)} logoUrl={item.job.company?.logoUrl} domain={item.job.company?.domain} website={item.job.company?.website} size={40}/><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold uppercase text-slate-400">{cleanCompanyName(item.job.company?.name)}</p><p className="truncate text-sm font-black">{item.job.title}</p></div><span className="rounded-full bg-[#DDF8EA] px-2 py-1 text-[9px] font-black text-[#08733E]">{item.job.matchPercent}% match</span></div></summary>
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

    <AnimatePresence>{basketHistoryOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[110] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setBasketHistoryOpen(false)}>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} onClick={e => e.stopPropagation()} className="max-h-[80dvh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[1.5px] text-[#B59A00]">PANIER</p><h2 className="text-2xl font-black text-[#17212B]">Historique des candidatures</h2></div><button type="button" onClick={() => setBasketHistoryOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600" aria-label="Fermer"><X size={17}/></button></div>
        {!basketHistory.length ? <p className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">Aucune candidature issue du panier pour le moment.</p> : <div className="mt-5 space-y-3">{basketHistory.map(item => <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-[#17212B]">{item.title}</p><p className="mt-1 text-xs font-bold text-slate-500">{item.company}</p></div><span className="rounded-full bg-[#EEF4FF] px-2.5 py-1 text-[10px] font-black text-[#22448B]">{item.score}% matching</span></div><p className="mt-3 text-[10px] font-semibold text-slate-400">{new Intl.DateTimeFormat("fr-FR",{dateStyle:"short",timeStyle:"short"}).format(new Date(item.sentAt))}</p></div>)}</div>}
      </motion.div>
    </motion.div>}</AnimatePresence>

    <AnimatePresence>{expiredNoticeOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[130] grid place-items-center bg-black/55 p-4 backdrop-blur-sm" onClick={() => setExpiredNoticeOpen(false)}>
      <motion.div initial={{ y: 18, opacity: 0, scale: .97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 18, opacity: 0 }} onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-[28px] bg-white p-6 text-center shadow-2xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-600"><X size={25}/></div>
        <p className="mt-4 text-sm font-bold leading-6 text-[#17212B]">Nous sommes désolés, cette entreprise n'accepte plus de nouvelles candidatures pour cette offre. Restez connecté sur <span className="font-black text-[#FFE135]">Jobly</span> pour ne rien rater des offres qui vous correspondent.</p>
        <button type="button" onClick={() => { setExpiredNoticeOpen(false); router.push("/jobs?focus=match"); }} className="mt-5 w-full rounded-full bg-[#FFE135] px-5 py-3 text-xs font-black text-[#2E3F4F]">Des offres qui vous correspondent</button>
        <button type="button" onClick={() => setExpiredNoticeOpen(false)} className="mt-2 rounded-full px-4 py-2 text-xs font-bold text-slate-400">Fermer</button>
      </motion.div>
    </motion.div>}</AnimatePresence>

    <AnimatePresence>{selectedMatch && (() => {
      const m = selectedMatch;
      const breakdown = m.matchBreakdown || [];
      const statuses = [
        { key: "MATCH", label: "Correspondent", bar: "bg-emerald-500", soft: "bg-emerald-50", text: "text-emerald-700" },
        { key: "PARTIAL", label: "Partiels", bar: "bg-orange-400", soft: "bg-orange-50", text: "text-orange-600" },
        { key: "MISMATCH", label: "Écarts", bar: "bg-red-500", soft: "bg-red-50", text: "text-red-600" },
        { key: "UNKNOWN", label: "À vérifier", bar: "bg-amber-400", soft: "bg-amber-50", text: "text-amber-700" },
      ] as const;
      const counts = statuses.map(s => breakdown.filter(item => item.status === s.key).length);
      const total = Math.max(1, counts.reduce((a, b) => a + b, 0));
      const verdict = m.matchPercent >= 85 ? "Très forte compatibilité" : m.matchPercent >= 70 ? "Bonne compatibilité" : m.matchPercent >= 60 ? "Compatibilité intéressante" : "Compatibilité à renforcer";
      const barColor = (status: string) => status === "MISMATCH" ? "bg-red-500" : status === "PARTIAL" ? "bg-orange-400" : status === "UNKNOWN" ? "bg-amber-400" : "bg-emerald-500";
      const valueColor = (status: string) => status === "MISMATCH" ? "text-red-600" : status === "PARTIAL" ? "text-orange-500" : status === "UNKNOWN" ? "text-amber-600" : "text-emerald-600";
      return (
        <motion.div key="match-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[105] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4" onClick={() => closeOfferModal("match")}>
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()} className="flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white text-[#17212B] shadow-2xl sm:rounded-[28px]">
            <div className="shrink-0 bg-[#2E3F4F] px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[1.6px] text-[#FFE135]">JOBLY MATCH</p>
                  <h2 className="mt-1 text-xl font-black leading-tight">Votre score de compatibilité</h2>
                </div>
                <button type="button" onClick={() => closeOfferModal("match")} aria-label="Fermer le détail du score" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10"><X size={20}/></button>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <ScoreDonut value={m.matchPercent} size={104} tone="dark" />
                <div className="min-w-0">
                  <p className="text-base font-black leading-snug">{cleanJobTitle(m.title)}</p>
                  <p className="mt-1 truncate text-sm text-white/70">{cleanCompanyName(m.company?.name) || "Aucune donnée"}</p>
                  <p className="mt-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-black">{verdict}</p>
                </div>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {statuses.map((s, i) => (
                  <div key={s.key} className={`rounded-2xl ${s.soft} p-3 text-center`}>
                    <p className={`text-3xl font-black leading-none ${s.text}`}>{counts[i]}</p>
                    <p className="mt-1.5 text-xs font-black text-slate-600">{s.label}</p>
                  </div>
                ))}
              </div>
              {breakdown.length > 0 && <>
                <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                  {statuses.map((s, i) => counts[i] > 0 && <div key={s.key} className={s.bar} style={{ width: `${(counts[i] / total) * 100}%` }} />)}
                </div>
                <p className="mt-1.5 text-xs font-semibold text-slate-500">Répartition des {breakdown.length} critères analysés</p>
              </>}
              <h3 className="mt-5 text-sm font-black">Détail par critère</h3>
              {breakdown.length === 0 && <p className="mt-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">Aucun critère détaillé n’est disponible pour cette offre.</p>}
              <div className="mt-2 space-y-3">
                {breakdown.map(item => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 bg-[#F8FAFC] p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="min-w-0 text-sm font-black leading-snug">{cleanDisplayText(item.label)}</span>
                      <b className={`shrink-0 text-lg ${valueColor(item.status)}`}>{item.score == null ? "—" : Math.round(item.score * 100) + "%"}</b>
                    </div>
                    <div className="mt-2 h-3.5 overflow-hidden rounded-full bg-slate-200">
                      {item.score != null && <motion.div initial={{ width: 0 }} animate={{ width: Math.round(item.score * 100) + "%" }} transition={{ duration: .5 }} className={`h-full rounded-full ${barColor(item.status)}`} />}
                    </div>
                    {(item.required || item.expectedValue || item.candidateValue) && (
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-white p-2.5">
                          <p className="font-black uppercase tracking-[.6px] text-slate-400">Attendu{item.required ? " · requis" : ""}</p>
                          <p className="mt-1 font-semibold leading-snug text-slate-700">{cleanDisplayText(item.expectedValue) || "Non précisé"}</p>
                        </div>
                        <div className="rounded-xl bg-white p-2.5">
                          <p className="font-black uppercase tracking-[.6px] text-slate-400">Votre profil</p>
                          <p className="mt-1 font-semibold leading-snug text-slate-700">{cleanDisplayText(item.candidateValue) || "Non renseigné"}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-4">
                  <ScoreRing score={m.matchConfidence ?? 100} size={92} label="confiance" />
                  <p className="min-w-0 flex-1 text-xs leading-5 text-slate-500"><b className="text-[#2E3F4F]">Confiance de l’analyse</b> · basée sur les informations réellement disponibles dans votre profil. Les informations absentes du profil ne sont pas automatiquement comptées comme des échecs.</p>
                </div>
              </div>
              <button type="button" onClick={() => router.push("/cv?mode=adapt&jobId=" + encodeURIComponent(m.id) + "&source=" + encodeURIComponent(m.source))} className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-[#FFE135] px-5 py-3.5 text-sm font-black text-[#2E3F4F]"><Sparkles size={16}/> Adapter votre CV pour cette candidature</button>
              <p className="mt-2 text-center text-xs text-slate-400">J’IA analyse l’offre et votre CV. Vous validez chaque modification avant utilisation.</p>
            </div>
          </motion.div>
        </motion.div>
      );
    })()}</AnimatePresence>

    <AnimatePresence>{selectedCompany && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] grid place-items-end bg-black/60 p-3 backdrop-blur-sm sm:place-items-center" onClick={() => closeOfferModal("company")}>
      <motion.div initial={{ y: 40, opacity: 0, scale: .97 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()} className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-[32px] border border-white/15 bg-[#2E3F4F] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <CompanyLogo companyName={cleanCompanyName(selectedCompany.name)} logoUrl={companyWebProfile?.logoUrl || selectedCompany.logoUrl} domain={selectedCompany.domain} website={companyWebProfile?.website || selectedCompany.website} size={60}/>
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#FFE135]">Entreprise</p><h2 className="truncate text-xl font-black">{cleanCompanyName(selectedCompany.name)}</h2></div>
          </div>
          <button onClick={() => closeOfferModal("company")} aria-label="Fermer les informations de l’entreprise" className="rounded-full border border-white/10 p-2"><X size={18}/></button>
        </div>
         {companyWebLoading ? <div className="mt-7 flex items-center gap-3 rounded-2xl bg-white/5 p-4 text-sm text-white/70"><RefreshCw size={16} className="animate-spin"/> Recherche des informations publiques…</div> : companyWebProfile ? <div className="mt-6 space-y-4">
           <div className="grid gap-3 sm:grid-cols-2">
             <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Nom</p><p className="mt-1 text-sm font-bold">{cleanCompanyName(selectedCompany.name) || "Aucune donnée"}</p></div>
             <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Localisation</p><p className="mt-1 text-sm">{cleanDisplayText(companyWebProfile.address || selectedCompanyLocation) || "Non renseignée"}</p></div>
           </div>
           {companyWebProfile.activity.length>0 && <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Domaine d’activité</p><p className="mt-1 text-sm capitalize">{companyWebProfile.activity.map((value) => cleanDisplayText(cleanCompanyName(value) || value)).join(" · ")}</p></div>}
           <div className="grid gap-3 sm:grid-cols-2">
             <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Téléphone</p>{companyWebProfile.phone ? <a href={`tel:${companyWebProfile.phone}`} className="mt-1 block text-sm font-bold">{companyWebProfile.phone}</a> : <p className="mt-1 text-sm font-bold">Aucune donnée</p>}</div>
             <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Site officiel</p>{companyWebProfile.website ? <a href={companyWebProfile.website.startsWith("http") ? companyWebProfile.website : `https://${companyWebProfile.website}`} target="_blank" rel="noreferrer" className="mt-1 block truncate text-sm font-bold underline">{companyWebProfile.website}</a> : <p className="mt-1 text-sm font-bold">Aucune donnée</p>}</div>
           </div>
           {(companyWebProfile.status || companyWebProfile.rating!=null) && <div className="rounded-2xl bg-white/5 p-3"><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Présence publique</p><p className="mt-1 text-sm">{companyWebProfile.status ? companyWebProfile.status.replace(/_/g," ") : ""}{companyWebProfile.rating!=null ? ` · ★ ${companyWebProfile.rating}${companyWebProfile.reviewCount!=null ? ` (${companyWebProfile.reviewCount} avis)` : ""}` : ""}</p></div>}
           {(companyWebProfile.summary || companyWebProfile.description || selectedCompany.description) && <div><p className="text-[10px] font-black uppercase tracking-[1.2px] text-[#7A9BB5]">Synthèse exploitable</p><p className="mt-1 text-sm leading-6 text-white/75">{cleanJobDescription(companyWebProfile.summary || companyWebProfile.description || selectedCompany.description || "") || "Non renseigné."}</p></div>}
           {companyWebProfile.mapsUrl && <a href={companyWebProfile.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center rounded-full bg-white/10 px-4 py-3 text-xs font-bold">Voir l’emplacement</a>}
           {companyWebProfile.source.length>0 && <p className="text-[9px] font-bold uppercase tracking-[1px] text-white/40">Sources : {companyWebProfile.source.join(" · ")}</p>}
         </div> : <div className="mt-7 rounded-2xl bg-white/5 p-4 text-sm text-white/65">Dossier entreprise indisponible pour le moment.</div>}
      </motion.div>
    </motion.div>}</AnimatePresence>

    <AnimatePresence>
      {showBackToTop && <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.82, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.82, y: 12 }}
        transition={{ duration: 0.1 }}
        onClick={() => {
          const target = offersStartRef.current || document.getElementById("jobly-offers-start");
          if (!target) return;
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }}
        aria-label="Remonter au début des offres"
        title="Remonter au début des offres"
        className="fixed bottom-24 right-5 z-[9999] grid h-16 w-16 place-items-center rounded-full border border-[#2E3F4F]/25 bg-white/60 text-[#2E3F4F] shadow-[0_12px_34px_rgba(23,33,43,.22)] backdrop-blur-xl transition [@media(hover:hover)]:hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2E3F4F] focus-visible:ring-offset-2 active:scale-95 sm:bottom-8 sm:right-8"
      >
        <span className="relative text-3xl font-black leading-none text-[#2E3F4F]">↑</span>
      </motion.button>}
    </AnimatePresence>
    {jobs.length === 0 && !loading && <div className="mx-auto max-w-2xl px-5 py-20 text-center"><Sparkles className="mx-auto text-[#22448B]"/><h2 className="mt-4 text-2xl font-black">Aucune offre disponible pour le moment.</h2><p className="mt-2 text-sm text-white/55">Jobly ne fabrique pas d’offres : les offres affichées proviennent de sources réelles.</p></div>}
    <BottomNav active="/jobs" items={TALENT_NAV} />
  </main>;
}
