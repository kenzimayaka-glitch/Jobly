"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { refreshGmailConnection } from "@/lib/gmailService";

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/ecosystem";
  return value;
}

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const supabase = getSupabaseClient();
    const next = safeNext(searchParams.get("next"));
    const code = searchParams.get("code");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const gmailRequested = searchParams.get("gmail") === "1";

    async function finishCallback() {
      let unsubscribe: (() => void) | undefined;
      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash) {
          const otpType = type === "recovery" ? "recovery" : "email";
          const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
          if (verifyError) throw verifyError;
        }

        const sessionNow = await supabase.auth.getSession();
        if (sessionNow.data.session) {
          const session = sessionNow.data.session as typeof sessionNow.data.session & {
            provider_token?: string | null;
            provider_refresh_token?: string | null;
          };
          if (gmailRequested && session.provider_token) {
            const gmailRes = await fetch("/api/recruiter/gmail/connect", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({
                email: session.user.email || "",
                accessToken: session.provider_token,
                refreshToken: session.provider_refresh_token || null,
                scopes: ["openid", "email", "profile", "gmail.readonly", "gmail.send"],
              }),
            });
            if (!gmailRes.ok) {
              const body = await gmailRes.json().catch(() => ({}));
              throw new Error(body.message || "La connexion Gmail n'a pas pu être enregistrée.");
            }
            await refreshGmailConnection();
          }
          if (mounted) router.replace(next);
          return;
        }

        await new Promise<void>((resolve, reject) => {
          let settled = false;
          const finish = (fn: () => void) => {
            if (settled) return;
            settled = true;
            unsubscribe?.();
            fn();
          };
          const timeout = window.setTimeout(() => {
            finish(() => reject(new Error("La session de récupération n'a pas pu être créée. Ouvre le lien depuis le même navigateur puis réessaie.")));
          }, 5000);
          const listener = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
              window.clearTimeout(timeout);
              finish(resolve);
            }
          });
          unsubscribe = () => listener.data.subscription.unsubscribe();
        });
        if (mounted) router.replace(next);
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "La vérification n'a pas pu être finalisée.");
      } finally {
        unsubscribe?.();
      }
    }

    finishCallback();
    return () => { mounted = false; };
  }, [router, searchParams]);

  if (error) {
    return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, background: "#F7FAFF", color: "#16254A", fontFamily: "Arial, sans-serif" }}><section style={{ width: "min(100%, 520px)", background: "white", borderRadius: 24, padding: 24, boxShadow: "0 16px 50px rgba(22,37,74,.10)", textAlign: "center" }}><strong>Vérification JOBLY</strong><p>{error}</p><button onClick={() => router.replace("/")} style={{ border: 0, borderRadius: 14, padding: "13px 18px", background: "#2563EB", color: "white", fontWeight: 800 }}>Retour à Jobly</button></section></main>;
  }

  return <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#F7FAFF", color: "#16254A", fontFamily: "Arial, sans-serif", fontWeight: 700 }}>Vérification sécurisée…</main>;
}

export default function AuthCallbackPage() {
  return <Suspense fallback={<main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", background: "#F7FAFF", color: "#16254A", fontFamily: "Arial, sans-serif", fontWeight: 700 }}>Vérification sécurisée…</main>}><AuthCallbackInner /></Suspense>;
}
