"use client";

import { useState, useCallback, useEffect } from "react";

type ApplicationStatus = "DISCOVERED" | "SUBMITTED" | "ACKNOWLEDGED" | "INTERVIEW" | "OFFER" | "REJECTED";

export type RecruiterATSApplication = {
  id: string;
  recruiterJobId: string | null;
  jobTitle: string | null;
  candidateName?: string;
  candidateRole?: string;
  status: ApplicationStatus;
  statusSource: "CANDIDATE" | "RECRUITER";
  proofUrl: string | null;
  viewedAt: string | null;
  interviewAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; icon: string; bgColor: string }> = {
  DISCOVERED: { label: "À faire", color: "text-gray-600", icon: "☐", bgColor: "bg-slate-50" },
  SUBMITTED: { label: "En cours", color: "text-blue-600", icon: "⟳", bgColor: "bg-blue-50" },
  ACKNOWLEDGED: { label: "Vu", color: "text-violet-600", icon: "👁️", bgColor: "bg-violet-50" },
  INTERVIEW: { label: "Interview", color: "text-amber-600", icon: "👥", bgColor: "bg-amber-50" },
  OFFER: { label: "Recruté", color: "text-emerald-600", icon: "✓", bgColor: "bg-emerald-50" },
  REJECTED: { label: "Refusé", color: "text-red-600", icon: "✕", bgColor: "bg-red-50" },
};

const COLUMN_ORDER: ApplicationStatus[] = ["DISCOVERED", "SUBMITTED", "INTERVIEW", "OFFER"];

interface RecruiterATSProps {
  applications: RecruiterATSApplication[];
  onStatusChange?: (appId: string, newStatus: ApplicationStatus) => Promise<void>;
  isLoading?: boolean;
}

export default function RecruiterATS({ applications, onStatusChange, isLoading }: RecruiterATSProps) {
  const [draggedApp, setDraggedApp] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Grouper les candidatures par statut
  const columnsByStatus = useCallback(() => {
    const grouped: Record<ApplicationStatus, RecruiterATSApplication[]> = {
      DISCOVERED: [],
      SUBMITTED: [],
      ACKNOWLEDGED: [],
      INTERVIEW: [],
      OFFER: [],
      REJECTED: [],
    };

    applications.forEach((app) => {
      if (grouped[app.status]) {
        grouped[app.status].push(app);
      }
    });

    return grouped;
  }, [applications]);

  const groupedApps = columnsByStatus();

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, appId: string) => {
    setDraggedApp(appId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStatus: ApplicationStatus) => {
    e.preventDefault();
    if (!draggedApp) return;

    const app = applications.find((a) => a.id === draggedApp);
    if (!app || app.status === targetStatus) {
      setDraggedApp(null);
      return;
    }

    setUpdatingId(draggedApp);
    setError(null);

    try {
      if (onStatusChange) {
        await onStatusChange(draggedApp, targetStatus);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du déplacement");
    } finally {
      setUpdatingId(null);
      setDraggedApp(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedApp(null);
  };

  if (isLoading) {
    return (
      <div className="grid h-96 place-items-center">
        <p className="text-sm font-semibold text-jobly-gray">Chargement du ATS…</p>
      </div>
    );
  }

  const totalApps = applications.length;

  return (
    <section className="w-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-base font-extrabold text-navy flex items-center gap-2">
          <span>📋</span> ATS · Suivi des candidatures
          {totalApps > 0 && <span className="ml-1 text-xs font-normal text-jobly-gray">({totalApps})</span>}
        </h2>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}

      {totalApps === 0 ? (
        <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-[0_8px_20px_rgba(22,37,74,0.06)]">
          <p className="text-sm font-semibold text-navy">Aucune candidature pour l'instant.</p>
          <p className="mt-1 text-xs text-jobly-gray">Les candidatures apparaîtront ici dès réception.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-flex w-full gap-4 pb-4">
            {COLUMN_ORDER.map((status) => {
              const config = STATUS_CONFIG[status];
              const columnApps = groupedApps[status] || [];

              return (
                <div
                  key={status}
                  className="flex min-w-[280px] flex-col rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, status)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config.icon}</span>
                      <div>
                        <p className="text-xs font-extrabold text-navy">{config.label}</p>
                        <p className="text-[10px] font-bold text-jobly-gray">{columnApps.length} candidat{columnApps.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </div>

                  {/* Cards Container */}
                  <div className="space-y-2.5 flex-1 min-h-[200px]">
                    {columnApps.length === 0 ? (
                      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/50 py-6">
                        <p className="text-center text-[10px] text-jobly-gray">Aucun candidat</p>
                      </div>
                    ) : (
                      columnApps.map((app) => (
                        <button
                          key={app.id}
                          draggable={updatingId !== app.id}
                          onDragStart={(e) => handleDragStart(e, app.id)}
                          className={`w-full cursor-move rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:shadow-md text-left ${
                            draggedApp === app.id ? "opacity-50" : ""
                          } ${updatingId === app.id ? "pointer-events-none opacity-60" : ""}`}
                          type="button"
                        >
                          {/* Avatar & Name */}
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-violet-100 text-[10px] font-bold text-navy">
                              {(app.candidateName || "C")
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-extrabold text-navy truncate">{app.candidateName || "Candidat"}</p>
                              <p className="text-[9px] text-jobly-gray truncate">{app.candidateRole || "Poste inconnu"}</p>
                            </div>
                          </div>

                          {/* Job Title */}
                          <p className="mt-2 text-[9px] font-semibold text-navy/70 truncate">{app.jobTitle || "Offre sans titre"}</p>

                          {/* Interview Date */}
                          {app.interviewAt && (
                            <p className="mt-1.5 flex items-center gap-1 text-[9px] text-amber-600 font-bold">
                              <span>📅</span>
                              {new Date(app.interviewAt).toLocaleDateString("fr-FR", {
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          )}

                          {/* Proof Link */}
                          {app.proofUrl && (
                            <a
                              href={app.proofUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold text-jobly-blue hover:underline"
                            >
                              <span>📎</span> Preuve
                            </a>
                          )}

                          {/* Timestamp */}
                          <p className="mt-2 text-[8px] text-jobly-gray">
                            {new Date(app.createdAt).toLocaleDateString("fr-FR")}
                          </p>

                          {updatingId === app.id && (
                            <div className="mt-2 animate-pulse flex items-center gap-1 text-[9px] text-jobly-blue">
                              <span>⟳</span> Mise à jour…
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legend */}
      {totalApps > 0 && (
        <div className="mt-4 rounded-xl bg-blue-50 p-3">
          <p className="text-[10px] font-semibold text-navy">
            💡 <strong>Astuce :</strong> Glissez-déposez les candidats entre les colonnes pour mettre à jour leur statut.
          </p>
        </div>
      )}

      {/* Stats Footer */}
      {totalApps > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
          {COLUMN_ORDER.map((status) => {
            const config = STATUS_CONFIG[status];
            const count = groupedApps[status]?.length || 0;
            return (
              <div key={status} className={`rounded-xl ${config.bgColor} border border-slate-200 p-2.5 text-center`}>
                <p className={`text-lg font-extrabold ${config.color}`}>{count}</p>
                <p className="mt-0.5 text-[9px] font-semibold text-navy">{config.label}</p>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
