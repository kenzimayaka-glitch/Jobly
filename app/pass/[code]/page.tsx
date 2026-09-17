"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type PassData = { passCode: string; status: string; passUsages: number; departCity?: string; arriveeCity?: string; distanceKm?: number };

export default function PublicPass() {
  const params = useParams<{ code: string }>();
  const code = String(params?.code || "");
  const [pass, setPass] = useState<PassData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/pass/${encodeURIComponent(code)}`);
        const body = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (!r.ok) { setError(body.message || "Pass introuvable."); return; }
        setPass(body.pass);
      } catch {
        if (!cancelled) setError("Impossible de vérifier ce pass. Vérifie ta connexion.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  const valid = pass && pass.status !== "REJECTED" && pass.status !== "EXPIRED" && (pass.passUsages ?? 0) > 0;

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-slate-50 px-5">
      <div className="w-full max-w-sm rounded-[28px] bg-white p-7 text-center shadow-sm">
        {loading ? (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-slate-100 text-2xl">…</div>
            <p className="mt-4 text-sm font-bold text-slate-500">Vérification en cours…</p>
          </>
        ) : error || !pass ? (
          <>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50 text-2xl text-red-500">✕</div>
            <p className="mt-4 text-xs font-black text-slate-500">JOBLY MOBILITY PASS</p>
            <h1 className="mt-2 text-xl font-black text-red-600">Pass invalide</h1>
            <p className="mt-3 text-sm text-slate-500">{error || "Ce code ne correspond à aucun pass Jobly Mobility."}</p>
          </>
        ) : (
          <>
            <div className={`mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl ${valid ? "bg-[#FFF5CC]" : "bg-red-50 text-red-500"}`}>{valid ? "✓" : "✕"}</div>
            <p className="mt-4 text-xs font-black text-slate-500">JOBLY MOBILITY PASS</p>
            <h1 className="mt-2 text-3xl font-black">{pass.passCode}</h1>
            <p className="mt-2 text-sm font-bold">{valid ? `${pass.passUsages} usage(s) disponible(s)` : `Statut : ${pass.status}`}</p>
            {pass.departCity && pass.arriveeCity && <p className="mt-1 text-xs text-slate-400">{pass.departCity} → {pass.arriveeCity}{pass.distanceKm ? ` · ${pass.distanceKm} km` : ""}</p>}
            <p className="mt-3 text-sm text-slate-500">Présentez ce code au partenaire pour validation. Les droits sont contrôlés côté Jobly.</p>
          </>
        )}
      </div>
    </main>
  );
}
