"use client";

// Créée le 13/09/2026 (audit 360°) : l'onglet "Offres" du Bottom Nav Recruiter
// pointait vers cette route qui n'existait pas (404 systématique). Cette page
// reprend la même logique de chargement que le Dashboard Recruiter (/recruiter)
// pour afficher la liste complète des offres, avec accès direct à la création
// et à l'édition d'une offre.

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import PageHeader from "../../../components/PageHeader";
import BottomNav, { RECRUITER_NAV } from "../../../components/BottomNav";
import DecorativeBackground from "../../../components/DecorativeBackground";

type RecruiterJob = {
  id: string;
  title: string;
  companyName: string;
  location: string | null;
  mode: string;
  contract: string;
  status: "draft" | "published" | "closed";
  createdAt: string;
};

type ReceivedApplication = {
  id: string;
  recruiterJobId: string | null;
  status: string;
  viewedAt: string | null;
};

const STATUS_LABEL: Record<RecruiterJob["status"], { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-slate-100 text-jobly-gray" },
  published: { label: "Publiée", className: "bg-emerald-50 text-jobly-green-dark" },
  closed: { label: "Clôturée", className: "bg-red-50 text-red-500" },
};

const FILTERS = ["all", "published", "draft", "closed"] as const;
const FILTER_LABEL: Record<(typeof FILTERS)[number], string> = {
  all: "Toutes",
  published: "Publiées",
  draft: "Brouillons",
  closed: "Clôturées",
};

export default function RecruiterJobsListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<RecruiterJob[]>([]);
  const [applications, setApplications] = useState<ReceivedApplication[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");

  const load = useCallback(async () => {
    const session = await getSupabaseClient().auth.getSession();
    if (!session.data.session) {
      router.replace("/");
      return;
    }
    const token = session.data.session.access_token;
    try {
      const [jobsRes, applicationsRes] = await Promise.all([
        fetch("/api/recruiter/jobs", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/recruiter/applications?markViewed=0", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const jobsBody = await jobsRes.json();
      if (!jobsRes.ok) throw new Error(jobsBody.message || "Offres indisponibles.");
      setJobs(jobsBody.jobs || []);
      if (applicationsRes.ok) {
        const applicationsBody = await applicationsRes.json();
        setApplications(applicationsBody.applications || []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredJobs = filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  if (loading) {
    return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Chargement…</main>;
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-28 text-navy">
      <DecorativeBackground />
      <div className="relative z-10">
        <PageHeader label="Vos offres" eyebrow="RECRUTEUR" initial="R" onBack={() => router.push("/recruiter")} />

        <div className="mx-auto w-full max-w-3xl px-5 py-5 sm:px-6">
          <div className="flex items-baseline justify-between gap-2">
            <h1 className="font-heading text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-navy sm:text-[32px]">Offres</h1>
            <span className="text-xs font-semibold text-jobly-gray">{jobs.length} offre{jobs.length > 1 ? "s" : ""}</span>
          </div>

          {error && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              <span>{error}</span>
              <button type="button" onClick={() => load()} className="shrink-0 font-extrabold underline">
                Réessayer
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => router.push("/recruiter/jobs/new")}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-jobly-blue py-3.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(37,99,235,0.3)] transition-transform active:scale-[0.98]"
          >
            <span aria-hidden="true">+</span> Publier une nouvelle offre
          </button>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-bold shadow-sm transition-colors ${
                  filter === f ? "border-jobly-blue bg-jobly-blue text-white" : "border-slate-200 bg-white text-navy"
                }`}
              >
                {FILTER_LABEL[f]}
              </button>
            ))}
          </div>

          {filteredJobs.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-[0_8px_20px_rgba(22,37,74,0.06)]">
              <p className="text-sm font-semibold text-navy">
                {jobs.length === 0 ? "Aucune offre pour l'instant." : "Aucune offre dans ce filtre."}
              </p>
              <p className="mt-1 text-xs text-jobly-gray">
                {jobs.length === 0
                  ? "Publiez votre première offre pour commencer à recevoir des candidatures."
                  : "Essayez un autre filtre."}
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-2.5">
              {filteredJobs.map((job) => {
                const status = STATUS_LABEL[job.status];
                const jobApplications = applications.filter((a) => a.recruiterJobId === job.id);
                const newCount = jobApplications.filter((a) => !a.viewedAt).length;
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => router.push(`/recruiter/jobs/${job.id}`)}
                    className="flex w-full items-center gap-3.5 rounded-[20px] border border-slate-100 bg-white p-4 text-left shadow-[0_8px_20px_rgba(22,37,74,0.06)] transition-transform active:scale-[0.98]"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-xl" aria-hidden="true">💼</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-navy">{job.title}</span>
                      <span className="block text-xs text-jobly-gray">{[job.contract, job.mode, job.location].filter(Boolean).join(" · ")}</span>
                      {jobApplications.length > 0 && (
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-jobly-blue">
                          {jobApplications.length} candidature{jobApplications.length > 1 ? "s" : ""}
                          {newCount > 0 && <span className="rounded-full bg-jobly-blue px-1.5 py-0.5 text-[9px] font-black text-white">{newCount} nouvelle{newCount > 1 ? "s" : ""}</span>}
                        </span>
                      )}
                    </span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${status.className}`}>{status.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <BottomNav active="/recruiter/jobs" items={RECRUITER_NAV} />
    </main>
  );
}
