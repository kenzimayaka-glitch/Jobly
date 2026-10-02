"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";

type Community = {
  id: string;
  name: string;
  description?: string | null;
  category: string;
  country?: string | null;
  city?: string | null;
};

type Post = {
  id: string;
  content: string;
  createdAt: string;
  author?: { id: string; name?: string | null; email?: string | null };
};

export default function CommunityPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [communitiesResponse, postsResponse] = await Promise.all([
          fetch("/api/community", { cache: "no-store" }),
          fetch(`/api/community/${params.id}/posts`, { cache: "no-store" }),
        ]);
        const communitiesData = communitiesResponse.ok ? await communitiesResponse.json() : { communities: [] };
        const postsData = postsResponse.ok ? await postsResponse.json() : { posts: [] };
        if (!active) return;
        setCommunity((communitiesData.communities ?? []).find((item: Community) => item.id === params.id) ?? null);
        setPosts(Array.isArray(postsData.posts) ? postsData.posts : []);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [params.id]);

  async function publish() {
    const value = content.trim();
    if (!value) return;
    const response = await fetch(`/api/community/${params.id}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: value }),
    });
    if (response.status === 401) {
      router.push(`/login?next=/communities/${params.id}`);
      return;
    }
    if (!response.ok) {
      setMessage("Rejoignez la communauté pour publier.");
      return;
    }
    const data = await response.json();
    if (data.post) setPosts((current) => [data.post, ...current]);
    setContent("");
    setMessage("");
  }

  return (
    <main className="min-h-[100dvh] bg-[#F8FAFF] text-[#0B1F4B]">
      <PageHeader label="Community" eyebrow="BON PLAN JOBLY" initial="J" />

      <div className="mx-auto max-w-3xl px-5 pb-12 pt-5">
        <button
          type="button"
          onClick={() => router.push("/communities")}
          className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold shadow-sm"
        >
          ← Community
        </button>

        {loading ? (
          <div className="rounded-[26px] bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Chargement…</div>
        ) : !community ? (
          <div className="rounded-[26px] bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-black">Communauté introuvable</h1>
          </div>
        ) : (
          <>
            <section className="rounded-[28px] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#EEF2FF] text-xl">◉</span>
                <div className="min-w-0">
                  <span className="text-[10px] font-black uppercase tracking-[.16em] text-canari-blue">{community.category}</span>
                  <h1 className="mt-1 text-2xl font-black tracking-tight">{community.name}</h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {community.description || "Échanger, apprendre et créer des connexions utiles."}
                  </p>
                  {(community.city || community.country) && (
                    <p className="mt-3 text-xs font-bold text-slate-400">
                      {[community.city, community.country].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="mt-5 rounded-[26px] bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black">Discussion</h2>
              <div className="mt-4 flex gap-2">
                <textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="Partager une idée, une question ou une ressource…"
                  rows={3}
                  className="min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0B1F4B]"
                />
                <button
                  type="button"
                  onClick={() => void publish()}
                  className="self-end rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white"
                >
                  Publier
                </button>
              </div>
              {message && <p className="mt-2 text-xs font-semibold text-slate-500">{message}</p>}
            </section>

            <section className="mt-5 space-y-3">
              {posts.length === 0 ? (
                <div className="rounded-[26px] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  Aucun échange pour le moment. Soyez le premier à lancer la discussion.
                </div>
              ) : (
                posts.map((post) => (
                  <article key={post.id} className="rounded-[24px] bg-white p-5 shadow-sm">
                    <p className="text-sm leading-6 text-slate-700">{post.content}</p>
                    <p className="mt-3 text-[11px] font-bold text-slate-400">
                      {post.author?.name || post.author?.email || "Membre Jobly"} · {new Date(post.createdAt).toLocaleDateString("fr-FR")}
                    </p>
                  </article>
                ))
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
