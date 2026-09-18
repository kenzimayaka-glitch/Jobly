"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import TalentBackground from "@/components/TalentBackground";

type CareerOs = { readiness?: number; gap?: string[]; nextBestAction?: string };

const tracks = [
  ["internships","Stages & premières expériences","Stages académiques, professionnels et de vacances pour obtenir tes premières preuves d'expérience.","/jobs","🎓","EXPÉRIENCE"],
  ["student-jobs","Jobs étudiants & temps partiel","Activités compatibles avec les études pour apprendre, travailler et commencer à générer des revenus.","/opportunities","◷","REVENUS"],
  ["missions","Missions, courses & freelance","Petites missions, services, projets freelance et challenges pour apprendre en faisant.","/opportunities","✦","MISSIONS"],
  ["learning","Formation & préparation","Formations, préparation aux concours, montée en compétences et préparation à l'insertion.","/opportunities","↗","COMPÉTENCES"],
  ["volunteering","Volontariat & projets","Engagement associatif, bénévolat, projets et expériences utiles pour construire son réseau.","/communities","◉","RÉSEAU"],
  ["events","Événements étudiants & professionnels","Salons, ateliers, rencontres, challenges et événements qui rapprochent du monde professionnel.","/events","◆","OPPORTUNITÉS"],
] as const;

const journey = [
  ["01","Découvrir","Comprendre les métiers, secteurs, compétences et opportunités qui correspondent à ton profil."],
  ["02","Expérimenter","Accumuler stages, jobs étudiants, missions, projets, volontariat et premières preuves."],
  ["03","Progresser","Transformer chaque expérience en compétences, preuves et meilleure orientation."],
  ["04","Entrer dans le monde professionnel","Faire le pont vers Talent, les candidatures, la mobilité et les opportunités durables."],
] as const;

