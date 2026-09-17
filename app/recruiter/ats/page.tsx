"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import PageHeader from "../../../components/PageHeader";
import BottomNav, { RECRUITER_NAV } from "../../../components/BottomNav";
import DecorativeBackground from "../../../components/DecorativeBackground";
import RecruiterATS, { type RecruiterATSApplication } from "../../../components/RecruiterATS";


export default function RecruiterATSPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [applications, setApplications] = useState<RecruiterATSApplication[]>([]);
  const [filterJob, setFilterJob] = useState<string>("all");
  const [jobs, setJobs] = useState<any[]>([]);

  const load = useCallback(async () => {
    const session = await getSupabaseClient().auth.getSession();
    if (!session.data.session) {
      router.replace("/");
      return;
    }
    const t = session.data.session.access_token;
    setToken(t);
    try {
      const [appsRes, jobsRes] = await Promise.all([
        fetch("/api/recruiter/applications", { headers: { Authorization: `Bearer ${t}` } }),
        fetch("/api/recruiter/jobs", { headers: { Authorization: `Bearer ${t}` } }),
      ]);

      const appsBody = await appsRes.json();
      const jobsBody = await jobsRes.json();

      if (!appsRes.ok) throw new Error(appsBody.message || "Candidatures indisponibles.");
      if (!jobsRes.ok) throw new Error(jobsBody.message || "Offres indisponibles.");

      setApplications(appsBody.applications || []);
      setJobs(jobsBody.jobs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredApps = filterJob === "all" ? applications : applications.filter((a) => a.recruiterJobId === filterJob);

  if (loading) {
    return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Chargement…</main>;
  }

  const stats = {
    total: filteredApps.length,
    todo: filteredApps.filter((a) => a.status === "DISCOVERED").length,
    inProgress: filteredApps.filter((a) => a.status === "SUBMITTED").length,
    interview: filteredApps.filter((a) => ["ACKNOWLEDGED", "INTERVIEW"].includes(a.status)).length,
    hired: filteredApps.filter((a) => a.status === "OFFER").length,
    rejected: filteredApps.filter((a) => a.status === "REJECTED").length,
  };

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-28 text-navy">
      <DecorativeBackground />
      <div className="relative z-10">
        <PageHeader label="Vue Pipeline" eyebrow="ATS" initial="📋" onBack={() => router.push("/recruiter")} />

        <div className="mx-auto w-full max-w-7xl px-5 py-5 sm:px-6">
          <div className="mb-6">
            <h1 className="font-heading text-[26px] font-extrabold leading-tight text-navy">Suivi des Candidatures</h1>
            <p className="mt-1 text-sm text-jobly-gray">Gérez votre pipeline de recrutement en glissé-déposé.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          {/* Filtres */}
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs font-extrabold text-navy">Filtrer par offre :</label>
              <select
                value={filterJob}
                onChange={(e) => setFilterJob(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-navy outline-none focus:border-jobly-blue"
              >
                <option value="all">Toutes les offres ({applications.length})</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} ({applications.filter((a) => a.recruiterJobId === job.id).length})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => load()}
              className="text-xs font-extrabold text-jobly-blue hover:underline"
            >
              ↻ Actualiser
            </button>
          </div>

          {/* Stats Bar */}
          {filteredApps.length > 0 && (
            <div className="mb-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[
                { label: "Total", count: stats.total, color: "bg-slate-100 text-navy" },
                { label: "À faire", count: stats.todo, color: "bg-slate-50" },
                { label: "En cours", count: stats.inProgress, color: "bg-blue-50" },
                { label: "Interview", count: stats.interview, color: "bg-amber-50" },
                { label: "Recruté", count: stats.hired, color: "bg-emerald-50" },
                { label: "Refusé", count: stats.rejected, color: "bg-red-50" },
              ].map((item, idx) => (
                <div key={idx} className={`rounded-xl ${item.color} border border-slate-200 py-3 text-center`}>
                  <p className="text-lg font-extrabold">{item.count}</p>
                  <p className="text-[9px] font-semibold text-jobly-gray">{item.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ATS Component */}
          <RecruiterATS
            applications={filteredApps}
            onStatusChange={async (appId, newStatus) => {
              if (!token) throw new Error("Non authentifié");
              const res = await fetch(`/api/recruiter/applications/${appId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus }),
              });
              const body = await res.json();
              if (!res.ok) throw new Error(body.message || "Erreur de mise à jour");
              // Recharger les candidatures
              await load();
            }}
            isLoading={loading}
          />

          {/* Conseil */}
          <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-blue-50 px-4 py-3.5">
            <span aria-hidden="true" className="mt-0.5 text-jobly-blue">✦</span>
            <p className="text-xs leading-snug text-navy/80">
              <strong className="font-extrabold">Conseil :</strong> Utilisez le glissé-déposé pour déplacer rapidement les candidats entre les statuts. Les changements sont sauvegardés automatiquement.
            </p>
          </div>
        </div>
      </div>
      <BottomNav active="/recruiter/ats" items={RECRUITER_NAV} />
    </main>
  );
}
