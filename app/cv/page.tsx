"use client";

import { PremiumDiamond } from "@/components/ui/PremiumDiamond";
import { ChangeEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase";

type CvData = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experience: string;
  education: string;
  atsScore: number;
  atsKeywords: string[];
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  activities: string[];
  interests: string[];
  references: string[];
  referencesVisible: boolean;
  languages: string[];
  achievements: string[];
  photoDataUrl: string;
};

type ViewMode = "simple" | "ats";

const EMPTY_CV: CvData = {
  fullName: "Votre nom et prénom",
  headline: "Intitulé professionnel",
  email: "email@exemple.com",
  phone: "+237 6 XX XX XX XX",
  summary: "Votre résumé professionnel apparaîtra ici après l’import ou la saisie de votre CV.",
  skills: ["Leadership", "Vente", "Négociation", "Analyse"],
  experience: "Ajoutez vos expériences, responsabilités et résultats mesurables.",
  education: "Formation et certifications",
  atsScore: 0,
  atsKeywords: [],
  strengths: [],
  gaps: [],
  suggestions: [],
  activities: [],
  interests: [],
  references: [],
  referencesVisible: false,
  languages: [],
  achievements: [],
  photoDataUrl: "",
};

function safeFilename(name: string) {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const parts = normalized.trim().split(/\s+/).filter(Boolean);
  const last = (parts[0] || "NOM").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const first = (parts.slice(1).join("_") || "PRENOM").replace(/[^a-zA-Z0-9_]/g, "").toUpperCase();
  const date = new Date();
  const months = ["JANVIER", "FEVRIER", "MARS", "AVRIL", "MAI", "JUIN", "JUILLET", "AOUT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DECEMBRE"];
  return `CV_${last}_${first}_${months[date.getMonth()]}_${date.getFullYear()}.pdf`;
}

