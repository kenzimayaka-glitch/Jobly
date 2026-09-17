"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getSupabaseClient } from "@/lib/supabase";

type Promo = { id:string; code:string; label:string; sponsorName:string; sponsorType:string; scope:string; planCode:string; maxRedemptions:number; redemptionsCount:number; validFrom:string; expiresAt:string|null; durationDays:number; active:boolean; notes:string|null };

export default function PromoCodesAdmin(){
  const router=useRouter();
  const [token,setToken]=useState(""); const [loading,setLoading]=useState(true); const [items,setItems]=useState<Promo[]>([]); const [created,setCreated]=useState("");
  const [form,setForm]=useState({sponsorName:"",label:"",sponsorType:"INSTITUTION",scope:"TALENT",maxRedemptions:"100",durationDays:"30",notes:""});
  async function load(t:string){ const r=await fetch("/api/admin/promo-codes",{headers:{Authorization:`Bearer ${t}`}}); const b=await r.json(); if(!r.ok) throw new Error(b.message||"Accès refusé"); setItems(b.promoCodes||[]); }
  useEffect(()=>{(async()=>{try{const s=await getSupabaseClient().auth.getSession();if(!s.data.session){router.replace("/");return;}const t=s.data.session.access_token;await load(t);setToken(t);setLoading(false);}catch{router.replace("/ecosystem")}})()},[router]);
  async function create(){setCreated("");const r=await fetch("/api/admin/promo-codes",{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({...form,maxRedemptions:Number(form.maxRedemptions),durationDays:Number(form.durationDays)})});const b=await r.json();if(!r.ok){alert(b.message||"Création impossible");return;}setCreated(b.generatedCode);await load(token);}
  async function toggle(item:Promo){const r=await fetch("/api/admin/promo-codes",{method:"PATCH",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({id:item.id,active:!item.active})});if(r.ok) await load(token);}
  if(loading)return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold">Chargement…</main>;
  return <main className="min-h-[100dvh] bg-[#F7FAFF] text-slate-900"><PageHeader eyebrow="ADMIN" label="Codes Pro JOBLY" onBack={()=>router.push('/admin')}/><div className="mx-auto max-w-6xl px-5 py-6 space-y-6">
    <section className="rounded-3xl bg-white p-5 shadow-sm"><h1 className="text-xl font-black">Générer un accès JOBLY Pro</h1><p className="mt-1 text-sm text-slate-500">Pour FNE, ONT, BIT, partenaires institutionnels, démonstrations investisseurs ou campagnes ciblées.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input className="rounded-xl border p-3" placeholder="Sponsor / organisme" value={form.sponsorName} onChange={e=>setForm({...form,sponsorName:e.target.value})}/>
        <input className="rounded-xl border p-3" placeholder="Libellé" value={form.label} onChange={e=>setForm({...form,label:e.target.value})}/>
        <select className="rounded-xl border p-3" value={form.sponsorType} onChange={e=>setForm({...form,sponsorType:e.target.value})}><option>INSTITUTION</option><option>INVESTOR</option><option>PARTNER</option><option>INTERNAL</option><option>CAMPAIGN</option></select>
        <select className="rounded-xl border p-3" value={form.scope} onChange={e=>setForm({...form,scope:e.target.value})}><option value="TALENT">Talent</option><option value="RECRUITER">Recruiter</option><option value="BOTH">Talent + Recruiter</option></select>
        <input type="number" min="1" className="rounded-xl border p-3" placeholder="Nombre d'utilisations" value={form.maxRedemptions} onChange={e=>setForm({...form,maxRedemptions:e.target.value})}/>
        <input type="number" min="1" className="rounded-xl border p-3" placeholder="Durée (jours)" value={form.durationDays} onChange={e=>setForm({...form,durationDays:e.target.value})}/>
      </div>
      <textarea className="mt-3 w-full rounded-xl border p-3" placeholder="Notes internes" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/>
      <button onClick={create} className="mt-4 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white">Générer le code PRO</button>
      {created && <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><div className="text-xs font-bold uppercase text-emerald-700">Code généré — à copier maintenant</div><div className="mt-1 break-all font-mono text-lg font-black">{created}</div></div>}
    </section>
    <section className="rounded-3xl bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black">Codes existants</h2><span className="text-sm text-slate-500">{items.length} code(s)</span></div><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Code</th><th className="p-3">Sponsor</th><th className="p-3">Profil</th><th className="p-3">Usage</th><th className="p-3">Fin</th><th className="p-3">État</th></tr></thead><tbody>{items.map(x=><tr key={x.id} className="border-b last:border-0"><td className="p-3 font-mono font-bold">{x.code}</td><td className="p-3">{x.sponsorName}</td><td className="p-3">{x.scope}</td><td className="p-3">{x.redemptionsCount}/{x.maxRedemptions}</td><td className="p-3">{x.expiresAt?new Date(x.expiresAt).toLocaleDateString("fr-FR"):"—"}</td><td className="p-3"><button onClick={()=>toggle(x)} className={`rounded-full px-3 py-1 text-xs font-bold ${x.active?"bg-emerald-100 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{x.active?"Actif":"Désactivé"}</button></td></tr>)}</tbody></table></div></section>
  </div></main>;
}
