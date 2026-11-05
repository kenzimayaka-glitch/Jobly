"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { Button, Card, EmptyState, ErrorState, LoadingState, PageIntro } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";

type Application360 = {
  id: string;
  userId: string;
  candidateName?: string;
  status: string;
  letterText?: string | null;
  assessment?: { atsScore?: number | null; profileCompleteness?: number | null } | null;
  shortlist?: { status?: string | null } | null;
};

export default function Applications360() {
  const router = useRouter();
  const [apps, setApps] = useState<Application360[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      const response = await fetch("/api/recruitment360/applications", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Chargement des candidatures impossible.");
      setApps(payload.applications ?? []);
      setState("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur de chargement.");
      setState("error");
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function action(body: Record<string, unknown>, key: string) {
    setError("");
    setBusy(key);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) {
        router.replace("/");
        return;
      }
      const response = await fetch("/api/recruitment360/applications", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Action impossible.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell role="recruiter" active="/recruiter/applications360" title="Candidatures 360°" eyebrow="RECRUTEMENT 360°" initial="R" width="lg">
      <PageIntro
        eyebrow="LOT 3"
        title="Candidatures & sélection"
        subtitle="ATS, critères, justificatifs, vivier et décisions de présélection."
        actions={<div className="flex flex-wrap gap-2"><Button href="/recruiter">Tableau de bord</Button><Button href="/recruiter/interviews360" variant="ghost">Entretiens</Button><Button href="/recruiter/listings" variant="ghost">Listings officiels</Button></div>}
      />
      {error && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {state === "loading" && <LoadingState />}
      {state === "error" && <ErrorState title={error || "Chargement impossible"} onRetry={load} />}
      {state === "ready" && (apps.length ? (
        <div className="space-y-3">
          {apps.map((application) => {
            const id = application.id;
            const locked = busy !== null;
            return (
              <Card key={id}>
                <div className="flex flex-col gap-3">
                  <div>
                    <h2 className="font-black">{application.candidateName || "Candidat"}</h2>
                    <p className="text-sm text-muted">
                      {application.status} · ATS {application.assessment?.atsScore ?? "—"} · Complétude {application.assessment?.profileCompleteness ?? "—"}%
                      {application.shortlist?.status ? ` · ${application.shortlist.status}` : ""}
                    </p>
                    <p className="mt-1 text-sm">{application.letterText || "Lettre non renseignée."}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={locked} loading={busy === id + ":score"} onClick={() => void action({ action: "score", applicationId: id }, id + ":score")}>Recalculer ATS</Button>
                    <Button size="sm" disabled={locked} loading={busy === id + ":shortlist"} onClick={() => void action({ action: "shortlist", applicationId: id, status: "SHORTLISTED" }, id + ":shortlist")}>Retenir</Button>
                    <Button size="sm" variant="ghost" disabled={locked} loading={busy === id + ":reserve"} onClick={() => void action({ action: "shortlist", applicationId: id, status: "RESERVE" }, id + ":reserve")}>Vivier</Button>
                    <Button size="sm" variant="ghost" disabled={locked} loading={busy === id + ":defer"} onClick={() => void action({ action: "shortlist", applicationId: id, status: "DEFERRED", deferUntil: new Date(Date.now() + 7 * 86400000).toISOString() }, id + ":defer")}>Différer 7 j</Button>
                    <Button size="sm" variant="ghost" disabled={locked} onClick={() => {
                      const reason = window.prompt("Motif du refus (5 caractères minimum)")?.trim() || "";
                      if (reason.length >= 5) void action({ action: "shortlist", applicationId: id, status: "REJECTED", reason }, id + ":reject");
                      else if (reason) setError("Le motif du refus doit contenir au moins 5 caractères.");
                    }}>Refuser</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : <EmptyState title="Aucune candidature à traiter" />)}
    </AppShell>
  );
}
