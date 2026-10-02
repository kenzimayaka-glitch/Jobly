"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type Result = {
  ok?: boolean;
  processed?: number;
  updated?: number;
  skipped?: number;
  deactivated?: number;
  message?: string;
  hasMore?: boolean;
  nextOffset?: number;
};

type BridgeResponse = {
  type: "JOBLY_SESSION_RESPONSE";
  requestId: string;
  accessToken: string;
  refreshToken: string;
};

export default function JobsReprocessPage() {
  const [status, setStatus] = useState("Préparation de la réindexation…");
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function getSessionAcrossTabs(supabase: ReturnType<typeof getSupabaseClient>) {
      let session = (await supabase.auth.getSession()).data.session;
      if (session) return session;

      if (!cancelled) setStatus("Récupération de votre session Jobly…");

      if ("BroadcastChannel" in window) {
        session = await new Promise<Session | null>((resolve) => {
          const requestId = crypto.randomUUID();
          const channel = new BroadcastChannel("jobly-session-bridge");
          let settled = false;

          const finish = (value: Session | null) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            channel.close();
            resolve(value);
          };

          const onMessage = (event: MessageEvent<BridgeResponse>) => {
            if (
              event.data?.type !== "JOBLY_SESSION_RESPONSE" ||
              event.data.requestId !== requestId
            ) return;

            void supabase.auth
              .setSession({
                access_token: event.data.accessToken,
                refresh_token: event.data.refreshToken,
              })
              .then(({ data }) => finish(data.session ?? null))
              .catch(() => finish(null));
          };

          channel.addEventListener("message", onMessage);
          channel.postMessage({ type: "JOBLY_SESSION_REQUEST", requestId });

          const timer = window.setTimeout(() => finish(null), 3000);
        });
      }

      if (session) return session;

      const refreshed = await supabase.auth.refreshSession();
      return refreshed.data.session ?? null;
    }

    async function run() {
      try {
        const supabase = getSupabaseClient();
        const session = await getSessionAcrossTabs(supabase);

        if (!session?.access_token) {
          if (!cancelled) {
            setStatus("Session Jobly introuvable. Gardez Jobly ouvert dans un autre onglet du même navigateur, puis rechargez cette page.");
          }
          return;
        }

        let offset = 0;
        let totalProcessed = 0;
        let totalUpdated = 0;
        let totalSkipped = 0;
        let totalDeactivated = 0;

        while (!cancelled) {
          if (!cancelled) {
            setStatus(
              offset === 0
                ? "Réindexation complète en cours…"
                : `Réindexation en cours… ${totalProcessed} offres déjà traitées`,
            );
          }

          const response = await fetch(
            `/api/jobs/ingest/sources?mode=reprocess-all&limit=10&offset=${offset}`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${session.access_token}` },
              cache: "no-store",
            },
          );

          const payload = await response.json().catch(() => ({}));
          if (!response.ok) {
            throw new Error(payload?.message || `Erreur HTTP ${response.status}`);
          }

          totalProcessed += Number(payload?.processed || 0);
          totalUpdated += Number(payload?.updated || 0);
          totalSkipped += Number(payload?.skipped || 0);
          totalDeactivated += Number(payload?.deactivated || 0);

          if (!cancelled) {
            setResult({
              ...payload,
              processed: totalProcessed,
              updated: totalUpdated,
              skipped: totalSkipped,
              deactivated: totalDeactivated,
              hasMore: Boolean(payload?.hasMore),
              nextOffset: Number(payload?.nextOffset || offset),
            });
          }

          if (!payload?.hasMore) break;
          offset = Number(payload?.nextOffset || offset + 10);
        }

        if (!cancelled) {
          setStatus("Réindexation complète terminée.");
          setResult((current) => current ? { ...current, hasMore: false, message: "Réindexation complète terminée." } : current);
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
        <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">JOBLY · Maintenance offres</p>
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
        {result?.message && <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm font-medium">{result.message}</p>}
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
