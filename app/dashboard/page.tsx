"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase";
import PageHeader from "../../components/PageHeader";
import BottomNav, { TALENT_NAV } from "../../components/BottomNav";
import ScoreRing from "../../components/ScoreRing";

type ProfileData = {
  user: { id?: string; displayName?: string; email?: string; phone?: string; profilePhotoUrl?: string | null };
  profile: { headline?: string; summary?: string; location?: string; targetRoles?: string[]; preferredSectors?: string[] };
  experiences: unknown[];
  skills: { name?: string }[];
  education: unknown[];
};

type Job = {
  source: "discovery" | "recruiter";
  id: string;
  title: string;
  location: string | null;
  contractType: string | null;
  remoteMode: string | null;
  company: { name: string; logoUrl: string | null } | null;
  matchPercent: number;
};

type JobsResponse = { totalActive: number; count: number; jobs: Job[] };
type ApplicationsResponse = { counters?: { envoyees: number; vues: number; entretien: number } };

const QUICK = [
  { href: "/talent/cvs", icon: "cv", title: "Mon CV", subtitle: "Optimisé par J’IA", tone: "violet" },
  { href: "/jobs", icon: "briefcase", title: "Offres", subtitle: "Les opportunités pour vous", tone: "blue" },
  { href: "/candidatures", icon: "target", title: "Mes candidatures", subtitle: "Suivez vos progrès", tone: "orange" },
  { href: "/career-os", icon: "sparkle", title: "Ma carrière", subtitle: "Pilotez votre parcours", tone: "green" },
];

function QuickIcon({ id }: { id: string }) {
  if (id === "briefcase") return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></svg>;
  if (id === "cv") return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
  if (id === "target") return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m12 12 5-5"/></svg>;
  return <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M12 2l1.8 5.1L19 9l-5.2 1.9L12 16l-1.8-5.1L5 9l5.2-1.9L12 2Zm7 11 .8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13Z"/></svg>;
}

function contractLabel(value: string | null) {
  if (!value) return "Contrat non précisé";
  const v = value.toUpperCase();
  if (v === "CDI") return "CDI";
  if (v === "CDD") return "CDD";
  if (v === "STAGE") return "Stage";
  if (v === "ALTERNANCE") return "Alternance";
  return value;
}

