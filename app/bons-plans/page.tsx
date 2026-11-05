"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../../components/PageHeader";
import { getSupabaseClient } from "@/lib/supabase";
import { useI18n, type DictKey } from "@/lib/i18n";

type BonPlan = {
  id: string;
  title: string;
  description: string;
  category: string;
  country?: string | null;
  city?: string | null;
  sourceUrl?: string | null;
  imageUrl?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  author?: { displayName?: string | null; username?: string | null } | null;
  likeCount: number;
  saveCount: number;
  shareCount: number;
  commentCount: number;
  viewerLiked: boolean;
  viewerSaved: boolean;
  viewerShared: boolean;
};

type BonPlanComment = { id: string; content: string; createdAt: string; author?: { displayName?: string | null; username?: string | null } | null };

const pillars = [
  { id: "campus", title: "bonplans.pillar.campusTitle", eyebrow: "bonplans.pillar.campusEyebrow", description: "bonplans.pillar.campusDescription", detail: "bonplans.pillar.campusDetail", href: "/campus", tone: "blue", icon: "🎓" },
  { id: "community", title: "bonplans.pillar.communityTitle", eyebrow: "bonplans.pillar.communityEyebrow", description: "bonplans.pillar.communityDescription", detail: "bonplans.pillar.communityDetail", href: "/communities", tone: "purple", icon: "◉" },
  { id: "mobility", title: "bonplans.pillar.mobilityTitle", eyebrow: "bonplans.pillar.mobilityEyebrow", description: "bonplans.pillar.mobilityDescription", detail: "bonplans.pillar.mobilityDetail", href: "/mobility", tone: "green", icon: "↗" },
  { id: "events", title: "bonplans.pillar.eventsTitle", eyebrow: "bonplans.pillar.eventsEyebrow", description: "bonplans.pillar.eventsDescription", detail: "bonplans.pillar.eventsDetail", href: "/events", tone: "orange", icon: "✦" },
] as const;

const tone = {
  blue: "border-blue-100 bg-blue-50/80",
  purple: "border-violet-100 bg-violet-50/80",
  green: "border-emerald-100 bg-emerald-50/80",
  orange: "border-orange-100 bg-orange-50/80",
};

