"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  Globe2,
  Heart,
  MapPin,
  Share2,
  Sparkles,
  X,
} from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { jobPublicUrl } from "@/lib/site";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import TalentBackground from "@/components/TalentBackground";
import CompanyLogo from "@/components/CompanyLogo";
import { parseJobDetailSections } from "@/lib/jobContent";
import { normalizeJobIdentity } from "@/lib/jobNormalizer";
import { extractApplicationSubject } from "@/lib/applicationSubject";

type MatchItem = {
  id: string;
  label: string;
  score: number | null;
  weight: number;
  required: boolean;
  status: "MATCH" | "PARTIAL" | "MISMATCH" | "UNKNOWN";
  candidateValue?: string | null;
  expectedValue?: string | null;
};

type Job = Record<string, any> & {
  matchPercent?: number;
  matchConfidence?: number;
  matchBreakdown?: MatchItem[];
};

function GmailIcon({ size = 18 }: { size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="5" fill="white"/><path d="M5 7.2 12 12.5l7-5.3V18a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7.2Z" fill="#EA4335"/><path d="M5 7.2 12 12.5l7-5.3" stroke="#4285F4" strokeWidth="1.7"/><path d="M5 7.2V18c0 .55.45 1 1 1h2V9.5L5 7.2Z" fill="#34A853"/><path d="M19 7.2V18c0 .55-.45 1-1 1h-2V9.5l3-2.3Z" fill="#FBBC04"/></svg>;
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.5" fill="#25D366"/><path d="M8.7 7.8c.3-.3.7-.3 1 0l1.15 1.35c.25.28.25.68.02.98l-.55.7c.52 1.02 1.34 1.84 2.36 2.36l.7-.55c.3-.23.7-.23.98.02l1.35 1.15c.3.25.3.7 0 1-.66.76-1.57 1.12-2.55.98-1.52-.22-3.15-1.18-4.5-2.53s-2.31-2.98-2.53-4.5c-.14-.98.22-1.89.98-2.55Z" fill="white"/></svg>;
}

function cleanLine(value: string) {
  return value.normalize("NFC")
    .replace(/^[|>»›•▪◦*✓✔☑\-–—]+\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/\s*\|\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function formatContract(value: unknown) {
  const key = String(value || "").trim().toUpperCase().replace(/[\s-]+/g, "_");
  const labels: Record<string, string> = {
    FULL_TIME: "Temps plein",
    FULLTIME: "Temps plein",
    PART_TIME: "Temps partiel",
    PARTTIME: "Temps partiel",
    INTERNSHIP: "Stage",
    INTERNSHIP_CONTRACT: "Stage",
    FREELANCE: "Freelance",
    TEMPORARY: "Temporaire",
    FIXED_TERM: "CDD",
    PERMANENT: "CDI",
    CDD: "CDD",
    CDI: "CDI",
  };
  return labels[key] || String(value || "");
}

function formatSalary(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const numeric = Number(raw.replace(/[^0-9.,-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
  return Number.isFinite(numeric) ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(numeric) : raw;
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[22px] border border-slate-100 bg-white px-5 py-5 shadow-[0_6px_24px_rgba(23,33,43,0.035)] sm:px-6">
      <h2 className="text-[19px] font-black tracking-[-0.015em] text-[#17212B]">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MatchModal({ job, onClose }: { job: Job; onClose: () => void }) {
  const score = Math.max(0, Math.min(100, Number(job.matchPercent ?? 0)));
  const items: MatchItem[] = Array.isArray(job.matchBreakdown) ? job.matchBreakdown : [];

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#0D1726]/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label="Détail de la correspondance">
      <div className="max-h-[88dvh] w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-w-xl sm:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div><p className="text-[10px] font-black uppercase tracking-[1.5px] text-[#9B8500]">Votre correspondance</p><h2 className="mt-1 text-xl font-black text-[#17212B]">Pourquoi ce score ?</h2></div>
          <button onClick={onClose} aria-label="Fermer" className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-600"><X size={18}/></button>
        </div>
        <div className="max-h-[calc(88dvh-86px)] overflow-y-auto p-6">
          <div className="flex items-center gap-5 rounded-2xl bg-[#F7FAFF] p-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full border-[7px] border-[#FFD60A] bg-white text-xl font-black text-[#17212B]">{score}%</div>
            <div><p className="font-black text-[#17212B]">{score >= 80 ? "Très bonne correspondance" : score >= 60 ? "Bonne correspondance" : "Correspondance à examiner"}</p><p className="mt-1 text-sm leading-6 text-slate-500">Le score synthétise les éléments de votre profil comparés aux critères disponibles dans l’offre.</p></div>
          </div>
          {items.length > 0 ? (
            <div className="mt-6 space-y-2">
              {items.map((item) => {
                const status = item.status === "MATCH" ? "Correspond" : item.status === "PARTIAL" ? "Partiel" : item.status === "MISMATCH" ? "À renforcer" : "Non renseigné";
                const tone = item.status === "MATCH" ? "text-emerald-700 bg-emerald-50" : item.status === "MISMATCH" ? "text-amber-800 bg-amber-50" : "text-slate-600 bg-slate-100";
                return <div key={item.id} className="rounded-2xl border border-slate-100 p-4"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-extrabold text-[#17212B]">{item.label}</p>{(item.expectedValue || item.candidateValue) && <p className="mt-1 text-xs leading-5 text-slate-500">{item.candidateValue ? `Votre profil : ${item.candidateValue}` : ""}{item.expectedValue ? ` · Offre : ${item.expectedValue}` : ""}</p>}</div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${tone}`}>{status}</span></div></div>;
              })}
            </div>
          ) : <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">Le détail des critères n’est pas disponible pour cette offre. Le score reste indicatif.</div>}
        </div>
      </div>
    </div>
  );
}

function JobDetailInner() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const source = search.get("source");
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!params.id || (source !== "discovery" && source !== "recruiter")) {
      setError("Lien d’offre invalide.");
      setLoading(false);
      return;
    }
    fetch(`/api/jobs/${encodeURIComponent(params.id)}?source=${encodeURIComponent(source)}`)
      .then(async (r) => { const b = await r.json(); if (!r.ok) throw Error(b.message || "Offre introuvable."); return b.job; })
      .then(setJob)
      .catch((e) => setError(e instanceof Error ? e.message : "Offre introuvable."))
      .finally(() => setLoading(false));
  }, [params.id, source]);

  function whatsappPhone(profile: any) {
    const values = Array.isArray(profile?.phoneNumbers) ? profile.phoneNumbers : typeof profile?.phone === "string" ? [profile.phone] : [];
    const raw = values.find((v: any) => /237|^6|^2/.test(String(v))) || values[0];
    if (!raw) return null;
    const digits = String(raw).replace(/[^0-9]/g, "");
    if (digits.startsWith("237")) return digits;
    if (digits.startsWith("6") && digits.length === 9) return "237" + digits;
    if (digits.startsWith("2") && digits.length === 9) return "237" + digits;
    return null;
  }

  async function openWhatsApp() {
    const phone = whatsappPhone(job?.applicationProfile);
    if (!phone) return;
    try {
      const s = await getSupabaseClient().auth.getSession();
      if (!s.data.session) { sessionStorage.setItem("jobly:after-login", "/jobs/" + params.id + "?source=" + source); router.push("/"); return; }
      const r = await fetch("/api/cv-share", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.data.session.access_token }, body: JSON.stringify({ source, jobId: params.id }) });
      const b = await r.json(); if (!r.ok) throw Error(b.message || "Impossible de préparer le CV.");
      const cvUrl = window.location.origin + "/cv/share/" + b.token;
      const message = "Bonjour, je suis " + b.candidateName + ". Je souhaite vous soumettre ma candidature au poste de " + (displayTitle || "ce poste") + (company ? " chez " + company : "") + ".\n\n📄 CV " + b.candidateName + " — Candidature " + (company || job?.title || "ce poste") + "\n" + cvUrl;
      window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(message), "_blank", "noopener,noreferrer");
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible d’ouvrir WhatsApp."); }
  }

  async function openEmail() {
    if (!emailChannel || busy) return;
    setBusy(true); setError("");
    try {
      const s = await getSupabaseClient().auth.getSession();
      if (!s.data.session) { sessionStorage.setItem("jobly:after-login", window.location.pathname + window.location.search); router.push("/"); return; }
      const r = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + s.data.session.access_token }, body: JSON.stringify({ source, jobId: params.id }) });
      const b = await r.json().catch(() => ({})); if (!r.ok) throw Error(b.message || "Impossible de préparer la candidature.");
      router.push("/applications/review/" + encodeURIComponent(b.application.id));
    } catch (e) { setError(e instanceof Error ? e.message : "Impossible de préparer la candidature."); } finally { setBusy(false); }
  }

  async function apply() {
    if (phoneChannel) return openWhatsApp();
    if (applicationLink) { window.open(applicationLink, "_blank", "noopener,noreferrer"); return; }
    if (emailChannel) return openEmail();
  }

  async function shareOffer() {
    try {
      await navigator.clipboard?.writeText(jobPublicUrl(params.id, source || undefined));
      setShared(true); window.setTimeout(() => setShared(false), 1800);
    } catch {}
  }

  if (loading) return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-[#17212B]">Chargement…</main>;
  if (error || !job) return <main className="talent-shell min-h-[100dvh] bg-[#F7FAFF] text-navy"><PageHeader label="Offre" onBack={() => router.replace("/jobs")} theme="talent"/><div className="mx-auto mt-8 max-w-2xl px-5"><div className="rounded-[24px] bg-white p-6 shadow-sm"><h1 className="text-xl font-black">Offre indisponible</h1><p className="mt-2 text-sm text-slate-500">{error || "Cette offre n’est plus disponible."}</p><button onClick={() => router.replace("/jobs")} className="mt-5 rounded-2xl bg-[#22448B] px-5 py-3 text-sm font-black text-white">Retour aux offres</button></div></div></main>;

  const normalizedIdentity = normalizeJobIdentity({
    title: job.displayTitle ?? job.title,
    companyName: job.displayCompanyName ?? job.company?.name ?? job.companyName,
    description: job.description,
  });
  const displayTitle = normalizedIdentity.title;
  const displayCompany = normalizedIdentity.companyName;
  const company = displayCompany;
  const emailChannel = Boolean(job.applicationProfile?.applicationEmail || job.applicationProfile?.email);
  const phoneChannel = Boolean(job.applicationProfile?.applicationPhone || job.applicationProfile?.phone || job.applicationProfile?.phoneNumbers?.length);
  const applicationLink = String(job.applicationProfile?.applicationUrl || job.applicationProfile?.applyUrl || job.applicationProfile?.url || "").trim();
  const contract = job.contractType || job.contract;
  const remote = job.remoteMode === "YES" ? "Télétravail" : job.remoteMode === "PARTIAL" ? "Hybride" : job.remoteMode === "NO" ? "Présentiel" : null;
  const deadline = job.deadline ? new Date(job.deadline).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;
  const deadlineExpired = Boolean(job.deadlineExpired);
  const tags: string[] = Array.isArray(job.tags) ? job.tags : [];
  const sections = job.detailSections && typeof job.detailSections === "object"
    ? job.detailSections
    : parseJobDetailSections(normalizedIdentity.description, displayTitle);
  const matchScore = Math.max(0, Math.min(100, Number(job.matchPercent ?? 0)));
  const headerFacts = [
    job.location ? { icon: MapPin, value: job.location } : null,
    contract ? { icon: Clock3, value: formatContract(contract) } : null,
    remote ? { icon: Globe2, value: remote } : null,
    job.salary || job.salaryMin != null ? { icon: null, value: job.salary ? `${formatSalary(job.salary)} ${job.salaryCurrency || "XAF"}` : `${formatSalary(job.salaryMin)}${job.salaryMax != null ? " – " + formatSalary(job.salaryMax) : ""} ${job.salaryCurrency || "XAF"}` } : null,
  ].filter(Boolean) as Array<{ icon: any; value: string }>;

  const applicationMode = emailChannel ? "Candidature par e-mail" : phoneChannel ? "Candidature par téléphone / WhatsApp" : applicationLink ? "Plateforme externe" : "Candidature depuis Jobly";
  const applicationEmail = String(job.applicationProfile?.applicationEmail || job.applicationProfile?.email || "").trim();
  const applicationSubject = emailChannel ? extractApplicationSubject(job.description || "", displayTitle || "") : "";

  const compactItems = (items: string[], limit = 12) => Array.from(new Set(items.map(cleanLine).filter(Boolean))).slice(0, limit);
  const renderParagraphs = (items: string[]) => <div className="space-y-2.5 text-[15px] leading-7 text-slate-600">{compactItems(items, 8).map((line, i) => <p key={i}>{line}</p>)}</div>;
  const renderBullets = (items: string[]) => <ul className="space-y-2.5 text-[15px] leading-7 text-slate-600">{compactItems(items, 12).map((line, i) => <li key={i} className="flex gap-2.5"><span className="mt-[0.72em] h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFD60A]"/><span>{line}</span></li>)}</ul>;

  return (
    <main className="talent-shell relative min-h-[100dvh] bg-[#F7FAFF] pb-28 text-[#17212B]">
      <TalentBackground/>
      <div className="relative z-10">
        <PageHeader label="Détail de l’offre" onBack={() => router.replace("/jobs")} theme="talent"/>
        <div className="mx-auto max-w-4xl px-4 py-5 sm:px-6 sm:py-8">
          <section className="overflow-hidden rounded-[30px] border border-slate-100 bg-white shadow-[0_18px_55px_rgba(23,33,43,0.07)]">
            <div className="h-1.5 bg-[#FFD60A]"/>
            <div className="p-5 sm:p-8">
              <div className="flex items-start gap-4 sm:gap-5">
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-[#F3F6FA] sm:h-20 sm:w-20"><CompanyLogo companyName={company} logoUrl={job.company?.logoUrl} domain={job.company?.domain} website={job.company?.website} size={64}/></div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-[1.7px] text-[#9B8500]">Offre d’emploi</p>
                  <h1 className="mt-1.5 text-[27px] font-black leading-[1.12] tracking-[-0.03em] text-[#17212B] sm:text-[38px]">{displayTitle}</h1>
                  <p className="mt-2 text-base font-extrabold text-[#22448B]">{company || "Employeur non renseigné"}</p>
                  {deadlineExpired && <span className="mt-3 inline-flex rounded-full bg-red-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[1px] text-red-600">Offre expirée</span>}
                </div>
                <button onClick={() => setSaved(v => !v)} aria-label={saved ? "Retirer des favoris" : "Ajouter aux favoris"} className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${saved ? "border-[#FFD60A] bg-[#FFFBE0] text-[#8C7600]" : "border-slate-200 bg-white text-slate-500"}`}><Heart size={18} fill={saved ? "currentColor" : "none"}/></button>
              </div>

              {headerFacts.length > 0 && <div className="mt-6 grid gap-2 sm:grid-cols-2">{headerFacts.map(({ icon: Icon, value }) => <div key={value} className="flex min-w-0 items-center gap-2.5 rounded-xl bg-[#F7FAFF] px-3.5 py-3 text-sm font-semibold text-slate-600">{Icon ? <Icon size={16} className="shrink-0 text-[#22448B]"/> : <span className="h-2 w-2 shrink-0 rounded-full bg-[#FFD60A]"/>}<span className="truncate">{value}</span></div>)}</div>}

              <div className="mt-6">
                <button type="button" onClick={() => setMatchOpen(true)} className="group flex w-full items-center justify-between rounded-2xl border border-[#DDE6F5] bg-[#F7FAFF] p-4 text-left transition hover:border-[#BFCDE5]">
                  <div><p className="text-[10px] font-black uppercase tracking-[1.4px] text-slate-400">Correspondance avec votre profil</p><div className="mt-1 flex items-center gap-2"><span className="text-2xl font-black text-[#17212B]">{matchScore}%</span><span className="rounded-full bg-[#FFF4A8] px-2 py-1 text-[10px] font-black text-[#735F00]">Voir le détail</span></div></div>
                  <ChevronRight size={19} className="text-slate-400 transition group-hover:translate-x-0.5"/>
                </button>
              </div>

              {tags.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{tags.slice(0, 8).map(tag => <span key={tag} className="rounded-full bg-[#EEF4FF] px-3 py-1.5 text-xs font-bold text-[#22448B]">{tag}</span>)}</div>}

            </div>
          </section>

          <div className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DetailSection title="Nom de l'entreprise">
                <p className="text-[15px] font-extrabold leading-7 text-[#22448B]">
                  {company || "Informations non disponibles"}
                </p>
              </DetailSection>
              <DetailSection title="Intitulé du poste">
                <p className="text-[15px] font-extrabold leading-7 text-[#17212B]">
                  {displayTitle}
                </p>
              </DetailSection>
            </div>

            {sections.description.length > 0 && <DetailSection title="À propos de l'offre">{renderParagraphs(sections.description)}</DetailSection>}
            {sections.missions.length > 0 && <DetailSection title="Missions">{renderBullets(sections.missions)}</DetailSection>}
            {sections.profile.length > 0 && <DetailSection title="Profil recherché">{renderBullets(sections.profile)}</DetailSection>}
            {sections.benefits.length > 0 && <DetailSection title="Avantages">{renderBullets(sections.benefits)}</DetailSection>}

            {(emailChannel || phoneChannel || applicationLink || sections.application.length > 0) && (
              <DetailSection title="Comment postuler">
                <div className="space-y-4">
                  {emailChannel && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-[#F7FAFF] px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[1px] text-slate-400">Mail de candidature</p><p className="mt-1 break-all text-sm font-bold text-[#17212B]">{applicationEmail}</p></div>
                      <div className="rounded-2xl bg-[#F7FAFF] px-4 py-4"><p className="text-[10px] font-black uppercase tracking-[1px] text-slate-400">Objet du mail</p><p className="mt-1 text-sm font-bold text-[#17212B]">{applicationSubject || "Candidature — " + displayTitle}</p></div>
                    </div>
                  )}
                  {sections.application.length > 0 && renderBullets(sections.application)}
                  <p className="text-sm leading-6 text-slate-500">{applicationMode}</p>
                </div>
              </DetailSection>
            )}

            {deadline && <DetailSection title="Délai"><div className="flex items-start gap-3 rounded-2xl bg-[#FFFBEA] p-4"><CalendarDays size={18} className="mt-0.5 shrink-0 text-amber-700"/><div><p className="text-sm font-black text-[#17212B]">{deadlineExpired ? "Date limite dépassée" : "Candidatures jusqu’au"}</p><p className="mt-1 text-sm leading-6 text-slate-600">{deadline}</p></div></div></DetailSection>}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button disabled={busy || deadlineExpired} onClick={apply} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FFD60A] px-5 py-4 text-sm font-black text-[#17212B] shadow-[0_10px_25px_rgba(255,214,10,.22)] transition hover:brightness-[.98] disabled:opacity-50">
                {deadlineExpired ? <span>Offre expirée</span> : emailChannel ? <><GmailIcon/><span>Postuler</span></> : phoneChannel ? <><WhatsAppIcon/><span>Postuler</span></> : applicationLink ? <><ExternalLink size={17}/><span>Postuler</span></> : <span>Postuler</span>}
              </button>
              <button type="button" onClick={shareOffer} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-extrabold text-slate-600">{shared ? <CheckCircle2 size={17} className="text-emerald-600"/> : <Share2 size={17}/>}<span>{shared ? "Lien copié" : "Partager"}</span></button>
            </div>

            <section className="rounded-[22px] border border-amber-100 bg-[#FFFBEA] px-5 py-5 sm:px-6">
              <p className="text-sm leading-6 text-[#4A3F00]">
                <span className="font-black">Important — Sécurité et impartialité.</span>{" "}
                Jobly agit de manière <strong>impartiale et exclusivement consultative</strong>. Jobly n’intervient pas en faveur d’un candidat et ne peut garantir, influencer ou faciliter son recrutement.
              </p>
              <p className="mt-2 text-sm leading-6 text-[#4A3F00]">
                <strong>Postuler est entièrement gratuit.</strong> Ne versez jamais d’argent, de frais ou de commission à une personne qui vous promettrait un emploi, un recrutement ou un traitement privilégié en échange d’un paiement.
              </p>
            </section>

            {error && <div role="alert" className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
          </div>
        </div>
      </div>
      <BottomNav active="/jobs"/>
      {matchOpen && <MatchModal job={job} onClose={() => setMatchOpen(false)}/>}
    </main>
  );
}

export default function JobDetailPage() {
  return <Suspense fallback={<main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-[#17212B]">Chargement…</main>}><JobDetailInner/></Suspense>;
}
