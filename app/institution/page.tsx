"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Dashboard = {
  institution: { id: string; name: string; city?: string | null; type: string };
  kpis: { partnerships: number; projects: number; beneficiaries: number; applications: number; reports: number };
  partnerships: Array<{ id: string; name: string; status: string }>;
  projects: Array<{ id: string; name: string; description?: string | null; status: string }>;
  reports: Array<{ id: string; title: string; status: string; createdAt: string }>;
};

export default function InstitutionHubPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"checking" | "private" | "dashboard">("checking");
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    fetch("/api/institution/dashboard", { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) { setMode("private"); return; }
        const body = await r.json();
        setData(body);
        setMode("dashboard");
      })
      .catch(() => setMode("private"));
  }, []);

  if (mode === "checking") return <main className="min-h-[100dvh] grid place-items-center bg-slate-50 text-slate-600">Chargement de l’espace institutionnel…</main>;

  if (mode === "private") {
    return (
      <main className="min-h-[100dvh] grid place-items-center bg-slate-50 px-6">
        <section className="max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm border border-slate-200">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-2xl">🔒</div>
          <h1 className="text-2xl font-semibold text-slate-900">Espace réservé aux partenaires institutionnels.</h1>
          <p className="mt-3 text-slate-600">Cet espace est accessible uniquement aux institutions accompagnées et partenaires de Jobly.</p>
          <p className="mt-2 text-slate-600">Vous représentez une institution partenaire ? Contactez votre référent Jobly pour obtenir ou réinitialiser votre accès.</p>
          <button onClick={() => router.push("/institution/login")} className="mt-6 rounded-xl bg-[#22448B] px-5 py-3 text-white">Accès partenaire</button>
        </section>
      </main>
    );
  }

  const k = data!.kpis;
  return (
    <main className="min-h-[100dvh] bg-slate-50 px-4 py-6 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[#22448B]">JOBLY · Espace institutionnel</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">Bienvenue {data!.institution.name}</h1>
            <p className="mt-1 text-slate-600">Votre espace de pilotage Jobly</p>
          </div>
          <button onClick={async () => { await fetch("/api/institution/auth/logout", { method: "POST" }); router.refresh(); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm">Se déconnecter</button>
        </header>

        <nav className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-5">
          {["Vue d’ensemble", "Chiffres clés", "Mes projets", "Performance", "Rapports"].map((item) => <div key={item} className="rounded-xl bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 shadow-sm border border-slate-200">{item}</div>)}
        </nav>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Partenariats actifs", k.partnerships],
            ["Projets actifs", k.projects],
            ["Bénéficiaires suivis", k.beneficiaries],
            ["Candidatures", k.applications],
            ["Rapports", k.reports],
          ].map(([label, value]) => (
            <article key={label as string} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
            </article>
          ))}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Mes projets</h2>
            <div className="mt-4 space-y-3">
              {data!.projects.length ? data!.projects.map((p) => <div key={p.id} className="rounded-xl bg-slate-50 p-4"><div className="font-medium text-slate-900">{p.name}</div><div className="mt-1 text-sm text-slate-600">{p.description || "Projet Jobly en cours de pilotage."}</div></div>) : <p className="text-slate-500">Aucun projet configuré pour le moment.</p>}
            </div>
          </section>
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Rapports</h2>
            <div className="mt-4 space-y-3">
              {data!.reports.length ? data!.reports.map((r) => <div key={r.id} className="rounded-xl bg-slate-50 p-4"><div className="font-medium text-slate-900">{r.title}</div><div className="mt-1 text-sm text-slate-600">{r.status}</div></div>) : <p className="text-slate-500">Aucun rapport disponible pour le moment.</p>}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl bg-[#22448B] p-6 text-white">
          <h2 className="text-xl font-semibold">J’IA institutionnelle</h2>
          <p className="mt-2 text-white/80">La couche d’intelligence analysera uniquement les données autorisées par vos projets et expliquera les évolutions, écarts et résultats sans inventer de données.</p>
        </section>
      </div>
    </main>
  );
}
