"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, Play, Sparkles, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import AppShell from "@/components/ui/AppShell";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageIntro, StatCard } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

type Talent = {
  userId: string; name: string; headline: string; location: string | null; yearsExperience: number; currentLevel: number; currentLevelLabel: string;
  readiness: number; topSkills: { name: string }[]; quantifiedEvidence: string[]; discoveryScore: number; bestJob: { id: string; title: string } | null; reasons: string[];
  profilePhotoUrl?: string | null; pitchVideoUrl?: string | null; pitchVideoDurationMs?: number | null; plan?: "FREE" | "PRO" | "PREMIUM"; advertisingEligible?: boolean;
};

export default function RecruiterTalentsPage() {
  const router = useRouter();
  const { t, lang } = useI18n();
  const [talents, setTalents] = useState<Talent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);

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

  const featured = useMemo(() => (talents ?? []).filter((x) => x.advertisingEligible && x.pitchVideoUrl), [talents]);

  useEffect(() => {
    if (featured.length < 2) return;
    const timer = window.setInterval(() => setHeroIndex((i) => (i + 1) % featured.length), 5000);
    return () => window.clearInterval(timer);
  }, [featured.length]);

  function openTalent(talent: Talent) {
    try { sessionStorage.setItem("jobly:selected-talent", JSON.stringify(talent)); } catch {}
    router.push(`/talent/profile?candidate=${encodeURIComponent(talent.userId)}`);
  }

  const visibleFeatured = featured.length ? [0, 1, 2].map((offset) => featured[(heroIndex + offset) % featured.length]).filter(Boolean) : [];

  return (
    <AppShell role="recruiter" active="/recruiter/talents" title={t("talents.title")} eyebrow={t("common.recruiter").toUpperCase()} backHref="/recruiter" width="lg">
      <PageIntro title={t("talents.title")} subtitle={t("talents.subtitle")} actions={<Button variant="outline" size="sm" onClick={load}>{t("talents.refresh")}</Button>} />

      {error && <ErrorState className="mt-6" title={error} onRetry={load} />}
      {!talents && !error && <LoadingState />}

      {talents && (
        <>
          {featured.length > 0 && (
            <section className="mt-6 overflow-hidden rounded-[30px] bg-[#2E3F4F] p-4 text-white shadow-[0_18px_55px_rgba(46,63,79,.22)]">
              <div className="flex items-center justify-between gap-3 px-1">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[1.8px] text-[#FFE135]"><Sparkles size={14}/> Talent Ads</div>
                  <h2 className="mt-1 text-2xl font-black tracking-tight">À la une</h2>
                </div>
                <Badge tone="yellow">{featured.length} vidéo{featured.length > 1 ? "s" : ""}</Badge>
              </div>
              <div className="relative mt-4 h-[360px] sm:h-[410px]">
                {visibleFeatured.map((talent, index) => {
                  const active = index === 0;
                  const duration = talent.plan === "PRO" ? 12 : 8;
                  return (
                    <motion.article key={`${talent.userId}-${index}`} initial={{ opacity: 0, x: 45 }} animate={{ opacity: active ? 1 : .55, x: index * 30, y: index * 10, scale: 1 - index * .035, zIndex: 10 - index }} transition={{ duration: .35 }} className="absolute inset-0 overflow-hidden rounded-[26px] border border-white/15 bg-white/10">
                      {active && <video src={talent.pitchVideoUrl || undefined} poster={talent.profilePhotoUrl || undefined} autoPlay muted loop playsInline className="h-full w-full object-cover opacity-70" />}
                      {!active && <div className="h-full w-full bg-gradient-to-br from-[#7A9BB5]/45 to-[#2E3F4F]" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#17212B] via-transparent to-transparent" />
                      <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
                        <Badge tone="yellow">{talent.plan === "PRO" ? "PRO · AD ≤ 12s" : "PREMIUM · AD ≤ 8s"}</Badge>
                        <span className="rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[10px] font-black backdrop-blur">{duration}s max</span>
                      </div>
                      <div className="absolute bottom-5 left-5 right-5">
                        <div className="flex items-end justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[1.5px] text-[#FFE135]">Talent spotlight</p>
                            <h3 className="mt-1 text-4xl font-black leading-none">{talent.name}</h3>
                            <p className="mt-2 max-w-xl text-sm text-white/75">{talent.headline}</p>
                          </div>
                          <button type="button" onClick={() => openTalent(talent)} className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#FFE135] text-[#2E3F4F] shadow-lg" aria-label={t("common.view")}><ArrowUpRight size={21}/></button>
                        </div>
                        {active && <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-white/65"><Play size={14} fill="currentColor"/> Vidéo de mise en valeur du Talent · profil public</div>}
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          )}

          <section className="mt-8">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[1.8px] text-canari-blue">DISCOVERY</p>
                <h2 className="mt-1 text-2xl font-black text-ink">Tous les profils publics</h2>
              </div>
              <span className="text-xs font-bold text-muted">{talents.length} talent{talents.length > 1 ? "s" : ""}</span>
            </div>
            {talents.length === 0 && <EmptyState className="mt-6" title={t("talents.empty")} body={t("talents.emptyBody")} />}
            {talents.length > 0 && (
              <ul className="mt-5 grid gap-4 md:grid-cols-2">
                {talents.map((tl, i) => (
                  <li key={tl.userId}>
                    <Card className="h-full">
                      <div className="flex items-start gap-3">
                        {tl.profilePhotoUrl ? <img src={tl.profilePhotoUrl} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-canari-blue-soft text-canari-blue"><Star size={22}/></div>}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0"><Badge tone="yellow">#{String(i + 1).padStart(2, "0")} · {t("talents.public")}</Badge><h2 className="mt-2 truncate text-lg font-black text-ink">{tl.name}</h2><p className="truncate text-sm font-semibold text-muted">{tl.headline}</p></div>
                            <div className="text-right"><div className="text-3xl font-black leading-none text-canari-blue">{tl.discoveryScore}</div><div className="text-[10px] font-black uppercase text-muted">{t("talents.signal")}</div></div>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <StatCard label={t("career.years")} value={tl.yearsExperience} tone="slate" className="!p-3" />
                        <StatCard label={t("career.level")} value={`L${tl.currentLevel}`} hint={tl.currentLevelLabel} className="!p-3" />
                        <StatCard label={t("career.readiness")} value={`${tl.readiness}%`} tone="green" className="!p-3" />
                      </div>
                      <p className="mt-3 text-xs font-semibold text-muted">{[tl.location,tl.bestJob?.title].filter(Boolean).join(" · ") || t("talents.fallbackProfile")}</p>
                      <div className="mt-3 flex flex-wrap gap-1.5">{tl.topSkills.slice(0, 5).map((s) => <Badge key={s.name} tone="slate">{s.name}</Badge>)}</div>
                      <div className="mt-4 rounded-2xl bg-canari-blue-soft p-4">
                        <p className="text-[11px] font-black uppercase tracking-wider text-canari-blue">{t("talents.why")}</p>
                        <p className="mt-1 text-xs leading-5 text-ink">{tl.reasons.join(" · ")}</p>
                        {tl.quantifiedEvidence.length > 0 && <p className="mt-2 text-xs text-ink"><b>{t("talents.evidence")} :</b> {tl.quantifiedEvidence.join(" · ")}</p>}
                      </div>
                      <Button className="mt-4 w-full" onClick={() => openTalent(tl)}>Voir le profil</Button>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}