function remoteLabel(value: string | null) {
  if (!value) return null;
  const v = value.toLowerCase();
  if (v === "yes" || v === "remote") return "Télétravail";
  if (v === "partial" || v === "hybrid") return "Hybride";
  if (v === "no" || v === "onsite") return "Présentiel";
  return value;
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProfileData | null>(null);
  const [jobs, setJobs] = useState<JobsResponse | null>(null);
  const [applications, setApplications] = useState<ApplicationsResponse | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      if (!session.data.session) { router.replace("/"); return; }
      const token = session.data.session.access_token;
      try {
        const [profileRes, jobsRes, applicationsRes] = await Promise.all([
          fetch("/api/profile", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/jobs", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
          fetch("/api/applications", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }),
        ]);
        const [profileBody, jobsBody, applicationsBody] = await Promise.all([
          profileRes.json().catch(() => null), jobsRes.json().catch(() => null), applicationsRes.json().catch(() => null),
        ]);
        if (!cancelled) {
          if (profileRes.ok) setData(profileBody);
          if (jobsRes.ok) setJobs(jobsBody);
          if (applicationsRes.ok) setApplications(applicationsBody);
        }
      } catch {
        // The dashboard remains navigable even if one backend request is temporarily unavailable.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  const profileCompletion = useMemo(() => {
    if (!data) return 0;
    const { user, profile, experiences, skills, education } = data;
    const checks = [
      Boolean(user.displayName), Boolean(profile.headline), Boolean(profile.summary), Boolean(profile.location),
      Boolean(profile.targetRoles?.length), Boolean(profile.preferredSectors?.length), Boolean(skills.some((s) => s.name?.trim())),
      experiences.length > 0, education.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [data]);

  const firstName = data?.user.displayName?.split(" ")[0] || "";
  const topJobs = jobs?.jobs?.slice(0, 3) ?? [];
  const applicationsCount = applications?.counters?.envoyees ?? 0;
  const visibleJobCount = jobs?.totalActive ?? 0;

  function goSearch() {
    const q = search.trim();
    router.push(q ? `/jobs?q=${encodeURIComponent(q)}` : "/jobs");
  }

  if (loading) return <main className="min-h-[100dvh] grid place-items-center bg-white font-bold text-navy">Chargement…</main>;

  return (
    <main className="talent-shell min-h-[100dvh] w-full overflow-x-hidden bg-[#F7F9FC] pb-28 text-navy">
      <PageHeader
        label="Talent"
        initial={(firstName || "J").charAt(0).toUpperCase()}
        avatarUrl={data?.user.profilePhotoUrl || undefined}
        theme="talent"
      />

      <div className="w-full">
        <section className="relative overflow-visible bg-[#F7F9FC]">
          <div className="pointer-events-none absolute -right-20 top-4 h-64 w-64 rounded-full bg-[#DCEBFF] blur-3xl sm:h-80 sm:w-80" />
          <div className="pointer-events-none absolute left-[-80px] top-24 h-56 w-56 rounded-full bg-[#FFF4A8]/70 blur-3xl" />
          <div className="mx-auto w-full max-w-6xl px-4 pb-8 pt-3 sm:px-6 sm:pb-10 lg:px-8">
            <div className="relative min-h-[330px] overflow-visible sm:min-h-[390px]">
              <div className="relative z-20 w-[68%] pt-4 sm:w-[58%] sm:pt-8">
                <p className="text-[20px] font-black leading-tight tracking-[-.03em] text-[#FFE135] drop-shadow-[0_1px_0_rgba(7,27,69,.08)] sm:text-[28px]">Bonjour{firstName ? ` ${firstName}` : ""} 👋</p>
                <h1 className="mt-2 max-w-xl font-heading text-[25px] font-black leading-[1.06] tracking-[-.04em] sm:text-[38px]">Votre carrière mérite <span className="text-[#0057B8]">un vrai copilote.</span></h1>
                <p className="mt-3 max-w-lg text-[12px] leading-5 text-[#52627A] sm:text-[15px] sm:leading-6">Je cherche, j’analyse, je prépare et je vous accompagne vers les meilleures opportunités.</p>
              </div>

              <div className="pointer-events-none absolute right-[-8px] bottom-[-34px] z-10 h-[310px] w-[285px] sm:right-0 sm:bottom-[-48px] sm:h-[390px] sm:w-[360px]">
                <div className="absolute left-[8%] top-[10%] h-36 w-36 rounded-full bg-[#FFE135]/55 blur-3xl sm:h-48 sm:w-48" />
                <div className="absolute right-[0%] top-[22%] h-36 w-36 rounded-full bg-[#CFE4FF]/80 blur-3xl sm:h-52 sm:w-52" />
                <div className="absolute inset-x-[4%] bottom-0 top-[4%] overflow-hidden rounded-[46%_46%_18%_18%] bg-white shadow-[0_24px_60px_rgba(7,27,69,.12)] ring-8 ring-white/80">
                  {data?.user.profilePhotoUrl ? (
                    <img
                      src={data.user.profilePhotoUrl}
                      alt="Photo de profil"
                      className="absolute inset-0 h-full w-full object-cover object-[center_18%] brightness-[1.06] contrast-[1.03] saturate-[1.06]"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center bg-[#0057B8] text-7xl font-black text-white">
                      {(firstName || "J").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-[38%] bg-gradient-to-t from-[#1769B5] via-[#1769B5]/95 to-transparent" />
                  <div className="absolute bottom-[-4%] left-[8%] h-[38%] w-[88%] rounded-[55%_55%_12%_12%] bg-[#155DB0] shadow-[inset_0_10px_18px_rgba(255,255,255,.12)]" />
                  <div className="absolute bottom-[18%] right-[2%] h-[48%] w-[9%] rotate-[9deg] rounded-full bg-[#161A22] shadow-[0_4px_10px_rgba(0,0,0,.18)]" />
                  <div className="absolute bottom-[27%] left-1/2 h-8 w-24 -translate-x-1/2 rounded-full border-4 border-[#D7E8FF]/80 bg-white/10" />
                </div>
              </div>
            </div>
          </div>
        </section>
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <form onSubmit={(e) => { e.preventDefault(); goSearch(); }} className="relative z-30 -mt-3 flex min-h-[58px] items-center gap-3 rounded-[20px] border-2 border-white/80 bg-white/95 px-4 shadow-[0_14px_34px_rgba(7,27,69,.11)] backdrop-blur-md focus-within:border-[#FFE135]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-[#0057B8]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Quel poste recherchez-vous ?" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#7C8CA5]" aria-label="Rechercher une offre" />
            <button type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0057B8] text-white" aria-label="Rechercher">→</button>
          </form>

          <section className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
            {QUICK.map((item) => {
              const tone = item.tone === "violet"
                ? "bg-[#F1EDFF] text-[#5B35C8]"
                : item.tone === "orange"
                  ? "bg-[#FFF0E5] text-[#E56A00]"
                  : item.tone === "green"
                    ? "bg-[#E7FAF2] text-[#12A875]"
                    : "bg-[#EAF2FF] text-[#0057B8]";
              return (
                <button key={item.href} type="button" onClick={() => router.push(item.href)} className="group min-w-0 rounded-[18px] border border-[#E0E7F2] bg-white p-2.5 text-left shadow-[0_8px_22px_rgba(7,27,69,.055)] transition-all hover:-translate-y-0.5 hover:border-[#FFE135] active:scale-[.98] sm:rounded-[22px] sm:p-4">
                  <span className={`grid h-10 w-10 place-items-center rounded-2xl ${tone} sm:h-12 sm:w-12`}><QuickIcon id={item.icon}/></span>
                  <strong className="mt-2 block truncate text-[11px] font-black sm:mt-3 sm:text-sm">{item.title}</strong>
                  <span className="mt-1 hidden min-h-8 text-[10px] leading-4 text-[#5D6C83] sm:block">{item.subtitle}</span>
                  <span className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#D9E2F0] text-sm font-black text-[#0057B8] sm:mt-3 sm:h-8 sm:w-8 sm:text-lg">→</span>
                </button>
              );
            })}
          </section>

          <button type="button" onClick={() => router.push("/jobs?focus=match")} className="mt-5 w-full rounded-[26px] border border-[#DCE8F4] bg-gradient-to-r from-[#EFFCF7] via-white to-[#FFFBE4] p-5 text-left shadow-[0_12px_32px_rgba(7,27,69,.07)] transition-all hover:-translate-y-0.5 hover:border-[#FFE135] sm:p-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <ScoreRing value={jobs?.jobs?.length ? Math.round(jobs.jobs.reduce((sum, job) => sum + job.matchPercent, 0) / jobs.jobs.length) : profileCompletion} size={112} label="Match global" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-[17px] font-black sm:text-xl">Votre profil est très recherché !</h2>
                    <p className="mt-1 text-xs leading-5 text-[#5D6C83] sm:text-sm">Vous correspondez à de nombreuses opportunités du moment. Voici les meilleures offres pour vous.</p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#F1EDFF] text-[#5B35C8]">✦</span>
                </div>
                <span className="mt-3 inline-flex rounded-full bg-[#0057B8] px-5 py-2.5 text-xs font-black text-white shadow-[0_8px_20px_rgba(0,87,184,.22)]">Voir mes meilleures offres&nbsp; →</span>
              </div>
            </div>
          </button>

          <section className="mt-6">
            <div className="flex items-end justify-between gap-3"><div><h2 className="font-heading text-xl font-black">Opportunités recommandées</h2><p className="mt-1 text-xs text-[#64748B]">{visibleJobCount > 0 ? `${visibleJobCount} offre${visibleJobCount > 1 ? "s" : ""} actuellement disponible${visibleJobCount > 1 ? "s" : ""}.` : "Aucune offre disponible pour le moment."}</p></div><button type="button" onClick={() => router.push("/jobs")} className="shrink-0 text-xs font-black text-[#0057B8]">Voir tout →</button></div>
            {topJobs.length > 0 ? (
              <div className="mt-3 -mx-1 overflow-x-auto overflow-y-hidden pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex w-max gap-3 pr-4">
                  {topJobs.map((job) => {
                    const remote = remoteLabel(job.remoteMode);
                    const destination = `/jobs/${encodeURIComponent(job.id)}?source=${job.source}`;
                    return (
                      <button key={`${job.source}:${job.id}`} type="button" onClick={() => router.push(destination)} className="h-[180px] w-[280px] shrink-0 snap-start rounded-[20px] border border-[#E4EAF2] bg-white p-4 text-left shadow-[0_8px_24px_rgba(7,27,69,.07)] transition-all hover:-translate-y-0.5 hover:border-[#0057B8]">
                        <div className="flex items-center gap-2">
                          {job.company?.logoUrl ? <img src={job.company.logoUrl} alt="" className="h-[50px] w-[50px] rounded-full border border-[#E5EAF2] object-contain" /> : <span className="grid h-[50px] w-[50px] place-items-center rounded-full bg-[#0057B8] text-sm font-black text-white">{(job.company?.name || "J").charAt(0).toUpperCase()}</span>}
                          <span className="min-w-0 truncate text-[11px] font-bold text-[#667085]">{job.company?.name || "Employeur non précisé"}</span>
                        </div>
                        <strong className="mt-3 block line-clamp-2 text-sm font-black leading-5 text-[#1A2B4C]">{job.title}</strong>
                        <div className="mt-2 flex items-center gap-1 truncate text-[10px] text-[#5D6C83]"><span aria-hidden>⌖</span><span>{job.location || "Yaoundé, Cameroun"}</span></div>
                        <div className="mt-1 flex items-center gap-1 truncate text-[10px] text-[#5D6C83]"><span aria-hidden>💼</span><span>{contractLabel(job.contractType)}{remote ? ` · ${remote}` : " · Télétravail partiel"}</span></div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#DDF8EA] px-2.5 py-1 text-[10px] font-black text-[#08733E]"><span aria-hidden>✓</span>{job.matchPercent}% match</span>
                          <span className="grid h-7 w-7 place-items-center rounded-full border border-[#D9E2F0] text-sm font-black text-[#0057B8]" aria-hidden>↻</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-[22px] border-2 border-dashed border-[#BFD0E8] bg-[#F7FAFF] p-6 text-center"><p className="text-sm font-bold">Les offres apparaîtront ici dès qu'elles seront disponibles.</p><button type="button" onClick={() => router.push("/jobs")} className="mt-3 rounded-full bg-[#0057B8] px-5 py-2.5 text-xs font-black text-white">Explorer les offres →</button></div>
            )}
          </section>

          <section className="mt-5 flex items-center gap-4 rounded-[22px] border-2 border-[#C9DDF7] bg-[#EAF2FF] p-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0057B8] text-2xl">🎓</span><div className="min-w-0 flex-1"><h2 className="text-sm font-black text-[#0B3D91]">Boostez vos compétences</h2><p className="mt-1 text-[11px] leading-4 text-[#52627A]">Transformez vos gaps en objectifs de carrière avec les formations disponibles.</p></div><button type="button" onClick={() => router.push("/ai/learning")} className="rounded-full border-2 border-[#0057B8] bg-white px-4 py-2 text-[10px] font-black text-[#0057B8]">Voir →</button></section>

          <section className="mt-5 mb-4 rounded-[26px] border-2 border-[#E0E7F2] bg-white p-5 shadow-[0_12px_32px_rgba(7,27,69,.07)] sm:p-6">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-heading text-lg font-black">Career Intelligence</h2><p className="mt-1 text-xs text-[#5D6C83]">Accédez à toutes les briques Career depuis un seul endroit.</p></div><button type="button" onClick={() => router.push("/career-os")} className="rounded-full bg-[#0057B8] px-4 py-2.5 text-[10px] font-black text-white">Ouvrir →</button></div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[["GPS","/career-gps"],["Gap","/career-gap"],["Radar","/opportunity-radar"],["ID / QR","/jobly-id"]].map(([label,href]) => <button key={href} type="button" onClick={() => router.push(href)} className="rounded-2xl border-2 border-[#E0E7F2] bg-[#F7FAFF] p-3 text-left hover:border-[#0057B8]"><span className="block text-xs font-black text-[#0057B8]">{label}</span><span className="mt-1 block text-[10px] font-semibold text-[#64748B]">Accéder →</span></button>)}
            </div>
          </section>

          <section className="mt-5 mb-4 rounded-[26px] border-2 border-[#E0E7F2] bg-white p-5 shadow-[0_12px_32px_rgba(7,27,69,.07)] sm:p-6">
            <div><h2 className="font-heading text-lg font-black">Explorer</h2><p className="mt-1 text-xs text-[#5D6C83]">D'autres espaces Jobly à découvrir.</p></div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[["Market Intelligence","/market-intelligence"],["Communities","/communities"],["Campus","/campus"],["Events","/events"]].map(([label,href]) => <button key={href} type="button" onClick={() => router.push(href)} className="rounded-2xl border-2 border-[#E0E7F2] bg-[#F7FAFF] p-3 text-left hover:border-[#0057B8]"><span className="block text-xs font-black text-[#0057B8]">{label}</span><span className="mt-1 block text-[10px] font-semibold text-[#64748B]">Accéder →</span></button>)}
            </div>
          </section>
        </div>
      </div>
      <BottomNav active="/dashboard" items={TALENT_NAV} />
    </main>
  );
}