export default function BonsPlansPage() {
  const router = useRouter();
  const { t, formatDate } = useI18n();
  const [showQuitConfirmation, setShowQuitConfirmation] = useState(false);
  const [plans, setPlans] = useState<BonPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [plansError, setPlansError] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [commentsByPlan, setCommentsByPlan] = useState<Record<string, BonPlanComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const loadPlans = useCallback(async () => {
    setLoadingPlans(true);
    setPlansError("");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      setAccessToken(session?.access_token || null);
      const headers: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
      const response = await fetch("/api/bon-plans?limit=50", { headers, cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || t("common.error.generic"));
      setPlans(Array.isArray(body.items) ? body.items : []);
    } catch (cause) {
      setPlansError(cause instanceof Error ? cause.message : t("common.error.generic"));
    } finally {
      setLoadingPlans(false);
    }
  }, [t]);

  useEffect(() => { void loadPlans(); }, [loadPlans]);

  async function interact(plan: BonPlan, type: "LIKE" | "SAVE" | "SHARE") {
    if (!accessToken) {
      router.push("/login?next=/bons-plans");
      return;
    }
    const response = await fetch(`/api/bon-plans/${encodeURIComponent(plan.id)}/interactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || t("common.error.generic"));
      return;
    }
    setPlans((current) => current.map((item) => {
      if (item.id !== plan.id) return item;
      if (type === "LIKE") return { ...item, viewerLiked: Boolean(body.active), likeCount: Math.max(0, item.likeCount + (body.active ? 1 : -1)) };
      if (type === "SAVE") return { ...item, viewerSaved: Boolean(body.active), saveCount: Math.max(0, item.saveCount + (body.active ? 1 : -1)) };
      if (type === "SHARE" && !item.viewerShared) return { ...item, viewerShared: true, shareCount: item.shareCount + 1 };
      return item;
    }));
    setMessage("");
  }

  async function toggleComments(plan: BonPlan) {
    if (commentsOpen[plan.id]) {
      setCommentsOpen((current) => ({ ...current, [plan.id]: false }));
      return;
    }
    const response = await fetch(`/api/bon-plans/${encodeURIComponent(plan.id)}/comments`, { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || t("common.error.generic"));
      return;
    }
    setCommentsByPlan((current) => ({ ...current, [plan.id]: Array.isArray(body.comments) ? body.comments : [] }));
    setCommentsOpen((current) => ({ ...current, [plan.id]: true }));
  }

  async function commentOnPlan(plan: BonPlan) {
    if (!accessToken) {
      router.push("/login?next=/bons-plans");
      return;
    }
    const content = (commentDrafts[plan.id] || "").trim();
    if (!content) return;
    if (content.length > 1000) {
      setMessage(t("bonplans.page.commentTooLong"));
      return;
    }
    const response = await fetch(`/api/bon-plans/${encodeURIComponent(plan.id)}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || t("common.error.generic"));
      return;
    }
    const comment = body.comment as BonPlanComment;
    setCommentsByPlan((current) => ({ ...current, [plan.id]: [...(current[plan.id] || []), comment] }));
    setPlans((current) => current.map((item) => item.id === plan.id ? { ...item, commentCount: item.commentCount + 1 } : item));
    setCommentDrafts((current) => ({ ...current, [plan.id]: "" }));
    setCommentsOpen((current) => ({ ...current, [plan.id]: true }));
    setMessage("");
  }

  async function share(plan: BonPlan) {
    const url = `${window.location.origin}/bons-plans?plan=${encodeURIComponent(plan.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: plan.title, text: plan.description, url });
      else await navigator.clipboard.writeText(url);
      await interact(plan, "SHARE");
    } catch {
      // A cancelled share should not be counted as a successful share.
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#F8FAFF] text-[#0B1F4B]">
      <PageHeader label={t("bonplans.page.title")} eyebrow="JOBLY" initial="J" />
      <div className="mx-auto max-w-5xl px-5 pb-12 pt-5">
        <button
          type="button"
          onClick={() => setShowQuitConfirmation(true)}
          className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold text-[#0B1F4B] shadow-sm"
        >
          ← {t("common.back")}
        </button>

        <section className="overflow-hidden rounded-[32px] bg-gradient-to-br from-[#FFF1A8] via-[#FFD95A] to-[#FFE135] p-6 shadow-[0_20px_60px_rgba(70,55,0,.13)] sm:p-8">
          <span className="inline-flex rounded-full border border-white/50 bg-white/35 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em]">
            BON PLAN JOBLY
          </span>
          <h1 className="mt-4 max-w-2xl font-heading text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
            {t("bonplans.page.title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#514400] sm:text-[15px]">
            {t("bonplans.page.description")}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-bold text-[#5D4B00]">
            <span className="rounded-full bg-white/55 px-3 py-1.5">{t("bonplans.page.opportunities")}</span>
            <span className="rounded-full bg-white/55 px-3 py-1.5">{t("bonplans.page.network")}</span>
            <span className="rounded-full bg-white/55 px-3 py-1.5">{t("bonplans.page.services")}</span>
          </div>
        </section>

        <section className="mt-7" aria-labelledby="bonplans-feed-title">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#1877B9]">{t("bonplans.page.published")}</p>
              <h2 id="bonplans-feed-title" className="mt-1 text-xl font-black">{t("bonplans.page.feedTitle")}</h2>
            </div>
            <button type="button" onClick={() => void loadPlans()} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black">{t("common.retry")}</button>
          </div>
          {message && <p role="status" className="mb-3 text-xs font-semibold text-slate-600">{message}</p>}
          {loadingPlans ? (
            <div className="rounded-2xl bg-white p-7 text-center text-sm text-slate-500">{t("common.loading")}</div>
          ) : plansError ? (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">{plansError}</div>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-7 text-center">
              <p className="font-black">{t("bonplans.page.emptyTitle")}</p>
              <p className="mt-2 text-sm text-slate-500">{t("bonplans.page.emptyDescription")}</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {plans.map((plan) => (
                <article key={plan.id} className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm">
                  {plan.imageUrl && <img src={plan.imageUrl} alt="" className="h-44 w-full object-cover" />}
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-[10px] font-black uppercase text-[#22448B]">{plan.category}</span>
                      {(plan.city || plan.country) && <span className="text-[11px] font-semibold text-slate-500">{[plan.city, plan.country].filter(Boolean).join(" · ")}</span>}
                    </div>
                    <h3 className="mt-3 text-lg font-black">{plan.title}</h3>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{plan.description}</p>
                    <p className="mt-3 text-[11px] text-slate-400">{t("bonplans.page.publishedOn", { date: formatDate(plan.createdAt) })}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                      <button type="button" aria-pressed={plan.viewerLiked} onClick={() => void interact(plan, "LIKE")} className={`rounded-xl px-3 py-2 text-xs font-black ${plan.viewerLiked ? "bg-[#0B1F4B] text-white" : "bg-slate-100 text-[#0B1F4B]"}`}>
                        ♥ {plan.likeCount}
                      </button>
                      <button type="button" aria-pressed={plan.viewerSaved} onClick={() => void interact(plan, "SAVE")} className={`rounded-xl px-3 py-2 text-xs font-black ${plan.viewerSaved ? "bg-[#0B1F4B] text-white" : "bg-slate-100 text-[#0B1F4B]"}`}>
                        {t("bonplans.page.save")} · {plan.saveCount}
                      </button>
                      <button type="button" onClick={() => void share(plan)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-[#0B1F4B]">
                        {t("bonplans.page.share")} · {plan.shareCount}
                      </button>
                      <button type="button" aria-expanded={Boolean(commentsOpen[plan.id])} onClick={() => void toggleComments(plan)} className="ml-auto rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">
                        {t("bonplans.page.comments", { n: plan.commentCount })}
                      </button>
                    </div>
                    {commentsOpen[plan.id] && (
                      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                        <div className="space-y-3">
                          {(commentsByPlan[plan.id] || []).map((comment) => (
                            <div key={comment.id} className="text-xs">
                              <p className="font-black text-[#0B1F4B]">{comment.author?.displayName || comment.author?.username || t("community.detail.memberFallback")}</p>
                              <p className="mt-1 leading-5 text-slate-600">{comment.content}</p>
                              <p className="mt-1 text-[10px] text-slate-400">{formatDate(comment.createdAt)}</p>
                            </div>
                          ))}
                          {(commentsByPlan[plan.id] || []).length === 0 && <p className="text-xs text-slate-500">{t("bonplans.page.noComments")}</p>}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <input value={commentDrafts[plan.id] || ""} onChange={(event) => setCommentDrafts((current) => ({ ...current, [plan.id]: event.target.value }))} maxLength={1000} placeholder={t("bonplans.page.commentPlaceholder")} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
                          <button type="button" onClick={() => void commentOnPlan(plan)} className="rounded-xl bg-[#0B1F4B] px-3 py-2 text-xs font-black text-white">{t("bonplans.page.commentSubmit")}</button>
                        </div>
                      </div>
                    )}
                    {plan.sourceUrl && <a href={plan.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-black text-[#1877B9] underline">{t("bonplans.page.learnMore")}</a>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 grid gap-3 sm:grid-cols-2" aria-label={t("bonplans.page.spaces")}>
          {pillars.map((pillar) => (
            <button
              key={pillar.id}
              type="button"
              onClick={() => router.push(pillar.href)}
              className={`group rounded-[26px] border p-5 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[.99] ${tone[pillar.tone]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 text-xl shadow-sm">{pillar.icon}</span>
                <span className="rounded-full bg-white/75 px-2.5 py-1 text-[9px] font-black tracking-[.14em] text-slate-500">{t(pillar.eyebrow as DictKey)}</span>
              </div>
              <h2 className="mt-5 text-xl font-black tracking-tight">{t(pillar.title as DictKey)}</h2>
              <p className="mt-2 text-sm leading-5 text-slate-600">{t(pillar.description as DictKey)}</p>
              <p className="mt-4 text-xs font-bold text-[#0B1F4B]">{t(pillar.detail as DictKey)}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-xs font-black text-jobly-blue">{t("bonplans.page.discover")} →</span>
            </button>
          ))}
        </section>

        <section className="mt-6 rounded-[24px] border border-white bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#FFF4BF] text-sm">J</span>
            <div>
              <h2 className="font-black">{t("bonplans.page.jiaTitle")}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{t("bonplans.page.jiaDescription")}</p>
            </div>
          </div>
        </section>
      </div>

      {showQuitConfirmation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1F4B]/45 px-5 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" aria-labelledby="quit-bons-plans-title" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF3B8] text-xl">↗</div>
            <h2 id="quit-bons-plans-title" className="text-center text-xl font-bold text-[#0B1F4B]">{t("bonplans.page.quitTitle")}</h2>
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">{t("bonplans.page.quitDescription")}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowQuitConfirmation(false)} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-[#0B1F4B]">{t("common.cancel")}</button>
              <button type="button" onClick={() => router.push("/ecosystem")} className="rounded-2xl bg-[#0B1F4B] px-4 py-3 text-sm font-semibold text-white">{t("bonplans.page.quit")}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
