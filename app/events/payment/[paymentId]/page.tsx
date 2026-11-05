"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "../../../../lib/supabase";

type PaymentContext = {
  payment:{id:string;amount:number;currency:string;status:string;feature:string};
  event:{id:string;title:string;organizerName:string;status:string};
  purpose:"PUBLICATION"|"FEATURED";
  instructions:string;
  submission:null|{id:string;paymentMethod:string;transactionReference:string;status:string;submittedAt:string;reviewNote:string|null};
  canSubmit:boolean;
};

export default function EventManualPaymentPage(){
  const {paymentId}=useParams<{paymentId:string}>();
  const router=useRouter();
  const [token,setToken]=useState("");
  const [data,setData]=useState<PaymentContext|null>(null);
  const [method,setMethod]=useState("MTN_MOMO");
  const [reference,setReference]=useState("");
  const [notes,setNotes]=useState("");
  const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("Chargement…");

  async function load(){
    const session=await getSupabaseClient().auth.getSession();
    const accessToken=session.data.session?.access_token;
    if(!accessToken){router.replace("/");return;}
    setToken(accessToken);
    const response=await fetch("/api/events/payments/"+paymentId+"/manual",{headers:{Authorization:"Bearer "+accessToken}});
    const payload=await response.json();
    if(!response.ok)throw new Error(payload.message||"Paiement introuvable.");
    setData(payload);
    setMessage("");
  }
  useEffect(()=>{load().catch(e=>setMessage(e instanceof Error?e.message:"Chargement impossible."));},[paymentId]);

  async function submit(e:React.FormEvent){
    e.preventDefault();
    if(!file){setMessage("Ajoutez le reçu de paiement.");return;}
    setBusy(true);setMessage("");
    try{
      const form=new FormData();form.append("file",file);
      const upload=await fetch("/api/events/payments/proof",{method:"POST",headers:{Authorization:"Bearer "+token},body:form});
      const proof=await upload.json();
      if(!upload.ok)throw new Error(proof.message||"Upload du justificatif impossible.");
      const response=await fetch("/api/events/payments/"+paymentId+"/manual",{
        method:"POST",
        headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},
        body:JSON.stringify({paymentMethod:method,transactionReference:reference,proofPath:proof.proofPath,notes})
      });
      const result=await response.json();
      if(!response.ok)throw new Error(result.message||"Transmission impossible.");
      await load();
      setMessage(result.message||"Justificatif transmis à Jobly Finance.");
    }catch(error){
      setMessage(error instanceof Error?error.message:"Transmission impossible.");
    }finally{setBusy(false);}
  }

  return <main className="min-h-screen bg-[#F5F7FB] px-4 py-8 text-[#17212B]">
    <div className="mx-auto max-w-2xl">
      <button onClick={()=>router.back()} className="text-xs font-black text-[#0057B8]">← Retour</button>
      <h1 className="mt-4 text-3xl font-black">Confirmer votre paiement</h1>
      {message&&<p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
      {data&&<div className="mt-6 space-y-4">
        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-[#667085]">{data.purpose==="PUBLICATION"?"Publication d’événement":"Mise en avant · Grand rendez-vous"}</p>
          <h2 className="mt-2 text-xl font-black">{data.event.title}</h2>
          <p className="mt-3 text-2xl font-black">{data.payment.amount.toLocaleString("fr-FR")} {data.payment.currency}</p>
          <p className="mt-1 text-xs text-[#667085]">Référence Jobly : <span className="font-mono font-bold">{data.payment.id}</span></p>
        </section>
        <section className="rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="font-black">Instructions de paiement</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#52627A]">{data.instructions}</p>
          <p className="mt-3 text-xs font-bold text-amber-800">La publication reste en attente jusqu’à la vérification du transfert par Jobly Finance.</p>
        </section>
        {data.submission&&data.submission.status!=="REJECTED"?<section className="rounded-3xl border bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase text-[#667085]">Justificatif transmis</p>
          <p className="mt-2 font-black">{data.submission.status==="SUBMITTED"?"En attente de validation":data.submission.status==="APPROVED"?"Paiement validé":"Paiement rejeté"}</p>
          <p className="mt-1 text-sm text-[#667085]">Référence transfert : {data.submission.transactionReference}</p>
          {data.submission.reviewNote&&<p className="mt-2 text-sm text-red-700">Motif : {data.submission.reviewNote}</p>}
          {data.submission.status==="APPROVED"&&<button onClick={()=>router.push("/events/"+data.event.id)} className="mt-4 rounded-full bg-[#22448B] px-5 py-3 text-xs font-black text-white">Voir l’événement</button>}
        </section>:data.canSubmit?<><section className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900"><b>Un justificatif précédent a été rejeté.</b> {data.submission?.reviewNote||"Vérifiez la référence ou le reçu puis transmettez une nouvelle preuve."}</section><form onSubmit={submit} className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
          <h2 className="font-black">Déposer le justificatif</h2>
          <label className="block text-xs font-bold">Moyen de paiement
            <select value={method} onChange={e=>setMethod(e.target.value)} className="mt-2 w-full rounded-xl border p-3 text-sm">
              <option value="MTN_MOMO">MTN Mobile Money</option>
              <option value="ORANGE_MONEY">Orange Money</option>
              <option value="BANK_TRANSFER">Virement bancaire</option>
              <option value="OTHER">Autre</option>
            </select>
          </label>
          <label className="block text-xs font-bold">Référence de transaction
            <input required minLength={4} maxLength={120} value={reference} onChange={e=>setReference(e.target.value)} className="mt-2 w-full rounded-xl border p-3 text-sm" placeholder="Référence visible sur le reçu"/>
          </label>
          <label className="block text-xs font-bold">Reçu / preuve (image ou PDF, 10 MB max)
            <input required type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" onChange={e=>setFile(e.target.files?.[0]||null)} className="mt-2 w-full text-sm"/>
          </label>
          <label className="block text-xs font-bold">Note facultative
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1000} rows={3} className="mt-2 w-full rounded-xl border p-3 text-sm" placeholder="Information complémentaire"/>
          </label>
          <button disabled={busy} className="w-full rounded-full bg-[#22448B] px-5 py-3.5 text-xs font-black text-white disabled:opacity-50">{busy?"Transmission…":"Envoyer le justificatif"}</button>
        </form></>:<p className="rounded-2xl bg-white p-4 text-sm text-[#52627A]">Ce paiement ne peut plus recevoir de justificatif.</p>}
      </div>}
    </div>
  </main>;
}
