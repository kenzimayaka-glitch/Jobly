"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/PageHeader";

export default function BonsPlansPage() {
  const router = useRouter();
  const [showQuitConfirmation, setShowQuitConfirmation] = useState(false);

  return (
    <main className="min-h-[100dvh] bg-[#FFFDF5] text-[#0B1F4B]">
      <PageHeader label="Bon Plan" eyebrow="JOBLY" initial="J" />
      <div className="mx-auto max-w-2xl px-5 pb-10 pt-5">
        <button type="button" onClick={() => setShowQuitConfirmation(true)} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold text-[#0B1F4B] shadow-sm">
          ← Quitter
        </button>
        <div className="overflow-hidden rounded-[30px] bg-[#FFF3B8] p-6 shadow-[0_18px_50px_rgba(70,55,0,.10)]">
          <span className="inline-flex rounded-full bg-[#FFC72C] px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-[#0B1F4B]">Bon Plan JOBLY</span>
          <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-[-.03em]">Les bons plans qui font la différence.</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[#5D5B4A]">Retrouvez les offres, avantages et services sélectionnés pour la communauté JOBLY.</p>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3"><button onClick={()=>router.push("/bons-plans/mobility")} className="rounded-2xl bg-white p-4 text-left shadow-sm"><b>Mobility</b><span className="mt-1 block text-xs text-slate-500">Transport, logement, Pass →</span></button><button onClick={()=>router.push("/opportunities")} className="rounded-2xl bg-white p-4 text-left shadow-sm"><b>Opportunités</b><span className="mt-1 block text-xs text-slate-500">Jobs, stages, ONG →</span></button></div>
        <div className="mt-5 rounded-[24px] bg-white p-5 text-sm text-[#66738A] shadow-sm">
          L'espace Bon Plan est indépendant des écosystèmes Talent, Recruiter et Partner. Pour changer d'écosystème, utilisez <strong className="text-[#0B1F4B]">Quitter</strong>.
        </div>
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
