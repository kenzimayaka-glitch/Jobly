"use client";

// Créée le 13/09/2026 (audit 360°) : la cloche de PageHeader n'avait aucune
// action nulle part dans l'app. Aucun moteur de notifications n'existe encore
// côté API/backend — cet écran affiche donc un état honnête ("rien pour
// l'instant") plutôt qu'une liste inventée, en attendant que la brique
// notifications soit réellement construite.

import { useRouter } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import DecorativeBackground from "../../components/DecorativeBackground";

export default function NotificationsPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-16 text-navy">
      <DecorativeBackground />
      <div className="relative z-10">
        <PageHeader label="Notifications" initial="J" onBack={() => router.back()} />

        <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6">
          <div className="flex flex-col items-center gap-3 rounded-[24px] border border-slate-100 bg-white px-4 py-12 text-center shadow-[0_16px_50px_rgba(22,37,74,0.10)]">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-jobly-blue text-xl text-white" aria-hidden="true">🔔</span>
            <p className="font-heading text-base font-extrabold text-navy">Aucune notification pour l'instant</p>
            <p className="max-w-xs text-sm text-jobly-gray">
              Vous serez prévenu ici dès qu'il y aura du nouveau sur vos candidatures, vos offres ou votre compte.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
