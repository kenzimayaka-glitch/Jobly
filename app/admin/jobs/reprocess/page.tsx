"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Result = {
  ok?: boolean;
  processed?: number;
  updated?: number;
  skipped?: number;
  deactivated?: number;
  message?: string;
};

export default function JobsReprocessPage() {
  const [status, setStatus] = useState("Préparation de la réindexation…");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const supabase = getSupabaseClient();

        let session = (await supabase.auth.getSession()).data.session;

        // La restauration de session peut être asynchrone depuis le stockage
        // du navigateur. On attend l'événement d'authentification avant
        // d'afficher à tort "Connectez-vous".
        if (!session) {
          if (!cancelled) setStatus("Restauration de votre session Jobly…");

          session = await new Promise<typeof session>((resolve) => {
            let settled = false;
            let timer: number | undefined;
            let subscription: { unsubscribe: () => void } | null = null;

            const finish = (value: typeof session) => {
              if (settled) return;
              settled = true;
              if (timer !== undefined) window.clearTimeout(timer);
              subscription?.unsubscribe();
              resolve(value);
            };

            const listener = supabase.auth.onAuthStateChange((_event, nextSession) => {
              if (nextSession) finish(nextSession);
            });
            subscription = listener.data.subscription;

            timer = window.setTimeout(async () => {
              const refreshed = await supabase.auth.refreshSession();
              finish(refreshed.data.session ?? null);
            }, 1500);
          });
        }

        if (!session?.access_token) {
          if (!cancelled) setStatus("Session Jobly introuvable. Ouvrez cette page dans le même navigateur où vous êtes connecté à Jobly, puis rechargez.");
          return;
        }

        if (!cancelled) setStatus("Réindexation complète en cours…");

        const response = await fetch("/api/jobs/ingest/sources?mode=reprocess-all", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          cache: "no-store",
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message || `Erreur HTTP ${response.status}`);
        }

        if (!cancelled) {
          setResult(payload);
          setStatus("Réindexation complète terminée.");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : "La réindexation a échoué.");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
          JOBLY · Maintenance offres
        </p>
        <h1 className="text-2xl font-bold">Réindexation des offres</h1>
        <p className="mt-3 text-slate-600">{status}</p>

        {result && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Traitées" value={result.processed ?? 0} />
            <Stat label="Mises à jour" value={result.updated ?? 0} />
            <Stat label="Ignorées" value={result.skipped ?? 0} />
            <Stat label="Désactivées" value={result.deactivated ?? 0} />
          </div>
        )}

        {result?.message && (
          <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm font-medium">
            {result.message}
          </p>
        )}
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 p-4">
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}
