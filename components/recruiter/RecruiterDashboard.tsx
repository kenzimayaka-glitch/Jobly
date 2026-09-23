"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import AppShell from "../ui/AppShell";
import { ApplicationCard, Badge, Button, Card, DashboardCard, EmptyState, ErrorState, LoadingState, PageIntro, Section, StatCard, type BadgeTone } from "../ui";
import PitchReel, { type ReelCandidate } from "./PitchReel";
import { useI18n } from "@/lib/i18n";

type Job = { id: string; title: string; status: "draft" | "published" | "closed"; location: string | null; contract: string | null; createdAt: string };
type Application = ReelCandidate & { status: string; createdAt: string; atsScore: number | null; candidateEmail?: string };
type Profile = { companyName?: string | null; sector?: string | null; website?: string | null; location?: string | null };

const JOB_TONE: Record<Job["status"], BadgeTone> = { draft: "slate", published: "green", closed: "red" };
const ONBOARDING_FLAG = "jobly:recruiter-onboarding-prompted";

const ic = "h-6 w-6";
const svgp = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
const IconAts = <svg {...svgp} className={ic}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M17.5 14v7M14 17.5h7" /></svg>;
const IconStar = <svg {...svgp} className={ic}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z" /></svg>;
const IconMail = <svg {...svgp} className={ic}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
const IconGlobe = <svg {...svgp} className={ic}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>;
const IconBuilding = <svg {...svgp} className={ic}><path d="M4 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M14 9h5a1 1 0 0 1 1 1v11M2 21h20M8 8h2M8 12h2M8 16h2" /></svg>;
const IconGear = <svg {...svgp} className={ic}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>;

