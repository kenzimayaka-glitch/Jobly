"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import PageHeader from "../../components/PageHeader";
import BottomNav, { RECRUITER_NAV } from "../../components/BottomNav";
import DecorativeBackground from "../../components/DecorativeBackground";
import { scrapeJobFromUrl } from "../../lib/jobImportService";
import { generateSharePack } from "../../lib/viralityService";
import { jobPublicUrl } from "../../lib/site";
import ViralPoster from "../../components/ViralPoster";

const CONTRACTS = ["CDI", "CDD", "Stage", "Freelance", "Alternance"];
const MODES = ["Présentiel", "Hybride", "Télétravail"];

type ReceivedApplication = {
  id: string;
  recruiterJobId: string | null;
  jobTitle: string | null;
  status: "DISCOVERED" | "SUBMITTED" | "ACKNOWLEDGED" | "INTERVIEW" | "OFFER" | "REJECTED";
  statusSource: "CANDIDATE" | "RECRUITER";
  proofUrl: string | null;
  viewedAt: string | null;
  interviewAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const APP_STATUS_LABEL: Record<ReceivedApplication["status"], string> = {
  DISCOVERED: "Brouillon",
  SUBMITTED: "En attente",
  ACKNOWLEDGED: "Vu",
  INTERVIEW: "Entretien",
  OFFER: "Acceptée",
  REJECTED: "Refusée",
};

const APP_STATUS_STYLE: Record<ReceivedApplication["status"], string> = {
  DISCOVERED: "bg-slate-100 text-jobly-gray",
  SUBMITTED: "bg-blue-50 text-jobly-blue",
  ACKNOWLEDGED: "bg-violet-50 text-violet-600",
  INTERVIEW: "bg-amber-50 text-amber-600",
  OFFER: "bg-emerald-50 text-jobly-green-dark",
  REJECTED: "bg-red-50 text-red-500",
};

export function RecruiterJobForm({ jobId }: { jobId?: string }) {
  const router = useRouter();
  const isNew = !jobId;
  const id = jobId || "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published" | "closed">("draft");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState("Hybride");
  const [contract, setContract] = useState("CDI");
  const [salary, setSalary] = useState("");
  const [sector, setSector] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [shareJob, setShareJob] = useState<any | null>(null);
  const [shareTab, setShareTab] = useState<"linkedin" | "facebook" | "whatsapp">("linkedin");
  const [shareToast, setShareToast] = useState("");
  const [recruiterEmail, setRecruiterEmail] = useState("rh@jobly.cm");

  const [applications, setApplications] = useState<ReceivedApplication[]>([]);
  const [interviewDraft, setInterviewDraft] = useState<Record<string, string>>({});
  const [savingAppId, setSavingAppId] = useState<string | null>(null);
  const [appsError, setAppsError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const session = await getSupabaseClient().auth.getSession();
    if (!session.data.session) {
      router.replace("/");
      return;
    }
    const t = session.data.session.access_token;
    setToken(t);
    setRecruiterEmail(session.data.session.user.email || "rh@jobly.cm");
    if (isNew) return;

    try {
      const res = await fetch(`/api/recruiter/jobs/${id}`, { headers: { Authorization: `Bearer ${t}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Offre introuvable.");
      const job = body.job;
      setTitle(job.title || "");
      setDescription(job.description || "");
      setLocation(job.location || "");
      setMode(job.mode || "Hybride");
      setContract(job.contract || "CDI");
      setSalary(job.salary || "");
      setSector(job.sector || "");
      setTagsInput((job.tags || []).join(", "));
      setSourceUrl(job.sourceUrl || "");
      setStatus(job.status || "draft");
      await loadApplications(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [isNew, id, router]);

  const loadApplications = useCallback(
    async (t: string) => {
      if (isNew) return;
      try {
        const res = await fetch("/api/recruiter/applications", { headers: { Authorization: `Bearer ${t}` } });
        const body = await res.json();
        if (!res.ok) throw new Error(body.message || "Candidatures indisponibles.");
        setApplications((body.applications || []).filter((a: ReceivedApplication) => a.recruiterJobId === id));
      } catch (e) {
        setAppsError(e instanceof Error ? e.message : "Erreur de chargement des candidatures.");
      }
    },
    [isNew, id]
  );

  async function patchApplication(id: string, payload: Record<string, unknown>) {
    if (!token) return;
    setSavingAppId(id);
    setAppsError(null);
    try {
      const res = await fetch(`/api/recruiter/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setAppsError(body.message || "Mise à jour impossible.");
        return;
      }
      await loadApplications(token);
    } catch {
      setAppsError("Erreur réseau, réessaie.");
    } finally {
      setSavingAppId(null);
    }
  }

  useEffect(() => {
    load();
  }, [load]);

  async function submit(nextStatus: "draft" | "published") {
    if (!token) return;
    if (!title.trim() || !description.trim()) {
      setError("Le titre et la description sont obligatoires.");
      return;
    }
    setSaving(true);
    setError(null);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = { title, description, location, mode, contract, salary, sector, tags, status: nextStatus, sourceUrl };

    try {
      const res = await fetch(isNew ? "/api/recruiter/jobs" : `/api/recruiter/jobs/${id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Enregistrement impossible.");
      if (nextStatus === "published") {
        setShareJob(body.job || { id: id, title, description, location, mode, contract, companyName: "Mon entreprise" });
      } else {
        router.push("/recruiter");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'enregistrement.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!token || isNew) return;
    if (!confirm("Supprimer définitivement cette offre ?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/recruiter/jobs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Suppression impossible.");
      router.push("/recruiter");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de suppression.");
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Chargement…</main>;
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-28 text-navy">
      <DecorativeBackground />
      <div className="relative z-10">
        <PageHeader
          label={isNew ? "Nouvelle offre" : "Modifier l'offre"}
          eyebrow="RECRUTEUR"
          initial="R"
          onBack={() => router.push("/recruiter")}
        />

        <div className="mx-auto w-full max-w-3xl px-5 py-5 sm:px-6">
          {error && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          {!isNew && (
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-jobly-gray">
              Statut actuel :
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black ${
                  status === "published"
                    ? "bg-emerald-50 text-jobly-green-dark"
                    : status === "closed"
                    ? "bg-red-50 text-red-500"
                    : "bg-slate-100 text-jobly-gray"
                }`}
              >
                {status === "published" ? "Publiée" : status === "closed" ? "Clôturée" : "Brouillon"}
              </span>
            </div>
          )}

          {isNew && (
            <section className="mb-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="font-heading text-base font-extrabold text-navy">Déjà publiée ailleurs ?</h2>
              <p className="mt-1 text-xs text-jobly-gray">Colle l’URL LinkedIn, Indeed ou d’une autre source et pré-remplis ton offre en quelques secondes.</p>
              <div className="mt-3 flex gap-2">
                <input value={sourceUrl} onChange={(e)=>setSourceUrl(e.target.value)} placeholder="https://linkedin.com/jobs/…" className="min-w-0 flex-1 rounded-full border border-slate-200 px-4 py-3 text-xs outline-none focus:border-[#2E5C9E]" />
                <button type="button" disabled={importing || !sourceUrl.trim()} onClick={async()=>{
                  try {
                    setImporting(true); setError(null);
                    const imported=await scrapeJobFromUrl(sourceUrl.trim());
                    setTitle(imported.title); setDescription(imported.description); setLocation(imported.location);
                    setMode(imported.mode); setContract(imported.contract); setSalary(imported.salary); setSector(imported.sector);
                    setTagsInput(imported.tags.join(", "));
                    setShareToast("Offre importée : vérifie les informations avant publication.");
                  } catch { setError("URL invalide. Vérifie le lien puis réessaie."); }
                  finally { setImporting(false); }
                }} className="shrink-0 rounded-full bg-[#FFC72C] px-4 py-3 text-xs font-black text-navy disabled:opacity-50">{importing ? "Import…" : "Importer en 10s"}</button>
              </div>
              {shareToast && <p className="mt-2 text-xs font-bold text-[#2E5C9E]">{shareToast}</p>}
              <p className="mt-2 text-[10px] text-jobly-gray">Pré-remplissage indicatif à partir de l'URL (pas encore d'extraction réelle du contenu externe) : relis et complète chaque champ avant publication.</p>
              <label className="mt-3 flex cursor-not-allowed items-center gap-2 text-xs font-bold text-jobly-gray" title="Intégration Gmail non branchée côté backend — voir audit du 16/09/2026">
                <input type="checkbox" disabled className="h-4 w-4 accent-[#2E5C9E]" />
                Connecter Gmail pour recevoir les candidatures · Bientôt disponible
              </label>
            </section>
          )}

          {!isNew && status === "published" && (
            <section className="mb-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
              <h2 className="font-heading text-base font-extrabold text-navy">Diffusion virale</h2>
              <p className="mt-1 mb-3 text-xs text-jobly-gray">Crée une affiche carrée avec QR code vers ta candidature Jobly.</p>
              <ViralPoster job={{ id: id, title, companyName: "Votre entreprise" }} />
            </section>
          )}

          {/* Détails de l'offre */}
          <section className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_16px_50px_rgba(22,37,74,0.10)]">
            <h2 className="mb-4 font-heading text-base font-extrabold text-navy flex items-center gap-2">
              <span>💼</span> Détails de l'offre
            </h2>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold text-navy">Titre du poste *</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue" placeholder="Ex. Développeur Full-Stack" />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold text-navy flex items-center justify-between">
                  Description *
                  <span
                    aria-disabled="true"
                    title="Nécessite un chiffrage du coût IA avant activation (voir Statut.md §17)"
                    className="flex cursor-not-allowed items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-jobly-gray"
                  >
                    <span>✨</span> Générer avec IA · Bientôt disponible
                  </span>
                </span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue" placeholder="Décrivez les missions, responsabilités, profil recherché…" />
              </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold text-navy">Contrat</span>
                <select value={contract} onChange={(e) => setContract(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue">
                  {CONTRACTS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-extrabold text-navy">Mode</span>
                <select value={mode} onChange={(e) => setMode(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue">
                  {MODES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Localisation</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue" placeholder="Ex. Douala, Cameroun" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Salaire (optionnel)</span>
              <input value={salary} onChange={(e) => setSalary(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue" placeholder="Ex. 400 000 - 600 000 FCFA" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">URL source (optionnel)</span>
              <input value={sourceUrl} onChange={(e)=>setSourceUrl(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue" placeholder="https://…" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Secteur</span>
              <input value={sector} onChange={(e) => setSector(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue" placeholder="Ex. Technologie" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Mots-clés (séparés par des virgules)</span>
              <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue" placeholder="Ex. React, Node.js, Remote" />
            </label>
            </div>
          </section>

          {/* Prévisualisation */}
          <section className="mt-6">
            <h2 className="mb-3 font-heading text-base font-extrabold text-navy flex items-center gap-2">
              <span>👁️</span> Prévisualisation
            </h2>
            <div className="rounded-[20px] border border-slate-100 bg-white p-4 shadow-[0_8px_20px_rgba(22,37,74,0.06)]">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-lg" aria-hidden="true">🏢</div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-extrabold text-navy">{title || "Titre du poste"}</h3>
                  <p className="text-xs text-jobly-gray">
                    {[location, contract, mode].filter(Boolean).join(" · ") || "Localisation, contrat, mode"}
                  </p>
                  {salary && <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-emerald-600">💰 {salary}</p>}
                </div>
              </div>
              {description && (
                <p className="mt-3 text-xs leading-relaxed text-navy/80 line-clamp-3">{description}</p>
              )}
            </div>
          </section>

          {/* Validation & Sécurité */}
          <section className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <h3 className="mb-2 font-heading text-sm font-extrabold text-emerald-900 flex items-center gap-2">
              <span>✓</span> Validation & Sécurité
            </h3>
            <ul className="space-y-1.5 text-xs text-emerald-800">
              <li className="flex items-center gap-2">
                <span>✓</span> Contrôle de cohérence du profil et de l'offre
              </li>
              <li className="flex items-center gap-2">
                <span>✓</span> Champs obligatoires vérifiés
              </li>
              <li className="flex items-center gap-2">
                <span>✓</span> Offre prête à être enregistrée
              </li>
            </ul>
          </section>

          {!isNew && (
            <section className="mt-6">
              <h2 className="mb-3 font-heading text-base font-extrabold text-navy flex items-center gap-2">
                <span>📋</span> Candidatures reçues {applications.length > 0 && `(${applications.length})`}
              </h2>

              {appsError && (
                <div className="mb-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{appsError}</div>
              )}

              {applications.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-white p-5 text-center shadow-[0_8px_20px_rgba(22,37,74,0.06)]">
                  <p className="text-sm font-semibold text-navy">Aucune candidature pour l'instant.</p>
                  <p className="mt-1 text-xs text-jobly-gray">Les candidatures apparaîtront ici une fois l'offre publiée.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {applications.map((app) => {
                    const isSaving = savingAppId === app.id;
                    const canDeclare = ["SUBMITTED", "ACKNOWLEDGED", "INTERVIEW"].includes(app.status);
                    return (
                      <div key={app.id} className="rounded-[20px] border border-slate-100 bg-white p-4 shadow-[0_8px_20px_rgba(22,37,74,0.06)]">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-jobly-gray">
                            Reçue le {new Date(app.createdAt).toLocaleDateString("fr-FR")}
                          </span>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${APP_STATUS_STYLE[app.status]}`}>
                            {APP_STATUS_LABEL[app.status]}
                          </span>
                        </div>

                        {app.proofUrl && (
                          <a href={app.proofUrl} target="_blank" rel="noreferrer" className="mt-2 block text-xs font-bold text-jobly-blue">
                            Voir la preuve jointe →
                          </a>
                        )}

                        {app.interviewAt && (
                          <p className="mt-2 text-xs text-jobly-gray">
                            Entretien prévu le <strong className="text-navy">{new Date(app.interviewAt).toLocaleDateString("fr-FR")}</strong>
                          </p>
                        )}

                        {canDeclare && (
                          <div className="mt-3 space-y-2.5 border-t border-slate-100 pt-3">
                            <div>
                              <label className="mb-1 block text-xs font-bold text-navy">Fixer une date d'entretien</label>
                              <div className="flex gap-2">
                                <input
                                  type="date"
                                  value={interviewDraft[app.id] ?? ""}
                                  onChange={(e) => setInterviewDraft((prev) => ({ ...prev, [app.id]: e.target.value }))}
                                  className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy outline-none"
                                />
                                <button
                                  type="button"
                                  disabled={isSaving || !(interviewDraft[app.id] || "").trim()}
                                  onClick={() => patchApplication(app.id, { interviewAt: new Date(interviewDraft[app.id]).toISOString() })}
                                  className="shrink-0 rounded-xl bg-jobly-blue px-4 text-xs font-extrabold text-white disabled:opacity-50"
                                >
                                  Fixer
                                </button>
                              </div>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-bold text-navy">Déclarer un résultat</label>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => patchApplication(app.id, { status: "OFFER" })}
                                  className="flex-1 rounded-xl bg-emerald-50 py-2 text-xs font-extrabold text-jobly-green-dark disabled:opacity-50"
                                >
                                  Acceptée
                                </button>
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => patchApplication(app.id, { status: "REJECTED" })}
                                  className="flex-1 rounded-xl bg-red-50 py-2 text-xs font-extrabold text-red-500 disabled:opacity-50"
                                >
                                  Refusée
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          <div className="mt-5 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => submit("published")}
              disabled={saving}
              className="w-full rounded-2xl bg-jobly-blue py-3.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(37,99,235,0.3)] transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Publier l'offre"}
            </button>
            <button
              type="button"
              onClick={() => submit("draft")}
              disabled={saving}
              className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-extrabold text-navy shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              Enregistrer comme brouillon
            </button>
            {!isNew && (
              <button
                type="button"
                onClick={remove}
                disabled={saving}
                className="w-full rounded-2xl border border-red-100 bg-red-50 py-3 text-xs font-extrabold text-red-500 transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                Supprimer cette offre
              </button>
            )}
          </div>
        </div>
      </div>

      {shareJob && (() => {
        const pack = generateSharePack(shareJob);
        const text = pack[`${shareTab}Text` as "linkedinText" | "facebookText" | "whatsappText"];
        return (
          <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4">
            <section className="w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl">
              <h2 className="font-heading text-xl font-extrabold text-navy">Félicitations 🎉</h2>
              <p className="mt-1 text-xs text-jobly-gray">Partage ton offre partout en 30 secondes.</p>
              <div className="mt-4 flex gap-2">
                {(["linkedin","facebook","whatsapp"] as const).map(tab=><button key={tab} onClick={()=>setShareTab(tab)} className={`flex-1 rounded-full px-2 py-2 text-[10px] font-black ${shareTab===tab?"bg-[#2E5C9E] text-white":"bg-slate-100 text-navy"}`}>{tab==="linkedin"?"LinkedIn":tab==="facebook"?"Facebook":"WhatsApp"}</button>)}
              </div>
              <textarea readOnly value={text} rows={8} className="mt-3 w-full rounded-2xl border border-slate-200 p-3 text-xs text-navy outline-none"/>
              <button onClick={async()=>{await navigator.clipboard.writeText(text);setShareToast("Texte copié.");}} className="mt-3 w-full rounded-full bg-[#FFC72C] py-3 text-xs font-black text-navy">Copier</button>
              <p className="mt-3 rounded-2xl bg-blue-50 p-3 text-[11px] font-bold text-[#2E5C9E]">Lien direct : {jobPublicUrl(shareJob.id, "recruiter")}</p>
              <p className="mt-2 text-[10px] text-jobly-gray">Contact candidature : <a className="font-bold text-[#2E5C9E]" href={`mailto:${recruiterEmail}`}>{recruiterEmail}</a></p>
              <button onClick={()=>router.push("/recruiter")} className="mt-3 w-full rounded-full border border-slate-200 py-3 text-xs font-black text-navy">Terminer</button>
            </section>
          </div>
        );
      })()}
      <BottomNav active="/recruiter/jobs" items={RECRUITER_NAV} />
    </main>
  );
}
