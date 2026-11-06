"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ExternalLink, ShieldCheck, Sparkles } from "lucide-react";
import {
  announceExternalApplicationToJia,
  type ExternalApplicationContext,
} from "@/lib/jia/external-application";
import {
  applyExternalFormAnswersInAndroid,
  isJoblyAndroidShellAvailable,
  type AndroidExternalFormAnswer,
} from "@/lib/jia/android-bridge";

type FormField = NonNullable<ExternalApplicationContext["formFields"]>[number];

function AndroidAssistantInner() {
  const search = useSearchParams();
  const title = search.get("title") || "Candidature externe";
  const company = search.get("company") || "";
  const jobId = search.get("jobId") || "android-external";
  const source = search.get("source") || "external";
  const targetUrl = useMemo(() => {
    try {
      const parsed = new URL(search.get("targetUrl") || "");
      return parsed.protocol === "https:" ? parsed.toString() : "";
    } catch { return ""; }
  }, [search]);
  const sourceUrl = useMemo(() => {
    try {
      const parsed = new URL(search.get("sourceUrl") || targetUrl);
      return parsed.protocol === "https:" ? parsed.toString() : targetUrl;
    } catch { return targetUrl; }
  }, [search, targetUrl]);
  const description = (search.get("description") || "").slice(0, 3000);
  const fields = useMemo<FormField[]>(() => {
    try {
      const parsed = JSON.parse(search.get("fields") || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.slice(0, 10).map((field, position) => ({
        index: Number.isInteger(field?.index) ? field.index : position,
        label: typeof field?.label === "string" ? field.label.slice(0, 80) : "",
        type: typeof field?.type === "string" ? field.type.slice(0, 20) : "",
        required: field?.required === true,
        options: Array.isArray(field?.options)
          ? field.options.slice(0, 4)
              .filter((value: unknown): value is string => typeof value === "string")
              .map((value: string) => value.slice(0, 80))
          : [],
      })).filter((field) => field.label);
    } catch { return []; }
  }, [search]);
  const [sent, setSent] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [applyStatus, setApplyStatus] = useState("");
  const androidAvailable = isJoblyAndroidShellAvailable();

  function askJia() {
    const context: ExternalApplicationContext = {
      jobId, source, title, company, targetUrl, sourceUrl, description, formFields: fields,
    };
    announceExternalApplicationToJia(context);
    setSent(true);
  }

  function applyReviewedAnswers() {
    const reviewed: AndroidExternalFormAnswer[] = fields
      .map((field, position) => ({
        index: Number.isInteger(field.index) ? Number(field.index) : position,
        label: field.label,
        type: field.type || "text",
        answer: answers[Number.isInteger(field.index) ? Number(field.index) : position] || "",
      }))
      .filter((field) => field.answer.trim().length > 0);

    if (!reviewed.length) {
      setApplyStatus("Ajoute au moins une réponse avant de continuer.");
      return;
    }
    const sentToAndroid = applyExternalFormAnswersInAndroid(reviewed);
    setApplyStatus(sentToAndroid
      ? "Réponses transmises au navigateur intégré. Vérifie les champs sur le site du promoteur."
      : "Cette insertion est disponible uniquement dans l’application Android Jobly.");
  }

  return (
    <main className="min-h-[100dvh] bg-[#F7FAFF] px-4 py-6 text-[#17212B]">
      <section className="mx-auto max-w-xl rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF4A8] text-[#22448B]"><Sparkles size={21}/></div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[1.5px] text-[#9B8500]">Jobly Android · Assistance</p>
        <h1 className="mt-2 text-2xl font-black">{title}</h1>
        {company && <p className="mt-1 text-sm font-bold text-[#22448B]">{company}</p>}
        {targetUrl && <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex max-w-full items-center gap-2 break-all text-xs font-bold text-blue-700 underline">{targetUrl}<ExternalLink size={13}/></a>}

        <p className="mt-5 text-sm leading-6 text-slate-600">
          J’IA peut t’aider à comprendre les questions et à préparer tes réponses à partir des informations disponibles dans ton profil Jobly. Les libellés seulement ont été détectés : aucune réponse déjà saisie n’a été lue.
        </p>

        <div className="mt-5 rounded-2xl bg-[#F7FAFF] p-4">
          <p className="text-[10px] font-black uppercase tracking-[1px] text-slate-400">Champs compatibles repérés · {fields.length}</p>
          {fields.length ? (
            <ul className="mt-3 space-y-2">
              {fields.map((field, index) => <li key={String(field.index) + "-" + index} className="flex items-start gap-2 text-sm text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFD60A]"/><span>{field.label}{field.required ? <strong className="ml-1 text-amber-700">· obligatoire</strong> : null}</span></li>)}
            </ul>
          ) : <p className="mt-2 text-xs text-slate-500">Aucun champ compatible détecté. Tu peux décrire à J’IA les questions affichées par le promoteur.</p>}
        </div>

        <button type="button" onClick={askJia} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD60A] px-5 py-3 text-sm font-black text-[#17212B]"><Sparkles size={17}/>{sent ? "Renvoyer le contexte à J’IA" : "Demander l’aide de J’IA"}</button>
        {sent && <p role="status" className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCircle2 size={15}/> Contexte transmis au panneau J’IA. Demande-lui des propositions, puis vérifie-les ici.</p>}

        <div className="mt-7 border-t border-slate-100 pt-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-[#22448B]" size={19}/>
            <h2 className="text-base font-black">Réponses à valider avant insertion</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Après échange avec J’IA, copie ici les réponses que tu approuves. Le bouton ci-dessous ne remplit que les champs compatibles encore vides et dont le libellé correspond exactement.
          </p>

          {fields.length > 0 && (
            <div className="mt-4 space-y-4">
              {fields.map((field, position) => {
                const index = Number.isInteger(field.index) ? Number(field.index) : position;
                const value = answers[index] || "";
                const canSelect = field.type === "select" && field.options && field.options.length > 0;
                return (
                  <div key={String(index) + "-" + field.label}>
                    <label htmlFor={"jia-answer-" + index} className="mb-1.5 block text-xs font-bold text-slate-700">
                      {field.label}{field.required ? <span className="ml-1 text-amber-700">*</span> : null}
                    </label>
                    {canSelect ? (
                      <select id={"jia-answer-" + index} value={value} onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value }))} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#22448B]">
                        <option value="">Choisir une réponse validée</option>
                        {field.options!.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    ) : (
                      <textarea id={"jia-answer-" + index} value={value} onChange={(event) => setAnswers((current) => ({ ...current, [index]: event.target.value.slice(0, 500) }))} maxLength={500} rows={field.type === "textarea" ? 3 : 2} placeholder="Saisis ou colle ici ta réponse validée…" className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#22448B]"/>
                    )}
                    <p className="mt-1 text-[10px] text-slate-400">{value.length}/500 caractères</p>
                  </div>
                );
              })}
            </div>
          )}

          <button type="button" disabled={!androidAvailable || !fields.length || !Object.values(answers).some((value) => value.trim())} onClick={applyReviewedAnswers} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#22448B] px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
            <CheckCircle2 size={17}/> Appliquer les réponses validées
          </button>
          {applyStatus && <p role="status" className="mt-3 text-xs leading-5 text-slate-600">{applyStatus}</p>}
          {!androidAvailable && <p className="mt-2 text-xs text-amber-700">L’insertion contrôlée est disponible uniquement depuis l’application Android Jobly.</p>}
        </div>

        <p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">
          Sécurité : aucun mot de passe, code de vérification, champ bancaire, consentement ou fichier n’est rempli. Les champs déjà renseignés restent inchangés. Jobly ne clique jamais sur « Envoyer » : tu vérifies et soumets toi-même ta candidature.
        </p>
      </section>
    </main>
  );
}

export default function AndroidAssistantPage() {
  return <Suspense fallback={<main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] text-sm font-bold text-slate-500">Préparation de J’IA…</main>}><AndroidAssistantInner/></Suspense>;
}
