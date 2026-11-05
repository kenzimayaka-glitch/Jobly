"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getSupabaseClient } from "@/lib/supabase";

type Submission = {
  id:string; paymentMethod:string; transactionReference:string; proofUrl:string;
  notes:string|null; submittedAt:string;
  payment:{amount:number;currency:string;status:string;feature:string}|null;
  event:{title:string;organizerName:string;city:string;status:string}|null;
  user:{displayName:string|null;email:string|null;phone:string|null}|null;
};

export default function AdminEventManualPayments(){
  const router=useRouter();
  const [token,setToken]=useState("");
  const [items,setItems]=useState<Submission[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState("");

  async function load(accessToken:string){
    const response=await fetch("/api/admin/events/manual-payments",{headers:{Authorization:"Bearer "+accessToken}});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.message||"File des paiements indisponible.");
    setItems(payload.submissions||[]);
  }
  useEffect(()=>{
    (async()=>{
      try{
        const session=await getSupabaseClient().auth.getSession();
        const accessToken=session.data.session?.access_token;
        if(!accessToken){router.replace("/");return;}
        await load(accessToken);setToken(accessToken);setLoading(false);
      }catch(error){setMessage(error instanceof Error?error.message:"Accès impossible.");setLoading(false);}
    })();
  },[router]);

  async function review(item:Submission,decision:"APPROVE"|"REJECT"){
    let reviewNote="";
    if(decision==="REJECT"){
      reviewNote=window.prompt("Motif obligatoire du rejet :")?.trim()||"";
      if(reviewNote.length<4)return;
    }
    setBusy(item.id);setMessage("");
    try{
      const response=await fetch("/api/admin/events/manual-payments/"+item.id+"/review",{
        method:"POST",
        headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
        body:JSON.stringify({decision,reviewNote})
      });
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.message||"Validation impossible.");
      await load(token);
      setMessage(payload.message||"Décision enregistrée.");
    }catch(error){setMessage(error instanceof Error?error.message:"Validation impossible.");}
    finally{setBusy(null);}
  }

  if(loading)return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold">Chargement de la file Finance…</main>;
  return <main className="min-h-[100dvh] bg-[#F7FAFF] text-slate-900">
    <PageHeader eyebrow="ADMIN · FINANCE" label="Justificatifs événements" onBack={()=>router.push("/admin")}/>
    <div className="mx-auto max-w-6xl space-y-5 px-5 py-7">
      <div><h1 className="text-3xl font-black">Paiements manuels à vérifier</h1><p className="mt-2 text-sm text-slate-500">Chaque preuve est privée et accessible ici par lien temporaire. La validation active la publication ou la mise en avant.</p></div>
      {message&&<p className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
      <div className="flex items-center justify-between rounded-2xl bg-white p-4"><b>{items.length} dossier(s) en attente</b><button onClick={()=>load(token).catch(e=>setMessage(e.message))} className="rounded-full border px-4 py-2 text-xs font-bold">Actualiser</button></div>
      {items.map(item=><article key={item.id} className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><span className="text-[10px] font-black uppercase tracking-wide text-blue-700">{item.payment?.feature==="EVENT_FEATURED"?"Grand rendez-vous":"Publication d’événement"}</span><h2 className="mt-1 text-xl font-black">{item.event?.title||"Événement"}</h2><p className="mt-1 text-xs text-slate-500">{item.event?.organizerName} · {item.event?.city||"Ville non précisée"}</p></div>
          <div className="text-right"><div className="text-xl font-black">{Number(item.payment?.amount||0).toLocaleString("fr-FR")} {item.payment?.currency||"XAF"}</div><div className="text-xs text-slate-500">Réf. {item.transactionReference}</div></div>
        </div>
        <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-xs sm:grid-cols-2">
          <span><b>Payeur :</b> {item.user?.displayName||"Compte Jobly"}</span><span><b>Email :</b> {item.user?.email||"—"}</span>
          <span><b>Téléphone :</b> {item.user?.phone||"—"}</span><span><b>Moyen :</b> {item.paymentMethod}</span>
          <span><b>Soumis le :</b> {new Date(item.submittedAt).toLocaleString("fr-FR")}</span>
          <span><b>Référence Jobly :</b> <span className="font-mono">{item.id}</span></span>
        </div>
        {item.notes&&<p className="text-sm text-slate-600">Note : {item.notes}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <a href={item.proofUrl} target="_blank" rel="noreferrer" className="rounded-full border px-4 py-2 text-xs font-bold">Ouvrir le justificatif sécurisé ↗</a>
          <button disabled={busy===item.id} onClick={()=>review(item,"APPROVE")} className="rounded-full bg-emerald-700 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{busy===item.id?"Traitement…":"Valider le paiement"}</button>
          <button disabled={busy===item.id} onClick={()=>review(item,"REJECT")} className="rounded-full border border-red-200 px-5 py-2.5 text-xs font-black text-red-700 disabled:opacity-50">Rejeter</button>
        </div>
      </article>)}
      {!items.length&&<div className="rounded-3xl border bg-white p-8 text-center text-sm text-slate-500">Aucun justificatif en attente.</div>}
    </div>
  </main>;
}
