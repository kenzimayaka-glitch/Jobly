"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PLAN_LABEL: Record<string, string> = { FREE: "Vous utilisez l'offre gratuite.", START: "Votre abonnement Start est actif.", PREMIUM: "Votre abonnement Premium est actif.", PRO: "Votre abonnement Pro est actif." };

export default function SubscriptionCard({ ecosystem }: { ecosystem: "TALENT" | "RECRUITER" | "PARTNER" }) {
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch("/api/entitlements").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  const plan = data?.subscription?.plan || "FREE";
  const ent = data?.entitlements;
  const usage = data?.usage;
  const fmt = (n: any) => (n === null || n === Infinity ? "Illimité" : n);

  return (
    <section className="rounded-[24px] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-extrabold">💳 Mon abonnement</h2>
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-white">{plan}</span>
      </div>
      <p className="mt-2 text-sm text-jobly-gray">{PLAN_LABEL[plan] || PLAN_LABEL.FREE}</p>
      {ent?.testUnlimited && (
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">Mode test : accès illimité activé pour cette session de démonstration.</p>
      )}
      {ent && (
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-bold text-slate-600">
          <div className="rounded-xl bg-slate-50 p-3">Crédits IA<div className="mt-1 text-base font-black text-slate-900">{fmt(ent.aiCredits)}</div></div>
          <div className="rounded-xl bg-slate-50 p-3">Stockage<div className="mt-1 text-base font-black text-slate-900">{ent.storageMb === Infinity ? "Illimité" : `${fmt(ent.storageMb)} Mo`}</div></div>
          {ecosystem === "TALENT" && (
            <>
              <div className="rounded-xl bg-slate-50 p-3">Candidatures/semaine<div className="mt-1 text-base font-black text-slate-900">{usage ? `${usage.applicationsThisWeek} / ${fmt(ent.applicationsPerWeek)}` : fmt(ent.applicationsPerWeek)}</div></div>
              <div className="rounded-xl bg-slate-50 p-3">Multi-postulation<div className="mt-1 text-base font-black text-slate-900">{ent.bulkApplicationLimit > 1 ? `Jusqu'à ${fmt(ent.bulkApplicationLimit)}` : "Non disponible"}</div></div>
            </>
          )}
          {ecosystem === "RECRUITER" && (
            <>
              <div className="rounded-xl bg-slate-50 p-3">Filtres ATS<div className="mt-1 text-base font-black text-slate-900 capitalize">{ent.recruiterAtsFilters === "none" ? "Non disponible" : ent.recruiterAtsFilters}</div></div>
              <div className="rounded-xl bg-slate-50 p-3">Boîtes mail<div className="mt-1 text-base font-black text-slate-900">{fmt(ent.recruiterEmailConnect)}</div></div>
            </>
          )}
        </div>
      )}
      <button onClick={() => router.push("/abonnement")} className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-extrabold text-slate-800">
        {plan === "FREE" ? "Voir START, PREMIUM et PRO →" : "Gérer mon abonnement →"}
      </button>
    </section>
  );
}
