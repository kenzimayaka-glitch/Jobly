"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

export default function AdminSetupPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function activate() {
    setBusy(true); setMessage(""); setSuccess(false);
    try {
      const session = await getSupabaseClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Connectez-vous d'abord à Jobly avec l'adresse e-mail autorisée.");
      const response = await fetch("/api/admin/bootstrap", { method: "POST", headers: { Authorization: "Bearer " + token } });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Activation administrateur impossible.");
      setSuccess(true);
      setMessage(body.message || "Compte administrateur activé.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Activation impossible.");
    } finally { setBusy(false); }
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#F4F7FC] px-5 py-10 text-[#10264A]">
      <section className="w-full max-w-xl rounded-[28px] border border-[#DCE4F0] bg-white p-7 shadow-[0_20px_60px_rgba(16,38,74,.08)] sm:p-9">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#3156A4]">JOBLY · ADMIN 360°</p>
        <h1 className="mt-3 text-2xl font-black">Activation du compte administrateur</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#65748A]">Connectez-vous avec l'adresse e-mail vérifiée définie dans la variable serveur JOBLY_ROOT_ADMIN_EMAIL, puis activez l'accès maître. Aucun rôle administrateur n'est accordé depuis les métadonnées modifiables du profil.</p>
        {message && <p className={"mt-5 rounded-xl p-3 text-sm font-semibold " + (success ? "bg-[#E6F7EF] text-[#126642]" : "bg-[#FFF4E5] text-[#81520B]")}>{message}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={activate} disabled={busy} className="rounded-full bg-[#FFE135] px-5 py-3 text-sm font-black text-[#10264A] disabled:opacity-50">{busy ? "Activation…" : "Activer mon compte ADMIN"}</button>
          {success && <button onClick={() => router.push("/admin")} className="rounded-full bg-[#10264A] px-5 py-3 text-sm font-black text-white">Ouvrir l'administration</button>}
          <button onClick={() => router.push("/")} className="rounded-full border border-[#DCE4F0] px-5 py-3 text-sm font-bold text-[#52627B]">Retour à Jobly</button>
        </div>
      </section>
    </main>
  );
}
