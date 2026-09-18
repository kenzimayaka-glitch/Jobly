"use client";

import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import BottomNav from "@/components/BottomNav";
import TalentBackground from "@/components/TalentBackground";

const tracks = [
  { title: "Stages & premières expériences", text: "Stages académiques, professionnels et de vacances pour construire une première expérience.", href: "/jobs", icon: "🎓" },
  { title: "Jobs étudiants & temps partiel", text: "Jobs compatibles avec les études, missions ponctuelles et activités à temps partiel.", href: "/opportunities", icon: "◷" },
  { title: "Missions & freelance", text: "Petites missions, services et projets pour apprendre en faisant et générer ses premiers revenus.", href: "/opportunities", icon: "✦" },
  { title: "Formation & préparation", text: "Formations, préparation aux concours et montée en compétences pour renforcer son profil.", href: "/opportunities", icon: "↗" },
  { title: "Volontariat & projets", text: "Engagement associatif, projets et challenges utiles pour développer son réseau et ses compétences.", href: "/communities", icon: "◉" },
  { title: "Événements étudiants", text: "Salons, ateliers, rencontres et événements professionnels accessibles aux étudiants.", href: "/events", icon: "◆" },
];

export default function CampusPage() {
  const router = useRouter();

  return (
    <main className="talent-shell relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-28 text-navy">
      <TalentBackground />
      <div className="relative z-10">
        <PageHeader label="Campus" eyebrow="JOBLY" initial="J" onBack={() => router.push("/bons-plans")} theme="talent" />

        <div className="mx-auto max-w-4xl px-5 py-6">
          <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#123D8F] via-[#1757B8] to-[#4C8DFF] p-6 text-white shadow-[0_24px_70px_rgba(18,61,143,.20)] sm:p-8">
            <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em]">JOBLY CAMPUS · ÉTUDIANTS</span>
            <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-[-.04em] sm:text-5xl">
              La carrière professionnelle commence avant le premier job.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/80 sm:text-[15px]">
              Un espace pensé d’abord pour les étudiants : expériences, revenus, compétences, réseau et mobilité — sans confondre Campus avec l’espace Talent.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wider text-white/80">
              <span className="rounded-full bg-white/10 px-3 py-2">Expérience</span>
              <span className="rounded-full bg-white/10 px-3 py-2">Compétences</span>
              <span className="rounded-full bg-white/10 px-3 py-2">Revenus</span>
              <span className="rounded-full bg-white/10 px-3 py-2">Réseau</span>
            </div>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Parcours Jobly Campus">
            {tracks.map((track) => (
              <button
                key={track.title}
                type="button"
                onClick={() => router.push(track.href)}
                className="group rounded-[26px] border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-lg">{track.icon}</div>
                <h2 className="mt-4 text-lg font-black">{track.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{track.text}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-black text-jobly-blue">
                  Explorer <span className="transition-transform group-hover:translate-x-1">→</span>
                </span>
              </button>
            ))}
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={() => router.push("/jobs")} className="rounded-2xl bg-[#FFF5CC] p-4 text-left">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#806000]">Action 01</div>
              <div className="mt-2 font-black text-[#352900]">Chercher un stage</div>
            </button>
            <button type="button" onClick={() => router.push("/communities")} className="rounded-2xl bg-violet-50 p-4 text-left">
              <div className="text-[10px] font-black uppercase tracking-wider text-violet-600">Action 02</div>
              <div className="mt-2 font-black text-violet-950">Construire son réseau</div>
            </button>
            <button type="button" onClick={() => router.push("/events")} className="rounded-2xl bg-emerald-50 p-4 text-left">
              <div className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Action 03</div>
              <div className="mt-2 font-black text-emerald-950">Trouver un événement</div>
            </button>
          </section>

          <section className="mt-6 rounded-[26px] border border-blue-100 bg-white p-5 shadow-sm">
            <h2 className="font-black">J’IA Campus</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              J’IA peut relier études, compétences, localisation, objectifs et opportunités pour recommander le prochain pas pertinent. Les données business internes de JOBLY restent séparées de l’expérience utilisateur.
            </p>
          </section>
        </div>

        <BottomNav active="/career-brain" />
      </div>
    </main>
  );
}
