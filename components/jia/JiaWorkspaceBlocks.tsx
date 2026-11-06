"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  GraduationCap,
  MapPin,
  RefreshCw,
  UserRound,
} from "lucide-react";
import type { JiaWorkspaceBlock, JiaWorkspaceOffer } from "@/lib/jia/workspace";
import {
  JIA_DOCUMENT_PRESENTATIONS,
  JIA_OFFER_PRESENTATIONS,
  JIA_QUESTION_PRESENTATIONS,
} from "@/lib/jia/visual-variations";

type ProfileSavePayload = {
  messageId: string;
  displayName: string;
  phone: string;
  headline: string;
  summary: string;
  location: string;
  skills: string[];
};

type Props = {
  block: JiaWorkspaceBlock;
  messageId: string;
  variationIndex: number;
  onPrepareApplication: (offer: JiaWorkspaceOffer) => Promise<void>;
  onNavigate: (href: string) => void;
  onSaveProfile: (args: ProfileSavePayload) => Promise<void>;
  onUploadCv: (args: { messageId: string; file: File }) => Promise<boolean>;
  onUpdateWorkspace: (messageId: string, workspace: JiaWorkspaceBlock) => void;
  onSubmitAssessment: (args: {
    messageId: string;
    assessmentId: string;
    answers: Record<string, unknown>;
    score: number;
    resultSummary: string;
  }) => Promise<void>;
  onSubmitApplication: (args: { messageId: string; applicationId: string; letter: string }) => Promise<void>;
};

const surface = "rounded-2xl border border-[#DCE6F2] bg-white p-3.5 shadow-[0_8px_22px_rgba(16,43,85,.045)]";
const primary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#1264EB] px-3.5 py-2 text-[11px] font-extrabold text-white transition hover:bg-[#0D52C5] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#DCE6F2] bg-white px-3.5 py-2 text-[11px] font-extrabold text-[#31547F] transition hover:border-[#1264EB]/50";

