"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { getSupabaseClient } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

type Community = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  country?: string | null;
  city?: string | null;
  memberCount: number;
  postCount: number;
};

type Access = {
  allowed: boolean;
  reason: "ACTIVE" | "SUBSCRIPTION_REQUIRED" | "UNAUTHENTICATED";
};

export default function CommunitiesPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [access, setAccess] = useState<Access>({ allowed: false, reason: "UNAUTHENTICATED" });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const headers: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const response = await fetch("/api/community", { headers, cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || t("common.error.generic"));
      setCommunities(Array.isArray(body.communities) ? body.communities : []);
      setAccess(body.access || { allowed: false, reason: "UNAUTHENTICATED" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("common.error.generic"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const categories = useMemo(
    () => ["ALL", ...Array.from(new Set(communities.map((item) => item.category))).sort()],
    [communities],
  );
  const visible = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return communities.filter((item) => {
      const matchesCategory = category === "ALL" || item.category === category;
      const haystack = `${item.name} ${item.description || ""} ${item.city || ""} ${item.country || ""}`.toLocaleLowerCase();
      return matchesCategory && (!search || haystack.includes(search));
    });
  }, [communities, category, query]);

  return (
    <AppShell role="talent" active="/career-brain" title={t("community.page.title")} eyebrow="JOBLY COMMUNITY" width="lg">
      <section className="mb-6 rounded-[28px] bg-gradient-to-br from-[#FFF1A8] via-[#FFD95A] to-[#FFE135] p-6 sm:p-8">
        <p className="text-[11px] font-black uppercase tracking-[.16em] text-[#645000]">{t("community.page.eyebrow")}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-[#0B1F4B]">{t("community.page.title")}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#514400]">{t("community.page.description")}</p>
        <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-[#514400]">
          <span className="rounded-full bg-white/65 px-3 py-1.5">{t("community.page.count", { n: communities.length })}</span>
          <span className="rounded-full bg-white/65 px-3 py-1.5">{t("community.page.realData")}</span>
        </div>
      </section>

      {!access.allowed && (
        <section className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-bold">{t("community.page.accessTitle")}</p>
          <p className="mt-1">{t("community.page.accessDescription")}</p>
          <button
            type="button"
            onClick={() => router.push(access.reason === "UNAUTHENTICATED" ? "/login?next=/communities" : "/abonnement")}
            className="mt-3 rounded-xl bg-[#0B1F4B] px-4 py-2.5 text-xs font-black text-white"
          >
            {t("community.page.accessAction")}
          </button>
        </section>
      )}

      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("community.page.search")}
          aria-label={t("community.page.search")}
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-[#0B1F4B]"
        />
        <button
          type="button"
          onClick={() => void load()}
          className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-[#0B1F4B]"
        >
          {t("common.retry")}
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" aria-label={t("community.page.categories")}>
        {categories.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setCategory(value)}
            aria-pressed={category === value}
            className={`rounded-full px-3.5 py-2 text-xs font-black transition ${category === value ? "bg-[#0B1F4B] text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"}`}
          >
            {value === "ALL" ? t("community.page.all") : value}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">{t("common.loading")}</div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p>{error}</p>
          <button type="button" onClick={() => void load()} className="mt-3 font-black underline">{t("common.retry")}</button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="font-black text-[#0B1F4B]">{t("community.page.emptyTitle")}</p>
          <p className="mt-2 text-sm text-slate-500">{t("community.page.emptyDescription")}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {visible.map((item) => (
            <article key={item.id} className="rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#EEF2FF] text-lg text-[#22448B]">◉</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-slate-600">{item.category}</span>
              </div>
              <h2 className="mt-4 text-lg font-black text-[#0B1F4B]">{item.name}</h2>
              <p className="mt-2 min-h-10 text-sm leading-6 text-slate-600">{item.description || t("community.page.defaultDescription")}</p>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-slate-500">
                <span>{t("community.page.members", { n: item.memberCount || 0 })}</span>
                <span>{t("community.page.posts", { n: item.postCount || 0 })}</span>
                {(item.city || item.country) && <span>{[item.city, item.country].filter(Boolean).join(" · ")}</span>}
              </div>
              <button
                type="button"
                onClick={() => router.push(`/communities/${encodeURIComponent(item.id)}`)}
                className="mt-5 w-full rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white"
              >
                {t("community.page.open")}
              </button>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
