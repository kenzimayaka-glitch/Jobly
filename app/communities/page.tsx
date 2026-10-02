"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";

type Community = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  category: string;
  country?: string | null;
  city?: string | null;
  createdAt: string;
};

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    let active = true;
    fetch("/api/community", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data.communities) ? data.communities : [];
      })
      .then((items) => {
        if (active) setCommunities(items);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(communities.map((item) => item.category).filter(Boolean)))],
    [communities],
  );

  const visible = category === "all"
    ? communities
    : communities.filter((item) => item.category === category);

  async function join(id: string) {
    const response = await fetch(`/api/community/${id}/membership`, { method: "POST" });
    if (response.status === 401) {
      router.push("/login?next=/communities");
      return;
    }
    if (response.ok) {
      router.push(`/communities/${id}`);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#F8FAFF] text-[#0B1F4B]">
      <PageHeader label="Community" eyebrow="BON PLAN JOBLY" initial="J" />

      <div className="mx-auto max-w-5xl px-5 pb-12 pt-5">
        <button
          type="button"
          onClick={() => router.push("/bons-plans")}
          className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold shadow-sm"
        >
          ← Bons plans
        </button>

        <section className="rounded-[30px] bg-gradient-to-br from-[#EEF2FF] via-white to-[#FFF5C7] p-6 shadow-[0_18px_50px_rgba(70,55,0,.08)] sm:p-8">
          <span className="inline-flex rounded-full bg-[#FFF1A8] px-3 py-1 text-[10px] font-black uppercase tracking-[.16em]">
            COMMUNITY
          </span>
          <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
            Les personnes qui avancent avec vous.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
            Découvrez des communautés professionnelles par métier, ville, secteur ou centre d’intérêt.
          </p>
        </section>

        {categories.length > 1 && (
          <div className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrer les communautés">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-black transition ${category === item ? "bg-[#0B1F4B] text-white" : "bg-white text-slate-600 shadow-sm"}`}
              >
                {item === "all" ? "Toutes" : item}
              </button>
            ))}
          </div>
        )}

        <section className="mt-5" aria-live="polite">
          {loading ? (
            <div className="rounded-[26px] bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
              Chargement des communautés…
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="text-3xl">◉</div>
              <h2 className="mt-3 text-lg font-black">Aucune communauté disponible pour le moment</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Les communautés apparaîtront ici dès qu’elles seront créées.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((community) => (
                <article key={community.id} className="rounded-[26px] border border-white bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EEF2FF] text-lg">◉</span>
                    <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-slate-500">
                      {community.category}
                    </span>
                  </div>
                  <h2 className="mt-5 text-lg font-black tracking-tight">{community.name}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-5 text-slate-600">
                    {community.description || "Une communauté Jobly pour apprendre, échanger et créer des connexions utiles."}
                  </p>
                  {(community.city || community.country) && (
                    <p className="mt-3 text-xs font-bold text-slate-400">
                      {[community.city, community.country].filter(Boolean).join(" · ")}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => void join(community.id)}
                    className="mt-5 w-full rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white transition hover:opacity-90"
                  >
                    Rejoindre
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
