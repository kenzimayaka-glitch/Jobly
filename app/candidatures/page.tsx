"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import PageHeader from "../../components/PageHeader";
import BottomNav from "../../components/BottomNav";
import TalentBackground from "../../components/TalentBackground";

// Écran "Candidatures" (Statut.md spec 12.2) — consomme /api/applications (GET/POST)
// et /api/applications/[id] (PATCH côté candidat : preuve, entretien, statut final).

type Application = {
  id: string;
  source: "discovery" | "recruiter";
  status: "DISCOVERED" | "SUBMITTED" | "ACKNOWLEDGED" | "INTERVIEW" | "OFFER" | "REJECTED";
  statusLabel: string;
  statusSource: "CANDIDATE" | "RECRUITER";
  proofUrl: string | null;
  viewedAt: string | null;
  interviewAt: string | null;
  createdAt: string;
  updatedAt: string;
  job: { title: string; location: string | null; contractType: string | null; remoteMode: string | null; companyName: string | null } | null;
};

type Counters = { envoyees: number; vues: number; entretien: number };

const STATUS_STYLE: Record<Application["status"], string> = {
  DISCOVERED: "bg-slate-100 text-jobly-gray",
  SUBMITTED: "bg-blue-50 text-jobly-blue",
  ACKNOWLEDGED: "bg-blue-50 text-jobly-blue",
  INTERVIEW: "bg-[#FFF8D9] text-amber-600",
  OFFER: "bg-blue-50 text-jobly-blue",
  REJECTED: "bg-red-50 text-red-500",
};

