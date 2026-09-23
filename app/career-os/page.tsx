"use client";

import { useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";
import AppShell from "@/components/ui/AppShell";
import { Badge, Card, CTASection, DashboardCard, ErrorState, JourneyBar, LoadingState, PageIntro, Progress, Section, StatCard, Switch } from "@/components/ui";
import { useCareerOs } from "@/components/career/useCareerOs";
import { useI18n, type DictKey } from "@/lib/i18n";

const LINKS: { href: string; key: DictKey }[] = [
  { href: "/career-gps", key: "career.nav.gps" },
  { href: "/career-gap", key: "career.nav.gap" },
  { href: "/readiness", key: "career.nav.readiness" },
  { href: "/opportunity-radar", key: "career.nav.radar" },
  { href: "/market-intelligence", key: "career.market.title" },
  { href: "/campus", key: "career.campus.title" },
];

export default function CareerOsPage() {
  const { t } = useI18n();
  const { data: d, setData, status, reload } = useCareerOs();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function togglePublic(next: boolean) {
    const { data: { session } } = await getSupabaseClient().auth.getSession();
    if (!session) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/talent/discoverability", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ publicDiscoverable: next }),
      });
      if (!res.ok) throw new Error("save");
      setData((x) => (x ? { ...x, publicDiscoverable: next } : x));
      setNotice({ ok: true, text: t("settings.saved") });
    } catch {
      setNotice({ ok: false, text: t("settings.saveError") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell role="talent" active="/career-brain" title="Career OS" eyebrow="JOBLY" backHref="/career-brain" width="lg" initial="J">
      <JourneyBar current="progress" className="mb-5" />
      <PageIntro eyebrow={t("career.eyebrow")} title={t("career.os.title")} subtitle={t("career.os.subtitle")} />

      {status === "loading" && <LoadingState />}
      {status === "error" && <ErrorState title={t("career.loadError")} onRetry={reload} />}

      {status === "ready" && d && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label={t("career.level")} value={`L${d.currentLevel}`} hint={d.currentLevelLabel} tone="blue" />
            <StatCard label={t("career.nextLevel")} value={`L${d.targetLevel}`} hint={d.targetLevelLabel} tone="yellow" />
            <StatCard label={t("career.readiness")} value={`${d.readiness}%`} hint={t("career.readinessHint")} href="/readiness" />
            <StatCard label={t("career.dim.experience")} value={d.yearsExperience} hint={t("career.years")} tone="slate" />
          </div>

          <Card tone="highlight" className="mt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#695500]">{t("career.os.next")}</span>
              <Badge tone="blue">L{d.currentLevel} → L{d.targetLevel}</Badge>
            </div>
            <h2 className="mt-2 text-lg font-black leading-6 text-ink">{d.nextBestAction || t("career.defaultNext")}</h2>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title={t("career.os.determines")}>
              <Card className="space-y-4">
                {Object.entries(d.dimensions).map(([k, v]) => (
                  <Progress key={k} value={v.score} label={t(`career.dim.${k}` as DictKey)} tone={v.score >= 60 ? "green" : "blue"} />
                ))}
              </Card>
            </Section>
            <Section title={t("career.os.criteria")}>
              <Card>
                <ul className="space-y-2 text-sm text-ink">
                  {d.criteria.map((x) => <li key={x} className="flex gap-2"><span aria-hidden="true" className="text-canari-blue">•</span>{x}</li>)}
                </ul>
              </Card>
            </Section>
          </div>

          <Section title={t("career.os.gaps")}>
            <Card>
              {d.gap.length ? (
                <ul className="space-y-2 text-sm text-ink">{d.gap.map((x) => <li key={x} className="flex gap-2"><span aria-hidden="true" className="text-[#C79A00]">•</span>{x}</li>)}</ul>
              ) : (
                <p className="text-sm text-muted">{t("career.noGap")}</p>
              )}
            </Card>
          </Section>

          <Section title={t("career.os.roadmap")}>
            <Card padded={false} className="divide-y divide-line">
              {d.roadmap.map((x) => (
                <div key={x.step} className="flex gap-3 p-4">
                  <span aria-hidden="true" className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-black ${x.done ? "bg-emerald-500 text-white" : "bg-canari-blue-soft text-canari-blue"}`}>{x.done ? "✓" : x.step}</span>
                  <div><div className="text-sm font-black text-ink">{x.title}</div><p className="mt-0.5 text-xs leading-5 text-muted">{x.action}</p></div>
                </div>
              ))}
            </Card>
          </Section>

          <Section title={t("career.os.visibility")}>
            <Card>
              <Switch checked={d.publicDiscoverable} onChange={togglePublic} disabled={busy} label={t("career.os.visibility")} description={t("career.os.visibilityDesc")} />
              {notice && <p role="status" className={`mt-3 text-xs font-bold ${notice.ok ? "text-emerald-600" : "text-red-600"}`}>{notice.text}</p>}
            </Card>
          </Section>

          <Section title={t("career.os.explore")}>
            <div className="grid gap-3 sm:grid-cols-2">
              {LINKS.map((l) => <DashboardCard key={l.href} title={t(l.key)} href={l.href} />)}
            </div>
          </Section>

          <CTASection title={t("career.cta.title")} primary={{ label: t("career.os.seeJobs"), href: "/opportunities" }} secondary={{ label: t("career.gps.secondary"), href: "/candidatures" }} />
        </>
      )}
    </AppShell>
  );
}
