"use client";

import { useMemo } from "react";
import AppShell from "../ui/AppShell";
import { Badge, Card, CTASection, DashboardCard, EmptyState, ErrorState, JobCard, JourneyBar, LoadingState, PageIntro, Progress, Section, StatCard, type JourneyStage } from "../ui";
import ScoreRing from "../ScoreRing";
import { useCareerOs, useJobsSample, type CareerOsData, type FeedJob } from "./useCareerOs";
import { useI18n, type DictKey } from "@/lib/i18n";

export type CareerKind = "gps" | "gap" | "readiness" | "radar" | "market" | "campus" | "communities" | "events";

const STAGE: Record<CareerKind, JourneyStage> = {
  gps: "understand", gap: "prepare", readiness: "prepare", radar: "succeed", market: "discover", campus: "discover", communities: "progress", events: "progress",
};
const CTA: Record<CareerKind, { primary: string; secondary: string }> = {
  gps: { primary: "/career-os", secondary: "/candidatures" },
  gap: { primary: "/career-brain", secondary: "/jobs" },
  readiness: { primary: "/career-brain", secondary: "/talent/cvs" },
  radar: { primary: "/opportunities", secondary: "/jobs" },
  market: { primary: "/jobs", secondary: "/opportunity-radar" },
  campus: { primary: "/jobs?q=stage", secondary: "/talent/cvs" },
  communities: { primary: "/notifications", secondary: "/ecosystem?mode=switcher" },
  events: { primary: "/notifications", secondary: "/ecosystem?mode=switcher" },
};
const NEEDS_CAREER: CareerKind[] = ["gps", "gap", "readiness", "radar"];
const NEEDS_JOBS: CareerKind[] = ["radar", "market"];

function tally(values: Array<string | null | undefined>, max = 5) {
  const map = new Map<string, number>();
  for (const v of values) { const k = (v ?? "").trim(); if (k) map.set(k, (map.get(k) ?? 0) + 1); }
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, max);
}

function Bars({ rows }: { rows: [string, number][] }) {
  const top = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <ul className="space-y-2.5">
      {rows.map(([label, n]) => (
        <li key={label}>
          <div className="mb-1 flex justify-between text-xs font-bold"><span className="truncate text-ink">{label}</span><span className="text-muted">{n}</span></div>
          <Progress value={(n / top) * 100} />
        </li>
      ))}
    </ul>
  );
}

function StatsRow({ career }: { career: CareerOsData }) {
  const { t } = useI18n();
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      <StatCard label={t("career.readiness")} value={`${career.readiness}%`} tone="blue" />
      <StatCard label={t("career.gaps")} value={career.gap.length} tone={career.gap.length ? "yellow" : "green"} />
    </div>
  );
}

function ReadinessMessage(score: number): DictKey {
  return score >= 75 ? "career.readiness.high" : score >= 45 ? "career.readiness.mid" : "career.readiness.low";
}

/**
 * Gabarit unique des surfaces « Career » (GPS, Gap, Readiness, Radar, Marché, Campus,
 * Communities, Events) : même coque, même parcours (JourneyBar), même hiérarchie —
 * un contenu propre à chaque surface, alimenté par les données réelles.
 */
