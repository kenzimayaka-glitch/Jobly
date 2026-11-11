"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";
import DecorativeBackground from "@/components/DecorativeBackground";

type Talent = { rank: number; matchPercent: number; id?: string; name?: string; headline?: string; location?: string; skills?: string[]; experienceYears?: number; profilePhotoUrl?: string | null };
type Payload = { job?: { id: string; title: string }; profileAccess?: boolean; eligibleCount?: number; talents?: Talent[]; message?: string };
type TalentDetails = { profile?: { firstName?: string; lastName?: string; headline?: string; summary?: string; location?: string }; user?: { displayName?: string; executiveSummary?: string; profilePhotoUrl?: string | null }; experiences?: Array<{ title: string; company: string; description?: string }>; skills?: Array<{ name: string; level?: string }>; matchPercent?: number };

export default function RecruiterJobMatchingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const jobId = params.id;
  const [token, setToken] = useState("");
  const [payload, setPayload] = useState<Payload>({});
  const [details, setDetails] = useState<TalentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const session = await getSupabaseClient().auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) { router.replace("/"); return; }
      setToken(accessToken);
      const response = await fetch(`/api/recruiter/jobs/${encodeURIComponent(jobId)}/matching`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Matching indisponible.");
      setPayload(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Matching indisponible.");
    } finally { setLoading(false); }
  }, [jobId, router]);

  useEffect(() => { load(); }, [load]);

  async function openProfile(talent: Talent) {
    if (!payload.profileAccess || !talent.id || !token) return;
    setBusyId(talent.id); setError("");
    try {
      const query = new URLSearchParams({ userId: talent.id, jobId });
      const response = await fetch("/api/recruiter/talents/profile?" + query.toString(), { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "Profil indisponible.");
      setDetails(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Profil indisponible.");
    } finally { setBusyId(null); }
  }

  if (loading) return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Calcul du matching…</main>;

  return <main className="relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-24 text-navy">
    <DecorativeBackground />
    <div className="relative z-10">
      <PageHeader eyebrow="RECRUTEUR · MATCHING" label="Top 5 talents" initial="✦" onBack={() => router.push(`/recruiter/jobs/${jobId}`)} />
      <section className="mx-auto max-w-4xl px-5 py-6">
        <h1 className="text-2xl font-black sm:text-3xl">Talents correspondants</h1>
        <p className="mt-2 text-sm text-slate-600">Offre : <b>{payload.job?.title || "Offre Jobly"}</b>. Seuls les profils avec un score d'au moins 90 % sont classés, jusqu'à cinq talents, du score le plus élevé au plus faible.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-800">{payload.eligibleCount || 0} talent(s) admissible(s)</span>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-slate-700">{payload.profileAccess ? "Accès profils activé" : "Scores visibles · profils protégés"}</span>
        </div>
        {!payload.profileAccess && <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><b>Les profils restent verrouillés.</b><p className="mt-1">La version gratuite affiche uniquement les scores. Les cinq cartes sont floutées et ne contiennent aucun nom, identifiant, photo, compétence ni lien permettant d'ouvrir un profil. Un abonnement Recruteur Premium ou Pro actif avec l'accès Top 5 est nécessaire.</p></div>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-5 space-y-3">
          {(payload.talents || []).map((talent) => <article key={talent.rank} className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            {payload.profileAccess ? <div className="flex flex-wrap items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-blue-50 text-xl font-black text-blue-800">{talent.profilePhotoUrl ? <img src={talent.profilePhotoUrl} alt="" className="h-full w-full object-cover" /> : (talent.name || "T").slice(0,1).toUpperCase()}</div>
              <div className="min-w-0 flex-1"><div className="text-xs font-bold text-blue-700">Rang #{talent.rank} · {talent.matchPercent}%</div><h2 className="mt-1 truncate text-base font-black">{talent.name}</h2><p className="text-sm text-slate-600">{talent.headline}</p><p className="mt-1 text-xs text-slate-500">{talent.location}</p></div>
              <button disabled={busyId===talent.id} onClick={() => openProfile(talent)} className="rounded-full bg-[#0057B8] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">{busyId===talent.id?"Ouverture…":"Voir le profil"}</button>
            </div> : <div className="flex items-center gap-4">
              <div aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-slate-100 text-2xl text-slate-400">●</div>
              <div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-500">Talent anonyme · Rang #{talent.rank}</div><div aria-hidden="true" className="mt-2 h-3 w-2/3 rounded-full bg-slate-200 blur-sm"/><div aria-hidden="true" className="mt-2 h-2.5 w-1/2 rounded-full bg-slate-100 blur-sm"/></div>
              <div className="shrink-0 text-right"><div className="text-2xl font-black text-[#0057B8]">{talent.matchPercent}%</div><div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Matching</div></div>
            </div>}
          </article>)}
          {!payload.talents?.length && <div className="rounded-3xl border bg-white p-8 text-center text-sm text-slate-500">Aucun talent n'atteint actuellement le seuil minimum de 90 % pour cette offre.</div>}
        </div>
      </section>
    </div>
    {details && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4" role="presentation" onClick={() => setDetails(null)}>
      <section role="dialog" aria-modal="true" className="max-h-[85dvh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-7" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-blue-700">Profil talent · {details.matchPercent || 0}%</p><h2 className="mt-1 text-2xl font-black">{[details.profile?.firstName,details.profile?.lastName].filter(Boolean).join(" ") || details.user?.displayName}</h2><p className="text-sm text-slate-600">{details.profile?.headline} · {details.profile?.location}</p></div><button onClick={() => setDetails(null)} className="rounded-full border px-3 py-2 text-sm font-bold">Fermer</button></div>
        {details.profile?.summary && <p className="mt-5 text-sm leading-6 text-slate-700">{details.profile.summary}</p>}
        {details.user?.executiveSummary && <p className="mt-3 text-sm leading-6 text-slate-700">{details.user.executiveSummary}</p>}
        <h3 className="mt-5 font-black">Compétences</h3><div className="mt-2 flex flex-wrap gap-2">{(details.skills||[]).map((skill,i)=><span key={i} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800">{skill.name}</span>)}</div>
        <h3 className="mt-5 font-black">Expériences</h3><div className="mt-2 space-y-3">{(details.experiences||[]).map((experience,i)=><div key={i} className="rounded-2xl bg-slate-50 p-3"><b className="text-sm">{experience.title}</b><p className="text-xs text-slate-500">{experience.company}</p>{experience.description&&<p className="mt-1 text-sm text-slate-700">{experience.description}</p>}</div>)}</div>
      </section>
    </div>}
  </main>;
}