export default function CandidaturesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [apps, setApps] = useState<Application[]>([]);
  const [counters, setCounters] = useState<Counters>({ envoyees: 0, vues: 0, entretien: 0 });
  const [openId, setOpenId] = useState<string | null>(null);
  const [proofDraft, setProofDraft] = useState<Record<string, string>>({});
  const [interviewDraft, setInterviewDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async (t: string) => {
    setError(null);
    try {
      const res = await fetch("/api/applications", { headers: { Authorization: `Bearer ${t}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Candidatures indisponibles.");
      setApps(body.applications || []);
      setCounters(body.counters || { envoyees: 0, vues: 0, entretien: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getSupabaseClient()
      .auth.getSession()
      .then(({ data }) => {
        if (!data.session) {
          router.replace("/");
          return;
        }
        setToken(data.session.access_token);
        load(data.session.access_token);
      });
  }, [router, load]);

  async function patch(id: string, payload: Record<string, unknown>) {
    if (!token) return;
    setSavingId(id);
    setNotice(null);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setNotice(body.message || "Mise à jour impossible.");
        return;
      }
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...body.application, statusLabel: a.statusLabel } : a)));
      await load(token);
    } catch {
      setNotice("Erreur réseau, réessaie.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <main className="talent-shell grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Chargement…</main>;
  }

  return (
    <main className="talent-shell relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-28 text-navy">
      <TalentBackground />

      <div className="relative z-10">
        <PageHeader label="Session active" initial="J" theme="talent" />

        <div className="mx-auto w-full max-w-3xl px-5 py-5 sm:px-6">
          <h1 className="font-heading text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-navy sm:text-[32px]">Mes candidatures</h1>
          <p className="mt-1 text-sm text-jobly-gray">Suis l'avancement de tes candidatures envoyées sur JOBLY.</p>

          <section className="mt-5 grid grid-cols-3 gap-2.5">
            {[
              { icon: "📤", value: counters.envoyees, label: "Envoyées" },
              { icon: "👀", value: counters.vues, label: "Vues" },
              { icon: "🎤", value: counters.entretien, label: "Entretien" },
            ].map(({ icon, value, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5 talent-card rounded-2xl border border-slate-100 bg-white py-4 text-center shadow-[0_8px_20px_rgba(22,37,74,0.06)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-base" aria-hidden="true">{icon}</span>
                <strong className="font-heading text-lg font-extrabold text-navy">{value}</strong>
                <span className="text-[10px] font-semibold text-jobly-gray">{label}</span>
              </div>
            ))}
          </section>

          {error && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              <span>{error}</span>
              <button type="button" onClick={() => token && load(token)} className="shrink-0 font-extrabold underline">
                Réessayer
              </button>
            </div>
          )}
          {notice && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-semibold text-jobly-blue">{notice}</div>
          )}

          {!error && apps.length === 0 && (
            <div className="mt-6 flex flex-col items-center gap-3 talent-card rounded-[24px] border border-slate-100 bg-white px-4 py-10 text-center shadow-[0_16px_50px_rgba(22,37,74,0.10)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-jobly-blue text-xl text-white" aria-hidden="true">📭</span>
              <p className="font-heading text-base font-extrabold text-navy">Aucune candidature pour l'instant</p>
              <p className="max-w-xs text-sm text-jobly-gray">Parcours les offres et postule à celles qui te correspondent.</p>
              <button
                type="button"
                onClick={() => router.push("/jobs")}
                className="mt-1 rounded-2xl bg-jobly-blue px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(37,99,235,0.2)]"
              >
                Voir les offres →
              </button>
            </div>
          )}

          <div className="mt-4 space-y-2.5">
            {apps.map((app) => {
              const isOpen = openId === app.id;
              const isSaving = savingId === app.id;
              const canDeclareFinal = ["SUBMITTED", "ACKNOWLEDGED", "INTERVIEW"].includes(app.status) && app.statusSource !== "RECRUITER";
              return (
                <div key={app.id} className="talent-card rounded-[20px] border border-slate-100 bg-white p-4 shadow-[0_8px_20px_rgba(22,37,74,0.06)]">
                  <button type="button" onClick={() => setOpenId(isOpen ? null : app.id)} className="flex w-full items-start gap-3.5 text-left">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl" aria-hidden="true">💼</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="block truncate text-sm font-extrabold text-navy">{app.job?.title || "Offre"}</span>
                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${STATUS_STYLE[app.status]}`}>{app.statusLabel}</span>
                      </div>
                      {app.job?.companyName && <span className="block text-xs font-semibold text-jobly-gray">{app.job.companyName}</span>}
                      <span className="mt-1 block text-xs text-jobly-gray">
                        {[app.job?.contractType, app.job?.remoteMode === "YES" ? "Télétravail" : null, app.job?.location].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                    <span aria-hidden="true" className="mt-1 text-jobly-gray">{isOpen ? "︿" : "﹀"}</span>
                  </button>

                  {isOpen && (
                    <div className="mt-3.5 space-y-3 border-t border-slate-100 pt-3.5">
                      {app.statusSource === "RECRUITER" && (
                        <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-jobly-gray">
                          Le statut de cette candidature a été fixé par le recruteur.
                        </p>
                      )}

                      {app.status === "DISCOVERED" && (
                        <div>
                          <label className="mb-1 block text-xs font-bold text-navy">Lien vers ta preuve de candidature</label>
                          <div className="flex gap-2">
                            <input
                              value={proofDraft[app.id] ?? ""}
                              onChange={(e) => setProofDraft((prev) => ({ ...prev, [app.id]: e.target.value }))}
                              placeholder="https://…"
                              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy outline-none"
                            />
                            <button
                              type="button"
                              disabled={isSaving || !(proofDraft[app.id] || "").trim()}
                              onClick={() => patch(app.id, { proofUrl: proofDraft[app.id] })}
                              className="shrink-0 rounded-xl bg-jobly-blue px-4 text-xs font-extrabold text-white disabled:opacity-50"
                            >
                              Confirmer
                            </button>
                          </div>
                          <p className="mt-1 text-[11px] text-jobly-gray">Sans preuve, ta candidature reste en brouillon (non comptée).</p>
                        </div>
                      )}

                      {["SUBMITTED", "ACKNOWLEDGED"].includes(app.status) && (
                        <div>
                          <label className="mb-1 block text-xs font-bold text-navy">Date d'entretien</label>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={interviewDraft[app.id] ?? ""}
                              onChange={(e) => setInterviewDraft((prev) => ({ ...prev, [app.id]: e.target.value }))}
                              className="h-11 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm text-navy outline-none"
                            />
                            <button
                              type="button"
                              disabled={isSaving || !(interviewDraft[app.id] || "").trim()}
                              onClick={() => patch(app.id, { interviewAt: new Date(interviewDraft[app.id]).toISOString() })}
                              className="shrink-0 rounded-xl bg-jobly-blue px-4 text-xs font-extrabold text-white disabled:opacity-50"
                            >
                              Enregistrer
                            </button>
                          </div>
                        </div>
                      )}

                      {app.interviewAt && (
                        <p className="text-xs text-jobly-gray">
                          Entretien prévu le <strong className="text-navy">{new Date(app.interviewAt).toLocaleDateString("fr-FR")}</strong>
                        </p>
                      )}

                      {canDeclareFinal && (
                        <div>
                          <label className="mb-1 block text-xs font-bold text-navy">Résultat</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => patch(app.id, { status: "OFFER" })}
                              className="flex-1 rounded-xl bg-blue-50 py-2 text-xs font-extrabold text-jobly-blue disabled:opacity-50"
                            >
                              Acceptée
                            </button>
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() => patch(app.id, { status: "REJECTED" })}
                              className="flex-1 rounded-xl bg-red-50 py-2 text-xs font-extrabold text-red-500 disabled:opacity-50"
                            >
                              Refusée
                            </button>
                          </div>
                        </div>
                      )}

                      {app.proofUrl && (
                        <a href={app.proofUrl} target="_blank" rel="noreferrer" className="block text-xs font-bold text-jobly-blue">
                          Voir la preuve jointe →
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BottomNav active="/candidatures" />
    </main>
  );
}
