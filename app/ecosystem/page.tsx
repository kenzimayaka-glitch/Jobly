// Bon Plan: leaving requires an explicit confirmation, then returns to the ecosystem selector.
"use client";

import { Suspense, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import EcosystemSelector from "../../components/EcosystemSelector";
import { JIA_MASTER_DATA_URI } from "../../components/JiaMaster";

function EcosystemContent() {
  const params = useSearchParams();
  const [jiaGuide, setJiaGuide] = useState("Je suis J’IA. Je vais t’aider à choisir l’espace qui correspond à ton objectif.");
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

          <EcosystemSelector
            showBonPlan
            onGuide={(eco) => setJiaGuide(
              eco.id === "talent" ? "Tu cherches un emploi ou veux construire ta carrière ? Talent est ton espace." :
              eco.id === "recruiter" ? "Tu recrutes ? Recruiter te permet de trouver les talents dont tu as besoin." :
              eco.id === "partner" ? "Tu veux développer ton activité avec Jobly ? Découvre Partner." :
              "Découvre les offres et avantages exclusifs dans Bon Plan."
            )}
          />

          <div className="pointer-events-none fixed bottom-3 left-3 z-30 flex max-w-[min(360px,calc(100vw-24px))] items-end gap-2 sm:bottom-5 sm:left-5">
            <motion.div
              className="relative h-[76px] w-[76px] shrink-0 rounded-full border border-white/70 bg-white/80 p-1.5 shadow-[0_14px_35px_rgba(20,38,78,0.22)] backdrop-blur-xl"
              animate={{ y: [0, -4, 0], scale: [1, 1.015, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <img src={JIA_MASTER_DATA_URI} alt="J’IA — guide Jobly" className="h-full w-full object-contain object-bottom" draggable={false} />
              <span className="absolute bottom-1 right-1 h-3 w-3 rounded-full border-2 border-white bg-[#FFDE00] shadow-[0_0_10px_rgba(255,222,0,.9)]" aria-hidden="true" />
            </motion.div>
            <motion.div
              key={jiaGuide}
              initial={{ opacity: 0, y: 6, scale: .98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="mb-3 rounded-[18px] border border-white/70 bg-white/90 px-3.5 py-2.5 text-[11px] font-semibold leading-[1.35] text-[#0B1F4B] shadow-[0_12px_30px_rgba(20,38,78,0.16)] backdrop-blur-xl"
            >
              <span className="mr-1 font-black text-[#22448B]">J’IA</span>{jiaGuide}
            </motion.div>
          </div>

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
