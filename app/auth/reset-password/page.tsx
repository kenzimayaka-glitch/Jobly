"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "../../../lib/supabase";
import { updatePassword } from "../../../lib/auth";

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let mounted = true;
    let timeout: number | undefined;

    const prepare = async () => {
      try {
        // The recovery link now opens this page directly from Gmail.
        // Accept both Supabase PKCE links (?code=...) and token-hash links
        // (?token_hash=...&type=recovery), then wait for the resulting session.
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type === "recovery" ? "recovery" : "email",
          });
          if (error) throw error;
        }

        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (mounted) setReady(true);
          return;
        }

        timeout = window.setTimeout(async () => {
          const { data: retry } = await supabase.auth.getSession();
          if (mounted) {
            setReady(Boolean(retry.session));
            if (!retry.session) setMessage("Le lien de récupération est invalide ou a expiré. Demande un nouveau lien depuis Jobly.");
          }
        }, 1200);
      } catch {
        if (mounted) setMessage("Le lien de récupération est invalide ou a expiré. Demande un nouveau lien depuis Jobly.");
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted && session) {
        setReady(true);
        setMessage("");
      }
    });

    void prepare();
    return () => {
      mounted = false;
      if (timeout) window.clearTimeout(timeout);
      listener.subscription.unsubscribe();
    };
  }, [searchParams]);

  async function submit() {
    if (password !== confirm) {
      setMessage("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await updatePassword(password);
      setMessage("Mot de passe modifié avec succès.");
      setTimeout(() => window.location.assign("/ecosystem"), 700);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Impossible de modifier le mot de passe.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-[100dvh] w-full bg-white text-[#0A1931]">
      <div className="relative flex min-h-[100dvh] w-full flex-col">
        <header className="z-20 flex h-[84px] shrink-0 items-start px-5 pt-5 sm:px-8">
          <img src="/jobly-logo-reference.jpg" alt="JOBLY — accueil" className="h-auto w-[165px] mix-blend-multiply sm:w-[195px]" />
        </header>

        <section className="container mx-auto flex w-[92%] max-w-[440px] flex-1 flex-col justify-center px-4 py-4">
          <div className="mb-3 flex w-full items-center justify-end">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-[15px]" aria-hidden="true">🔒</div>
          </div>

          <h1 className="mb-1 w-full text-center text-[36px] font-extrabold leading-none tracking-[-0.03em] text-navy">
            Nouveau mot de passe
          </h1>
          <p className="mb-5 w-full text-center text-sm text-jobly-gray">
            Choisis un nouveau mot de passe pour sécuriser ton compte JOBLY.
          </p>

          {!ready ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-[13px] text-slate-600">
              {message || "Vérification sécurisée du lien…"}
            </div>
          ) : (
            <>
              <label className="mb-3 block w-full">
                <span className="mb-1.5 block text-[13px] font-bold text-navy">Nouveau mot de passe</span>
                <div className="flex h-[50px] w-full items-center rounded-2xl border border-slate-300 px-4">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" className="w-full outline-none" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="text-slate-400" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                    {showPassword ? "◉" : "○"}
                  </button>
                </div>
              </label>

              <label className="mb-2 block w-full">
                <span className="mb-1.5 block text-[13px] font-bold text-navy">Confirmer le mot de passe</span>
                <div className="flex h-[50px] w-full items-center rounded-2xl border border-slate-300 px-4">
                  <input type={showConfirm ? "text" : "password"} value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" onKeyDown={e => e.key === "Enter" && submit()} className="w-full outline-none" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-slate-400" aria-label={showConfirm ? "Masquer la confirmation" : "Afficher la confirmation"}>
                    {showConfirm ? "◉" : "○"}
                  </button>
                </div>
              </label>

              <p className="mb-4 text-[11px] leading-[1.35] text-slate-500">
                Minimum 6 caractères avec minuscule, majuscule, chiffre et caractère spécial.
              </p>

              <button type="button" onClick={submit} disabled={busy} className="h-[52px] w-full rounded-2xl bg-[#FFDE00] text-base font-extrabold text-black disabled:opacity-50">
                {busy ? "Enregistrement…" : "Enregistrer le nouveau mot de passe →"}
              </button>

              <button type="button" onClick={() => router.replace("/")} className="mt-4 w-full text-center text-[13px] font-extrabold text-jobly-blue">
                ← Retour à la connexion
              </button>
            </>
          )}

          {message && ready && (
            <p role="status" aria-live="polite" className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-center text-xs text-blue-800">
              {message}
            </p>
          )}
        </section>

        <footer className="shrink-0 px-4 pb-3 text-center">
          <p className="text-[11px] leading-[1.35] text-[#6B7280]">En continuant, vous acceptez nos Conditions et Politique de confidentialité</p>
          <div className="mt-1.5 flex items-center justify-center gap-2 text-[12px] font-medium text-jobly-blue">
            <a href="/legal/terms" className="underline">Conditions</a><span>•</span><a href="/legal/privacy" className="underline">Confidentialité</a>
          </div>
        </footer>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="grid min-h-[100dvh] place-items-center bg-white text-[#0A1931] font-bold">Vérification sécurisée…</main>}>
      <ResetPasswordInner />
    </Suspense>
  );
}