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
  { href: "/jobs", icon: "briefcase", title: "Offres", subtitle: "Les opportunités disponibles" },
  { href: "/career-brain", icon: "sparkle", title: "Career AI", subtitle: "Ton assistant personnel" },
  { href: "/talent/cvs", icon: "cv", title: "Mon CV", subtitle: "Créer, importer, optimiser" },
  { href: "/candidatures", icon: "target", title: "Mes candidatures", subtitle: "Suivre tes candidatures" },
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
    <main className="talent-shell min-h-[100dvh] w-full overflow-x-hidden bg-white pb-28 text-navy">
      <PageHeader
        label="Talent · ton espace carrière"
        initial={(firstName || "J").charAt(0).toUpperCase()}
        avatarUrl={data?.user.profilePhotoUrl || undefined}
        theme="talent"
      />

      <div className="w-full">
        <section className="border-b border-[#E7ECF5] bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
            <div className="grid items-center gap-5 lg:grid-cols-[1.35fr_.65fr]">
              <div>
                <span className="inline-flex rounded-full bg-[#FFF0A6] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.12em] text-[#5D4700]">Talent Journey · Page 1</span>
                <p className="mt-4 text-sm font-extrabold">Bonjour{firstName ? ` ${firstName}` : ""} 👋</p>
                <h1 className="mt-1 max-w-3xl font-heading text-[34px] font-black leading-[1.02] tracking-[-.045em] sm:text-[48px]">Votre carrière mérite <span className="text-[#0057B8]">un vrai copilote.</span></h1>
                <p className="mt-4 max-w-2xl text-[15px] leading-6 text-[#52627A]">Je cherche, j’analyse, je prépare et je vous accompagne vers les opportunités disponibles pour vous.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={() => router.push("/career-brain")} className="rounded-full bg-[#FFE135] px-6 py-3.5 text-sm font-black text-[#071B45] shadow-[0_10px_25px_rgba(255,212,0,.32)] transition-transform active:scale-[.98]">Commencer avec J'IA ↗</button>
                  <button type="button" onClick={() => router.push("/talent/profile")} className="rounded-full border-2 border-[#0057B8] bg-white px-6 py-3 text-sm font-black text-[#0057B8]">Compléter mon profil</button>
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                <div className="relative grid h-40 w-40 place-items-center rounded-[36px] border-4 border-[#FFE135] bg-[#0B3D91] shadow-[0_20px_50px_rgba(11,61,145,.25)] sm:h-48 sm:w-48">
                  {data?.user.profilePhotoUrl ? (
                    <img src={data.user.profilePhotoUrl} alt="Photo de profil" className="h-full w-full rounded-[32px] object-cover" />
                  ) : (
                    <span className="text-6xl font-black text-white">{(firstName || "J").charAt(0).toUpperCase()}</span>
                  )}
                  <span className="absolute -bottom-3 -right-3 rounded-full bg-[#FFE135] px-3 py-1.5 text-[10px] font-black text-[#071B45] shadow-lg">MON PROFIL</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <form onSubmit={(e) => { e.preventDefault(); goSearch(); }} className="mt-5 flex min-h-[58px] items-center gap-3 rounded-[18px] border-2 border-[#D7E1F0] bg-white px-4 shadow-[0_8px_24px_rgba(7,27,69,.07)] focus-within:border-[#0057B8]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-[#0057B8]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Quel poste recherchez-vous ?" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#7C8CA5]" aria-label="Rechercher une offre" />
            <button type="submit" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#0057B8] text-white" aria-label="Rechercher">→</button>
          </form>

          <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK.map((item, i) => (
              <button key={item.href} type="button" onClick={() => router.push(item.href)} className="group rounded-[22px] border-2 border-[#E0E7F2] bg-white p-4 text-left shadow-[0_10px_25px_rgba(7,27,69,.07)] transition-all hover:-translate-y-0.5 hover:border-[#0057B8] active:scale-[.98]">
                <span className={`grid h-12 w-12 place-items-center rounded-2xl ${i % 2 === 0 ? "bg-[#FFE135] text-[#071B45]" : "bg-[#0057B8] text-white"}`}><QuickIcon id={item.icon}/></span>
                <strong className="mt-3 block text-sm font-black">{item.title}</strong>
                <span className="mt-1 block min-h-8 text-[11px] leading-4 text-[#5D6C83]">{item.subtitle}</span>
                <span className="mt-3 inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#D9E2F0] text-lg font-black text-[#0057B8]">→</span>
              </button>
            ))}
          </section>

          <section className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
            <div className="rounded-[26px] border-2 border-[#E0E7F2] bg-white p-5 shadow-[0_12px_32px_rgba(7,27,69,.07)] sm:p-6">
              <div className="flex items-center gap-5">
                <ScoreRing value={profileCompletion} size={112} label="Profil complété" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-black">Votre tableau de bord évolue avec vos données</h2>
                  <p className="mt-1 text-xs leading-5 text-[#5D6C83]">{profileCompletion === 100 ? "Votre profil est complet. Jobly peut personnaliser davantage vos opportunités." : `Votre profil est complété à ${profileCompletion} %. Ajoutez les informations manquantes pour affiner vos recommandations.`}</p>
                  <button type="button" onClick={() => router.push("/talent/profile")} className="mt-3 rounded-full bg-[#0057B8] px-5 py-2.5 text-xs font-black text-white">Mettre à jour mon profil →</button>
                </div>
              </div>
            </div>
            <div className="rounded-[26px] border-2 border-[#FFE135] bg-[#FFF9D9] p-5 shadow-[0_12px_32px_rgba(7,27,69,.06)]">
              <div className="text-xs font-black uppercase tracking-wide text-[#6B5200]">Mes candidatures</div>
              <div className="mt-2 text-4xl font-black text-[#0B3D91]">{applicationsCount}</div>
              <p className="mt-1 text-xs text-[#5D6C83]">candidature{applicationsCount > 1 ? "s" : ""} envoyée{applicationsCount > 1 ? "s" : ""} selon votre activité réelle.</p>
              <button type="button" onClick={() => router.push("/candidatures")} className="mt-4 rounded-full border-2 border-[#0B3D91] bg-white px-4 py-2.5 text-xs font-black text-[#0B3D91]">Voir mes candidatures →</button>
            </div>
          </section>

          <section className="mt-6">
            <div className="flex items-end justify-between gap-3"><div><h2 className="font-heading text-xl font-black">Opportunités recommandées</h2><p className="mt-1 text-xs text-[#64748B]">{visibleJobCount > 0 ? `${visibleJobCount} offre${visibleJobCount > 1 ? "s" : ""} actuellement disponible${visibleJobCount > 1 ? "s" : ""}.` : "Aucune offre disponible pour le moment."}</p></div><button type="button" onClick={() => router.push("/jobs")} className="shrink-0 text-xs font-black text-[#0057B8]">Voir tout →</button></div>
            {topJobs.length > 0 ? (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {topJobs.map((job) => {
                  const remote = remoteLabel(job.remoteMode);
                  const destination = `/jobs/${encodeURIComponent(job.id)}?source=${job.source}`;
                  return (
                    <button key={`${job.source}:${job.id}`} type="button" onClick={() => router.push(destination)} className="rounded-[22px] border-2 border-[#E0E7F2] bg-white p-4 text-left shadow-[0_10px_26px_rgba(7,27,69,.055)] transition-all hover:-translate-y-0.5 hover:border-[#0057B8]">
                      <div className="flex items-center gap-2">
                        {job.company?.logoUrl ? <img src={job.company.logoUrl} alt="" className="h-10 w-10 rounded-xl border border-[#E5EAF2] object-contain" /> : <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0057B8] text-sm font-black text-white">{(job.company?.name || "J").charAt(0).toUpperCase()}</span>}
                        <span className="min-w-0 truncate text-[11px] font-bold text-[#5D6C83]">{job.company?.name || "Employeur non précisé"}</span>
                      </div>
                      <strong className="mt-3 block text-sm font-black">{job.title}</strong>
                      <span className="mt-2 block truncate text-[11px] text-[#5D6C83]">{job.location || "Localisation non précisée"}</span>
                      <span className="mt-2 block text-[11px] text-[#5D6C83]">{contractLabel(job.contractType)}{remote ? ` · ${remote}` : ""}</span>
                      <span className="mt-3 inline-flex rounded-full bg-[#DDF8EA] px-2.5 py-1 text-[10px] font-black text-[#08733E]">{job.matchPercent}% match</span>
                    </button>
                  );
                })}
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
