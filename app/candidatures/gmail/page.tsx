"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export default function CandidateGmailPage() {
  const [token, setToken] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadStatus(t: string) {
    const response = await fetch("/api/talent/gmail/status", { headers: { Authorization: `Bearer ${t}` } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.message || "Statut Gmail indisponible.");
    setConnected(Boolean(body.connected));
    setEmail(body.email || null);
  }

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(async ({ data }) => {
      const t = data.session?.access_token || null;
      setToken(t);
      if (!t) {
        setLoading(false);
        setMessage("Session Jobly requise.");
        return;
      }
      try {
        await loadStatus(t);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Erreur.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function disconnect() {
    if (!token) return;
    setMessage(null);
    const response = await fetch("/api/talent/gmail/status", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    const body = await response.json();
    if (!response.ok) {
      setMessage(body.message || "Déconnexion impossible.");
      return;
    }
    setConnected(false);
    setEmail(null);
    setMessage("Gmail déconnecté.");
  }

  if (loading) return <main className="min-h-[100dvh] grid place-items-center bg-[#F7FAFF] font-bold text-navy">Chargement…</main>;

  return (
    <main className="min-h-[100dvh] bg-[#F7FAFF] px-5 py-10 text-navy">
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-100 bg-white p-6 shadow-[0_16px_50px_rgba(22,37,74,0.10)]">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-jobly-blue">Candidature automatisée</p>
        <h1 className="mt-2 font-heading text-2xl font-extrabold">Connecter Gmail</h1>
        <p className="mt-2 text-sm leading-6 text-jobly-gray">
          Jobly utilisera uniquement l'autorisation Gmail nécessaire pour envoyer tes candidatures par email. Les jetons OAuth sont chiffrés côté serveur et ne sont jamais affichés dans l'application.
        </p>

        {connected ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-bold text-emerald-700">Gmail connecté</p>
              <p className="mt-1 text-sm font-extrabold text-navy">{email}</p>
            </div>
            <button type="button" onClick={disconnect} className="w-full rounded-2xl border border-slate-200 py-3 text-sm font-extrabold text-navy">Déconnecter Gmail</button>
          </div>
        ) : (
          <a href="/api/talent/gmail/connect" className="mt-6 block rounded-2xl bg-jobly-blue px-5 py-3 text-center text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(37,99,235,0.2)]">
            Connecter mon Gmail →
          </a>
        )}

        {message && <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-jobly-gray">{message}</p>}
      </div>
    </main>
  );
}
