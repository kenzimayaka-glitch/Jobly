"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MapPreview from "../../../../../components/mobility/MapPreview";
import { MOBILITY_STEPS } from "../../../../../lib/mobility";
import { getSupabaseClient } from "@/lib/supabase";

export default function StatusPage() {
  const router = useRouter();
  const [request, setRequest] = useState<any>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const raw = localStorage.getItem("jobly-mobility-request");
      if (!raw) return;
      const local = JSON.parse(raw);
      setRequest(local);
      const session = await getSupabaseClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token || !local?.id) return;
      const response = await fetch("/api/mobility/request?requestId=" + encodeURIComponent(local.id), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!active) return;
      if (response.ok && payload.request) {
        setRequest(payload.request);
        localStorage.setItem("jobly-mobility-request", JSON.stringify(payload.request));
      } else if (!response.ok) setMessage(payload.message || "Actualisation du dossier impossible.");
    })().catch(() => { if (active) setMessage("Actualisation du dossier impossible."); });
    return () => { active = false; };
  }, []);

  return (
    <section className="min-h-[100dvh] bg-transparent px-5 py-8">
      <div className="mx-auto max-w-2xl">
        <span className="rounded-full bg-[#FFF5CC] px-3 py-1 text-xs font-black text-[#8A6500]">SUIVI MOBILITY</span>
        <h1 className="mt-4 text-3xl font-black">Suivi de ma mobilité</h1>
        {message && <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p>}
        {!request ? (
          <div className="mt-7 rounded-[24px] border border-dashed p-8 text-center">
            <p className="font-black">Aucune demande</p>
            <p className="mt-1 text-sm text-slate-500">Crée une demande pour suivre ton dossier.</p>
          </div>
        ) : (
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="talent-card rounded-[24px] border bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-500">Trajet</p><b>{request.departCity} → {request.arriveeCity}</b>
                <div className="mt-4"><MapPreview from={{ lat: request.departLat, lng: request.departLng, label: request.departCity }} to={{ lat: request.arriveeLat, lng: request.arriveeLng, label: request.arriveeCity }} /></div>
              </div>
              <div className="talent-card rounded-[24px] border bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-500">Éligibilité</p>
                <b className="text-xl">{request.eligibilityStatus || "À recalculer"}</b>
                <p className="mt-2 text-sm text-slate-500">Charge : {request.eligibilityBurdenPercent ?? "—"} % · Seuil : {request.eligibilityThresholdPercent ?? 50} %</p>
                <p className="mt-3 text-sm text-slate-500">Garantie recruteur : {request.recruiterGuaranteed ? "Acceptée" : "En attente"}</p>
                <p className="mt-3 text-sm text-slate-500">{request.eligibilityReason || "Le moteur finalise les conditions."}</p>
                <button onClick={() => router.push("/bons-plans/mobility/talent/programs")} className="mt-5 w-full rounded-full bg-[#0A3D9C] px-5 py-3 text-sm font-black text-white">
                  Voir les programmes de financement
                </button>
              </div>
            </div>
            <div className="mt-6 talent-card rounded-[24px] border bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Progression</h2>
              {MOBILITY_STEPS.map((step, index) => {
                const done = index + 1 <= Number(request.currentStep || 1);
                return (
                  <div key={step} className="flex gap-4">
                    <div className={`mt-1 h-4 w-4 shrink-0 rounded-full ${done ? "bg-[#0A3D9C]" : "bg-slate-200"}`} />
                    <div className="pb-5"><b className={done ? "text-[#0A1931]" : "text-slate-400"}>{step}</b></div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
