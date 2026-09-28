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
        const { data, error } = await supabase.auth.getSession();

        if (error || !data.session?.access_token) {
          if (!cancelled) setStatus("Session Jobly introuvable. Connectez-vous puis rechargez cette page.");
          return;
        }

        if (!cancelled) setStatus("Réindexation complète en cours…");

        const response = await fetch("/api/jobs/ingest/sources?mode=reprocess-all", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
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
