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
  memberCount: number;
};

type Access = { allowed: boolean; reason: "ACTIVE" | "SUBSCRIPTION_REQUIRED" | "UNAUTHENTICATED" };

export default function CommunitiesPage() {
  const router = useRouter();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [access, setAccess] = useState<Access>({ allowed: false, reason: "UNAUTHENTICATED" });
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/community", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json();
      })
      .then((data) => {
        if (!active || !data) return;
        setCommunities(Array.isArray(data.communities) ? data.communities : []);
        setAccess(data.access || { allowed: false, reason: "UNAUTHENTICATED" });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => (showAll ? communities : communities.slice(0, 4)), [communities, showAll]);

  async function join(id: string) {
    if (!access.allowed) {
      router.push(access.reason === "UNAUTHENTICATED" ? \`/login?next=/communities/\${id}\` : "/abonnement");
      return;
    }
    const response = await fetch(\`/api/community/\${id}/membership\`, { method: "POST" });
    if (response.status === 401) {
      router.push(\`/login?next=/communities/\${id}\`);
      return;
    }
    if (response.status === 403) {
      router.push("/abonnement");
      return;
    }
    if (response.ok) router.push(\`/communities/\${id}\`);
  }

  return (
    <main className="min-h-[100dvh] bg-[#F8FAFF] text-[#0B1F4B]">
      <PageHeader label="Community" eyebrow="BON PLAN JOBLY" initial="J" />

      <div className="mx-auto max-w-5xl px-5 pb-12 pt-5">
        <button type="button" onClick={() => router.push("/bons-plans")} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold shadow-sm">
          ← Bons plans
        </button>

        <section className="rounded-[30px] bg-gradient-to-br from-[#EEF2FF] via-white to-[#FFF5C7] p-6 shadow-[0_18px_50px_rgba(70,55,0,.08)] sm:p-8">
          <span className="inline-flex rounded-full bg-[#FFF1A8] px-3 py-1 text-[10px] font-black uppercase tracking-[.16em]">COMMUNITY</span>
          <h1 className="mt-4 font-heading text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">Les communautés qui avancent avec vous.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">Des espaces professionnels structurés par Jobly, sans logique de réseau social.</p>
          {!access.allowed && (
            <button type="button" onClick={() => router.push(access.reason === "UNAUTHENTICATED" ? "/login?next=/communities" : "/abonnement")} className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white">
              🔒 Community
            </button>
          )}
        </section>

        <section className="mt-6" aria-label="Communautés professionnelles">
          {loading ? (
            <div className="rounded-[26px] bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Chargement des communautés…</div>
          ) : visible.length === 0 ? (
            <div className="rounded-[26px] border border-dashed border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className="text-3xl">◉</div>
              <h2 className="mt-3 text-lg font-black">Aucune communauté disponible pour le moment</h2>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {visible.map((community) => (
                  <article key={community.id} className="rounded-[26px] border border-white bg-white p-5 shadow-sm">
                    <button type="button" onClick={() => router.push(\`/communities/\${community.id}\`)} className="block w-full text-left">
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EEF2FF] text-lg">◉</span>
                        <span className="text-xs font-black text-slate-500">{community.memberCount} membres</span>
                      </div>
                      <h2 className="mt-5 text-lg font-black tracking-tight">{community.name}</h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{community.description || "Une communauté Jobly pour apprendre et échanger."}</p>
                    </button>
                    <button type="button" onClick={() => void join(community.id)} className="mt-5 w-full rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white">
                      {access.allowed ? "Rejoindre la communauté" : "🔒 Rejoindre la communauté"}
                    </button>
                  </article>
                ))}
              </div>
              {communities.length > 4 && (
                <div className="mt-5 text-center">
                  <button type="button" onClick={() => setShowAll((value) => !value)} className="rounded-full bg-white px-5 py-2.5 text-xs font-black text-[#0B1F4B] shadow-sm">
                    {showAll ? "Afficher moins" : "Voir les autres"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