export default function CareerSurface({ kind }: { kind: CareerKind }) {
  const { t } = useI18n();
  const career = useCareerOs();
  const feed = useJobsSample(40);
  const needsCareer = NEEDS_CAREER.includes(kind);
  const needsJobs = NEEDS_JOBS.includes(kind);
  const c = career.data;
  const cta = CTA[kind];

  const loading = (needsCareer && career.status === "loading") || (needsJobs && feed.status === "loading");
  const failed = (needsCareer && career.status === "error") || (needsJobs && feed.status === "error");

  const market = useMemo(() => ({
    contracts: tally(feed.jobs.map((j) => j.contractType)),
    cities: tally(feed.jobs.map((j) => j.location?.split(",")[0])),
  }), [feed.jobs]);

  const key = (suffix: string) => `career.${kind}.${suffix}` as DictKey;
  const title = t(key("title"));
  // Communities / Events n’ont pas de backend métier : ils l’affichent honnêtement.
  const comingSoon = kind === "communities" || kind === "events";

  return (
    <AppShell role="talent" active="/career-brain" title={title} eyebrow="JOBLY" backHref="/career-os" avatarUrl={undefined} initial="J">
      <JourneyBar current={STAGE[kind]} className="mb-5" />
      <PageIntro eyebrow={t("career.eyebrow")} title={title} subtitle={t(key("desc"))} />

      {loading ? (
        <LoadingState />
      ) : failed ? (
        <ErrorState title={t("career.loadError")} onRetry={() => { if (needsCareer) void career.reload(); if (needsJobs) void feed.reload(); }} />
      ) : (
        <>
          {/* ── Career GPS ── */}
          {kind === "gps" && c && (
            <>
              <StatsRow career={c} />
              <Card tone="highlight" className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#695500]">{t("career.nextAction")}</span>
                  <Badge tone="blue">L{c.currentLevel} → L{c.targetLevel}</Badge>
                </div>
                <p className="mt-2 text-[17px] font-black leading-6 text-ink">{c.nextBestAction || t("career.defaultNext")}</p>
              </Card>
              <Section title={t("career.os.roadmap")}>
                <Card padded={false} className="divide-y divide-line">
                  {c.roadmap.map((step) => (
                    <div key={step.step} className="flex gap-3 p-4">
                      <span aria-hidden="true" className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${step.done ? "bg-emerald-500 text-white" : "bg-canari-blue-soft text-canari-blue"}`}>{step.done ? "✓" : step.step}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-ink">{step.title}</div>
                        <p className="mt-0.5 text-xs leading-5 text-muted">{step.action}</p>
                      </div>
                    </div>
                  ))}
                </Card>
              </Section>
            </>
          )}

          {/* ── Career Gap ── */}
          {kind === "gap" && c && (
            <>
              <StatsRow career={c} />
              <Section title={t("career.priorities")}>
                {c.gap.length ? (
                  <ul className="space-y-2.5">
                    {c.gap.map((g, i) => (
                      <li key={g}><Card className="flex items-start gap-3 !p-4">
                        <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-canari text-xs font-black text-ink">{i + 1}</span>
                        <span className="text-sm font-bold leading-6 text-ink">{g}</span>
                      </Card></li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title={t("career.noGap")} />
                )}
              </Section>
            </>
          )}

          {/* ── Readiness ── */}
          {kind === "readiness" && c && (
            <>
              <Card className="mt-5 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
                <ScoreRing score={c.readiness} size="lg" />
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-muted">{t("career.readiness")}</div>
                  <p className="mt-1 text-base font-black leading-6 text-ink">{t(ReadinessMessage(c.readiness))}</p>
                </div>
              </Card>
              <Section title={t("career.os.determines")}>
                <Card className="space-y-4">
                  {Object.entries(c.dimensions).map(([k, v]) => (
                    <Progress key={k} value={v.score} label={t(`career.dim.${k}` as DictKey)} tone={v.score >= 60 ? "green" : "blue"} />
                  ))}
                </Card>
              </Section>
            </>
          )}

          {/* ── Opportunity Radar ── */}
          {kind === "radar" && c && (
            <>
              <Card className="mt-5">
                <div className="text-xs font-bold text-muted">{t("career.radar.goals")}</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {c.goals.length ? c.goals.map((g) => <Badge key={g} tone="blue">{g}</Badge>) : <span className="text-sm text-muted">{t("career.radar.noGoal")}</span>}
                </div>
                {c.targetCity && <div className="mt-3 text-xs text-muted">{t("career.radar.city")} : <b className="text-ink">{c.targetCity}</b></div>}
              </Card>
              <Section title={t("career.radar.top")}>
                {feed.jobs.length ? (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {[...feed.jobs].sort((a: FeedJob, b: FeedJob) => b.matchPercent - a.matchPercent).slice(0, 4).map((j) => (
                      <li key={`${j.source}:${j.id}`}>
                        <JobCard title={j.title} company={j.company?.name ?? t("career.unknownCompany")} logoUrl={j.company?.logoUrl}
                          meta={[j.location, j.contractType, j.remoteMode]} matchPercent={j.matchPercent} href={`/jobs/${j.id}?source=${j.source}`} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title={t("career.radar.none")} />
                )}
              </Section>
            </>
          )}

          {/* ── Market intelligence ── */}
          {kind === "market" && (
            feed.jobs.length ? (
              <>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <StatCard label={t("career.stats.jobs")} value={feed.totalActive || feed.jobs.length} tone="blue" />
                  <StatCard label={t("career.stats.contracts")} value={market.contracts.length} tone="yellow" />
                  <StatCard label={t("career.stats.cities")} value={market.cities.length} tone="slate" />
                </div>
                <p className="mt-2 text-xs text-muted">{t("career.market.sample", { n: feed.jobs.length })}</p>
                <div className="mt-2 grid gap-4 sm:grid-cols-2">
                  <Section title={t("career.market.topContracts")}><Card><Bars rows={market.contracts} /></Card></Section>
                  <Section title={t("career.market.topCities")}><Card><Bars rows={market.cities} /></Card></Section>
                </div>
              </>
            ) : (
              <EmptyState className="mt-6" title={t("career.market.noData")} />
            )
          )}

          {/* ── Campus ── */}
          {kind === "campus" && (
            <div className="mt-6 space-y-3">
              <DashboardCard accent="yellow" title={t("career.campus.card1")} description={t("career.campus.card1d")} href="/jobs?q=stage"
                icon={<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" /></svg>} />
              <DashboardCard title={t("career.campus.card2")} description={t("career.campus.card2d")} href="/talent/cvs"
                icon={<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>} />
              <DashboardCard title={t("career.campus.card3")} description={t("career.campus.card3d")} href="/career-gps"
                icon={<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="m12 12 5-5" /></svg>} />
              <p className="px-1 text-xs text-muted">{t("career.campus.note")}</p>
            </div>
          )}

          {comingSoon && <EmptyState className="mt-6" title={t("career.comingSoon.title")} body={t("career.comingSoon.body")} />}

          <CTASection title={t("career.cta.title")} primary={{ label: t(key("cta")), href: cta.primary }} secondary={{ label: t(key("secondary")), href: cta.secondary }} />
        </>
      )}
    </AppShell>
  );
}
