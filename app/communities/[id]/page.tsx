"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  author?: { id: string; displayName?: string | null; username?: string | null; profilePhotoUrl?: string | null };
};

type Access = { allowed: boolean; reason: "ACTIVE" | "SUBSCRIPTION_REQUIRED" | "UNAUTHENTICATED" };

export default function CommunityPage() {
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

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/community", { cache: "no-store" });
        const data = response.ok ? await response.json() : { communities: [], access: { allowed: false, reason: "UNAUTHENTICATED" } };
        if (!active) return;
        setAccess(data.access || { allowed: false, reason: "UNAUTHENTICATED" });
        setCommunity((data.communities || []).find((item: Community) => item.id === params.id) || null);

        if (data.access?.allowed) {
          const postsResponse = await fetch(\`/api/community/\${params.id}/posts\`, { cache: "no-store" });
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
      router.push(access.reason === "UNAUTHENTICATED" ? \`/login?next=/communities/\${params.id}\` : "/abonnement");
      return;
    }
    const response = await fetch(\`/api/community/\${params.id}/membership\`, { method: "POST" });
    if (response.status === 401) return router.push(\`/login?next=/communities/\${params.id}\`);
    if (response.status === 403) return router.push("/abonnement");
    if (response.ok) {
      setJoined(true);
      const postsResponse = await fetch(\`/api/community/\${params.id}/posts\`, { cache: "no-store" });
      if (postsResponse.ok) {
        const data = await postsResponse.json();
        setPosts(Array.isArray(data.posts) ? data.posts : []);
      }
    }
  }

  async function publish() {
    const value = content.trim();
    if (!value) return;
    const response = await fetch(\`/api/community/\${params.id}/posts\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: value }),
    });
    if (response.status === 401) return router.push(\`/login?next=/communities/\${params.id}\`);
    if (response.status === 403) {
      setMessage("Community est accessible avec un abonnement actif.");
      return;
    }
    if (!response.ok) {
      setMessage("Rejoins la communauté avant de publier.");
      return;
    }
    const data = await response.json();
    if (data.post) setPosts((current) => [data.post, ...current]);
    setContent("");
    setMessage("");
  }

  const inviteUrl = typeof window !== "undefined" ? \`\${window.location.origin}/communities/\${params.id}?invite=1\` : "";
  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setMessage("Lien d’invitation copié.");
  }
  function shareWhatsApp() {
    if (!inviteUrl) return;
    window.open(\`https://wa.me/?text=\${encodeURIComponent(\`Rejoins cette communauté sur Jobly : \${inviteUrl}\`)}\`, "_blank", "noopener,noreferrer");
  }

  return (
    <main className="min-h-[100dvh] bg-[#F8FAFF] text-[#0B1F4B]">
      <PageHeader label="Community" eyebrow="BON PLAN JOBLY" initial="J" />
      <div className="mx-auto max-w-3xl px-5 pb-12 pt-5">
        <button type="button" onClick={() => router.push("/communities")} className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-extrabold shadow-sm">← Community</button>

        {loading ? (
          <div className="rounded-[26px] bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Chargement…</div>
        ) : !community ? (
          <div className="rounded-[26px] bg-white p-8 text-center shadow-sm"><h1 className="text-xl font-black">Communauté introuvable</h1></div>
        ) : (
          <>
            <section className="rounded-[28px] bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#EEF2FF] text-xl">◉</span>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-[.16em] text-canari-blue">{community.category}</span>
                  <h1 className="mt-1 text-2xl font-black tracking-tight">{community.name}</h1>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{community.description || "Échanger, apprendre et partager autour d'une discipline professionnelle."}</p>
                  <p className="mt-3 text-xs font-black text-slate-500">{community.memberCount} membres</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button type="button" onClick={() => void join()} className="rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white">{joined ? "✓ Vous avez rejoint" : access.allowed ? "Rejoindre la communauté" : "🔒 Rejoindre la communauté"}</button>
                <button type="button" onClick={() => setInviteOpen(true)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-[#0B1F4B]">Inviter un contact</button>
              </div>
            </section>

            {!access.allowed ? (
              <section className="mt-5 rounded-[26px] bg-white p-7 text-center shadow-sm">
                <div className="text-2xl">🔒</div>
                <h2 className="mt-3 text-lg font-black">Community est réservé aux abonnés</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Réactivez votre abonnement pour rejoindre cette communauté et participer aux échanges.</p>
                <button type="button" onClick={() => router.push(access.reason === "UNAUTHENTICATED" ? \`/login?next=/communities/\${params.id}\` : "/abonnement")} className="mt-5 rounded-2xl bg-[#0B1F4B] px-5 py-3 text-xs font-black text-white">Continuer</button>
              </section>
            ) : (
              <>
                <section className="mt-5 rounded-[26px] bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-black">Discussion</h2>
                  {joined ? (
                    <div className="mt-4 flex gap-2">
                      <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Partager une idée, une question ou une ressource…" rows={3} className="min-w-0 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#0B1F4B]" />
                      <button type="button" onClick={() => void publish()} className="self-end rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white">Publier</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => void join()} className="mt-4 rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white">Rejoindre pour participer</button>
                  )}
                  {message && <p className="mt-2 text-xs font-semibold text-slate-500">{message}</p>}
                </section>

                <section className="mt-5 space-y-3">
                  {posts.length === 0 ? (
                    <div className="rounded-[26px] border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Aucun échange pour le moment. Soyez le premier à lancer la discussion.</div>
                  ) : posts.map((post) => (
                    <article key={post.id} className="rounded-[24px] bg-white p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#EEF2FF]">
                          {post.author?.profilePhotoUrl ? <img src={post.author.profilePhotoUrl} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-sm">J</span>}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#0B1F4B]">{post.author?.displayName || post.author?.username || "Membre Jobly"}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-700 whitespace-pre-line">{post.content}</p>
                          {post.mediaUrl && <img src={post.mediaUrl} alt="" className="mt-4 max-h-80 w-full rounded-2xl object-cover" />}
                          {post.sourceUrl && <button type="button" onClick={() => window.open(post.sourceUrl!, "_blank", "noopener,noreferrer")} className="mt-3 text-xs font-black text-jobly-blue">En savoir plus →</button>}
                          <p className="mt-3 text-[11px] font-bold text-slate-400">{new Date(post.createdAt).toLocaleDateString("fr-FR")}</p>
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
            <p className="mt-2 text-center text-sm leading-6 text-slate-500">Le lien ouvre Jobly directement sur cette communauté. La création de compte et la condition d'abonnement restent obligatoires.</p>
            <div className="mt-6 grid gap-3">
              <button type="button" onClick={() => void copyInvite()} className="rounded-2xl bg-[#0B1F4B] px-4 py-3 text-xs font-black text-white">Copier le lien</button>
              <button type="button" onClick={shareWhatsApp} className="rounded-2xl border border-slate-200 px-4 py-3 text-xs font-black text-[#0B1F4B]">Partager sur WhatsApp</button>
              <button type="button" onClick={() => setInviteOpen(false)} className="rounded-2xl px-4 py-2 text-xs font-black text-slate-500">Fermer</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
