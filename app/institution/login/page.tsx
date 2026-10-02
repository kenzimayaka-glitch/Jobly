"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function InstitutionLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/institution/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Connexion impossible.");
      router.replace("/institution");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible.");
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-[100dvh] grid place-items-center bg-slate-50 px-6">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm border border-slate-200">
        <p className="text-sm font-medium text-[#22448B]">JOBLY · Partenaires institutionnels</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Accéder à votre dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">Utilisez les identifiants remis par votre référent Jobly.</p>
        <label className="mt-6 block text-sm font-medium text-slate-700">Identifiant institutionnel<input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#22448B]" /></label>
        <label className="mt-4 block text-sm font-medium text-slate-700">Mot de passe<input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#22448B]" /></label>
        {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <button disabled={loading} className="mt-6 w-full rounded-xl bg-[#22448B] px-5 py-3 font-medium text-white disabled:opacity-60">{loading ? "Connexion…" : "Ouvrir mon dashboard"}</button>
        <p className="mt-4 text-center text-xs text-slate-500">Pour un nouvel accès ou une réinitialisation, contactez votre référent Jobly.</p>
      </form>
    </main>
  );
}
