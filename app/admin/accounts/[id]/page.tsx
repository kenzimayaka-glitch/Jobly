"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Account = {
  id:string; accountType:string; organizationType?:string|null; organizationName?:string|null; website?:string|null;
  city?:string|null; country?:string|null; status:string; createdAt:string;
  user:{email?:string|null;displayName?:string|null;firstName?:string|null;lastName?:string|null;phone?:string|null;role?:string|null;createdAt?:string};
  profile:Record<string,unknown>|null;
};
const label = (key:string) => key.replace(/_/g," ").toLocaleLowerCase("fr-FR").replace(/^\p{L}/u,(letter)=>letter.toLocaleUpperCase("fr-FR"));

export default function ManagedAccountContextPage() {
  const params=useParams<{id:string}>();
  const router=useRouter();
  const [account,setAccount]=useState<Account|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let alive=true;
    (async()=>{
      const session=await getSupabaseClient().auth.getSession();
      const token=session.data.session?.access_token;
      if(!token)throw new Error("Session ADMIN requise.");
      const response=await fetch("/api/admin/accounts/"+encodeURIComponent(params.id),{headers:{Authorization:"Bearer "+token},cache:"no-store"});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.message||"Compte indisponible.");
      if(alive)setAccount(body.account);
    })().catch((e)=>{if(alive)setError(e instanceof Error?e.message:"Chargement impossible.");})
      .finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[params.id]);

  if(loading)return <main className="grid min-h-[60dvh] place-items-center text-sm font-bold">Ouverture du contexte sélectionné…</main>;
  if(error||!account)return <main className="mx-auto max-w-xl p-6"><p className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">{error||"Compte introuvable."}</p><button onClick={()=>router.push("/admin/accounts")} className="mt-4 rounded-full bg-[#10264A] px-4 py-2 text-xs font-black text-white">Retour aux comptes</button></main>;

  const fields=account.profile||{};
  return (
    <main className="min-h-[calc(100dvh-64px)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <button onClick={()=>router.push("/admin/accounts")} className="text-xs font-bold text-[#3156A4]">← Comptes & institutions</button>
        <div className="mt-4 rounded-[26px] border border-[#DCE4F0] bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3156A4]">CONTEXTE DE GESTION · {account.accountType}</p><h1 className="mt-2 break-words text-2xl font-black text-[#10264A] sm:text-3xl">{account.organizationName||account.user.displayName||"Compte Jobly"}</h1><p className="mt-2 break-all text-sm text-[#66758D]">{account.user.email}</p></div>
            <span className="rounded-full bg-[#EDF2FA] px-3 py-1.5 text-[10px] font-black text-[#43536C]">{account.status}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[["Titulaire",[account.user.firstName,account.user.lastName].filter(Boolean).join(" ")||account.user.displayName],["Type",label(account.accountType)],["Catégorie",label(account.organizationType||"—")],["Téléphone",account.user.phone||"—"],["Ville",account.city||"—"],["Pays",account.country||"—"],["Site web",account.website||"—"],["Créé le",new Date(account.createdAt).toLocaleString("fr-FR")]].map(([key,value])=><div key={key} className="rounded-xl bg-[#F5F7FB] p-3"><p className="text-[9px] font-black uppercase tracking-wide text-[#8290A5]">{key}</p><p className="mt-1 break-words text-sm font-bold text-[#344762]">{value}</p></div>)}
          </div>
          <div className="mt-5 rounded-2xl border border-[#E8D99B] bg-[#FFF9DF] p-4 text-xs leading-5 text-[#69551D]">
            Vous avez sélectionné ce compte comme contexte de gestion. Votre session reste celle de l'administrateur maître : ce mode ne se connecte pas à la place du titulaire et ne permet pas d'utiliser son mot de passe ni ses privilèges personnels.
          </div>
          <section className="mt-5">
            <h2 className="text-sm font-black text-[#10264A]">Profil métier rattaché</h2>
            {account.accountType==="PARTNER" ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[#DCE4F0] p-3"><p className="text-[9px] font-black uppercase text-[#8290A5]">KYC partenaire</p><p className="mt-1 text-sm font-bold">{String(fields.kycStatus||"PENDING")}</p></div>
                <div className="rounded-xl border border-[#DCE4F0] p-3"><p className="text-[9px] font-black uppercase text-[#8290A5]">Code de parrainage</p><p className="mt-1 break-all text-sm font-bold">{String(fields.referralCode||"—")}</p></div>
                <div className="rounded-xl border border-[#DCE4F0] p-3 sm:col-span-2"><p className="text-[9px] font-black uppercase text-[#8290A5]">Espaces partenaires spécialisés</p><div className="mt-2 flex flex-wrap gap-2">{(Array.isArray(fields.partnerSpaces)?fields.partnerSpaces:[]).map((space:any)=><span key={space.code} className="rounded-full bg-[#EDF2FA] px-3 py-1.5 text-xs font-bold">{label(space.type)} · {space.code}</span>)}</div></div>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(fields).map(([key,value])=><div key={key} className="min-w-0 rounded-xl border border-[#DCE4F0] p-3"><p className="text-[9px] font-black uppercase text-[#8290A5]">{label(key)}</p><p className="mt-1 break-words text-sm font-bold text-[#344762]">{Array.isArray(value)?value.join(", "):String(value??"—")}</p></div>)}{!Object.keys(fields).length&&<p className="text-xs text-[#8290A5]">Profil métier en attente de complétion par son titulaire.</p>}</div>
            )}
          </section>
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><button onClick={()=>router.push("/admin/accounts")} className="rounded-full border border-[#DCE4F0] bg-white px-5 py-3 text-xs font-black text-[#43536C]">Changer de compte</button><button onClick={()=>router.push("/admin")} className="rounded-full bg-[#10264A] px-5 py-3 text-xs font-black text-white">Retour au compte ADMIN maître</button></div>
      </div>
    </main>
  );
}
