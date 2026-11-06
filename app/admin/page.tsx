"use client";

import { useRouter } from "next/navigation";
import { ADMIN_WORKSPACE_TEMPLATES } from "@/lib/adminWorkspaceCatalog";

const lanes = [
  {
    title: "À examiner",
    subtitle: "Files et dossiers qui nécessitent une décision",
    cards: [
      { title: "Paiements événements", detail: "Justificatifs Mobile Money et virements à vérifier.", href: "/admin/events/payments", label: "Finance" },
      { title: "Mobility · KYC & financements", detail: "Prestataires, engagements et preuves de transfert.", href: "/admin/mobility", label: "Contrôle" },
      { title: "Espaces métier", detail: "Créer les espaces internes de l'administrateur maître.", href: "/admin/workspaces", label: "Accès" },
    ],
  },
  {
    title: "Opérations",
    subtitle: "Flux de l'écosystème Jobly",
    cards: [
      { title: "Offres & ingestion", detail: "Relancer et contrôler le pipeline des offres agrégées.", href: "/admin/jobs/reprocess", label: "Africa" },
      { title: "Partenaires", detail: "Créer et rattacher les partenaires opérationnels Mobility.", href: "/admin/partners/create", label: "Écosystème" },
      { title: "Codes Pro", detail: "Gérer les accès sponsorisés et les entitlements.", href: "/admin/promo-codes", label: "Commercial" },
    ],
  },
  {
    title: "Intelligence",
    subtitle: "Comprendre, anticiper et décider",
    cards: [
      { title: "J’IA · CEO Intelligence", detail: "Cockpit de situation, risques, opportunités et projections.", href: "/admin/jia", label: "J’IA" },
      { title: "J’IA · CEO Copilot", detail: "Interroger les données et l'intelligence de Jobly.", href: "/admin/jia/chat", label: "J’IA" },
      { title: "Réception Mobile Money", detail: "Appairage des appareils et configuration marchande.", href: "/admin/payments/sms", label: "Finance" },
    ],
  },
];

export default function AdminHome() {
  const router = useRouter();
  return (
    <main className="min-h-[calc(100dvh-64px)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#3156A4]">JOBLY · ADMIN MASTER</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[#10264A]">Pilotage 360°</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#66758D]">Un cockpit unique pour piloter les modules existants, créer les espaces spécialisés et accéder aux opérations sécurisées de Jobly.</p>
          </div>
          <button onClick={() => router.push("/admin/workspaces")} className="rounded-full bg-[#FFE135] px-5 py-3 text-xs font-black text-[#10264A]">Gérer mes espaces métier</button>
        </div>

        <div className="mt-7 grid gap-4 xl:grid-cols-3">
          {lanes.map((lane) => (
            <section key={lane.title} className="rounded-[24px] border border-[#DEE6F0] bg-[#EAF0F7] p-3">
              <div className="px-2 py-2">
                <h2 className="text-sm font-black text-[#233B62]">{lane.title}</h2>
                <p className="mt-1 text-[10px] text-[#77869C]">{lane.subtitle}</p>
              </div>
              <div className="space-y-3">
                {lane.cards.map((card) => (
                  <button key={card.href} onClick={() => router.push(card.href)} className="w-full rounded-2xl border border-[#E3E9F1] bg-white p-4 text-left shadow-[0_5px_16px_rgba(16,38,74,.04)] transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-black text-[#10264A]">{card.title}</h3>
                      <span className="rounded-full bg-[#F2F5F9] px-2 py-1 text-[9px] font-black text-[#687891]">{card.label}</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-[#65748A]">{card.detail}</p>
                    <p className="mt-3 text-[9px] font-black uppercase tracking-[0.14em] text-[#3156A4]">Ouvrir le module →</p>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-7 rounded-[24px] border border-[#DEE6F0] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 className="text-lg font-black text-[#10264A]">Espaces spécialisés</h2><p className="mt-1 text-xs text-[#718099]">Quatre espaces internes, une seule identité administrateur.</p></div>
            <button onClick={() => router.push("/admin/workspaces")} className="text-xs font-black text-[#3156A4]">Configurer →</button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {ADMIN_WORKSPACE_TEMPLATES.map((template) => (
              <button key={template.code} onClick={() => router.push("/admin/workspaces")} className="rounded-2xl border border-[#E3E9F1] bg-[#F8FAFD] p-4 text-left hover:border-[#AEBED4]">
                <div className="text-[9px] font-black uppercase tracking-[0.18em] text-[#72819A]">{template.code}</div>
                <div className="mt-2 text-sm font-black text-[#233B62]">{template.label}</div>
                <div className="mt-1 text-[10px] leading-relaxed text-[#78869C]">{template.description}</div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
