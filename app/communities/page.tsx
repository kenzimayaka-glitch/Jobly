"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";

type Community = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  country?: string | null;
  city?: string | null;
  memberCount: number;
};

type Access = {
  allowed: boolean;
  reason: "ACTIVE" | "SUBSCRIPTION_REQUIRED" | "UNAUTHENTICATED";
  blueBadge?: boolean;
};

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [access, setAccess] = useState<Access>({ allowed: false, reason: "UNAUTHENTICATED" });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/community", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || "Communautés indisponibles.");
        if (!active) return;
        setCommunities(Array.isArray(payload.communities) ? payload.communities : []);
        setAccess(payload.access || { allowed: false, reason: "UNAUTHENTICATED" });
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "Communautés indisponibles.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const categories = useMemo(
    () => ["ALL", ...Array.from(new Set(communities.map((item) => item.category).filter(Boolean)))],
    [communities],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return communities.filter((item) => {
      const matchesCategory = category === "ALL" || item.category === category;
      const haystack = [item.name, item.description, item.category, item.country, item.city].filter(Boolean).join(" ").toLowerCase();
      return matchesCategory && (!q || haystack.includes(q));
    });
  }, [communities, query, category]);

  return (
    <main className="min-h-[100dvh] bg-[#F8FAFF] text-[#0B1F4B]">
      <PageHeader label="Community" eyebrow="BON PLAN JOBLY" initial="J" />
      <div className="mx-auto max-w-4xl px-5 pb-14 pt-5">
        <button type="button" onClick={() => router.push("/bons-plans")} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold shadow-sm">
          ← Bons Plans
        </button>

        <section className="rounded-[30px] bg-white p-6 shadow-sm sm:p-8">
          <span className="text-[10px] font-black uppercase tracking-[.16em] text-jobly-blue">JOBLY COMMUNITY</span>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Les communautés qui font avancer votre carrière</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Échangez autour d'un métier, d'une discipline, d'une ville ou d'un secteur. Les discussions restent réservées aux membres autorisés.
          </p>

          {!access.allowed && (
            <div className="mt-5 rounded-2xl border border-[#FFE135]/60 bg-[#FFF9D6] p-4 text-sm text-[#5D4B00]">
              {access.reason === "UNAUTHENTICATED"
                ? "Connectez-vous pour rejoindre une communauté."
                : "Un abonnement actif est requis pour participer aux communautés."}
              <button
                type="button"
                onClick={() => router.push(access.reason === "UNAUTHENTICATED" ? "/login?next=/communities" : "/abonnement")}
                className="ml-2 font-black underline"
              >
                Continuer
              </button>
            </div>
          )}
        </section>

        <section className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une communauté…"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-jobly-blue"
            aria-label="Rechercher une communauté"
          />
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
            {categories.map((item) => <option key={item} value={item}>{item === "ALL" ? "Toutes les disciplines" : item}</option>)}
          </select>
        </section>

        {error && <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="mt-5 rounded-[24px] bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="mt-5 rounded-[24px] border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Aucune communauté disponible avec ces critères.
          </div>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {filtered.map((community) => (
              <button
                key={community.id}
                type="button"
                onClick={() => router.push(`/communities/${community.id}`)}
                className="rounded-[26px] border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EEF2FF] text-xl">◉</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">{community.category}</span>
                </div>
                <h2 className="mt-4 text-xl font-black">{community.name}</h2>
                <p className="mt-2 text-sm leading-5 text-slate-600">{community.description || "Échanger, apprendre et partager autour d'une discipline professionnelle."}</p>
                <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-500">
                  <span>{community.memberCount} membres</span>
                  <span className="text-jobly-blue">Voir la communauté →</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
