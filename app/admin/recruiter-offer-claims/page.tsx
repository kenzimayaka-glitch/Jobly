"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getSupabaseClient } from "@/lib/supabase";

type Claim = {
  id:string; registeredPhone:string|null; offerPhone:string|null; createdAt:string;
  share?:{jobTitleSnapshot?:string|null;companyNameSnapshot?:string|null}|null;
  job?:{title?:string;location?:string|null}|null;
  recruiter?:{displayName?:string|null;email?:string|null;phone?:string|null;signupPhone?:string|null}|null;
};
export default function RecruiterOfferClaimsAdminPage() {
  const router=useRouter();
  const [token,setToken]=useState("");
  const [claims,setClaims]=useState<Claim[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const load=useCallback(async(access:string)=>{
    const response=await fetch("/api/admin/recruiter-offer-claims",{headers:{Authorization:"Bearer "+access},cache:"no-store"});
    const body=await response.json();
    if(!response.ok)throw new Error(body.message||"File indisponible.");
    setClaims(body.claims||[]);
  },[]);
  useEffect(()=>{
    (async()=>{
      try{
        const session=await getSupabaseClient().auth.getSession();
        const access=session.data.session?.access_token;
        if(!access){router.replace("/");return;}
        await load(access);setToken(access);
      }catch(error){setMessage(error instanceof Error?error.message:"Chargement impossible.");}
      finally{setLoading(false);}
    })();
  },[load,router]);
  async function decide(claim:Claim,decision:"APPROVE"|"REJECT"){
    let reviewNote="";
    if(decision==="APPROVE"){
      reviewNote=window.prompt("Référence ou note de la vérification manuelle (obligatoire) :")?.trim()||"";
      if(reviewNote.length<4)return;
    }else{
      reviewNote=window.prompt("Motif du rejet (obligatoire) :")?.trim()||"";
      if(reviewNote.length<4)return;
    }
    setBusy(claim.id);setMessage("");
    try{
      const response=await fetch("/api/admin/recruiter-offer-claims",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({claimId:claim.id,decision,reviewNote})});
      const body=await response.json();
      if(!response.ok)throw new Error(body.message||"Décision impossible.");
      await load(token);setMessage(body.message||"Décision enregistrée.");
    }catch(error){setMessage(error instanceof Error?error.message:"Décision impossible.");}
    finally{setBusy(null);}
  }
  if(loading)return <main className="grid min-h-[100dvh] place-items-center bg-[#F4F7FC] font-bold">Chargement des réclamations…</main>;
  return <main className="min-h-[100dvh] bg-[#F4F7FC] text-[#10264A]">
    <PageHeader eyebrow="ADMIN · CONTRÔLE" label="Réclamations d'offres recruteur" onBack={()=>router.push("/admin")}/>
    <div className="mx-auto max-w-5xl space-y-5 px-5 py-7">
      <div><h1 className="text-2xl font-black">Vérification manuelle des numéros</h1><p className="mt-2 text-sm text-slate-600">Aucune offre discordante n'est rattachée automatiquement. L'approbation ci-dessous est une décision ADMIN auditée, avec conservation des deux numéros déclarés et de la note de vérification.</p></div>
      {message&&<p role="status" className="rounded-2xl bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
      <div className="rounded-2xl bg-white p-4 font-bold">{claims.length} réclamation(s) en attente</div>
      {claims.map(claim=><article key={claim.id} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div><p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Vérification requise</p><h2 className="mt-1 text-lg font-black">{claim.job?.title||claim.share?.jobTitleSnapshot||"Offre sans titre"}</h2><p className="text-xs text-slate-500">{claim.share?.companyNameSnapshot||"Entreprise"} · {claim.job?.location||"Lieu non précisé"}</p></div>
        <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
          <div><span className="block text-xs text-slate-500">Recruteur</span><b>{claim.recruiter?.displayName||claim.recruiter?.email||"Compte Jobly"}</b></div>
          <div><span className="block text-xs text-slate-500">Téléphone déclaré à l'inscription</span><b>{claim.registeredPhone||"Absent"}</b></div>
          <div><span className="block text-xs text-slate-500">Téléphone de l'offre</span><b>{claim.offerPhone||"Absent"}</b></div>
          <div><span className="block text-xs text-slate-500">Demande créée le</span><b>{new Date(claim.createdAt).toLocaleString("fr-FR")}</b></div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy===claim.id} onClick={()=>decide(claim,"APPROVE")} className="rounded-full bg-emerald-700 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{busy===claim.id?"Traitement…":"Confirmer le rattachement"}</button>
          <button disabled={busy===claim.id} onClick={()=>decide(claim,"REJECT")} className="rounded-full border border-red-200 px-5 py-2.5 text-xs font-black text-red-700 disabled:opacity-50">Rejeter la demande</button>
        </div>
      </article>)}
      {!claims.length&&<div className="rounded-3xl border bg-white p-8 text-center text-sm text-slate-500">Aucune réclamation à traiter.</div>}
    </div>
  </main>;
}