export default function CampusPage() {
  const router = useRouter();
  const [career, setCareer] = useState<CareerOs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const session = (await getSupabaseClient().auth.getSession()).data.session;
        if (!session) { router.replace("/"); return; }
        const r = await fetch("/api/career-os", {
          headers: { Authorization: "Bearer " + session.access_token },
        });
        if (r.ok) setCareer(await r.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const readiness = career?.readiness ?? null;
  const gap = career?.gap ?? [];
  const nextAction = career?.nextBestAction ?? "Définir ton premier objectif professionnel";

  return (
    <main className="talent-shell relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-28 text-navy">
      <TalentBackground />
      <div className="relative z-10">
        <PageHeader label="Campus" eyebrow="JOBLY" initial="J" onBack={() => router.push("/bons-plans")} theme="talent" />
        <div className="mx-auto max-w-4xl px-5 py-6">

          <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#123D8F] via-[#1757B8] to-[#4C8DFF] p-6 text-white shadow-[0_24px_70px_rgba(18,61,143,.20)] sm:p-8">
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em]">JOBLY CAMPUS · ÉTUDIANTS</span>
            <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-[-.04em] sm:text-5xl">La carrière professionnelle commence avant le premier job.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 sm:text-[15px]">
              Campus est l'espace étudiant de Jobly : construire ses premières expériences, développer ses compétences,
              créer son réseau, gagner ses premiers revenus et préparer la suite — sans confondre Campus avec l'espace Talent.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-white/80">
              {["Expérience","Compétences","Revenus","Réseau","Mobilité","Insertion"].map(x => <span key={x} className="rounded-full bg-white/10 px-3 py-2">{x}</span>)}
            </div>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-4" aria-label="Parcours Campus">
            {journey.map(([n,title,text]) => (
              <div key={n} className="rounded-[24px] border border-slate-100 bg-white p-4 shadow-sm">
                <span className="text-[10px] font-black tracking-[.18em] text-jobly-blue">{n}</span>
                <h2 className="mt-2 text-base font-black">{title}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">{text}</p>
              </div>
            ))}
          </section>

          <section className="mt-6 rounded-[28px] border border-white bg-white p-5 shadow-sm sm:p-6">
            <span className="text-[10px] font-black uppercase tracking-[.16em] text-jobly-blue">J’IA CAMPUS</span>
            <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">Ton copilote pour passer de l'idée à l'expérience.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">J’IA peut s'appuyer sur ton Career OS pour orienter, recommander, préparer, matcher et suivre ton parcours.</p>
              </div>
              <div className="rounded-2xl bg-[#FFF4BF] px-4 py-3 text-right">
                <div className="text-[10px] font-black uppercase tracking-wider text-[#735700]">Readiness actuelle</div>
                <div className="mt-1 text-2xl font-black text-[#0B1F4B]">{loading ? "…" : readiness === null ? "—" : readiness + "%"}</div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-blue-50 p-4"><b className="text-sm">Orientation</b><p className="mt-1 text-xs leading-5 text-slate-500">Clarifier métiers, secteurs, compétences et prochaines étapes.</p></div>
              <div className="rounded-2xl bg-emerald-50 p-4"><b className="text-sm">Matching</b><p className="mt-1 text-xs leading-5 text-slate-500">Relier ton profil aux expériences et opportunités disponibles.</p></div>
              <div className="rounded-2xl bg-violet-50 p-4"><b className="text-sm">Suivi</b><p className="mt-1 text-xs leading-5 text-slate-500">Mesurer ce que chaque expérience ajoute réellement à ton parcours.</p></div>
            </div>
            <div className="mt-4 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 p-4">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">Prochaine action détectée</div>
              <div className="mt-1 text-sm font-bold">{nextAction}</div>
              {gap.length > 0 && <div className="mt-2 text-xs text-slate-500">Éléments à renforcer : {gap.slice(0,3).join(" · ")}</div>}
            </div>
            <button type="button" onClick={() => router.push("/career-brain")} className="mt-5 w-full rounded-2xl bg-jobly-blue py-3.5 text-sm font-black text-white">Ouvrir mon Career Brain →</button>
          </section>

          <section className="mt-6">
            <div className="mb-4">
              <span className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">PREMIÈRES EXPÉRIENCES</span>
              <h2 className="mt-1 text-2xl font-black">Construis ton capital professionnel avant le premier CDI.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Chaque expérience doit pouvoir devenir une preuve, une compétence, une connexion ou une nouvelle opportunité.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {tracks.map(([id,title,text,href,icon,label]) => (
                <button key={id} type="button" onClick={() => router.push(href)} className="group rounded-[26px] border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-lg">{icon}</span>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[9px] font-black tracking-[.14em] text-slate-500">{label}</span>
                  </div>
                  <h3 className="mt-4 text-lg font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-5 text-slate-500">{text}</p>
                  <span className="mt-4 inline-flex text-xs font-black text-jobly-blue">Explorer →</span>
                </button>
              ))}
            </div>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={() => router.push("/bons-plans/mobility")} className="rounded-[24px] border border-emerald-100 bg-emerald-50 p-5 text-left"><b className="text-base">Mobility</b><p className="mt-1 text-xs leading-5 text-slate-600">Distance, transport, logement et budget pour rendre une opportunité géographiquement accessible.</p></button>
            <button type="button" onClick={() => router.push("/events")} className="rounded-[24px] border border-orange-100 bg-orange-50 p-5 text-left"><b className="text-base">Events</b><p className="mt-1 text-xs leading-5 text-slate-600">Rencontres, salons, ateliers et challenges pour créer les premières connexions professionnelles.</p></button>
            <button type="button" onClick={() => router.push("/communities")} className="rounded-[24px] border border-violet-100 bg-violet-50 p-5 text-left"><b className="text-base">Community</b><p className="mt-1 text-xs leading-5 text-slate-600">Communautés par métier, ville, secteur ou centre d'intérêt — distinctes du parcours Campus.</p></button>
          </section>

          <section className="mt-6 rounded-[28px] border border-slate-100 bg-white p-5 shadow-sm sm:p-6">
            <span className="text-[10px] font-black uppercase tracking-[.16em] text-emerald-600">PROGRAMMES & PARTENAIRES</span>
            <h2 className="mt-2 text-2xl font-black">Campus peut être co-construit avec les acteurs du territoire.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Entreprises, écoles et universités, collectivités, ministères, ONG, associations, fondations et organisations communautaires peuvent soutenir ou créer des programmes, expériences, formations et challenges.</p>
            <button type="button" onClick={() => router.push("/partner")} className="mt-5 rounded-2xl bg-[#0B1F4B] px-5 py-3 text-sm font-black text-white">Découvrir l'espace Partner →</button>
          </section>

          <section className="mt-6 rounded-[24px] border border-dashed border-slate-200 bg-white/70 p-5">
            <div className="text-[10px] font-black uppercase tracking-[.16em] text-slate-400">PASSERELLE DE CARRIÈRE</div>
            <h2 className="mt-2 text-xl font-black">Campus → premières preuves → Career Twin → Talent</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Les expériences réalisées pendant Campus ont vocation à enrichir progressivement le Career Twin et à préparer l'entrée dans l'écosystème Talent. Elles ne sont pas un simple catalogue d'offres.</p>
            <button type="button" onClick={() => router.push("/career-brain")} className="mt-4 text-sm font-black text-jobly-blue">Voir mon parcours professionnel →</button>
          </section>
        </div>
      </div>
      <BottomNav active="/career-brain" />
    </main>
  );
}
