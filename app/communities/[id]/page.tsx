"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";
import PageHeader from "@/components/PageHeader";

type Community = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  memberCount: number;
};

type Post = {
  id: string;
  content: string;
  createdAt: string;
  mediaUrl?: string | null;
  sourceUrl?: string | null;
  author?: { id: string; displayName?: string | null; username?: string | null; profilePhotoUrl?: string | null; blueBadge?: boolean };
  reactionCount: number;
  commentCount: number;
  viewerReacted: boolean;
};

type CommunityComment = {
  id: string;
  content: string;
  createdAt: string;
  author?: { displayName?: string | null; username?: string | null } | null;
};

type Access = { allowed: boolean; reason: "ACTIVE" | "SUBSCRIPTION_REQUIRED" | "UNAUTHENTICATED"; blueBadge?: boolean };

async function communityAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function CommunityAvatar({ photoUrl, name, verified, fallbackName }: { photoUrl?: string | null; name?: string | null; verified?: boolean; fallbackName: string }) {
  const label = (name || fallbackName).trim();
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "J";
  return (
    <span className="relative inline-grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#EEF2FF] text-sm font-black text-[#22448B]">
      {photoUrl ? <img src={photoUrl} alt="" className="h-full w-full rounded-full object-cover" /> : initials}
      {verified && (
        <span aria-label="Profil vérifié" title="Profil vérifié" className="absolute -bottom-0.5 -right-0.5 grid h-[15px] w-[15px] place-items-center rounded-full border-2 border-white bg-[#1877F2] text-[8px] font-black leading-none text-white shadow-sm">✓</span>
      )}
    </span>
  );
}

