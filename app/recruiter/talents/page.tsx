"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import AppShell from "@/components/ui/AppShell";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageIntro, StatCard } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

type Talent = {
  userId: string; name: string; headline: string; location: string | null; yearsExperience: number; currentLevel: number; currentLevelLabel: string;
  readiness: number; topSkills: { name: string }[]; quantifiedEvidence: string[]; discoveryScore: number; bestJob: { id: string; title: string } | null; reasons: string[];
};

export default function RecruiterTalentsPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [talents, setTalents] = useState<Talent[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setTalents(null);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) { router.replace("/"); return; }
      const res = await fetch(`/api/recruiter/talents?lang=${lang}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (res.status === 403) { setError(t("talents.forbidden")); return; }
      if (!res.ok) throw new Error("load");
      setTalents((await res.json()).talents ?? []);
    } catch {
      setError(t("talents.loadError"));
    }
  }, [router, lang, t]);

  useEffect(() => { void load(); }, [load]);

  return (
    <AppShell role="recruiter" active="/recruiter/talents" title={t("talents.title")} eyebrow={t("common.recruiter").toUpperCase()} backHref="/recruiter" width="lg">
      <PageIntro title={t("talents.title")} subtitle={t("talents.subtitle")} actions={<Button variant="outline" size="sm" onClick={load}>{t("talents.refresh")}</Button>} />
      {error && <ErrorState className="mt-6" title={error} onRetry={load} />}
      {!talents && !error && <LoadingState />}
      {talents && talents.length === 0 && <EmptyState className="mt-6" title={t("talents.empty")} body={t("talents.emptyBody")} />}
      {talents && talents.length > 0 && (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {talents.map((tl, i) => (
            <li key={tl.userId}>
              <Card>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge tone="yellow">#{String(i + 1).padStart(2, "0")} · {t("talents.public")}</Badge>
                    <h2 className="mt-2 truncate text-lg font-black text-ink">{tl.name}</h2>
                    <p className="truncate text-sm font-semibold text-muted">{tl.headline}</p>
                  </div>
                  <div className="text-right"><div className="text-3xl font-black leading-none text-canari-blue">{tl.discoveryScore}</div><div className="text-[10px] font-black uppercase text-muted">{t("talents.signal")}</div></div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <StatCard label={t("career.years")} value={tl.yearsExperience} tone="slate" className="!p-3" />
                  <StatCard label={t("career.level")} value={`L${tl.currentLevel}`} hint={tl.currentLevelLabel} className="!p-3" />
                  <StatCard label={t("career.readiness")} value={`${tl.readiness}%`} tone="green" className="!p-3" />
                </div>
                <p className="mt-3 text-xs font-semibold text-muted">{[tl.location, tl.bestJob?.title].filter(Boolean).join(" · ") || t("talents.fallbackProfile")}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">{tl.topSkills.slice(0, 5).map((s) => <Badge key={s.name} tone="slate">{s.name}</Badge>)}</div>
                <div className="mt-4 rounded-2xl bg-canari-blue-soft p-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-canari-blue">{t("talents.why")}</p>
                  <p className="mt-1 text-xs leading-5 text-ink">{tl.reasons.join(" · ")}</p>
                  {tl.quantifiedEvidence.length > 0 && <p className="mt-2 text-xs text-ink"><b>{t("talents.evidence")} :</b> {tl.quantifiedEvidence.join(" · ")}</p>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
