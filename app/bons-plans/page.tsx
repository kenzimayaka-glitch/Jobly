"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/PageHeader";

const pillars = [
  {
    id: "campus",
    title: "Jobly Campus",
    eyebrow: "ÉTUDIANTS",
    description: "Stages, jobs étudiants, alternance, missions, formations et premières expériences.",
    detail: "La carrière professionnelle commence avant le premier job.",
    href: "/campus",
    tone: "blue",
    icon: "🎓",
  },
  {
    id: "community",
    title: "Jobly Community",
    eyebrow: "COMMUNAUTÉ",
    description: "Rejoignez des communautés professionnelles par métier, ville, secteur ou centres d’intérêt.",
    detail: "Échanger, apprendre et créer des connexions utiles.",
    href: "/communities",
    tone: "purple",
    icon: "◉",
  },
  {
    id: "mobility",
    title: "Jobly Mobility",
    eyebrow: "MOBILITÉ",
    description: "Préparez un déplacement professionnel avec estimation du transport, logement et budget.",
    detail: "Bouger pour saisir l’opportunité.",
    href: "/bons-plans/mobility",
    tone: "green",
    icon: "↗",
  },
  {
    id: "events",
    title: "Jobly Events",
    eyebrow: "ÉVÉNEMENTS",
    description: "Découvrez les salons, ateliers, rencontres et rendez-vous qui rapprochent du job.",
    detail: "Votre réseau peut commencer par un événement.",
    href: "/events",
    tone: "orange",
    icon: "✦",
  },
] as const;

const tone = {
  blue: "border-blue-100 bg-blue-50/80",
  purple: "border-violet-100 bg-violet-50/80",
  green: "border-emerald-100 bg-emerald-50/80",
  orange: "border-orange-100 bg-orange-50/80",
};

export default function BonsPlansPage() {
  const router = useRouter();
  const [showQuitConfirmation, setShowQuitConfirmation] = useState(false);

  return (
    <main className="min-h-[100dvh] bg-[#F8FAFF] text-[#0B1F4B]">
      <PageHeader label="Bon Plan" eyebrow="JOBLY" initial="J" />

      <div className="mx-auto max-w-3xl px-5 pb-12 pt-5">
        <button
          type="button"
          onClick={() => setShowQuitConfirmation(true)}
          className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold text-[#0B1F4B] shadow-sm"
        >
          ← Quitter
        </button>

        <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#FFF1A8] via-[#FFD95A] to-[#FFE135] p-6 shadow-[0_20px_60px_rgba(70,55,0,.13)] sm:p-8">
          <span className="inline-flex rounded-full border border-white/50 bg-white/35 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em]">
            BON PLAN JOBLY
          </span>
          <h1 className="mt-4 max-w-2xl font-heading text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
            Plus qu’un bon plan. Un espace pour avancer.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#514400] sm:text-[15px]">
            Campus, Community, Mobility et Events réunissent les opportunités et services qui complètent votre parcours professionnel.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-[#5D4B00]">
            <span className="rounded-full bg-white/55 px-3 py-1.5">Opportunités</span>
            <span className="rounded-full bg-white/55 px-3 py-1.5">Réseau</span>
            <span className="rounded-full bg-white/55 px-3 py-1.5">Mobilité</span>
            <span className="rounded-full bg-white/55 px-3 py-1.5">Événements</span>
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Les quatre espaces Bon Plan">
          {pillars.map((pillar) => (
            <button
              key={pillar.id}
              type="button"
              onClick={() => router.push(pillar.href)}
              className={`group rounded-[26px] border p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[.99] ${tone[pillar.tone]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 text-xl shadow-sm">
                  {pillar.icon}
                </span>
                <span className="rounded-full bg-white/75 px-2.5 py-1 text-[9px] font-black tracking-[.14em] text-slate-500">
                  {pillar.eyebrow}
                </span>
              </div>
              <h2 className="mt-5 text-xl font-black tracking-tight">{pillar.title}</h2>
              <p className="mt-2 text-sm leading-5 text-slate-600">{pillar.description}</p>
              <p className="mt-4 text-xs font-bold text-[#0B1F4B]">{pillar.detail}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-black text-jobly-blue">
                Découvrir <span className="transition-transform group-hover:translate-x-1">→</span>
              </span>
            </button>
          ))}
        </section>

        <section className="mt-6 rounded-[24px] border border-white bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FFF4BF] text-sm">J</span>
            <div>
              <h2 className="font-black">J’IA accompagne tout le parcours</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Les quatre espaces restent indépendants des écosystèmes Talent, Recruiter et Partner, tout en pouvant être reliés par l’intelligence transversale de JOBLY.
              </p>
            </div>
          </div>
        </section>
      </div>

      {showQuitConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1F4B]/45 px-5 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="quit-bons-plans-title" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF3B8] text-xl">↗</div>
            <h2 id="quit-bons-plans-title" className="text-center text-xl font-bold text-[#0B1F4B]">Quitter les Bons Plans ?</h2>
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">Vous allez revenir au sélecteur des écosystèmes.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowQuitConfirmation(false)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#0B1F4B]">Annuler</button>
              <button type="button" onClick={() => router.push("/ecosystem")} className="rounded-2xl bg-[#0B1F4B] px-4 py-3 text-sm font-semibold text-white">Quitter</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
