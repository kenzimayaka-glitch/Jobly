"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithUsernamePassword } from "../../../lib/auth";
import { getSupabaseClient } from "../../../lib/supabase";

export default function PartnerLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function enter() {
    if (!username || !password) return;
    setBusy(true);
    setMessage("");
    try {
      await loginWithUsernamePassword(username, password);
      const s = await getSupabaseClient().auth.getSession();
      const token = s.data.session?.access_token;
      if (!token) throw new Error("Session non créée.");
      const r = await fetch("/api/mobility/partner/me", { headers: { Authorization: `Bearer ${token}` } });
      const body = await r.json().catch(() => ({}));
      if (!r.ok || !body.partner?.code) {
        await getSupabaseClient().auth.signOut();
        throw new Error("Ce compte n'est pas enregistré comme partenaire Mobility.");
      }
      localStorage.setItem("jobly-mobility-partner-type", body.partner.type || "FINANCE");
      router.push("/bons-plans/mobility/partner/dashboard");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Connexion impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-white px-5">
      <div className="w-full max-w-sm rounded-[24px] border p-6 shadow-sm">
        <span className="text-xs font-black text-[#0A3D9C]">JOBLY MOBILITY</span>
        <h1 className="mt-3 text-2xl font-black">Connexion partenaire</h1>
        <p className="mt-1 text-sm text-slate-500">Utilise ton compte Jobly (username + mot de passe).</p>
        <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Username" className="mt-5 w-full rounded-2xl border p-3"/>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" className="mt-3 w-full rounded-2xl border p-3"/>
        {message && <p className="mt-3 text-sm font-bold text-red-600">{message}</p>}
        <button disabled={busy} onClick={enter} className="mt-5 w-full rounded-full bg-[#FFC72C] px-5 py-3 font-black disabled:opacity-50">{busy ? "Connexion…" : "Entrer"}</button>
      </div>
    </main>
  );
}
