"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ExternalLink, Sparkles } from "lucide-react";
import { announceExternalApplicationToJia, type ExternalApplicationContext } from "@/lib/jia/external-application";

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
      return parsed.slice(0, 40).map((field) => ({
        label: typeof field?.label === "string" ? field.label.slice(0, 180) : "",
        type: typeof field?.type === "string" ? field.type.slice(0, 40) : "",
        required: field?.required === true,
        options: Array.isArray(field?.options) ? field.options.slice(0, 12).filter((value: unknown): value is string => typeof value === "string").map((value: string) => value.slice(0, 100)) : [],
      })).filter((field) => field.label);
    } catch { return []; }
  }, [search]);
  const [sent, setSent] = useState(false);

  function askJia() {
    const context: ExternalApplicationContext = {
      jobId, source, title, company, targetUrl, sourceUrl, description, formFields: fields,
    };
    announceExternalApplicationToJia(context);
    setSent(true);
  }

  return (
    <main className="min-h-[100dvh] bg-[#F7FAFF] px-4 py-6 text-[#17212B]">
      <section className="mx-auto max-w-xl rounded-[26px] border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF4A8] text-[#22448B]"><Sparkles size={21}/></div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[1.5px] text-[#9B8500]">Jobly Android · Assistance</p>
        <h1 className="mt-2 text-2xl font-black">{title}</h1>
        {company && <p className="mt-1 text-sm font-bold text-[#22448B]">{company}</p>}
        {targetUrl && <a href={targetUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex max-w-full items-center gap-2 break-all text-xs font-bold text-blue-700 underline">{targetUrl}<ExternalLink size={13}/></a>}
        <p className="mt-5 text-sm leading-6 text-slate-600">J’IA a récupéré uniquement les libellés visibles du formulaire. Elle n’a lu ni les réponses déjà saisies, ni les mots de passe, ni les fichiers. Elle peut maintenant t’aider à comprendre les demandes et à préparer tes réponses à partir de ton profil Jobly.</p>
        <div className="mt-5 rounded-2xl bg-[#F7FAFF] p-4">
          <p className="text-[10px] font-black uppercase tracking-[1px] text-slate-400">Champs repérés · {fields.length}</p>
          {fields.length ? (
            <ul className="mt-3 space-y-2">
              {fields.slice(0, 20).map((field, index) => <li key={field.label + "-" + index} className="flex items-start gap-2 text-sm text-slate-700"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FFD60A]"/><span>{field.label}{field.required ? <strong className="ml-1 text-amber-700">· obligatoire</strong> : null}</span></li>)}
            </ul>
          ) : <p className="mt-2 text-xs text-slate-500">Aucun champ visible détecté. Tu peux décrire à J’IA les questions affichées par le promoteur.</p>}
        </div>
        <button type="button" onClick={askJia} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD60A] px-5 py-3 text-sm font-black text-[#17212B]"><Sparkles size={17}/>{sent ? "Renvoyer le contexte à J’IA" : "Demander l’aide de J’IA"}</button>
        {sent && <p role="status" className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700"><CheckCircle2 size={15}/> Contexte transmis au panneau J’IA. Vérifie le prompt avant de l’envoyer.</p>}
        <p className="mt-4 text-xs leading-5 text-slate-400">Le formulaire du promoteur reste ouvert dans Jobly. Utilise le bouton natif « Formulaire » pour y retourner. Tu gardes le contrôle du remplissage et de l’envoi final.</p>
      </section>
    </main>
  );
}

export default function AndroidAssistantPage() {
  return <Suspense fallback={<main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] text-sm font-bold text-slate-500">Préparation de J’IA…</main>}><AndroidAssistantInner/></Suspense>;
}