function OffersBlock({ block, onPrepareApplication, onNavigate, variationIndex }: {
  block: Extract<JiaWorkspaceBlock, { kind: "offers" }>;
  onPrepareApplication: Props["onPrepareApplication"];
  onNavigate: Props["onNavigate"];
  variationIndex: number;
}) {
  const [busyOffer, setBusyOffer] = useState<string | null>(null);
  const presentation = JIA_OFFER_PRESENTATIONS[variationIndex % JIA_OFFER_PRESENTATIONS.length];
  const metadata = (offer: JiaWorkspaceOffer) => ({
    location: offer.location ? <span className="inline-flex items-center gap-1"><MapPin size={11}/>{offer.location}</span> : null,
    contract: offer.contractType ? <span className="inline-flex items-center gap-1"><BriefcaseBusiness size={11}/>{offer.contractType}</span> : null,
    deadline: offer.deadline ? <span className="inline-flex items-center gap-1"><CalendarClock size={11}/>Limite {new Date(offer.deadline).toLocaleDateString("fr-FR")}</span> : null,
    remote: offer.remoteMode ? <span>{offer.remoteMode === "YES" ? "Télétravail" : offer.remoteMode === "PARTIAL" ? "Hybride" : "Sur site"}</span> : null,
  });
  const metaClass = presentation.density === "airy" ? "gap-x-4 gap-y-2" : presentation.density === "compact" ? "gap-x-2 gap-y-0.5" : "gap-x-3 gap-y-1";
  return (
    <section className="mt-3 space-y-2.5" aria-label="Offres Jobly" data-jia-offer-presentation={presentation.id}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[9px] font-black uppercase tracking-[.14em] text-[#6B7C92]">Offres Jobly en direct</span>
        <span className="rounded-full bg-[#FFF4BE] px-2.5 py-1 text-[10px] font-black text-[#775900]">
          {block.totalAvailable.toLocaleString("fr-FR")} disponibles
        </span>
      </div>
      {block.error && <p role="status" className="rounded-xl bg-[#FFF4E8] p-3 text-[11px] leading-5 text-[#92520C]">{block.error}</p>}
      {block.offers.length === 0 && (
        <div className={surface}>
          <p className="text-[12px] font-bold text-[#173A6B]">Aucune offre ne correspond à cette recherche pour le moment.</p>
          <p className="mt-1 text-[11px] leading-5 text-[#6B7C92]">La recherche a été faite dans le flux Jobly authentifié. Tu peux élargir les critères depuis la page Offres.</p>
          <button type="button" onClick={() => onNavigate("/jobs")} className={secondary + " mt-3"}>Ouvrir toutes les offres <ArrowUpRight size={13}/></button>
        </div>
      )}
      <div className={block.offers.length > 1 && presentation.columns === 2 ? "grid grid-cols-1 gap-2.5 sm:grid-cols-2" : "grid grid-cols-1 gap-2.5"}>
      {block.offers.map((offer) => (
        <article key={offer.source + ":" + offer.id}
          data-jia-offer-structure={presentation.structure}
          className={surface + " " + (presentation.density === "airy" ? "p-4" : presentation.density === "compact" ? "p-2.5" : "p-3.5")}>
          <div className={presentation.structure === "split" || presentation.structure === "comparison" ? "grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]" : "flex items-start justify-between gap-3"}>
            <div className="min-w-0">
              <h3 className="text-[13px] font-extrabold leading-5 text-[#10233F]">{offer.title}</h3>
              <p className="mt-0.5 text-[11px] font-semibold text-[#526A87]">{offer.companyName || "Entreprise non précisée"}</p>
            </div>
            {offer.matchPercent !== null && (
              <span className="max-w-[42%] shrink-0 whitespace-normal break-words rounded-full bg-[#EAF4EE] px-2.5 py-1 text-center text-[10px] font-black text-[#187443]">
                {Math.round(offer.matchPercent)} % match
              </span>
            )}
          </div>
          <div className={`mt-2 flex flex-wrap text-[10px] font-medium text-[#6B7C92] ${metaClass}`}>
            {presentation.metadataOrder.map((key) => {
              const item = metadata(offer)[key];
              return item ? <span key={key}>{item}</span> : null;
            })}
            {!presentation.metadataOrder.includes("remote") && metadata(offer).remote}
          </div>
          <div className={`mt-3 flex flex-wrap gap-2 ${presentation.actionPlacement === "stacked" ? "flex-col items-stretch" : presentation.actionPlacement === "rail" ? "sm:flex-col" : presentation.actionPlacement === "split" ? "justify-between" : ""}`}>
            {offer.applicationReady ? (
              <button type="button" disabled={busyOffer !== null} className={primary}
                onClick={async () => { setBusyOffer(offer.id); try { await onPrepareApplication(offer); } finally { setBusyOffer(null); } }}>
                {busyOffer === offer.id ? <RefreshCw size={13} className="animate-spin"/> : <FileText size={13}/>}
                Préparer ma candidature
              </button>
            ) : (
              <span className="inline-flex min-h-9 items-center rounded-xl bg-[#F2F5F9] px-3 text-[10px] font-bold text-[#68798F]">Candidature directe non vérifiée</span>
            )}
            {offer.sourceUrl && /^https?:\/\//i.test(offer.sourceUrl) && (
              <a className={secondary} href={offer.sourceUrl} target="_blank" rel="noopener noreferrer">Voir la source <ArrowUpRight size={13}/></a>
            )}
          </div>
        </article>
      ))}
      </div>
    </section>
  );
}

