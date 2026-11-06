"use client";

import { useState } from "react";
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

type Props = {
  block: JiaWorkspaceBlock;
  messageId: string;
  onPrepareApplication: (offer: JiaWorkspaceOffer) => Promise<void>;
  onNavigate: (href: string) => void;
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
const primary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#1264EB] px-3.5 py-2 text-[11px] font-extrabold text-white transition hover:bg-[#0D52C5] disabled:cursor-not-allowed disabled:opacity-50";
const secondary = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#DCE6F2] bg-white px-3.5 py-2 text-[11px] font-extrabold text-[#31547F] transition hover:border-[#1264EB]/50";

function OffersBlock({ block, onPrepareApplication, onNavigate }: {
  block: Extract<JiaWorkspaceBlock, { kind: "offers" }>;
  onPrepareApplication: Props["onPrepareApplication"];
  onNavigate: Props["onNavigate"];
}) {
  const [busyOffer, setBusyOffer] = useState<string | null>(null);
  return (
    <section className="mt-3 space-y-2.5" aria-label="Offres Jobly">
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
      {block.offers.map((offer) => (
        <article key={offer.source + ":" + offer.id} className={surface}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-[13px] font-extrabold leading-5 text-[#10233F]">{offer.title}</h3>
              <p className="mt-0.5 text-[11px] font-semibold text-[#526A87]">{offer.companyName || "Entreprise non précisée"}</p>
            </div>
            {offer.matchPercent !== null && (
              <span className="shrink-0 rounded-full bg-[#EAF4EE] px-2.5 py-1 text-[10px] font-black text-[#187443]">
                {Math.round(offer.matchPercent)} % match
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-[#6B7C92]">
            {offer.location && <span className="inline-flex items-center gap-1"><MapPin size={11}/>{offer.location}</span>}
            {offer.contractType && <span className="inline-flex items-center gap-1"><BriefcaseBusiness size={11}/>{offer.contractType}</span>}
            {offer.remoteMode && <span>{offer.remoteMode === "YES" ? "Télétravail" : offer.remoteMode === "PARTIAL" ? "Hybride" : "Sur site"}</span>}
            {offer.deadline && <span className="inline-flex items-center gap-1"><CalendarClock size={11}/>Limite {new Date(offer.deadline).toLocaleDateString("fr-FR")}</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
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
        <article key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#E5EBF3] bg-white p-3">
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold text-[#173A6B]">{item.job?.title || "Offre non disponible"}</p>
            <p className="mt-0.5 text-[10px] text-[#718198]">{[item.job?.companyName, item.job?.location].filter(Boolean).join(" · ") || "Détails à confirmer"}</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#F1F5FA] px-2 py-1 text-[9px] font-extrabold text-[#52637A]">{item.statusLabel || item.status}</span>
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

function ProfileBlock({ block, onNavigate }: {
  block: Extract<JiaWorkspaceBlock, { kind: "profile" }>;
  onNavigate: Props["onNavigate"];
}) {
  const completion = [
    Boolean(block.displayName), Boolean(block.headline), Boolean(block.summary),
    block.skills.length > 0, block.experienceCount > 0, block.educationCount > 0,
  ].filter(Boolean).length;
  return (
    <section className="mt-3 space-y-3" aria-label="Mon profil et mon CV">
      <div className={surface}>
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFF4BE] text-[#775900]"><UserRound size={17}/></div>
          <div className="min-w-0">
            <p className="text-[12px] font-extrabold text-[#10233F]">{block.displayName || "Mon profil Talent"}</p>
            <p className="truncate text-[10px] text-[#718198]">{block.headline || "Titre professionnel à renseigner"}</p>
          </div>
          <span className="ml-auto shrink-0 text-[10px] font-black text-[#1264EB]">{Math.round(completion / 6 * 100)} %</span>
        </div>
        {block.summary && <p className="mt-3 line-clamp-4 text-[11px] leading-5 text-[#52637A]">{block.summary}</p>}
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-extrabold text-[#173A6B]">{item.title || "Expérience professionnelle"}</p>
                      <p className="text-[10px] text-[#6B7C92]">{item.company}</p>
                    </div>
                    {cvDateRange(item.startDate, item.endDate) && <span className="shrink-0 text-[9px] font-semibold text-[#8492A5]">{cvDateRange(item.startDate, item.endDate)}</span>}
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
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] text-[#6B7C92]">{item.institution}</p>
                    {cvDateRange(item.startDate, item.endDate) && <span className="shrink-0 text-[9px] font-semibold text-[#8492A5]">{cvDateRange(item.startDate, item.endDate)}</span>}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={primary} onClick={() => onNavigate("/talent/profile")}>Modifier mon profil <ArrowUpRight size={13}/></button>
          <button type="button" className={secondary} onClick={() => onNavigate("/talent/cvs")}>Mes CV <FileText size={13}/></button>
          {block.cvOriginalUrl && <a href={block.cvOriginalUrl} target="_blank" rel="noopener noreferrer" className={secondary}>CV importé <ArrowUpRight size={13}/></a>}
        </div>
      </div>
    </section>
  );
}

function QuestionnaireBlock({ block, messageId, onSubmitAssessment }: {
  block: Extract<JiaWorkspaceBlock, { kind: "questionnaire" }>;
  messageId: string;
  onSubmitAssessment: Props["onSubmitAssessment"];
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState("");
  const complete = block.questions.length > 0 && block.questions.every((_, index) => answers[String(index)] !== undefined);
  const computedScore = block.questions.length
    ? Math.round(block.questions.reduce((score, question, index) => score + (answers[String(index)] === question.correctIndex ? 1 : 0), 0) / block.questions.length * 100)
    : 0;

  async function submit() {
    if (!complete || submitting || block.result) return;
    setSubmitting(true);
    setLocalError("");
    const answerMap = Object.fromEntries(block.questions.map((question, index) => [
      String(index + 1),
      question.choices[answers[String(index)]] || "",
    ]));
    const resultSummary = "Résultat indicatif : " + computedScore + "/100 sur " + block.competency + ". Cet exercice ne constitue pas une certification.";
    try {
      await onSubmitAssessment({
        messageId,
        assessmentId: block.assessmentId,
        answers: answerMap,
        score: computedScore,
        resultSummary,
      });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Impossible d'enregistrer les réponses.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-3 space-y-3" aria-label="Questionnaire J’IA">
      <div className="rounded-2xl border border-[#F1D88B] bg-gradient-to-br from-[#FFFBEB] to-white p-3.5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#FFD21A] text-[#594300]"><ClipboardCheck size={17}/></div>
          <div><p className="text-[12px] font-extrabold text-[#10233F]">{block.title}</p><p className="text-[10px] font-semibold text-[#8A6A10]">{block.questions.length} questions · {block.competency}</p></div>
        </div>
        <p className="mt-2 text-[10px] leading-5 text-[#6B5A2A]">{block.objective}</p>
      </div>
      {block.questions.map((question, index) => (
        <fieldset key={block.assessmentId + ":" + index} className="rounded-xl border border-[#E3EAF3] bg-white p-3" disabled={Boolean(block.result) || submitting}>
          <legend className="px-1 text-[11px] font-extrabold leading-5 text-[#173A6B]">{index + 1}. {question.prompt}</legend>
          <div className="mt-2 space-y-1.5">
            {question.choices.map((choice, choiceIndex) => {
              const selected = answers[String(index)] === choiceIndex;
              const correct = block.result && choiceIndex === question.correctIndex;
              const optionClass = correct
                ? "border-[#8BC9A6] bg-[#EFF9F2] text-[#17613B]"
                : selected
                  ? "border-[#1264EB] bg-[#EEF5FF] text-[#173A6B]"
                  : "border-[#EDF1F6] text-[#52637A] hover:border-[#B9CBE2]";
              return (
                <label key={choice} className={"flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-[10px] leading-4 transition " + optionClass}>
                  <input type="radio" name={block.assessmentId + ":" + index} className="mt-0.5 accent-[#1264EB]" checked={selected} onChange={() => setAnswers((current) => ({ ...current, [String(index)]: choiceIndex }))}/>
                  <span className="flex-1">{choice}</span>
                  {correct && <CheckCircle2 size={13}/>}
                </label>
              );
            })}
          </div>
          {block.result && <p className="mt-2 text-[10px] leading-4 text-[#58708C]">{question.explanation}</p>}
        </fieldset>
      ))}
      {block.error && <p role="alert" className="rounded-xl bg-[#FFF4E8] p-3 text-[10px] text-[#92520C]">{block.error}</p>}
      {localError && <p role="alert" className="rounded-xl bg-[#FFF4E8] p-3 text-[10px] text-[#92520C]">{localError}</p>}
      {block.result ? (
        <div className="rounded-xl border border-[#B8DEC8] bg-[#F0FAF4] p-3">
          <p className="text-[15px] font-black text-[#17613B]">{block.result.score}/100</p>
          <p className="mt-1 text-[10px] leading-5 text-[#3E7056]">{block.result.summary}</p>
        </div>
      ) : (
        <button type="button" className={primary} disabled={!complete || submitting} onClick={() => void submit()}>
          {submitting ? <RefreshCw size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>}
          Valider mes réponses
        </button>
      )}
      <p className="text-[9px] leading-4 text-[#8492A5]">Exercice facultatif d'entraînement. Le score est indicatif et ne constitue ni une certification ni une décision de recrutement.</p>
    </section>
  );
}

function PreparedApplicationBlock({ block, messageId, onSubmitApplication }: {
  block: Extract<JiaWorkspaceBlock, { kind: "prepared-application" }>;
  messageId: string;
  onSubmitApplication: Props["onSubmitApplication"];
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
            onChange={(event) => setLetter(event.target.value)}
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

export default function JiaWorkspaceBlocks({ block, messageId, onPrepareApplication, onNavigate, onSubmitAssessment, onSubmitApplication }: Props) {
  if (block.kind === "offers") return <OffersBlock block={block} onPrepareApplication={onPrepareApplication} onNavigate={onNavigate}/>;
  if (block.kind === "applications") return <ApplicationsBlock block={block}/>;
  if (block.kind === "profile") return <ProfileBlock block={block} onNavigate={onNavigate}/>;
  if (block.kind === "questionnaire") return <QuestionnaireBlock block={block} messageId={messageId} onSubmitAssessment={onSubmitAssessment}/>;
  if (block.kind === "prepared-application") return <PreparedApplicationBlock block={block} messageId={messageId} onSubmitApplication={onSubmitApplication}/>;
  return (
    <section className="mt-3 rounded-2xl border border-[#E3EAF3] bg-white p-3.5">
      <div className="flex items-center gap-2"><GraduationCap size={16} className="text-[#1264EB]"/><p className="text-[11px] font-extrabold text-[#173A6B]">{block.title}</p></div>
      <p className="mt-1 text-[10px] leading-5 text-[#62748B]">{block.message}</p>
      {block.href && <button type="button" className={secondary + " mt-3"} onClick={() => onNavigate(block.href!)}>Ouvrir l'espace Jobly <ArrowUpRight size={13}/></button>}
    </section>
  );
}