function CvStudioContent() {
  const [mode, setMode] = useState<ViewMode>("simple");
  const [cv, setCv] = useState<CvData>(EMPTY_CV);
  const [fileName, setFileName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const adaptMode = searchParams.get("mode") === "adapt";
  const adaptJobId = searchParams.get("jobId");
  const adaptSource = searchParams.get("source");
  const [adaptJob, setAdaptJob] = useState<{title:string;companyName?:string;company?:{name?:string}} | null>(null);

  const generatedName = useMemo(() => safeFilename(cv.fullName), [cv.fullName]);

  const score = Math.max(0, Math.min(100, Number(cv.atsScore) || 0));
  const scoreTone = score <= 20
    ? { bg: "bg-red-400", text: "text-red-600" }
    : score <= 40
      ? { bg: "bg-blue-400", text: "text-blue-600" }
      : score <= 60
        ? { bg: "bg-green-400", text: "text-green-600" }
        : score <= 90
          ? { bg: "bg-orange-400", text: "text-orange-600" }
          : score < 100
            ? { bg: "bg-violet-500", text: "text-violet-600" }
            : { bg: "bg-[#FFD60A]", text: "text-[#8B7400]" };

  useEffect(() => {
    if (!adaptMode || !adaptJobId || (adaptSource !== "discovery" && adaptSource !== "recruiter")) return;
    fetch("/api/jobs/" + encodeURIComponent(adaptJobId) + "?source=" + encodeURIComponent(adaptSource))
      .then(async r => { const b = await r.json(); if (!r.ok) throw new Error(b.message || "Offre introuvable."); return b.job; })
      .then(job => setAdaptJob(job))
      .catch(() => setAdaptJob(null));
  }, [adaptMode, adaptJobId, adaptSource]);

  function selectCv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setSelectedFile(null);
      setFileName("");
      setMessage("J’IA accepte ici uniquement les CV PDF.");
      return;
    }
    setMessage("");
    setSelectedFile(file);
    setFileName(file.name);
  }

  async function extractCvData() {
    const file = selectedFile;
    if (!file) {
      setMessage("Sélectionnez d’abord votre CV PDF, puis cliquez sur « Extraire les données ».");
      return;
    }
    setMessage("");
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const current = await supabase.auth.getSession();
      let token = current.data.session?.access_token || null;
      if (!token) {
        const refreshed = await supabase.auth.refreshSession();
        token = refreshed.data.session?.access_token || null;
      }
      if (!token) throw new Error("Ta session Jobly n’est plus active. Reconnecte-toi puis réessaie.");

      const body = new FormData();
      body.append("file", file);
      let response = await fetch("/api/talent/cv/import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      if (response.status === 401) {
        const refreshed = await supabase.auth.refreshSession();
        token = refreshed.data.session?.access_token || null;
        if (token) response = await fetch("/api/talent/cv/import", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body });
      }

      const text = await response.text();
      let result: any = {};
      try { result = text ? JSON.parse(text) : {}; }
      catch { throw new Error(`Le serveur a renvoyé une réponse invalide au lieu du JSON attendu (HTTP ${response.status}).`); }
      if (!response.ok) throw new Error(result?.message || "Impossible d’analyser le CV.");
      setCv((current) => ({ ...current, ...result.cv }));
      setMessage(
        result.aiQuotaExceeded
          ? "CV extrait. L’analyse J’IA est temporairement indisponible car le quota de crédits est atteint. Vous pouvez déjà corriger et compléter votre CV."
          : "CV importé. Vérifiez et corrigez les informations avant de générer votre version finale."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import impossible.");
    } finally {
      setLoading(false);
    }
  }

  const update = (key: keyof CvData, value: string) => setCv((current) => ({ ...current, [key]: value }));

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-[#0b2447] md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-slate-500">JOBLY · TALENT</div>
            <h1 className="text-3xl font-black tracking-tight md:text-5xl">CV Studio</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">Un seul CV Master. Deux projections professionnelles : une version Simple pour l’humain et une version ATS structurée pour les systèmes de recrutement.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Nom automatique</div>
            <div className="mt-1 text-sm font-extrabold">{generatedName}</div>
          </div>
        </header>

        {adaptMode && <section className="mb-6 rounded-3xl border border-[#FFE135] bg-[#FFFBE0] p-5 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B7400]">J’IA · ADAPTATION DE CV</div>
          <h2 className="mt-1 text-xl font-black text-[#0b2447]">Adapter mon CV pour cette candidature</h2>
          <p className="mt-1 text-sm text-slate-600">{adaptJob ? "Candidature ciblée : " + adaptJob.title + (adaptJob.company?.name || adaptJob.companyName ? " · " + (adaptJob.company?.name || adaptJob.companyName) : "") : "J’IA prépare l’adaptation à partir de l’offre sélectionnée."}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">J’IA analyse les exigences de l’offre et votre CV pour proposer les ajustements pertinents. Aucune modification n’est appliquée sans votre validation.</p>
        </section>}

        <section className="mb-6 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <label className="group cursor-pointer rounded-3xl border border-dashed border-slate-300 bg-white p-6 shadow-sm transition hover:border-slate-500">
            <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={selectCv} />
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0b2447] text-xl text-white">↑</div>
              <div>
                <h2 className="font-extrabold">Importer mon CV PDF</h2>
                <p className="mt-1 text-sm text-slate-500">Gratuit pour tous les plans. Sélectionnez votre PDF puis cliquez sur « Extraire les données » pour préremplir votre CV Master.</p>
                {fileName && <p className="mt-3 text-xs font-bold text-slate-700">{fileName}</p>}
                {fileName && <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); void extractCvData(); }} disabled={loading} className="mt-4 rounded-xl bg-green-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60">{loading ? "Extraction en cours…" : "Extraire les données"}</button>}
                {loading && <p className="mt-2 text-xs font-bold text-[#0b2447]">J’IA extrait les données de votre CV…</p>}
              </div>
            </div>
          </label>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">Tarification CV · indépendante de l’abonnement</div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-2xl bg-slate-50 p-3"><b>FREE</b><div className="mt-1 font-black">1 000 F</div></div>
              <div className="rounded-2xl bg-slate-50 p-3"><b>START</b><div className="mt-1 font-black">500 F</div></div>
              <div className="rounded-2xl bg-[#0b2447] p-3 text-white"><b>PREMIUM / PRO</b><div className="mt-1 font-black">Inclus</div></div>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">Ces tarifs concernent la conversion ATS et les téléchargements CV. L’abonnement Jobly reste inchangé.</p>
          </div>
        </section>

        {message && <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{message}</div>}

        <div className="grid gap-6 lg:grid-cols-[390px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between"><h2 className="font-black">CV Master</h2><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">éditable</span></div>
            <div className="space-y-3">
              {([['fullName','Nom & prénom'],['headline','Titre professionnel'],['email','Email'],['phone','Téléphone'],['summary','Résumé'],['experience','Expérience'],['education','Formation']] as const).map(([key,label]) => (
                <label key={key} className="block"><span className="mb-1 block text-xs font-bold text-slate-500">{label}</span>{key === 'summary' || key === 'experience' || key === 'education' ? <textarea value={String(cv[key])} onChange={(e) => update(key, e.target.value)} className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0b2447]" /> : <input value={String(cv[key])} onChange={(e) => update(key, e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0b2447]" />}</label>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                <button onClick={() => setMode('simple')} className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === 'simple' ? 'bg-[#0b2447] text-white' : 'text-slate-500'}`}>CV Simple</button>
                <button onClick={() => setMode('ats')} className={`rounded-xl px-4 py-2 text-sm font-bold ${mode === 'ats' ? 'bg-[#0b2447] text-white' : 'text-slate-500'}`}>CV ATS</button>
              </div>
              <div className="text-xs font-semibold text-slate-500">Aperçu · {mode === 'simple' ? 'lecture humaine' : 'structure ATS'}</div>
            </div>

            {mode === 'simple' ? (
              <article className="mx-auto min-h-[720px] max-w-[760px] overflow-hidden rounded-[28px] bg-white shadow-xl ring-1 ring-slate-200">
                <div className="border-b border-slate-200 bg-white p-7 md:p-10">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-4xl font-black tracking-tight">{cv.fullName}</h2>
                      <p className="mt-2 text-lg font-semibold text-slate-500">{cv.headline}</p>
                      <p className="mt-3 text-sm text-slate-600">{cv.email} · {cv.phone}</p>
                      {cv.referencesVisible && cv.references.length > 0 && <p className="mt-2 text-xs font-semibold text-slate-500">Références disponibles · {cv.references.length}</p>}
                    </div>
                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                      {cv.photoDataUrl ? <img src={cv.photoDataUrl} alt="Photo professionnelle" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-xs text-slate-400">Photo</div>}
                    </div>
                  </div>
                  <div className="mt-7 flex items-center gap-4">
                    <div className={`text-3xl font-black ${scoreTone.text}`}>{score}%</div>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full transition-all ${scoreTone.bg}`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-[30%_70%]">
                  <aside className="bg-[#0b2447] p-7 text-white">
                    <div className="text-xs font-bold uppercase tracking-widest text-white/60">Contact</div>
                    <div className="mt-3 space-y-2 text-sm text-white/90"><div>{cv.email}</div><div>{cv.phone}</div></div>
                    {cv.skills.length > 0 && <><div className="mt-9 text-xs font-bold uppercase tracking-widest text-white/60">Compétences</div><div className="mt-3 flex flex-wrap gap-2">{cv.skills.map(skill => <span key={skill} className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{skill}</span>)}</div></>}
                    {cv.languages.length > 0 && <><div className="mt-9 text-xs font-bold uppercase tracking-widest text-white/60">Langues</div><div className="mt-3 space-y-1 text-sm">{cv.languages.map(language => <div key={language}>{language}</div>)}</div></>}
                    {cv.interests.length > 0 && <><div className="mt-9 text-xs font-bold uppercase tracking-widest text-white/60">Intérêts</div><div className="mt-3 space-y-1 text-sm">{cv.interests.map(item => <div key={item}>{item}</div>)}</div></>}
                  </aside>
                  <div className="p-8 md:p-10">
                    {cv.summary && <section><h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0b2447]">Résumé professionnel</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{cv.summary}</p></section>}
                    {cv.experience && <section className="pt-7"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0b2447]">Expérience professionnelle</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{cv.experience}</p></section>}
                    {cv.education && <section className="pt-7"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0b2447]">Formation</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{cv.education}</p></section>}
                    {cv.achievements.length > 0 && <section className="pt-7"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0b2447]">Réalisations</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{cv.achievements.map(item => <li key={item}>• {item}</li>)}</ul></section>}
                    {cv.activities.length > 0 && <section className="pt-7"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0b2447]">Activités</h3><ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{cv.activities.map(item => <li key={item}>• {item}</li>)}</ul></section>}
                    {cv.referencesVisible && cv.references.length > 0 && <section className="pt-7"><div className="flex items-center justify-between"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0b2447]">Références</h3><label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500"><input type="checkbox" checked={cv.referencesVisible} onChange={e => setCv(current => ({...current, referencesVisible:e.target.checked}))} /> Afficher</label></div><div className="mt-3 space-y-2 text-sm leading-6 text-slate-600">{cv.references.map(item => <div key={item}>{item}</div>)}</div></section>}
                  </div>
                </div>
              </article>
            ) : (
              <article className="mx-auto min-h-[720px] max-w-[760px] rounded bg-white px-10 py-12 shadow-xl ring-1 ring-slate-200 md:px-16">
                <header className="border-b border-black pb-5">
                  <div className="flex items-center justify-between gap-5">
                    <div><h2 className="text-3xl font-black uppercase">{cv.fullName}</h2><p className="mt-1 text-base font-bold">{cv.headline}</p><p className="mt-2 text-xs">{cv.email} · {cv.phone}</p></div>
                    {cv.photoDataUrl && <img src={cv.photoDataUrl} alt="Photo professionnelle" className="h-24 w-24 rounded object-cover" />}
                  </div>
                  <div className="mt-4 flex items-center gap-3"><span className={`text-xl font-black ${scoreTone.text}`}>{score}%</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${scoreTone.bg}`} style={{width:`${score}%`}} /></div></div>
                </header>
                {cv.summary && <section className="pt-6"><h3 className="text-sm font-black uppercase">Professional Summary</h3><p className="mt-2 whitespace-pre-line text-sm leading-6">{cv.summary}</p></section>}
                {cv.experience && <section className="pt-6"><h3 className="text-sm font-black uppercase">Professional Experience</h3><p className="mt-2 whitespace-pre-line text-sm leading-6">{cv.experience}</p></section>}
                {cv.education && <section className="pt-6"><h3 className="text-sm font-black uppercase">Education & Certifications</h3><p className="mt-2 whitespace-pre-line text-sm leading-6">{cv.education}</p></section>}
                {cv.skills.length > 0 && <section className="pt-6"><h3 className="text-sm font-black uppercase">Skills</h3><p className="mt-2 text-sm leading-6">{cv.skills.join(' · ')}</p></section>}
                {cv.languages.length > 0 && <section className="pt-6"><h3 className="text-sm font-black uppercase">Languages</h3><p className="mt-2 text-sm leading-6">{cv.languages.join(' · ')}</p></section>}
                {cv.achievements.length > 0 && <section className="pt-6"><h3 className="text-sm font-black uppercase">Achievements</h3><ul className="mt-2 space-y-1 text-sm leading-6">{cv.achievements.map(item => <li key={item}>• {item}</li>)}</ul></section>}
                {cv.activities.length > 0 && <section className="pt-6"><h3 className="text-sm font-black uppercase">Activities</h3><p className="mt-2 text-sm leading-6">{cv.activities.join(' · ')}</p></section>}
                {cv.interests.length > 0 && <section className="pt-6"><h3 className="text-sm font-black uppercase">Interests</h3><p className="mt-2 text-sm leading-6">{cv.interests.join(' · ')}</p></section>}
                {cv.referencesVisible && cv.references.length > 0 && <section className="pt-6"><div className="flex items-center justify-between"><h3 className="text-sm font-black uppercase">References</h3><label className="text-xs"><input type="checkbox" checked={cv.referencesVisible} onChange={e => setCv(current => ({...current, referencesVisible:e.target.checked}))} /> Afficher</label></div><p className="mt-2 whitespace-pre-line text-sm leading-6">{cv.references.join(' · ')}</p></section>}
                {cv.atsKeywords.length > 0 && <section className="pt-6"><h3 className="text-sm font-black uppercase">Keywords</h3><p className="mt-2 text-sm leading-6">{cv.atsKeywords.join(' · ')}</p></section>}
              </article>
            )}
            <div className="mx-auto mt-5 flex max-w-[760px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div><div className="font-extrabold">{mode === 'simple' ? 'CV Simple' : 'CV ATS'}</div><div className="text-xs text-slate-500">Téléchargement soumis aux droits CV de votre plan.</div></div>
              <button type="button" disabled className="cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2 font-bold text-slate-500"><span className="inline-flex items-center gap-1.5"><PremiumDiamond />Télécharger · paiement/plan</span></button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function CvStudioPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-[#0b2447]"><div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">Chargement de CV Studio…</div></main>}>
      <CvStudioContent />
    </Suspense>
  );
}