function ApplicationsBlock({ block }: { block: Extract<JiaWorkspaceBlock, { kind: "applications" }> }) {
  return (
    <section className="mt-3 space-y-2.5" aria-label="Mes candidatures">
      <div className="grid grid-cols-3 gap-2">
        {[
          ["Préparées / envoyées", block.counters.envoyees],
          ["Vues", block.counters.vues],
          ["Entretiens", block.counters.entretien],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl bg-[#F3F7FC] px-2 py-2.5 text-center">
            <p className="text-[18px] font-black tabular-nums text-[#1264EB]">{Number(value)}</p>
            <p className="mt-0.5 text-[9px] font-bold text-[#64758B]">{label}</p>
          </div>
        ))}
      </div>
      {block.error && <p role="status" className="rounded-xl bg-[#FFF4E8] p-3 text-[11px] text-[#92520C]">{block.error}</p>}
      {block.applications.length === 0 && <p className={surface + " text-[11px] text-[#6B7C92]"}>Aucune candidature enregistrée pour le moment.</p>}
      {block.applications.slice(0, 6).map((item) => (
        <article key={item.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[#E5EBF3] bg-white p-3">
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold text-[#173A6B]">{item.job?.title || "Offre non disponible"}</p>
            <p className="mt-0.5 text-[10px] text-[#718198]">{[item.job?.companyName, item.job?.location].filter(Boolean).join(" · ") || "Détails à confirmer"}</p>
          </div>
          <span className="max-w-full shrink-0 whitespace-normal break-words rounded-full bg-[#F1F5FA] px-2 py-1 text-[9px] font-extrabold text-[#52637A] sm:max-w-[42%] sm:text-right">{item.statusLabel || item.status}</span>
        </article>
      ))}
    </section>
  );
}

function cvDateRange(startDate: string | null, endDate: string | null) {
  const year = (value: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : String(date.getFullYear());
  };
  const start = year(startDate);
  const end = year(endDate) || (start ? "Aujourd'hui" : "");
  return [start, end].filter(Boolean).join(" — ");
}

function ProfileBlock({ block, messageId, onNavigate, onSaveProfile, onUploadCv, variationIndex }: {
  block: Extract<JiaWorkspaceBlock, { kind: "profile" }>;
  messageId: string;
  onNavigate: Props["onNavigate"];
  onSaveProfile: Props["onSaveProfile"];
  onUploadCv: Props["onUploadCv"];
  variationIndex: number;
}) {
  const presentation = JIA_DOCUMENT_PRESENTATIONS[variationIndex % JIA_DOCUMENT_PRESENTATIONS.length];
  const completion = [
    Boolean(block.displayName), Boolean(block.headline), Boolean(block.summary),
    block.skills.length > 0, block.experienceCount > 0, block.educationCount > 0,
  ].filter(Boolean).length;
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [draft, setDraft] = useState({
    displayName: block.displayName,
    phone: block.phone || "",
    headline: block.headline,
    summary: block.summary,
    location: block.location || "",
    skills: block.skills.join(", "),
  });

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await onSaveProfile({
        messageId,
        displayName: draft.displayName.trim(),
        phone: draft.phone.trim(),
        headline: draft.headline.trim(),
        summary: draft.summary.trim(),
        location: draft.location.trim(),
        skills: [...new Set(draft.skills.split(/[,;\r\n]+/).map((item) => item.trim()).filter(Boolean))].slice(0, 30),
      });
      setEditing(false);
      setSuccess("Profil enregistré dans Jobly.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Impossible d'enregistrer le profil.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadCv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const saved = await onUploadCv({ messageId, file });
      if (saved) setSuccess("CV original mis à jour dans Jobly.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Impossible de remplacer le CV.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mt-3 space-y-3" aria-label="Mon profil et mon CV">
      <div className={surface + " " + (presentation.density === "airy" ? "p-4" : presentation.density === "compact" ? "p-2.5" : "p-3.5")}
        data-jia-document-presentation={presentation.id}
        data-jia-document-structure={presentation.structure}
        style={{ borderRadius: presentation.structure === "minimal" ? 12 : presentation.structure === "showcase" ? 28 : 20 }}>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF4BE] text-[#775900]"><UserRound size={17}/></div>
          <div className="min-w-0">
            <p className="text-[#10233F] font-extrabold" style={{ fontSize: `${12 * presentation.headingScale}px` }}>{block.displayName || "Mon profil Talent"}</p>
            <p className="truncate text-[10px] text-[#718198]">{block.headline || "Titre professionnel à renseigner"}</p>
          </div>
          <span className="ml-auto shrink-0 text-[10px] font-black text-[#1264EB]">{Math.round(completion / 6 * 100)} %</span>
        </div>
        {block.summary && <p className="mt-3 line-clamp-4 text-[11px] leading-5 text-[#52637A]">{block.summary}</p>}
        {(block.location || block.phone || block.email) && (
          <p className="mt-2 break-words text-[10px] text-[#718198]">
            {[block.location, block.phone, block.email].filter(Boolean).join(" · ")}
          </p>
        )}
        <div className={`mt-3 grid gap-2 text-center ${presentation.columns === 2 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-3"}`}>
          <div className="rounded-xl bg-[#F3F7FC] p-2"><p className="text-[16px] font-black text-[#1264EB]">{block.skills.length}</p><p className="text-[9px] font-bold text-[#718198]">Compétences</p></div>
          <div className="rounded-xl bg-[#F3F7FC] p-2"><p className="text-[16px] font-black text-[#1264EB]">{block.experienceCount}</p><p className="text-[9px] font-bold text-[#718198]">Expériences</p></div>
          <div className="rounded-xl bg-[#F3F7FC] p-2"><p className="text-[16px] font-black text-[#1264EB]">{block.educationCount}</p><p className="text-[9px] font-bold text-[#718198]">Formations</p></div>
        </div>
        {block.skills.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{block.skills.slice(0, 8).map((skill) => <span key={skill} className="rounded-full bg-[#EAF3FF] px-2.5 py-1 text-[9px] font-bold text-[#315B92]">{skill}</span>)}</div>}
        {block.experiences.length > 0 && (
          <div className="mt-4 border-t border-[#E8EEF5] pt-3">
            <p className="text-[9px] font-black uppercase tracking-[.13em] text-[#6B7C92]">Expérience professionnelle</p>
            <div className="mt-2 space-y-3">
              {block.experiences.slice(0, 3).map((item, index) => (
                <article key={item.title + ":" + item.company + ":" + index}>
                  <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-start sm:gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold text-[#173A6B]">{item.title || "Expérience professionnelle"}</p>
                      <p className="text-[10px] text-[#6B7C92]">{item.company}</p>
                    </div>
                    {cvDateRange(item.startDate, item.endDate) && <span className="text-[9px] font-semibold text-[#8492A5] sm:shrink-0">{cvDateRange(item.startDate, item.endDate)}</span>}
                  </div>
                  {item.description && <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#64758B]">{item.description}</p>}
                </article>
              ))}
            </div>
          </div>
        )}
        {block.education.length > 0 && (
          <div className="mt-4 border-t border-[#E8EEF5] pt-3">
            <p className="text-[9px] font-black uppercase tracking-[.13em] text-[#6B7C92]">Formation</p>
            <div className="mt-2 space-y-2.5">
              {block.education.slice(0, 3).map((item, index) => (
                <article key={item.institution + ":" + index}>
                  <p className="text-[11px] font-extrabold text-[#173A6B]">{[item.degree, item.field].filter(Boolean).join(" · ") || "Formation"}</p>
                  <div className="flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <p className="text-[10px] text-[#6B7C92]">{item.institution}</p>
                    {cvDateRange(item.startDate, item.endDate) && <span className="text-[9px] font-semibold text-[#8492A5] sm:shrink-0">{cvDateRange(item.startDate, item.endDate)}</span>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={primary} onClick={() => { setEditing((value) => !value); setError(""); setSuccess(""); }}>
            {editing ? "Fermer l'édition" : "Modifier ici"} <ArrowUpRight size={13}/>
          </button>
          <button type="button" className={secondary} onClick={() => onNavigate("/talent/profile")}>Profil complet <ArrowUpRight size={13}/></button>
          <button type="button" className={secondary} onClick={() => onNavigate("/talent/cvs")}>Mes CV <FileText size={13}/></button>
          {block.cvOriginalUrl && <a href={block.cvOriginalUrl} target="_blank" rel="noopener noreferrer" className={secondary}>CV importé <ArrowUpRight size={13}/></a>}
          <label className={secondary + " cursor-pointer " + (uploading ? "pointer-events-none opacity-50" : "")}>
            {uploading ? "Enregistrement du CV…" : "Remplacer le CV PDF"}
            <input type="file" accept="application/pdf,.pdf" className="sr-only" disabled={uploading} onChange={(event) => void uploadCv(event)}/>
          </label>
        </div>
        {editing && (
          <form onSubmit={(event) => void saveProfile(event)} className="mt-4 space-y-2.5 rounded-2xl border border-[#DCE6F2] bg-[#F8FAFD] p-3">
            <label className="block text-[10px] font-bold text-[#52637A]">
              Nom affiché
              <input value={draft.displayName} onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))} maxLength={120} className="mt-1 min-h-10 w-full rounded-xl border border-[#DCE5F0] bg-white px-3 text-[12px] text-[#10233F] outline-none focus:border-[#1264EB]"/>
            </label>
            <label className="block text-[10px] font-bold text-[#52637A]">
              Intitulé professionnel
              <input value={draft.headline} onChange={(event) => setDraft((current) => ({ ...current, headline: event.target.value }))} maxLength={180} className="mt-1 min-h-10 w-full rounded-xl border border-[#DCE5F0] bg-white px-3 text-[12px] text-[#10233F] outline-none focus:border-[#1264EB]"/>
            </label>
            <label className="block text-[10px] font-bold text-[#52637A]">
              Localisation
              <input value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} maxLength={120} className="mt-1 min-h-10 w-full rounded-xl border border-[#DCE5F0] bg-white px-3 text-[12px] text-[#10233F] outline-none focus:border-[#1264EB]"/>
            </label>
            <label className="block text-[10px] font-bold text-[#52637A]">
              Téléphone
              <input value={draft.phone} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} maxLength={40} className="mt-1 min-h-10 w-full rounded-xl border border-[#DCE5F0] bg-white px-3 text-[12px] text-[#10233F] outline-none focus:border-[#1264EB]"/>
            </label>
            <label className="block text-[10px] font-bold text-[#52637A]">
              Résumé professionnel
              <textarea value={draft.summary} onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))} maxLength={4000} rows={5} className="mt-1 w-full rounded-xl border border-[#DCE5F0] bg-white p-3 text-[11px] leading-5 text-[#10233F] outline-none focus:border-[#1264EB]"/>
            </label>
            <label className="block text-[10px] font-bold text-[#52637A]">
              Compétences (séparées par des virgules)
              <input value={draft.skills} onChange={(event) => setDraft((current) => ({ ...current, skills: event.target.value }))} maxLength={1200} className="mt-1 min-h-10 w-full rounded-xl border border-[#DCE5F0] bg-white px-3 text-[12px] text-[#10233F] outline-none focus:border-[#1264EB]"/>
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={secondary} disabled={saving} onClick={() => setEditing(false)}>Annuler</button>
              <button type="submit" className={primary} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer le profil"}</button>
            </div>
          </form>
        )}
        {error && <p role="alert" className="mt-2 rounded-xl bg-[#FFF4E8] p-3 text-[10px] text-[#92520C]">{error}</p>}
        {success && <p role="status" className="mt-2 rounded-xl bg-[#EFF9F2] p-3 text-[10px] font-bold text-[#17613B]">{success}</p>}
      </div>
    </section>
  );
}

function QuestionnaireBlock({ block, messageId, onSubmitAssessment, onUpdateWorkspace, variationIndex }: {
  block: Extract<JiaWorkspaceBlock, { kind: "questionnaire" }>;
  messageId: string;
  onSubmitAssessment: Props["onSubmitAssessment"];
  onUpdateWorkspace: Props["onUpdateWorkspace"];
  variationIndex: number;
}) {
  const presentation = JIA_QUESTION_PRESENTATIONS[variationIndex % JIA_QUESTION_PRESENTATIONS.length];
  const [answers, setAnswers] = useState<Record<string, number>>(block.answers || {});
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");
  const asked = block.adaptive ? (block.askedQuestionIndexes?.length ? block.askedQuestionIndexes : [0]) : block.questions.map((_, index) => index);
  const currentIndex = block.currentQuestionIndex ?? asked[asked.length - 1] ?? 0;
  const currentQuestion = block.questions[currentIndex];
  const currentAnswered = answers[String(currentIndex)] !== undefined;
  const complete = block.adaptive
    ? asked.length >= (block.maxQuestions || 5) && asked.every((index) => answers[String(index)] !== undefined)
    : block.questions.length > 0 && block.questions.every((_, index) => answers[String(index)] !== undefined);
  const usedIndexes = block.adaptive ? asked : block.questions.map((_, index) => index);
  const computedScore = usedIndexes.length
    ? Math.round(usedIndexes.reduce((score, index) => score + (answers[String(index)] === block.questions[index].correctIndex ? 1 : 0), 0) / usedIndexes.length * 100)
    : 0;

  function updateAnswers(nextAnswers: Record<string, number>) {
    setAnswers(nextAnswers);
    onUpdateWorkspace(messageId, { ...block, answers: nextAnswers });
  }

  function continueAdaptive() {
    if (!block.adaptive || !currentAnswered || complete || block.result) return;
    const currentIsCorrect = answers[String(currentIndex)] === currentQuestion.correctIndex;
    const currentDifficulty = currentQuestion.difficulty || block.currentDifficulty || 1;
    const targetDifficulty = Math.min(3, Math.max(1, currentDifficulty + (currentIsCorrect ? 1 : -1))) as 1 | 2 | 3;
    const nextIndex = block.questions.findIndex((question, index) =>
      !asked.includes(index) && (question.difficulty || 1) === targetDifficulty
    );
    const fallbackIndex = block.questions.findIndex((_, index) => !asked.includes(index));
    const chosenIndex = nextIndex >= 0 ? nextIndex : fallbackIndex;
    if (chosenIndex < 0) return;
    onUpdateWorkspace(messageId, {
      ...block,
      answers,
      currentQuestionIndex: chosenIndex,
      currentDifficulty: targetDifficulty,
      askedQuestionIndexes: [...asked, chosenIndex],
    });
  }

  async function submit() {
    if (!complete || submitting || block.result) return;
    setSubmitting(true);
    setLocalError("");
    const answerMap = Object.fromEntries(usedIndexes.map((index) => [
      String(index + 1),
      block.questions[index].choices[answers[String(index)]] || "",
    ]));
    const resultSummary = "Résultat indicatif : " + computedScore + "/100 sur " + block.competency + ". Parcours " + (block.adaptive ? "adaptatif" : "standard") + ", non certifiant.";
    try {
      await onSubmitAssessment({ messageId, assessmentId: block.assessmentId, answers: answerMap, score: computedScore, resultSummary });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Impossible d'enregistrer les réponses.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={`mt-3 space-y-3 ${presentation.density === "airy" ? "space-y-4" : presentation.density === "compact" ? "text-[.96em]" : ""}`} aria-label="Questionnaire J’IA"
      data-jia-question-presentation={presentation.id}
      data-jia-question-arrangement={presentation.arrangement}>
      <div className="rounded-2xl border border-[#F1D88B] bg-gradient-to-br from-[#FFFBEB] to-white p-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FFD21A] text-[#594300]"><ClipboardCheck size={17}/></div>
          <div className="min-w-0"><p className="break-words text-[12px] font-extrabold text-[#10233F]">{block.title}</p><p className="text-[10px] font-semibold text-[#8A6A10]">{block.adaptive ? (asked.length + "/" + (block.maxQuestions || 5) + " questions adaptatives") : (block.questions.length + " questions")} · {block.competency}</p></div>
        </div>
        <p className="mt-2 text-[10px] leading-5 text-[#6B5A2A]">{block.objective}</p>
      </div>
      {(block.adaptive ? [currentIndex] : block.questions.map((_, index) => index)).map((index) => {
        const question = block.questions[index];
        return (
        <fieldset key={block.assessmentId + ":" + index} className="rounded-xl border border-[#E3EAF3] bg-white p-3" disabled={Boolean(block.result) || submitting}>
          <legend className="px-1 text-[11px] font-extrabold leading-5 text-[#173A6B]">
            {presentation.showQuestionNumber ? (index + 1) + ". " : ""}{question.prompt}
          </legend>
          {presentation.showProgress && <p className="mt-1 text-[9px] font-bold text-[#8795A8]">Question {asked.indexOf(index) + 1} sur {block.adaptive ? (block.maxQuestions || 5) : block.questions.length}</p>}
          <div className={`mt-2 grid gap-1.5 ${presentation.columns === 1 ? "grid-cols-1" : presentation.columns === 2 ? "grid-cols-1 sm:grid-cols-2" : presentation.columns === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4"}`}>
            {question.choices.map((choice, choiceIndex) => {
              const selected = answers[String(index)] === choiceIndex;
              const correct = block.result && choiceIndex === question.correctIndex;
              const optionClass = correct
                ? "border-[#8BC9A6] bg-[#EFF9F2] text-[#17613B]"
                : selected
                  ? "border-[#1264EB] bg-[#EEF5FF] text-[#173A6B]"
                  : "border-[#EDF1F6] text-[#52637A] hover:border-[#B9CBE2]";
              return (
                <label key={choice} className={`flex min-h-11 min-w-0 cursor-pointer items-start gap-2.5 border px-3 py-3 text-[10px] leading-4 transition ${presentation.optionShape === "pill" ? "rounded-full" : presentation.optionShape === "tile" ? "rounded-xl text-center" : presentation.optionShape === "numbered" ? "rounded-md" : presentation.optionShape === "row" ? "rounded-md" : "rounded-lg"} ${optionClass}`}>
                  <input type="radio" name={block.assessmentId + ":" + index} className="mt-0.5 accent-[#1264EB]" checked={selected} onChange={() => {
                    const nextAnswers = { ...answers, [String(index)]: choiceIndex };
                    setAnswers(nextAnswers);
                    onUpdateWorkspace(messageId, { ...block, answers: nextAnswers });
                  }}/>
                  <span className="min-w-0 flex-1 break-words [overflow-wrap:anywhere]">{choice}</span>
                  {correct && <CheckCircle2 size={13}/>}
                </label>
              );
            })}
          </div>
          {block.result && <p className="mt-2 text-[10px] leading-4 text-[#58708C]">{question.explanation}</p>}
        </fieldset>
        );
      })}
      {block.error && <p role="alert" className="rounded-xl bg-[#FFF4E8] p-3 text-[10px] text-[#92520C]">{block.error}</p>}
      {localError && <p role="alert" className="rounded-xl bg-[#FFF4E8] p-3 text-[10px] text-[#92520C]">{localError}</p>}
      {block.result ? (
        <div className="rounded-xl border border-[#B8DEC8] bg-[#F0FAF4] p-3">
          <p className="text-[15px] font-black text-[#17613B]">{block.result.score}/100</p>
          <p className="mt-1 text-[10px] leading-5 text-[#3E7056]">{block.result.summary}</p>
        </div>
      ) : block.adaptive && !complete ? (
        <button type="button" className={primary} disabled={!currentAnswered || submitting} onClick={continueAdaptive}>
          Continuer selon ma réponse
        </button>
      ) : (
        <button type="button" className={primary} disabled={!complete || submitting} onClick={() => void submit()}>
          {submitting ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>}
          Valider mes réponses
        </button>
      )}
      <p className="text-[9px] leading-4 text-[#8492A5]">Exercice facultatif. Le score est indicatif et ne constitue ni une certification ni une décision de recrutement. Le mode adaptatif ajuste la difficulté dans une banque de questions préparée.</p>
    </section>
  );
}

function PreparedApplicationBlock({ block, messageId, onSubmitApplication, onUpdateWorkspace }: {
  block: Extract<JiaWorkspaceBlock, { kind: "prepared-application" }>;
  messageId: string;
  onSubmitApplication: Props["onSubmitApplication"];
  onUpdateWorkspace: Props["onUpdateWorkspace"];
}) {
  const [letter, setLetter] = useState(block.letter);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(Boolean(block.submitted));
  const [error, setError] = useState("");

  async function submit() {
    if (sending || sent || !block.applicationId || !letter.trim()) return;
    const recipient = block.email ? " vers " + block.email : "";
    const confirmed = window.confirm(
      "Confirmer l’envoi réel de cette candidature" + recipient + " via ton compte Gmail ?\n\n" +
      "Le message sera envoyé avec le CV préparé en pièce jointe. Cet envoi ne pourra pas être annulé."
    );
    if (!confirmed) return;
    setSending(true);
    setError("");
    try {
      await onSubmitApplication({ messageId, applicationId: block.applicationId, letter });
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "L’envoi n’a pas été confirmé.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mt-3 rounded-2xl border border-[#B8DEC8] bg-[#F3FAF6] p-3.5">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={17} className="text-[#187443]"/>
        <p className="text-[12px] font-extrabold text-[#17613B]">{sent ? "Candidature envoyée" : "Candidature préparée — pas encore envoyée"}</p>
      </div>
      <p className="mt-2 text-[10px] text-[#456C57]">Canal : {block.channel || "à confirmer"}</p>
      {block.email && <p className="mt-1 break-all text-[10px] text-[#456C57]">E-mail destinataire : {block.email}</p>}
      {block.phone && <p className="mt-1 text-[10px] text-[#456C57]">Téléphone : {block.phone}</p>}
      {block.subject && <p className="mt-2 text-[11px] font-bold text-[#173A6B]">Objet : {block.subject}</p>}
      {block.letter && (
        <label className="mt-2 block text-[10px] font-bold text-[#456C57]">
          Relis et ajuste ta lettre avant l’envoi
          <textarea
            value={letter}
            onChange={(event) => {
              const nextLetter = event.target.value;
              setLetter(nextLetter);
              onUpdateWorkspace(messageId, { ...block, letter: nextLetter });
            }}
            disabled={sending || sent}
            rows={7}
            maxLength={30000}
            className="mt-1 max-h-64 w-full rounded-xl border border-[#DCE9E0] bg-white p-3 text-[10px] font-normal leading-5 text-[#40566C] outline-none focus:border-[#1264EB] disabled:opacity-70"
          />
        </label>
      )}
      {block.warnings.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[9px] text-[#8A5A20]">
          {block.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
        </ul>
      )}
      {error && <p role="alert" className="mt-2 rounded-xl bg-[#FFF4E8] p-3 text-[10px] text-[#92520C]">{error}</p>}
      {sent ? (
        <p role="status" className="mt-3 rounded-xl bg-white p-3 text-[10px] font-bold text-[#17613B]">
          Le service Jobly a confirmé l’envoi. Le suivi est disponible dans Mes candidatures.
        </p>
      ) : block.channel.toUpperCase() === "EMAIL" && block.applicationId ? (
        <div className="mt-3 space-y-2">
          <p className="text-[9px] leading-4 text-[#8A5A20]">
            Le bouton envoie réellement l’email depuis ton compte Gmail et joint le CV préparé. Une connexion Gmail active et les contrôles de quota Jobly sont nécessaires.
          </p>
          <button type="button" className={primary} disabled={sending || !letter.trim()} onClick={() => void submit()}>
            {sending ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>}
            {sending ? "Envoi en cours…" : "Relire, confirmer et envoyer"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-[10px] leading-5 text-[#6B7C92]">
          Ce canal n’est pas automatisable par email. J’IA ne simule pas l’envoi.
        </p>
      )}
      {block.sourceUrl && /^https?:\/\//i.test(block.sourceUrl) && (
        <a href={block.sourceUrl} target="_blank" rel="noopener noreferrer" className={secondary + " mt-3"}>
          Consulter l'annonce <ArrowUpRight size={13}/>
        </a>
      )}
    </section>
  );
}

function BusinessSummaryBlock({ block, onNavigate }: { block: Extract<JiaWorkspaceBlock, { kind: "business-summary" }>; onNavigate: Props["onNavigate"] }) {
  return (
    <section className="mt-3 space-y-2.5" aria-label={block.title}>
      <div className={surface}>
        <p className="text-[9px] font-black uppercase tracking-[.14em] text-[#6B7C92]">{block.title}</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <p className="text-[11px] font-bold text-[#52637A]">{block.metricLabel}</p>
          <p className="text-[25px] font-black tabular-nums text-[#1264EB]">{block.metric.toLocaleString("fr-FR")}</p>
        </div>
      </div>
      {block.items.length === 0 ? <div className={surface}><p className="text-[11px] font-bold text-[#173A6B]">Aucun élément à afficher dans ce périmètre.</p></div> : block.items.map((item) => (
        <article key={item.id} className={surface}>
          <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="break-words text-[11px] font-extrabold text-[#173A6B]">{item.title}</p>{item.subtitle && <p className="mt-0.5 break-words text-[10px] text-[#6B7C92]">{item.subtitle}</p>}</div>
          {item.status && <span className="max-w-[42%] shrink-0 whitespace-normal break-words rounded-full bg-[#F1F5FA] px-2 py-1 text-right text-[9px] font-bold text-[#52637A]">{item.status}</span>}</div>
          {item.detail && <p className="mt-2 text-[10px] leading-4 text-[#64758B]">{item.detail}</p>}
        </article>
      ))}
      {block.note && <p className="text-[9px] leading-4 text-[#8492A5]">{block.note}</p>}
      <button type="button" className={primary} onClick={() => onNavigate(block.href)}>{block.hrefLabel} <ArrowUpRight size={13}/></button>
    </section>
  );
}

export default function JiaWorkspaceBlocks({ block, messageId, onPrepareApplication, onNavigate, onSaveProfile, onUploadCv, onUpdateWorkspace, onSubmitAssessment, onSubmitApplication, variationIndex }: Props) {
  if (block.kind === "offers") return <OffersBlock block={block} onPrepareApplication={onPrepareApplication} onNavigate={onNavigate} variationIndex={variationIndex}/>;
  if (block.kind === "applications") return <ApplicationsBlock block={block}/>;
  if (block.kind === "profile") return <ProfileBlock block={block} messageId={messageId} onNavigate={onNavigate} onSaveProfile={onSaveProfile} onUploadCv={onUploadCv} variationIndex={variationIndex}/>;
  if (block.kind === "questionnaire") return <QuestionnaireBlock block={block} messageId={messageId} onSubmitAssessment={onSubmitAssessment} onUpdateWorkspace={onUpdateWorkspace} variationIndex={variationIndex}/>;
  if (block.kind === "prepared-application") return <PreparedApplicationBlock block={block} messageId={messageId} onSubmitApplication={onSubmitApplication} onUpdateWorkspace={onUpdateWorkspace}/>;
  if (block.kind === "business-summary") return <BusinessSummaryBlock block={block} onNavigate={onNavigate}/>;
  return (
    <section className="mt-3 rounded-2xl border border-[#E3EAF3] bg-white p-3.5">
      <div className="flex items-center gap-2"><GraduationCap size={16} className="text-[#1264EB]"/><p className="text-[11px] font-extrabold text-[#173A6B]">{block.title}</p></div>
      <p className="mt-1 text-[10px] leading-5 text-[#62748B]">{block.message}</p>
      {block.href && <button type="button" className={secondary + " mt-3"} onClick={() => onNavigate(block.href!)}>Ouvrir l'espace Jobly <ArrowUpRight size={13}/></button>}
    </section>
  );
}
