"use client";

import { ChangeEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const searchParams = useSearchParams();
  const adaptMode = searchParams.get("mode") === "adapt";
  const adaptJobId = searchParams.get("jobId");
  const adaptSource = searchParams.get("source");
  const [adaptJob, setAdaptJob] = useState<{title:string;companyName?:string;company?:{name?:string}} | null>(null);

  const generatedName = useMemo(() => safeFilename(cv.fullName), [cv.fullName]);

  useEffect(() => {
    if (!adaptMode || !adaptJobId || (adaptSource !== "discovery" && adaptSource !== "recruiter")) return;
    fetch("/api/jobs/" + encodeURIComponent(adaptJobId) + "?source=" + encodeURIComponent(adaptSource))
      .then(async r => { const b = await r.json(); if (!r.ok) throw new Error(b.message || "Offre introuvable."); return b.job; })
      .then(job => setAdaptJob(job))
      .catch(() => setAdaptJob(null));
  }, [adaptMode, adaptJobId, adaptSource]);

  async function importCv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage("");
    setFileName(file.name);
    setLoading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/talent/cv/import", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result?.message || "Impossible d’analyser le CV.");
      setCv((current) => ({ ...current, ...result.cv }));
      setMessage("CV importé. Vérifiez et corrigez les informations avant de générer votre version finale.");
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
            <input type="file" accept="application/pdf,.pdf" className="hidden" onChange={importCv} />
            <div className="flex items-start gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#0b2447] text-xl text-white">↑</div>
              <div>
                <h2 className="font-extrabold">Importer mon CV PDF</h2>
                <p className="mt-1 text-sm text-slate-500">Gratuit pour tous les plans. J’IA extrait les informations et préremplit votre CV Master.</p>
                {fileName && <p className="mt-3 text-xs font-bold text-slate-700">{fileName}</p>}
                {loading && <p className="mt-3 text-xs font-bold text-[#0b2447]">J’IA analyse votre CV…</p>}
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
                <div className="grid md:grid-cols-[34%_66%]">
                  <aside className="min-h-[720px] bg-[#0b2447] p-7 text-white">
                    <div className="mb-10 grid h-20 w-20 place-items-center rounded-full bg-white/10 text-2xl font-black">{cv.fullName.split(/\s+/).map(x => x[0]).join('').slice(0,2).toUpperCase()}</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-white/60">Contact</div>
                    <div className="mt-3 space-y-2 text-sm text-white/90"><div>{cv.email}</div><div>{cv.phone}</div></div>
                    <div className="mt-9 text-xs font-bold uppercase tracking-widest text-white/60">Compétences</div>
                    <div className="mt-3 flex flex-wrap gap-2">{cv.skills.map((skill) => <span key={skill} className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{skill}</span>)}</div>
                  </aside>
                  <div className="p-8 md:p-10">
                    <div className="border-b border-slate-200 pb-7"><h2 className="text-4xl font-black tracking-tight">{cv.fullName}</h2><p className="mt-2 text-lg font-semibold text-slate-500">{cv.headline}</p></div>
                    <section className="pt-7"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0b2447]">Profil</h3><p className="mt-3 text-sm leading-6 text-slate-600">{cv.summary}</p></section>
                    <section className="pt-7"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0b2447]">Expérience</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{cv.experience}</p></section>
                    <section className="pt-7"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#0b2447]">Formation</h3><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{cv.education}</p></section>
                  </div>
                </div>
              </article>
            ) : (
              <article className="mx-auto min-h-[720px] max-w-[760px] rounded bg-white px-10 py-12 shadow-xl ring-1 ring-slate-200 md:px-16">
                <header className="border-b border-black pb-5"><h2 className="text-3xl font-black uppercase">{cv.fullName}</h2><p className="mt-1 text-base font-bold">{cv.headline}</p><p className="mt-2 text-xs">{cv.email} · {cv.phone}</p></header>
                <section className="pt-6"><h3 className="text-sm font-black uppercase">Professional Summary</h3><p className="mt-2 text-sm leading-6">{cv.summary}</p></section>
                <section className="pt-6"><h3 className="text-sm font-black uppercase">Professional Experience</h3><p className="mt-2 whitespace-pre-line text-sm leading-6">{cv.experience}</p></section>
                <section className="pt-6"><h3 className="text-sm font-black uppercase">Education & Certifications</h3><p className="mt-2 whitespace-pre-line text-sm leading-6">{cv.education}</p></section>
                <section className="pt-6"><h3 className="text-sm font-black uppercase">Skills</h3><p className="mt-2 text-sm leading-6">{cv.skills.join(' · ')}</p></section>
                {cv.atsKeywords.length > 0 && <section className="pt-6"><h3 className="text-sm font-black uppercase">Keywords</h3><p className="mt-2 text-sm leading-6">{cv.atsKeywords.join(' · ')}</p></section>}
              </article>
            )}

            <div className="mx-auto mt-5 flex max-w-[760px] flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div><div className="font-extrabold">{mode === 'simple' ? 'CV Simple' : 'CV ATS'}</div><div className="text-xs text-slate-500">Téléchargement soumis aux droits CV de votre plan.</div></div>
              <button type="button" disabled className="cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2 font-bold text-slate-500">Télécharger · paiement/plan</button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function CvStudioPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-[#0b2447]">Chargement de l’atelier CV…</main>}>
      <CvStudioContent />
    </Suspense>
  );
}
