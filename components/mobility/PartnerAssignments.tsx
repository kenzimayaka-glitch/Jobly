"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Assignment = {
  id: string;
  mobilityRequestId: string;
  status: string;
  agreedAmount: number | null;
  currency: string;
  MobilityProviderService?: { title?: string; serviceType?: string; city?: string } | null;
  MobilityRequest?: { departCity?: string; arriveeCity?: string; distanceKm?: number; status?: string } | null;
};

export default function PartnerAssignments({ title = "Mes demandes" }: { title?: string }) {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [message, setMessage] = useState("Chargement des affectations…");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const session = await getSupabaseClient().auth.getSession();
    const token = session.data.session?.access_token;
    if (!token) {
      setMessage("Connecte-toi avec un compte prestataire Mobility vérifié.");
      return;
    }
    const response = await fetch("/api/mobility/partner/assignments", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(payload.message || "Affectations indisponibles.");
      return;
    }
    setRows(payload.assignments || []);
    setMessage(payload.assignments?.length ? "" : "Aucune affectation n'a encore été adressée à ce prestataire.");
  }

  useEffect(() => { load().catch(() => setMessage("Chargement impossible.")); }, []);

  async function transition(assignmentId: string, status: string) {
    setBusy(assignmentId);
    try {
      const session = await getSupabaseClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Session requise.");
      const response = await fetch("/api/mobility/partner/assignments", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, status }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Transition impossible.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Mise à jour impossible.");
    } finally {
      setBusy(null);
    }
  }

  const actions: Record<string, { label: string; status: string }[]> = {
    PROPOSED: [{ label: "Accepter", status: "ACCEPTED" }, { label: "Refuser", status: "DECLINED" }],
    ACCEPTED: [{ label: "Démarrer", status: "IN_PROGRESS" }],
    IN_PROGRESS: [{ label: "Terminer", status: "COMPLETED" }],
  };

  return (
    <main className="min-h-[100dvh] bg-white px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <span className="rounded-full bg-[#FFF5CC] px-3 py-1 text-xs font-black text-[#8A6500]">MOBILITY PARTNER</span>
        <h1 className="mt-4 text-3xl font-black">{title}</h1>
        {message && <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{message}</p>}
        <div className="mt-6 grid gap-4">
          {rows.map((row) => {
            const service = Array.isArray(row.MobilityProviderService) ? row.MobilityProviderService[0] : row.MobilityProviderService;
            const request = Array.isArray(row.MobilityRequest) ? row.MobilityRequest[0] : row.MobilityRequest;
            return (
              <article key={row.id} className="rounded-[24px] border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-slate-400">{service?.serviceType || "SERVICE"}</p>
                    <h2 className="mt-1 text-lg font-black">{service?.title || "Service Mobility"}</h2>
                    <p className="mt-1 text-sm text-slate-500">{request?.departCity || "—"} → {request?.arriveeCity || "—"} · {request?.distanceKm ?? "—"} km</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black">{row.status}</span>
                </div>
                <p className="mt-3 text-sm text-slate-600">Montant convenu : {row.agreedAmount == null ? "à confirmer" : Number(row.agreedAmount).toLocaleString("fr-FR") + " " + row.currency}</p>
                <p className="mt-1 text-xs text-slate-500">Identifiant dossier : {row.mobilityRequestId}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(actions[row.status] || []).map((action) => (
                    <button
                      key={action.status}
                      disabled={busy === row.id}
                      onClick={() => transition(row.id, action.status)}
                      className="rounded-full bg-[#0A3D9C] px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                    >
                      {busy === row.id ? "Traitement…" : action.label}
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
