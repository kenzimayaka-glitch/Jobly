"use client";

import { useEffect, useState } from "react";
import { Lock, UserRound, Sparkles, ArrowRight } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function PublicRecruiterDiscovery() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    fetch("/api/recruiter/discover/" + encodeURIComponent(token), { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || "Indisponible");
        return body;
      })
      .then((body) => { if (alive) setData(body); })
      .catch((reason) => { if (alive) setError(reason instanceof Error ? reason.message : "Indisponible"); });
    return () => { alive = false; };
  }, [token]);

  if (error) return <main className="grid min-h-[100dvh] place-items-center bg-[#F5F7FA] p-6"><div className="rounded-3xl bg-white p-8 text-center shadow-xl"><h1 className="font-black">Expérience indisponible</h1><p className="mt-2 text-sm text-slate-500">{error}</p></div></main>;
  if (!data) return <main className="grid min-h-[100dvh] place-items-center bg-[#F5F7FA] font-black text-[#0B2447]">Analyse des talents…</main>;

  const talents = Array.isArray(data.talents) ? data.talents : [];
  const profileAccess = data.profileAccess === true;
  const subscriptionUrl = "/abonnement?productType=RECRUITER";
  const accountAction = () => {
    if (data.authenticatedRecruiter) {
      router.push(subscriptionUrl);
      return;
    }
    router.push(`/?recruiterSignup=1&shareToken=${encodeURIComponent(token)}`);
  };

  return (
    <main className="min-h-[100dvh] bg-[#F5F7FA] text-[#0B2447]">
      <header className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="font-black"><span className="text-[#174EA6]">JOB</span><span className="text-[#FFE135]">LY</span></div>
          {!profileAccess && <button onClick={accountAction} className="rounded-full bg-[#174EA6] px-4 py-2 text-xs font-black text-white">{data.authenticatedRecruiter ? "Débloquer les profils" : "Créer mon compte recruteur"}</button>}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-7">
          <p className="text-[10px] font-black uppercase tracking-[.25em] text-slate-400">JOBLY · TALENT INTELLIGENCE</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Les talents correspondant à votre besoin</h1>
          <p className="mt-2 text-sm text-slate-500">{data.share?.jobTitle || data.job?.title || "Votre opportunité"}{data.share?.companyName ? " · " + data.share.companyName : ""}</p>
          <p className="mt-2 text-xs text-slate-500">Sélection des cinq meilleurs talents dont le score atteint au moins 90 %.</p>
        </div>

        {talents.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {talents.map((talent: any, index: number) => profileAccess ? (
              <article key={talent.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-blue-50 font-black text-[#174EA6]">
                    {talent.profilePhotoUrl ? <img src={talent.profilePhotoUrl} alt="" className="h-full w-full object-cover" /> : <UserRound size={20} />}
                  </div>
                  <div className="min-w-0"><h2 className="truncate font-black">{talent.name}</h2><p className="truncate text-xs text-slate-500">{talent.headline}</p></div>
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Correspondance</div><div className="text-3xl font-black text-[#174EA6]">{talent.matchPercent}%</div></div>
                  <div className="text-right text-xs text-slate-500">{talent.experienceYears} an{talent.experienceYears > 1 ? "s" : ""}<br />{talent.location}</div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">{(talent.skills || []).map((skill: string) => <span key={skill} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold">{skill}</span>)}</div>
                <button onClick={() => router.push("/recruiter/talents/profile?userId=" + encodeURIComponent(talent.id) + "&shareToken=" + encodeURIComponent(token))} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-xs font-black"><UserRound size={13} /> Ouvrir le profil</button>
              </article>
            ) : (
              <article key={talent.rank || index} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-slate-100">
                    <UserRound size={22} className="text-slate-400 blur-[2px]" />
                    <span className="absolute inset-0 backdrop-blur-md" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2" aria-label="Profil anonymisé">
                    <div className="h-3 w-28 rounded-full bg-slate-200 blur-[3px]" />
                    <div className="h-2.5 w-20 rounded-full bg-slate-100 blur-[3px]" />
                  </div>
                </div>
                <div className="mt-5 flex items-end justify-between">
                  <div><div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score de matching</div><div className="text-3xl font-black text-[#174EA6]">{talent.matchPercent}%</div></div>
                  <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-500">Profil flouté</div>
                </div>
                <div className="mt-4 space-y-2" aria-hidden="true"><div className="h-2.5 w-full rounded-full bg-slate-100 blur-[3px]" /><div className="h-2.5 w-4/5 rounded-full bg-slate-100 blur-[3px]" /></div>
                <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 py-3 text-xs font-black text-slate-400"><Lock size={13} /> Profil réservé à l'abonnement éligible</div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-10 text-center shadow-sm"><Sparkles className="mx-auto text-[#FFE135]" /><h2 className="mt-3 font-black">Aucun talent public ne dépasse actuellement le seuil de 90 %.</h2><p className="mt-2 text-sm text-slate-500">Le matching est recalculé à partir des profils dont la visibilité publique est activée.</p></div>
        )}

        {!profileAccess && talents.length > 0 && (
          <div className="mt-8 rounded-[28px] bg-[#081B36] p-6 text-white sm:p-8">
            <p className="text-[10px] font-black uppercase tracking-[.25em] text-[#FFE135]">Accès recruteur premium</p>
            <h2 className="mt-2 text-2xl font-black">Les scores sont visibles. Les identités et les profils restent protégés.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">Un abonnement Recruteur Premium ou Pro actif avec le droit « Top 5 Matching Profiles » permet d'ouvrir ces cinq profils. Les cartes gratuites ne sont ni cliquables ni consultables.</p>
            <button onClick={accountAction} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#FFE135] px-5 py-3 text-sm font-black text-[#081B36]">{data.authenticatedRecruiter ? "Voir les abonnements Recruteur" : "Créer mon compte recruteur"} <ArrowRight size={16} /></button>
          </div>
        )}
      </div>
    </main>
  );
}
