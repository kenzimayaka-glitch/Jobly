"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../../lib/supabase";
import { useRouter } from "next/navigation";
import PageHeader from "../../../../components/PageHeader";
import TalentBackground from "../../../../components/TalentBackground";

export default function OriginalCvViewer() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("CV-Jobly.pdf");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const supabase = getSupabaseClient();
        const { data: sessionData } = await supabase.auth.getSession();
        let token = sessionData.session?.access_token || null;
        if (!token) {
          const refreshed = await supabase.auth.refreshSession();
          token = refreshed.data.session?.access_token || null;
        }
        if (!token) throw new Error("Ta session Jobly n’est plus active. Reconnecte-toi puis réessaie.");

        let response = await fetch("/api/talent/cv/original", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (response.status === 401) {
          const refreshed = await supabase.auth.refreshSession();
          token = refreshed.data.session?.access_token || null;
          if (token) {
            response = await fetch("/api/talent/cv/original", {
              headers: { Authorization: `Bearer ${token}` },
              cache: "no-store",
            });
          }
        }

        const responseData = await response.json().catch(() => ({}));
        if (!response.ok || !responseData.url) throw new Error(responseData.message || "CV original indisponible.");
        if (!active) return;
        setUrl(responseData.url);
        setFileName(responseData.fileName || "CV-Jobly.pdf");
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Impossible d’ouvrir le CV original.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  return (
    <main className="talent-shell relative min-h-[100dvh] bg-[#F7FAFF] text-navy">
      <TalentBackground />
      <div className="relative z-10">
        <PageHeader label="CV original" eyebrow="TALENT" initial="T" onBack={() => router.push("/talent/cvs")} theme="talent" />
        <div className="mx-auto max-w-6xl px-4 py-5">
          <section className="overflow-hidden rounded-[24px] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <h1 className="text-lg font-black">Mon CV original</h1>
                <p className="mt-1 text-xs text-jobly-gray">{fileName} · document importé conservé pour mes candidatures</p>
              </div>
              <div className="flex gap-2">
                {url && <a href={url} target="_blank" rel="noreferrer" className="rounded-xl border border-jobly-blue px-3 py-2 text-xs font-black text-jobly-blue">Ouvrir le PDF</a>}
                <button type="button" onClick={() => router.push("/talent/cvs")} className="rounded-xl bg-jobly-blue px-3 py-2 text-xs font-black text-white">Retour au CV</button>
              </div>
            </div>
            {loading && <div className="grid min-h-[70vh] place-items-center p-8 text-sm font-bold text-jobly-gray">Chargement du CV original…</div>}
            {!loading && message && <div className="grid min-h-[50vh] place-items-center p-8 text-center text-sm font-bold text-red-600">{message}</div>}
            {!loading && !message && url && (
              <div className="bg-slate-100 p-2 md:p-4">
                <iframe
                  title="CV original Jobly"
                  src={url}
                  className="h-[calc(100dvh-190px)] min-h-[620px] w-full rounded-xl border border-slate-200 bg-white"
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
