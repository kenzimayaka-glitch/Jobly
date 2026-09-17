// Bon Plan: leaving requires an explicit confirmation, then returns to the ecosystem selector.
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import EcosystemSelector from "../../components/EcosystemSelector";

function EcosystemContent() {
  const params = useSearchParams();
  const switcher = params.get("mode") === "switcher";

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#F8FAFF] text-[#0B1F4B]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#FFC72C]/14 blur-3xl" />
        <div className="absolute -right-24 top-28 h-72 w-72 rounded-full bg-[#2E5C9E]/10 blur-3xl" />
        <div className="absolute bottom-[-90px] left-1/3 h-64 w-64 rounded-full bg-[#12B76A]/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        <PageHeader label="Écosystèmes" eyebrow="JOBLY" initial="J" />

        <div className="mx-auto w-full max-w-3xl px-4 pb-2 pt-1 sm:px-6">
          <div className="mb-2 text-center">
            <div className="mx-auto mb-2 flex w-fit items-center gap-2 rounded-full border border-white bg-white/80 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-[#64718A] shadow-sm backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FFC72C] shadow-[0_0_12px_rgba(255,199,44,.9)]" />
              {switcher ? "Changer d'espace" : "Bienvenue sur JOBLY"}
            </div>
            <h1 className="font-heading text-[23px] font-extrabold leading-[1.08] tracking-[-0.035em] text-[#0B1F4B] sm:text-[36px]">
              {switcher ? "Choisissez votre nouvel espace" : "Choisissez votre espace"}
            </h1>
            <p className="mx-auto mt-1 max-w-xl text-[13px] leading-relaxed text-[#65728A]">
              {switcher ? "Passez d'un écosystème à l'autre ou découvrez les Bon Plans JOBLY." : "Un écosystème, des opportunités, une seule plateforme."}
            </p>
          </div>

          <EcosystemSelector showBonPlan />

          {!switcher && (
            <div className="mt-2 rounded-[18px] border border-white bg-white/75 px-3 py-2 text-center text-[10px] leading-relaxed text-[#66738A] shadow-sm backdrop-blur">
              Votre choix sera mémorisé pour vous faire entrer directement dans votre espace lors de vos prochaines connexions. Les Bon Plans restent accessibles à tout moment.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


export default function EcosystemPage() {
  return (
    <Suspense fallback={
      <main className="relative h-[100dvh] overflow-hidden bg-[#F8FAFF] text-[#0B1F4B]">
        <div className="relative z-10">
          <PageHeader label="Écosystèmes" eyebrow="JOBLY" initial="J" />
          <div className="mx-auto w-full max-w-3xl px-4 pb-2 pt-1 sm:px-6">
            <div className="mx-auto h-10 w-48 animate-pulse rounded-full bg-white/80" />
            <div className="mx-auto mt-4 h-9 w-64 animate-pulse rounded-xl bg-white/80" />
            <div className="mx-auto mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-white/70" />
            <div className="mt-8 h-64 animate-pulse rounded-[28px] bg-white/70" />
          </div>
        </div>
      </main>
    }>
      <EcosystemContent />
    </Suspense>
  );
}
