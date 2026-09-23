"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabase";
import SubscriptionCard from "./SubscriptionCard";
import JiaPreferences from "./JiaPreferences";

export default function AccountSettings({ ecosystem, backHref, accent = "blue" }: { ecosystem: "TALENT" | "RECRUITER" | "PARTNER"; backHref: string; accent?: "blue" | "yellow" }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [language, setLanguage] = useState("fr");
  const bg = accent === "yellow" ? "bg-[#FFE135] text-navy" : "bg-jobly-blue text-white";

  async function logout() {
    setMessage("Déconnexion…");
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) { setMessage(error.message || "Déconnexion impossible."); return; }
    localStorage.removeItem("jobly:gmail-connection");
    router.replace("/");
  }

  return <div className="space-y-4">
    <section className="rounded-[24px] bg-white p-5 shadow-sm">
      <h2 className="font-heading text-lg font-extrabold">Préférences</h2>
      <label className="mt-4 flex items-center justify-between gap-4 text-sm font-bold"><span>Notifications Jobly</span><button type="button" onClick={()=>setNotifications(v=>!v)} className={`h-7 w-12 rounded-full p-1 ${notifications ? "bg-jobly-blue" : "bg-slate-200"}`}><span className={`block h-5 w-5 rounded-full bg-white transition-transform ${notifications ? "translate-x-5" : ""}`}/></button></label>
      <label className="mt-4 flex items-center justify-between gap-4 text-sm font-bold"><span>Profil privé</span><button type="button" onClick={()=>setPrivateProfile(v=>!v)} className={`h-7 w-12 rounded-full p-1 ${privateProfile ? "bg-jobly-blue" : "bg-slate-200"}`}><span className={`block h-5 w-5 rounded-full bg-white transition-transform ${privateProfile ? "translate-x-5" : ""}`}/></button></label>
      <label className="mt-4 block text-sm font-bold">Langue<select value={language} onChange={e=>setLanguage(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3"><option value="fr">Français</option><option value="en">English</option></select></label>
    </section>
    <JiaPreferences ecosystem={ecosystem} />
    <SubscriptionCard ecosystem={ecosystem} />
    <section className="rounded-[24px] bg-white p-5 shadow-sm">
      <h2 className="font-heading text-lg font-extrabold">Sécurité & confidentialité</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2"><button onClick={()=>router.push("/auth/reset-password")} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold">Changer mon mot de passe</button><button onClick={()=>setMessage("Les données sensibles restent gérées par les contrôles d'accès du compte Jobly.")} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold">Voir mes contrôles</button></div>
    </section>
    <section className="rounded-[24px] border border-red-100 bg-white p-5 shadow-sm">
      <h2 className="font-heading text-lg font-extrabold">Session Jobly</h2><p className="mt-1 text-xs text-jobly-gray">Écosystème actuel : {ecosystem}. La déconnexion ferme la session Jobly.</p>
      <button onClick={logout} className="mt-4 w-full rounded-2xl bg-red-600 py-3 font-black text-white">Se déconnecter de Jobly</button>
      {message && <p className="mt-3 text-xs font-bold text-jobly-gray">{message}</p>}
    </section>
    <button onClick={()=>router.push(backHref)} className={`w-full rounded-2xl py-3.5 font-black ${bg}`}>Retour à mon profil</button>
  </div>;
}