export default function RecruiterDashboard() {
  const { t } = useI18n();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) { router.replace("/"); return; }
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [pr, jr, ar] = await Promise.all([
        fetch("/api/recruiter/profile", { headers }),
        fetch("/api/recruiter/jobs", { headers }),
        // Lecture passive : ouvrir le dashboard ne marque plus les candidatures comme « Vues ».
        fetch("/api/recruiter/applications?markViewed=0", { headers }),
      ]);
      if (!jr.ok || !ar.ok) throw new Error("load");
      const prof: Profile | null = pr.ok ? (await pr.json()).profile ?? null : null;
      setProfile(prof);
      setJobs(((await jr.json()).jobs ?? []) as Job[]);
      setApps(((await ar.json()).applications ?? []) as Application[]);
      setStatus("ready");

      // Parcours fermé : profil entreprise incomplet → onboarding, une seule fois par session.
      const incomplete = !prof || !prof.companyName || prof.companyName === "Mon entreprise" || !prof.sector;
      if (incomplete && !sessionStorage.getItem(ONBOARDING_FLAG)) {
        sessionStorage.setItem(ONBOARDING_FLAG, "1");
        router.replace("/recruiter/onboarding");
      }
    } catch {
      setStatus("error");
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  const k = useMemo(() => ({
    published: jobs.filter((j) => j.status === "published").length,
    drafts: jobs.filter((j) => j.status === "draft").length,
    total: apps.length,
    toReview: apps.filter((a) => a.status === "SUBMITTED").length,
    interviews: apps.filter((a) => a.status === "INTERVIEW").length,
    accepted: apps.filter((a) => a.status === "ACCEPTED").length,
  }), [jobs, apps]);

  const profileIncomplete = !profile || !profile.companyName || profile.companyName === "Mon entreprise" || !profile.sector;
  const initial = (profile?.companyName ?? "R").trim().charAt(0).toUpperCase() || "R";

  return (
    <AppShell role="recruiter" active="/recruiter" title={profile?.companyName && profile.companyName !== "Mon entreprise" ? profile.companyName : t("common.recruiter")} eyebrow={t("common.recruiter").toUpperCase()} initial={initial} width="lg">
      <PageIntro eyebrow={t("rdash.eyebrow")} title={t("rdash.title")} subtitle={t("rdash.subtitle")}
        actions={<Button href="/recruiter/jobs/new">{t("rdash.jobs.create")}</Button>} />

      {status === "loading" && <LoadingState />}
      {status === "error" && <ErrorState title={t("rdash.loadError")} onRetry={load} />}

      {status === "ready" && (
        <>
          {profileIncomplete && (
            <Card tone="highlight" className="mt-5">
              <h2 className="text-base font-black text-ink">{t("rdash.onboardingTitle")}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">{t("rdash.onboardingBody")}</p>
              <Button href="/recruiter/onboarding" size="sm" className="mt-3">{t("rdash.onboardingCta")}</Button>
            </Card>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label={t("rdash.kpi.toReview")} value={k.toReview} tone={k.toReview ? "yellow" : "slate"} href="/recruiter/candidatures" />
            <StatCard label={t("rdash.kpi.applications")} value={k.total} tone="blue" href="/recruiter/candidatures" />
            <StatCard label={t("rdash.kpi.interviews")} value={k.interviews} tone="blue" href="/recruiter/ats" />
            <StatCard label={t("rdash.kpi.published")} value={k.published} tone="green" href="/recruiter/jobs" />
            <StatCard label={t("rdash.kpi.drafts")} value={k.drafts} tone="slate" href="/recruiter/jobs" />
            <StatCard label={t("rdash.kpi.accepted")} value={k.accepted} tone="green" href="/recruiter/ats" />
          </div>

          <Section title={t("rdash.actions.title")}>
            <div className="space-y-3">
              {k.toReview > 0 && <DashboardCard accent="yellow" title={t("rdash.actions.review", { n: k.toReview })} description={t("rdash.actions.reviewDesc")} href="/recruiter/candidatures" icon={IconAts} badge={<Badge tone="yellow">{t("common.new")}</Badge>} />}
              {k.drafts > 0 && <DashboardCard title={t("rdash.actions.draft", { n: k.drafts })} description={t("rdash.actions.draftDesc")} href="/recruiter/jobs" icon={IconBuilding} />}
              {jobs.length === 0 && <DashboardCard accent="yellow" title={t("rdash.actions.noJob")} description={t("rdash.actions.noJobDesc")} href="/recruiter/jobs/new" icon={IconBuilding} />}
              {k.toReview === 0 && k.drafts === 0 && jobs.length > 0 && <EmptyState title={t("rdash.actions.allClear")} body={t("rdash.actions.allClearDesc")} />}
            </div>
          </Section>

          <div className="grid gap-x-6 lg:grid-cols-2">
            <Section title={t("rdash.recent.title")} action={apps.length > 4 ? <Button href="/recruiter/candidatures" variant="ghost" size="sm">{t("common.seeAll")}</Button> : undefined}>
              {apps.length ? (
                <ul className="space-y-3">
                  {apps.slice(0, 4).map((a) => (
                    <li key={a.id}><ApplicationCard title={a.candidateName || t("common.candidate")} subtitle={a.jobTitle} status={a.status} date={a.createdAt} avatarUrl={a.profilePhotoUrl} score={a.atsScore} href="/recruiter/candidatures" /></li>
                  ))}
                </ul>
              ) : <EmptyState title={t("rdash.recent.empty")} />}
            </Section>

            <Section title={t("rdash.jobs.title")} action={<Button href="/recruiter/jobs" variant="ghost" size="sm">{t("rdash.jobs.manage")}</Button>}>
              {jobs.length ? (
                <ul className="space-y-3">
                  {jobs.slice(0, 4).map((j) => (
                    <li key={j.id}><DashboardCard title={j.title} description={[j.location, j.contract].filter(Boolean).join(" · ")} href={`/recruiter/jobs/${j.id}`} badge={<Badge tone={JOB_TONE[j.status]}>{t(`rdash.job.${j.status}` as "rdash.job.draft")}</Badge>} /></li>
                  ))}
                </ul>
              ) : <EmptyState title={t("rdash.jobs.empty")} action={<Button href="/recruiter/jobs/new" size="sm">{t("rdash.jobs.create")}</Button>} />}
            </Section>
          </div>

          <Section title={t("rdash.pitch.title")}>
            <p className="-mt-1 mb-3 text-sm text-muted">{t("rdash.pitch.desc")}</p>
            <div className="mx-auto max-w-md"><PitchReel candidates={apps} /></div>
          </Section>

          <Section title={t("rdash.quick.title")}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DashboardCard title={t("rdash.quick.ats")} href="/recruiter/ats" icon={IconAts} />
              <DashboardCard title={t("rdash.quick.talents")} href="/recruiter/talents" icon={IconStar} />
              <DashboardCard title={t("rdash.quick.gmail")} href="/recruiter/candidatures" icon={IconMail} />
              <DashboardCard title={t("rdash.quick.mobility")} href="/recruiter/mobility" icon={IconGlobe} />
              <DashboardCard title={t("rdash.quick.profile")} href="/recruiter/profile" icon={IconBuilding} />
              <DashboardCard title={t("rdash.quick.settings")} href="/recruiter/settings" icon={IconGear} />
            </div>
          </Section>
        </>
      )}
    </AppShell>
  );
}
