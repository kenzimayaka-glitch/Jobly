"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Dashboard = {
  user: { displayName?: string|null; email?: string|null; role: string };
  institutions: any[];
  programs: any[];
  requests: any[];
  allocations: any[];
  communications: any[];
};

export default function InstitutionalMobilityDashboard() {
  const router = useRouter();
  const [data, setData] = useState<Dashboard|null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) { router.replace("/"); return; }
      const r = await fetch("/api/institution/mobility/dashboard", { headers: { Authorization: `Bearer ${token}` } });
      const b = await r.json();
      if (!r.ok) { setError(b.error || "Accès institutionnel indisponible."); return; }
      setData(b);
    })().catch(() => setError("Impossible de charger le Hub institutionnel."));
  }, [router]);

  const requests = data?.requests ?? [];
  const allocations = data?.allocations ?? [];
  const eligible = requests.filter((r) => r.eligibilityStatus === "ELIGIBLE").length;
  const pending = requests.filter((r) => !r.eligibilityStatus || r.eligibilityStatus === "NEEDS_INFO").length;
  const committed = allocations.reduce((s, a) => s + Number(a.approvedAmount || 0), 0);

  return (
    <main className="min-h-[100dvh] bg-[#F7FAFF] text-[#0A1931]">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="rounded-full bg-[#FFF5CC] px-3 py-1 text-xs font-black text-[#8A6500]">HUB INSTITUTIONNEL</span>
            <h1 className="mt-4 text-3xl font-black">Mobility</h1>
            <p className="mt-1 text-sm text-slate-500">De l’emploi obtenu à l’emploi réellement rejoint.</p>
          </div>
          <button onClick={() => router.push("/dashboard")} className="rounded-full border bg-white px-4 py-2 text-sm font-black">Retour à Jobly</button>
        </div>

        {error && <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

        {data && <>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            <Kpi label="Programmes" value={data.programs.length} />
            <Kpi label="Demandes Mobility" value={requests.length} />
            <Kpi label="Éligibles" value={eligible} />
            <Kpi label="Montants engagés" value={committed.toLocaleString("fr-FR") + " XAF"} />
          </div>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[28px] border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Programme actif</h2>
              {data.programs.length === 0 ? <p className="mt-3 text-sm text-slate-500">Aucun programme configuré.</p> :
                data.programs.map((p) => (
                  <div key={p.id} className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div><p className="font-black">{p.name}</p><p className="mt-1 text-xs text-slate-500">{p.code}</p></div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{p.status}</span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{p.description}</p>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm"><Stat label="Capacité" value={p.capacity ?? "—"} /><Stat label="Budget" value={p.budgetTotal ? Number(p.budgetTotal).toLocaleString("fr-FR") + " " + p.currency : "—"} /></div>
                    <div className="mt-4 rounded-xl bg-[#FFF8D9] p-3 text-xs font-bold">Règles : pack payant actif · convention employeur obligatoire · garantie recruteur · plafond 50 % · remboursement 3 mois.</div>
                  </div>
                ))
              }
            </div>

            <div className="rounded-[28px] border bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">État du flux Jobly</h2>
              <Flow label="Talent — pack payant actif" ok />
              <Flow label="Emploi obtenu" ok />
              <Flow label="Demande Mobility" ok={requests.length > 0} />
              <Flow label="Éligibilité J’IA" ok={eligible > 0} />
              <Flow label="Financement" ok={allocations.length > 0} />
              <Flow label="Communication Jobly" ok={data.communications.length > 0} />
              {pending > 0 && <p className="mt-4 text-xs font-bold text-amber-700">{pending} dossier(s) attendent encore des informations.</p>}
            </div>
          </section>

          <section className="mt-6 rounded-[28px] border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Dossiers récents</h2>
            <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Trajet</th><th className="p-3">Coût</th><th className="p-3">Charge</th><th className="p-3">Éligibilité</th><th className="p-3">Statut</th></tr></thead><tbody>{requests.map((r) => <tr key={r.id} className="border-t"><td className="p-3">{r.departCity} → {r.arriveeCity}</td><td className="p-3">{Number(r.costTotal || 0).toLocaleString("fr-FR")} XAF</td><td className="p-3">{r.eligibilityBurdenPercent == null ? "—" : r.eligibilityBurdenPercent + "%"}</td><td className="p-3 font-black">{r.eligibilityStatus || "À calculer"}</td><td className="p-3">{r.status}</td></tr>)}</tbody></table></div>
          </section>
        </>}
      </div>
    </main>
  );
}

function Kpi({label,value}:{label:string;value:string|number}) { return <div className="rounded-[24px] border bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>; }
function Stat({label,value}:{label:string;value:string|number}) { return <div className="rounded-xl border bg-white p-3"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 font-black">{value}</p></div>; }
function Flow({label,ok}:{label:string;ok:boolean}) { return <div className="flex items-center justify-between border-b py-3 last:border-0"><span className="text-sm font-bold">{label}</span><span className={`rounded-full px-3 py-1 text-xs font-black ${ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{ok ? "CONNECTÉ" : "EN ATTENTE"}</span></div>; }