export default function CommunityPage() {
  const { t, formatDate } = useI18n();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [access, setAccess] = useState<Access>({ allowed: false, reason: "UNAUTHENTICATED" });
  const [joined, setJoined] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const headers = await communityAuthHeaders();
        const response = await fetch("/api/community", { cache: "no-store", headers });
        const data = response.ok ? await response.json() : { communities: [], access: { allowed: false, reason: "UNAUTHENTICATED" } };
        if (!active) return;
        setAccess(data.access || { allowed: false, reason: "UNAUTHENTICATED" });
        setCommunity((data.communities || []).find((item: Community) => item.id === params.id) || null);

        if (data.access?.allowed) {
          const postsResponse = await fetch(`/api/community/${params.id}/posts`, { cache: "no-store", headers });
          if (postsResponse.ok) {
            const postsData = await postsResponse.json();
            setPosts(Array.isArray(postsData.posts) ? postsData.posts : []);
            setJoined(true);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [params.id]);

  async function join() {
    if (!access.allowed) {
      router.push(access.reason === "UNAUTHENTICATED" ? `/login?next=/communities/${params.id}` : "/abonnement");
      return;
    }
    const headers = await communityAuthHeaders();
    const response = await fetch(`/api/community/${params.id}/membership`, { method: "POST", headers });
    if (response.status === 401) return router.push(`/login?next=/communities/${params.id}`);
    if (response.status === 403) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error || t("common.error.generic"));
      return;
    }
    if (response.ok) {
      setJoined(true);
      const headers = await communityAuthHeaders();
      const postsResponse = await fetch(`/api/community/${params.id}/posts`, { cache: "no-store", headers });
      if (postsResponse.ok) {
        const data = await postsResponse.json();
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      }
    }
  }

  async function publish() {
    const value = content.trim();
    if (!value) return;
    if (value.length > 4000) { setMessage(t("community.detail.messageTooLong")); return; }
    const headers = await communityAuthHeaders();
    const response = await fetch(`/api/community/${params.id}/posts`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ content: value }),
    });
    if (response.status === 401) return router.push(`/login?next=/communities/${params.id}`);
    if (response.status === 403) {
      setMessage("Community est accessible avec un abonnement actif.");
      return;
    }
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.error || body.message || t("common.error.generic"));
      return;
    }
    const data = await response.json();
    if (data.post) setPosts((current) => [{ reactionCount: 0, commentCount: 0, viewerReacted: false, ...data.post }, ...current]);
    setContent("");
    setMessage("");
  }

  async function reactToPost(post: Post) {
    const headers = await communityAuthHeaders();
    const response = await fetch(`/api/community/${params.id}/posts/${post.id}/reactions`, { method: "POST", headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || t("common.error.generic"));
      return;
    }
    setPosts((current) => current.map((item) => item.id === post.id
      ? { ...item, viewerReacted: Boolean(body.active), reactionCount: Math.max(0, item.reactionCount + (body.active ? 1 : -1)) }
      : item));
  }

  async function toggleComments(post: Post) {
    if (commentsOpen[post.id]) {
      setCommentsOpen((current) => ({ ...current, [post.id]: false }));
      return;
    }
    const headers = await communityAuthHeaders();
    const response = await fetch(`/api/community/${params.id}/posts/${post.id}/comments`, { headers, cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || t("common.error.generic"));
      return;
    }
    setCommentsByPost((current) => ({ ...current, [post.id]: Array.isArray(body.comments) ? body.comments : [] }));
    setCommentsOpen((current) => ({ ...current, [post.id]: true }));
  }

  async function commentOnPost(post: Post) {
    const value = (commentDrafts[post.id] || "").trim();
    if (!value) return;
    if (value.length > 1000) {
      setMessage(t("community.detail.commentTooLong"));
      return;
    }
    const headers = await communityAuthHeaders();
    const response = await fetch(`/api/community/${params.id}/posts/${post.id}/comments`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ content: value }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(body.error || t("common.error.generic"));
      return;
    }
    const comment = body.comment as CommunityComment;
    setCommentsByPost((current) => ({ ...current, [post.id]: [...(current[post.id] || []), comment] }));
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, commentCount: item.commentCount + 1 } : item));
    setCommentDrafts((current) => ({ ...current, [post.id]: "" }));
    setCommentsOpen((current) => ({ ...current, [post.id]: true }));
    setMessage("");
  }

  const inviteUrl = typeof window !== "undefined" ? `${window.location.origin}/communities/${params.id}?invite=1` : "";
  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setMessage(t("community.detail.inviteCopied"));
  }
  function shareWhatsApp() {
    if (!inviteUrl) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Rejoins cette communauté sur Jobly : ${inviteUrl}`)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-[100dvh] bg-[#F8FAFF] text-[#0B1F4B]">
      <PageHeader label={t("community.page.title")} eyebrow="JOBLY COMMUNITY" initial="J" />
      <div className="mx-auto max-w-3xl px-5 pb-12 pt-5">
        <button type="button" onClick={() => router.push("/communities")} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold shadow-sm">← {t("community.detail.back")}</button>

        {loading ? (
          <div className="rounded-[26px] bg-white p-8 text-center text-sm text-slate-500 shadow-sm">{t("common.loading")}</div>
        ) : !community ? (
          <div className="rounded-[26px] bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-black">{t("community.detail.notFound")}</h1></div>
        ) : (
          <>
            <section className="rounded-[28px] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#EEF2FF] text-xl">◉</span>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-[.16em] text-canari-blue">{community.category}</span>
                  <h1 className="mt-1 text-2xl font-black tracking-tight">{community.name}</h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{community.description || t("community.page.defaultDescription")}</p>
                  <p className="mt-3 text-xs font-black text-slate-500">{t("community.page.members", { n: community.memberCount })}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => void join()} className="rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white">{joined ? `✓ ${t("community.detail.joined")}` : access.allowed ? t("community.detail.join") : `🔒 ${t("community.detail.join")}`}</button>
                <button type="button" onClick={() => setInviteOpen(true)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-[#0B1F4B]">{t("community.detail.invite")}</button>
              </div>
            </section>

            {!access.allowed ? (
              <section className="mt-5 rounded-[26px] bg-white p-7 text-center shadow-sm">
                <div className="text-2xl">🔒</div>
                <h2 className="mt-3 text-lg font-black">{t("community.detail.accessTitle")}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{t("community.detail.accessDescription")}</p>
                <button type="button" onClick={() => router.push(access.reason === "UNAUTHENTICATED" ? `/login?next=/communities/${params.id}` : "/abonnement")} className="mt-5 rounded-2xl bg-[#0B1F4B] px-5 py-3 text-xs font-black text-white">{t("community.page.accessAction")}</button>
              </section>
            ) : (
              <>
                <section className="mt-5 rounded-[26px] bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-black">{t("community.detail.discussion")}</h2>
                  {joined ? (
                    <div className="mt-4 flex gap-2">
                      <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={t("community.detail.placeholder")} rows={3} className="min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0B1F4B]" />
                      <button type="button" onClick={() => void publish()} className="self-end rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white">{t("community.detail.publish")}</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => void join()} className="mt-4 rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white">{t("community.detail.joinToPost")}</button>
                  )}
                  {message && <p className="mt-2 text-xs font-semibold text-slate-500">{message}</p>}
                </section>

                <section className="mt-5 space-y-3">
                  {posts.length === 0 ? (
                    <div className="rounded-[26px] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">{t("community.detail.emptyPosts")}</div>
                  ) : posts.map((post) => (
                    <article key={post.id} className="rounded-[24px] bg-white p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <CommunityAvatar photoUrl={post.author?.profilePhotoUrl} name={post.author?.displayName || post.author?.username} verified={post.author?.blueBadge === true} fallbackName={t("community.detail.memberFallback")} />
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#0B1F4B]">{post.author?.displayName || post.author?.username || t("community.detail.memberFallback")}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-line">{post.content}</p>
                          {post.mediaUrl && <img src={post.mediaUrl} alt="" className="mt-4 max-h-80 w-full rounded-2xl object-cover" />}
                          {post.sourceUrl && <button type="button" onClick={() => window.open(post.sourceUrl!, "_blank", "noopener,noreferrer")} className="mt-3 text-xs font-black text-jobly-blue">{t("community.detail.learnMore")} →</button>}
                          <p className="mt-3 text-[11px] font-bold text-slate-400">{formatDate(post.createdAt)}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button type="button" aria-pressed={post.viewerReacted} onClick={() => void reactToPost(post)} className={`rounded-xl px-3 py-2 text-xs font-black ${post.viewerReacted ? "bg-[#0B1F4B] text-white" : "bg-slate-100 text-[#0B1F4B]"}`}>
                              ♥ {post.reactionCount}
                            </button>
                            <button type="button" aria-expanded={Boolean(commentsOpen[post.id])} onClick={() => void toggleComments(post)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-[#0B1F4B]">
                              {t("community.detail.comments", { n: post.commentCount })}
                            </button>
                          </div>
                          {commentsOpen[post.id] && (
                            <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                              <div className="space-y-3">
                                {(commentsByPost[post.id] || []).map((comment) => (
                                  <div key={comment.id} className="text-xs">
                                    <p className="font-black text-[#0B1F4B]">{comment.author?.displayName || comment.author?.username || t("community.detail.memberFallback")}</p>
                                    <p className="mt-1 leading-5 text-slate-600">{comment.content}</p>
                                  </div>
                                ))}
                                {(commentsByPost[post.id] || []).length === 0 && <p className="text-xs text-slate-500">{t("community.detail.noComments")}</p>}
                              </div>
                              <div className="mt-3 flex gap-2">
                                <input value={commentDrafts[post.id] || ""} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={1000} placeholder={t("community.detail.commentPlaceholder")} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none" />
                                <button type="button" onClick={() => void commentOnPost(post)} className="rounded-xl bg-[#0B1F4B] px-3 py-2 text-xs font-black text-white">{t("community.detail.commentSubmit")}</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </section>
              </>
            )}
          </>
        )}
      </div>

      {inviteOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1F4B]/45 px-5 backdrop-blur-sm">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <div className="text-center text-2xl">🤝</div>
            <h2 className="mt-3 text-center text-xl font-black">Inviter un contact</h2>
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">{t("community.detail.inviteDescription")}</p>
            <div className="mt-6 grid gap-3">
              <button type="button" onClick={() => void copyInvite()} className="rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white">{t("community.detail.copyInvite")}</button>
              <button type="button" onClick={shareWhatsApp} className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black text-[#0B1F4B]">{t("community.detail.shareWhatsApp")}</button>
              <button type="button" onClick={() => setInviteOpen(false)} className="rounded-2xl px-4 py-2 text-xs font-black text-slate-500">{t("common.close")}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
