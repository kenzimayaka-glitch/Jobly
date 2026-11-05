"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export default function PartnerMobilityReports() {
  const [rows, setRows] = useState<any[]>([]);
  const [message, setMessage] = useState("Chargement des rapports liés au prestataire…");

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error("Session requise.");
      const response = await fetch("/api/mobility/partner/reports?format=json", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.message || "Rapports indisponibles.");
      if (!active) return;
      setRows(payload.rows || []);
      setMessage(payload.rows?.length ? "" : "Aucun dossier n'est actuellement rattaché à ce prestataire.");
    })().catch((error) => {
      if (active) setMessage(error instanceof Error ? error.message : "Chargement impossible.");
    });
    return () => { active = false; };
  }, []);

  return (
    <main className="min-h-[100dvh] bg-white px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <span className="rounded-full bg-[#FFF5CC] px-3 py-1 text-xs font-black text-[#8A6500]">MOBILITY PARTNER</span>
        <h1 className="mt-4 text-3xl font-black">Rapports de service</h1>
        {message && <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{message}</p>}
        <div className="mt-6 overflow-x-auto rounded-[24px] border">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50"><tr><th className="p-3">Trajet</th><th className="p-3">Coût</th><th className="p-3">Éligibilité</th><th className="p-3">Statut</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-3">{row.departCity} → {row.arriveeCity}</td>
                  <td className="p-3">{Number(row.costTotal || 0).toLocaleString("fr-FR")} XAF</td>
                  <td className="p-3">{row.eligibilityStatus || "—"} ({row.eligibilityBurdenPercent ?? "—"} %)</td>
                  <td className="p-3">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
