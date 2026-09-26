"use client";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabase";
import { jobPublicUrl } from "@/lib/site";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import TalentBackground from "@/components/TalentBackground";
import CompanyLogo from "@/components/CompanyLogo";

type Job = Record<string, any>;
function cleanOfferDescription(value: unknown): string {
  if (value == null) return "";

  // Certaines sources renvoient la description comme JSON ou comme HTML complet.
  // On extrait le contenu éditorial avant de l'afficher, jamais le code/source brut.
  let raw = typeof value === "string" ? value.trim() : "";
  if (!raw && typeof value === "object") {
    try { raw = JSON.stringify(value); } catch { raw = ""; }
  }
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      const preferred = ["description", "content", "text", "summary", "details", "responsibilities", "requirements", "profile", "missions", "about", "jobDescription", "job_description"];
      const pick = (node: any, depth = 0): string => {
        if (typeof node === "string") return node.trim();
        if (Array.isArray(node)) return node.map(item => pick(item, depth + 1)).filter(Boolean).join("\n\n");
        if (!node || typeof node !== "object" || depth > 5) return "";
        const direct = preferred.map(key => pick(node[key], depth + 1)).filter(Boolean);
        if (direct.length) return direct.join("\n\n");
        return Object.values(node).map(value => pick(value, depth + 1)).filter(Boolean).join("\n\n");
      };
      const extracted = pick(parsed);
      if (extracted) raw = extracted;
    } catch {}
  }

  // Certaines sources sérialisent l'offre sous forme de JSON/JS dans description.
  // On extrait le texte éditorial au lieu d'afficher le payload technique.
  if (/^\s*(?:const|let|var|export|import|function|class)\b|^\s*[[{]/i.test(raw)) {
    const quoted = raw.match(/"(?:description|content|text|summary|details|responsibilities|requirements|profile|missions)"\s*:\s*"([\\s\\S]*?)"/i);
    if (quoted?.[1]) {
      try { raw = JSON.parse('"'+quoted[1].replace(/"/g, '\\\"')+'"'); } catch { raw = quoted[1]; }
    }
  }

  let text = raw
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>(?=.)/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/```(?:[a-zA-Z0-9_-]+)?/g, "")
    .replace(/```/g, "")
    .trim();

  // Répare les séquences UTF-8 mal décodées (ex. « Ã© », « â€™ ») sans toucher au français normal.
  if (/[ÃÂâ][\x80-\xBF\x20-\x7E]/.test(text) && [...text].every(ch => ch.charCodeAt(0) <= 255)) {
    try {
      const bytes = new Uint8Array([...text].map(ch => ch.charCodeAt(0)));
      const repaired = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      if (repaired && repaired !== text) text = repaired;
    } catch {}
  }

  return text
    .replace(/^[•\-–—]\s*/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(new RegExp(String.fromCharCode(96) + "{3}", "g"), "")
    .trim();
}

function JobDetailInner() {
  const router=useRouter(), params=useParams<{id:string}>(), search=useSearchParams(), source=search.get("source");
  const [job,setJob]=useState<Job|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
  useEffect(()=>{if(!params.id||(source!=="discovery"&&source!=="recruiter")){setError("Lien d'offre invalide.");setLoading(false);return;} fetch(`/api/jobs/${encodeURIComponent(params.id)}?source=${encodeURIComponent(source)}`).then(async r=>{const b=await r.json();if(!r.ok)throw Error(b.message||"Offre introuvable.");return b.job}).then(setJob).catch(e=>setError(e instanceof Error?e.message:"Offre introuvable.")).finally(()=>setLoading(false));},[params.id,source]);
  function whatsappPhone(profile:any){const values=Array.isArray(profile?.phoneNumbers)?profile.phoneNumbers:typeof profile?.phone==="string"?[profile.phone]:[];const raw=values.find((v:any)=>/237|^6|^2/.test(String(v)))||values[0];if(!raw)return null;let digits=String(raw).replace(/[^0-9]/g,"");if(digits.startsWith("237"))return digits;if(digits.startsWith("6")&&digits.length===9)return "237"+digits;if(digits.startsWith("2")&&digits.length===9)return "237"+digits;return null;}
  async function openWhatsApp(){const phone=whatsappPhone(job?.applicationProfile);if(!phone)return;try{const s=await getSupabaseClient().auth.getSession();if(!s.data.session){sessionStorage.setItem("jobly:after-login", "/jobs/"+params.id+"?source="+source);router.push("/");return;}const r=await fetch("/api/cv-share",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.data.session.access_token},body:JSON.stringify({source,jobId:params.id})});const b=await r.json();if(!r.ok)throw Error(b.message||"Impossible de préparer le CV.");const cvUrl=window.location.origin+"/cv/share/"+b.token;const message="Bonjour, je suis "+b.candidateName+". Je souhaite vous soumettre ma candidature au poste de "+(job?.title||"ce poste")+(company?" chez "+company:"")+".\n\n📄 CV "+b.candidateName+" — Candidature "+(company||job?.title||"ce poste")+"\n"+cvUrl;window.open("https://wa.me/"+phone+"?text="+encodeURIComponent(message),"_blank","noopener,noreferrer");}catch(e){alert(e instanceof Error?e.message:"Impossible d'ouvrir WhatsApp.");}}
  async function apply(){if(busy)return;setBusy(true);try{const s=await getSupabaseClient().auth.getSession();if(!s.data.session){sessionStorage.setItem("jobly:after-login", `/jobs/${params.id}?source=${source}`);router.push("/");return;}const r=await fetch("/api/applications",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s.data.session.access_token}`},body:JSON.stringify({source,jobId:params.id})});const b=await r.json();if(r.status===409){alert("Tu as déjà postulé à cette offre.");return;}if(!r.ok)throw Error(b.message||"Impossible d'enregistrer la candidature.");alert("Candidature enregistrée. Tu peux la compléter dans Mes candidatures.");}catch(e){alert(e instanceof Error?e.message:"Erreur réseau.");}finally{setBusy(false)}}
  if(loading)return <main className="talent-shell grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Chargement…</main>;
  if(error||!job)return <main className="talent-shell min-h-[100dvh] bg-[#F7FAFF] text-navy"><PageHeader label="Offre" onBack={()=>router.replace("/jobs")} theme="talent"/><div className="mx-auto mt-8 max-w-2xl px-5"><div className="talent-card rounded-[24px] bg-white p-6 shadow-sm"><h1 className="text-xl font-black">Offre indisponible</h1><p className="mt-2 text-sm text-slate-500">{error||"Cette offre n'est plus disponible."}</p><button onClick={()=>router.replace("/jobs")} className="mt-5 rounded-2xl bg-jobly-blue px-5 py-3 text-sm font-black text-white">Retour aux offres</button></div></div></main>;
  const company=job.company?.name||job.companyName||"Aucune donnée", phoneComingSoon=job.applicationProfile?.channel==="WHATSAPP_PHONE", contract=job.contractType||job.contract, remote=job.remoteMode==="YES"?"Télétravail":job.remoteMode==="PARTIAL"?"Hybride":job.remoteMode==="NO"?"Présentiel":null;
  const deadline=job.deadline?new Date(job.deadline).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):null;
  const tags:string[]=Array.isArray(job.tags)?job.tags:[];
  const cleanDescription=cleanOfferDescription(job.description);
  return <main className="talent-shell relative min-h-[100dvh] bg-[#F7FAFF] pb-28 text-navy"><TalentBackground/><div className="relative z-10"><PageHeader label="Détail de l'offre" onBack={()=>router.replace("/jobs")} theme="talent"/><div className="mx-auto max-w-3xl px-5 py-6"><section className="rounded-[28px] bg-white p-6 shadow-sm"><div className="flex items-start gap-4"><CompanyLogo companyName={company} logoUrl={job.company?.logoUrl} domain={job.company?.domain} website={job.company?.website} size={56} /><div className="min-w-0"><h1 className="text-2xl font-black">{job.title}</h1><p className="mt-1 font-bold text-jobly-blue">{company}</p><p className="mt-2 text-xs text-slate-500">{[job.location,contract,remote].filter(Boolean).join(" · ")}</p></div></div>
    <div className="mt-5 flex flex-wrap gap-2">{job.minExperienceYears!=null&&<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{job.minExperienceYears} an{job.minExperienceYears>1?"s":""} min.</span>}{job.sector&&<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{job.sector}</span>}{deadline&&<span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">Candidatures jusqu'au {deadline}</span>}{tags.map((t)=><span key={t} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-jobly-blue">{t}</span>)}</div>
    {phoneComingSoon&&<div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-black text-amber-900">Candidater via WhatsApp</p><p className="mt-1 text-sm leading-5 text-amber-800">Jobly prépare votre message et génère un lien CV partageable. Vous vérifiez puis appuyez sur Envoyer dans WhatsApp.</p></div>}{cleanDescription&&<div className="mt-7 rounded-2xl border border-slate-100 bg-white p-1"><h2 className="px-3 pt-3 text-base font-black">Description du poste</h2><div className="mt-2 space-y-3 px-3 pb-3 text-sm leading-6 text-slate-600">{cleanDescription.split(/\n\s*\n/).map((paragraph:string,index:number)=><p key={index}>{paragraph.split("\n").map((line:string,lineIndex:number)=>{const bullet=/^•\s*/.test(line);return <span key={lineIndex} className={bullet?"block pl-4 -indent-4":"block"}>{bullet?"• ":""}{bullet?line.replace(/^•\s*/,""):line}</span>;})}</p>)}</div></div>}
    {(job.salary||job.salaryMin!=null)&&<p className="mt-5 text-sm font-bold">Rémunération : {job.salary||`${job.salaryMin??""}${job.salaryMax!=null?` – ${job.salaryMax}`:""} ${job.salaryCurrency||"XAF"}`}</p>}
    {job.company?.description&&<div className="mt-7 rounded-2xl bg-slate-50 p-4"><h2 className="text-sm font-black">À propos de {company}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{job.company.description}</p>{job.company?.website&&<a href={job.company.website.startsWith("http")?job.company.website:`https://${job.company.website}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-jobly-blue underline">Site de l'entreprise</a>}</div>}
    <button type="button" onClick={()=>router.push("/cv?mode=adapt&jobId="+encodeURIComponent(params.id)+"&source="+encodeURIComponent(source||""))} className="mt-3 w-full rounded-2xl border border-[#FFE135] bg-[#FFFBE0] py-3.5 text-sm font-black text-[#2E3F4F]">Adapter votre CV pour cette candidature</button><button disabled={busy||phoneComingSoon} onClick={phoneComingSoon?openWhatsApp:apply} className="mt-2 w-full rounded-2xl bg-jobly-blue py-3.5 text-sm font-black text-white disabled:opacity-50">{phoneComingSoon?<><MessageCircle size={17} className="mr-2 inline"/>Candidater via WhatsApp</>:"J'ai postulé"}</button><button onClick={()=>navigator.clipboard?.writeText(jobPublicUrl(params.id,source||undefined))} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black">Copier le lien de l'offre</button></section></div></div><BottomNav active="/jobs"/></main>;
}
export default function JobDetailPage() {
  return <Suspense fallback={<main className="talent-shell grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Chargement…</main>}><JobDetailInner/></Suspense>;
}
