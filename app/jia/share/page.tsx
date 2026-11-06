"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Sparkles } from "lucide-react";
import { announceExternalApplicationToJia, buildExternalApplicationPrompt } from "@/lib/jia/external-application";

function SharedApplicationInner() {
  const search = useSearchParams();
  const title = search.get("title") || "Page de candidature partagée";
  const text = search.get("text") || "";
  const rawUrl = search.get("url") || "";
  const sourceUrl = useMemo(() => {
    try { const parsed = new URL(rawUrl); return ["http:", "https:"].includes(parsed.protocol) ? parsed.toString() : ""; }
    catch { return ""; }
  }, [rawUrl]);
  const [questions, setQuestions] = useState("");
  useEffect(() => {
    if (!sourceUrl && !text) return;
    const prompt = buildExternalApplicationPrompt({ jobId: "shared-page", source: "external", title, sourceUrl, targetUrl: sourceUrl, description: text });
    announceExternalApplicationToJia({ jobId: "shared-page", source: "external", title, sourceUrl, targetUrl: sourceUrl, description: text, prompt });
  }, [sourceUrl, text, title]);
  function askJia() {
    const description = [text, questions ? "Questions ou champs copiés par le talent :\n" + questions : ""].filter(Boolean).join("\n\n");
    const prompt = buildExternalApplicationPrompt({ jobId: "shared-page", source: "external", title, sourceUrl, targetUrl: sourceUrl, description });
    announceExternalApplicationToJia({ jobId: "shared-page", source: "external", title, sourceUrl, targetUrl: sourceUrl, description, prompt });
  }
  return <main className="min-h-[100dvh] bg-[#F7FAFF] px-4 py-8 text-[#17212B]"><section className="mx-auto max-w-xl rounded-[28px] border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF4A8] text-[#22448B]"><Sparkles size={22}/></div>
    <p className="mt-5 text-[10px] font-black uppercase tracking-[1.5px] text-[#9B8500]">Jobly · Assistance J’IA</p>
    <h1 className="mt-2 text-2xl font-black">{title}</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">La page a été partagée vers Jobly. J’IA peut t’aider à comprendre la procédure et préparer tes réponses. Elle ne soumettra jamais le formulaire à ta place.</p>
    {sourceUrl && <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 break-all text-sm font-bold text-blue-700 underline">{sourceUrl}<ExternalLink size={14}/></a>}
    <label className="mt-6 block text-sm font-extrabold" htmlFor="external-questions">Questions ou champs du formulaire (facultatif)</label>
    <textarea id="external-questions" value={questions} onChange={(event) => setQuestions(event.target.value)} rows={6} placeholder="Copie ici les questions du formulaire externe pour que J’IA prépare des réponses adaptées…" className="mt-2 w-full rounded-2xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-[#22448B]"/>
    <button type="button" onClick={askJia} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD60A] px-5 py-3 text-sm font-black text-[#17212B]"><Sparkles size={17}/> Demander l’aide de J’IA</button>
    <p className="mt-3 text-xs leading-5 text-slate-400">Sur Android, utilise « Partager » depuis le navigateur puis sélectionne Jobly. N’envoie jamais de mot de passe, de code de connexion ou d’information bancaire à J’IA.</p>
  </section></main>;
}
export default function SharedApplicationPage() { return <Suspense fallback={<main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] text-sm font-bold text-slate-500">Chargement de J’IA…</main>}><SharedApplicationInner/></Suspense>; }
