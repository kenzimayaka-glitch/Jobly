"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Ledger = { id: string; amount?: number | string | null; currency?: string | null; status?: string | null; payment?: { amount?: number | null; currency?: string | null; status?: string | null } | null; provider?: string | null; feature?: string | null; createdAt?: string | null; submittedAt?: string | null; receivedAt?: string | null; occurredAt?: string | null; transactionId?: string | null; processingStatus?: string | null; plan?: string | null; priceAmount?: number | null; priceCurrency?: string | null; transactionType?: string | null; externalReference?: string | null; event?: string | null };
type Source = { available: boolean; total: number | null; items: Ledger[]; reason: string | null };
type Data = { snapshotAt: string; sources: Record<"payments"|"manualProofs"|"smsReceipts"|"subscriptions"|"commissions"|"mobilityTransactions",Source> };

const GROUPS = [
  ["payments","Paiements Jobly","Flux de paiements réels"],
  ["manualProofs","Justificatifs événements","Dossiers de validation manuelle"],
  ["smsReceipts","Mobile Money / SMS","Réception et rapprochement"],
  ["subscriptions","Abonnements","Plans et cycles d'accès"],
  ["commissions","Commissions partenaires","Montants issus des écritures existantes"],
  ["mobilityTransactions","Financements Mobility","Décaissements et remboursements documentés"],
] as const;

function amount(value: unknown, currency?: string | null) {
  if (value === null || value === undefined) return "Montant non renseigné";
  const numeric = Number(value);
  return (Number.isFinite(numeric) ? numeric.toLocaleString("fr-FR") : String(value)) + " " + (currency || "XAF");
}

export default function AdminFinancePage() {
  const [token,setToken]=useState("");
  const [data,setData]=useState<Data|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  const load=useCallback(async(accessToken:string)=>{
    const response=await fetch("/api/admin/finance/overview",{headers:{Authorization:"Bearer "+accessToken},cache:"no-store"});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.message||"Cockpit Finance indisponible.");
    setData(body);
  },[]);

  useEffect(()=>{
    let alive=true;
    (async()=>{
      const session=await getSupabaseClient().auth.getSession();
      const accessToken=session.data.session?.access_token;
      if(!accessToken)throw new Error("Session ADMIN requise.");
      if(!alive)return;setToken(accessToken);
      await load(accessToken);
      if(alive)setLoading(false);
    })().catch(e=>{if(alive){setError(e instanceof Error?e.message:"Chargement impossible.");setLoading(false);}});
    return()=>{alive=false;};
  },[load]);

  if(loading)return <main className="grid min-h-[55dvh] place-items-center text-sm font-bold">Chargement du cockpit Finance…</main>;
  return (
    <main className="min-h-[calc(100dvh-64px)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3156A4]">ADMIN · FINANCE</p><h1 className="mt-2 text-2xl font-black text-[#10264A] sm:text-3xl">Pilotage financier transversal</h1><p className="mt-2 max-w-3xl text-sm text-[#66758D]">Lecture consolidée des mouvements existants. Les totaux ne mélangent pas les devises et aucun paiement sortant n'est déclenché depuis ce tableau.</p></div>
          <button onClick={()=>load(token).catch(e=>setError(e.message))} className="rounded-full border border-[#DCE4F0] bg-white px-4 py-2.5 text-xs font-black">Actualiser</button>
        </header>
        {error&&<p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">{error}</p>}
        <div className="mt-3 text-[10px] text-[#8793A5]">Instantané du {data?.snapshotAt ? new Date(data.snapshotAt).toLocaleString("fr-FR") : "—"}</div>
        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map(([key,label,description])=>{
            const source=data?.sources[key];
            return <article key={key} className="rounded-[20px] border border-[#DCE4F0] bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2"><h2 className="text-sm font-black text-[#10264A]">{label}</h2><span className={"rounded-full px-2.5 py-1 text-[9px] font-black "+(source?.available?"bg-[#E6F7EF] text-[#126642]":"bg-[#FFF1E5] text-[#9B4C13]")}>{source?.available?"SOURCE LUE":"INDISPONIBLE"}</span></div>
              <p className="mt-1 text-[10px] text-[#8290A5]">{description}</p>
              <div className="mt-4 text-2xl font-black tabular-nums text-[#10264A]">{source?.available ? source.total?.toLocaleString("fr-FR") : "—"}</div>
              <p className="mt-1 text-[10px] text-[#8290A5]">{source?.available?"Enregistrements dans la source":"Le système ne transforme pas cette absence en zéro"}</p>
              {!source?.available&&<p className="mt-3 break-words text-[10px] text-[#9B4C13]">{source?.reason||"Source non accessible."}</p>}
            </article>;
          })}
        </section>
        <section className="mt-7">
          <h2 className="text-lg font-black text-[#10264A]">Journaux récents</h2>
          <div className="mt-3 grid gap-4 xl:grid-cols-2">
            {GROUPS.map(([key,label])=>{
              const source=data?.sources[key];
              return <article key={key} className="min-w-0 rounded-[20px] border border-[#DCE4F0] bg-white p-4">
                <h3 className="text-sm font-black">{label}</h3>
                {!source?.available?<p className="mt-3 text-xs text-[#9B4C13]">Non disponible : {source?.reason}</p>:source.items.length===0?<p className="mt-3 text-xs text-[#8290A5]">Aucune écriture dans cette source.</p>:
                  <div className="mt-3 space-y-2">{source.items.slice(0,10).map(item=>{
                    const when=item.submittedAt||item.receivedAt||item.occurredAt||item.createdAt;
                    const value=item.amount??item.priceAmount;
                    const unit=item.currency||item.priceCurrency;
                    return <div key={item.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-[#F5F7FB] p-3">
                      <div className="min-w-0"><p className="break-all text-[10px] font-black text-[#344762]">{item.transactionId||item.externalReference||item.event||item.feature||item.plan||item.provider||item.transactionType||item.id.slice(0,12)}</p><p className="mt-1 text-[9px] text-[#8290A5]">{[item.status,item.payment?.status,item.processingStatus,item.provider].filter(Boolean).join(" · ")}</p><p className="text-[9px] text-[#8290A5]">{when?new Date(when).toLocaleString("fr-FR"):"Date non renseignée"}</p></div>
                      <strong className="shrink-0 text-xs tabular-nums">{value===undefined?"":amount(value,unit)}</strong>
                    </div>;
                  })}</div>}
              </article>;
            })}
          </div>
        </section>
        <section className="mt-7 rounded-2xl border border-[#DCE4F0] bg-[#EDF2FA] p-4">
          <h2 className="text-sm font-black">Outils financiers spécialisés</h2>
          <div className="mt-3 flex flex-wrap gap-2"><a href="/admin/payments/sms" className="rounded-full bg-[#10264A] px-4 py-2.5 text-xs font-black text-white">Mobile Money & appareils</a><a href="/admin/events/payments" className="rounded-full border border-[#D0DAE8] bg-white px-4 py-2.5 text-xs font-black">Justificatifs événements</a><a href="/admin/mobility" className="rounded-full border border-[#D0DAE8] bg-white px-4 py-2.5 text-xs font-black">Financements Mobility</a><a href="/admin/promo-codes" className="rounded-full border border-[#D0DAE8] bg-white px-4 py-2.5 text-xs font-black">Codes Pro & avantages</a></div>
        </section>
      </div>
    </main>
  );
}
