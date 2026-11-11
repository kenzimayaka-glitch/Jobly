"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/ui/AppShell";
import { Button, Card, EmptyState, ErrorState, LoadingState, PageIntro } from "@/components/ui";

type CriterionView = {
  label?: string;
  criterion?: string;
  score?: number | null;
  evidence?: string[];
  weight?: number;
  required?: boolean;
};

export default function Applications360() {
  const [apps, setApps] = useState<any[]>([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [scoringId, setScoringId] = useState<string | null>(null);
  const [matchSummaries, setMatchSummaries] = useState<Record<string, any>>({});

  async function load() {
    try {
      setState("loading");
      const response = await fetch("/api/recruitment360/applications", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      setApps(payload.applications ?? []);
      setState("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Erreur");
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  async function action(body: any) {
    setError("");
    if (body.action === "score") setScoringId(body.applicationId);
    try {
      const response = await fetch("/api/recruitment360/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message);
      if (body.action === "score" && payload.matching) {
        setMatchSummaries((current) => ({ ...current, [body.applicationId]: payload.matching }));
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action impossible.");
    } finally {
      setScoringId(null);
    }
  }

  const renderCriteria = (items: CriterionView[], emptyLabel: string) => items.length ? (
    <ul className="mt-2 space-y-1 text-xs">
      {items.map((item, index) => (
        <li key={String(item.criterion || item.label || index)} className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <span>
            <strong>{item.label || item.criterion || "Critère"}</strong>
            {Array.isArray(item.evidence) && item.evidence.length > 0 && (
              <span className="mt-0.5 block text-slate-500">{item.evidence.join(" · ")}</span>
            )}
          </span>
          {typeof item.score === "number" && <span className="font-bold">{Math.round(item.score)}%</span>}
        </li>
      ))}
    </ul>
  ) : <p className="mt-2 text-xs text-slate-500">{emptyLabel}</p>;

  return (
    <AppShell role="recruiter" active="/recruiter/applications360" title="Candidatures 360°" eyebrow="RECRUTEMENT 360°" initial="R" width="lg">
      <PageIntro
        eyebrow="LOT 3"
        title="Candidatures & sélection"
        subtitle="Matching explicable, critères de l'annonce, justificatifs, vivier et décisions de présélection."
        actions={<Button href="/recruiter">Tableau de bord</Button>}
      />
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {state === "loading" && <LoadingState />}
      {state === "error" && <ErrorState title={error} onRetry={load} />}
      {state === "ready" && (apps.length ? (
        <div className="space-y-3">
          {apps.map((application) => {
            const assessment = application.assessment;
            const matched = Array.isArray(assessment?.matchedCriteria) ? assessment.matchedCriteria : [];
            const missing = Array.isArray(assessment?.missingCriteria) ? assessment.missingCriteria : [];
            const summary = matchSummaries[application.id];
            return (
              <Card key={application.id}>
                <div className="flex flex-col gap-3">
                  <div>
                    <h2 className="font-black">{application.candidateName || "Candidat"}</h2>
                    <p className="text-xs text-muted">{application.jobTitle || "Poste"} · {application.companyName || "Entreprise"}</p>
                    <p className="text-sm text-muted">
                      {application.status} · Compatibilité {assessment?.atsScore ?? "—"}% · Profil {assessment?.profileCompleteness ?? "—"}%
                    </p>
                    {summary && (
                      <div className="mt-2 space-y-2 rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                        <p className="text-xs font-bold text-blue-900">Fiabilité : {summary.confidence}% · Couverture : {summary.coverage}% · {summary.algorithm}</p>
                        <p className="text-[10px] text-slate-500">Source CV : {summary.cvEvidence?.status === "PARSED" ? "CV original lu" : summary.cvEvidence?.source === "TAILORED_TEXT_FALLBACK" ? "Texte de CV adapté" : "Profil structuré uniquement"}</p>
                        {summary.matchedSkills?.length > 0 && <div><p className="text-[10px] font-black uppercase text-emerald-700">Compétences démontrées</p><div className="mt-1 flex flex-wrap gap-1">{summary.matchedSkills.map((item: string) => <span key={item} className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] text-emerald-900">{item}</span>)}</div></div>}
                        {summary.missingSkills?.length > 0 && <div><p className="text-[10px] font-black uppercase text-amber-700">Compétences non démontrées</p><div className="mt-1 flex flex-wrap gap-1">{summary.missingSkills.map((item: string) => <span key={item} className="rounded-full bg-amber-100 px-2 py-1 text-[10px] text-amber-900">{item}</span>)}</div></div>}
                        {summary.gaps?.length > 0 && <ul className="list-disc space-y-1 pl-4 text-[11px] text-slate-600">{summary.gaps.map((item: string, index: number) => <li key={index}>{item}</li>)}</ul>}
                      </div>
                    )}
                    <p className="mt-2 whitespace-pre-wrap text-sm">{application.letterText || "Lettre non renseignée."}</p>
                  </div>

                  {assessment && (
                    <div className="grid gap-3 md:grid-cols-2">
                      <section>
                        <h3 className="text-xs font-extrabold uppercase tracking-wide text-emerald-700">Critères démontrés</h3>
                        {renderCriteria(matched, "Aucun critère suffisamment démontré pour le moment.")}
                      </section>
                      <section>
                        <h3 className="text-xs font-extrabold uppercase tracking-wide text-amber-700">Écarts à examiner</h3>
                        {renderCriteria(missing, "Aucun écart détecté dans les informations disponibles.")}
                      </section>
                    </div>
                  )}

                  {Array.isArray(assessment?.missingDocuments) && assessment.missingDocuments.length > 0 && (
                    <p className="text-xs font-semibold text-amber-700">
                      Documents manquants : {assessment.missingDocuments.map((item: any) => item.kind).join(", ")}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={scoringId === application.id} loading={scoringId === application.id} onClick={() => void action({ action: "score", applicationId: application.id })}>
                      Recalculer le matching
                    </Button>
                    <Button size="sm" onClick={() => void action({ action: "shortlist", applicationId: application.id, status: "SHORTLISTED" })}>Retenir</Button>
                    <Button size="sm" variant="ghost" onClick={() => void action({ action: "shortlist", applicationId: application.id, status: "RESERVE" })}>Vivier</Button>
                    <Button size="sm" variant="ghost" onClick={() => void action({ action: "shortlist", applicationId: application.id, status: "DEFERRED", deferUntil: new Date(Date.now() + 7 * 86400000).toISOString() })}>Différer 7 j</Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      const reason = prompt("Motif du refus (5 caractères min.)") || "";
                      if (reason) void action({ action: "shortlist", applicationId: application.id, status: "REJECTED", reason });
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
