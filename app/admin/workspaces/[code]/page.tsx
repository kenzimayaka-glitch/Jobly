"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { getAdminWorkspaceTemplate, type AdminWorkspaceCode } from "@/lib/adminWorkspaceCatalog";

type WorkspaceRow = { code: string; enabled: boolean };
type BonPlanItem = { id: string; title: string; description: string | null; category: string; country: string; city: string | null; createdAt: string; sourceUrl: string | null; author?: { displayName?: string | null; username?: string | null } | null };
type Decision = { id: string; title: string; decision: "APPROVE" | "REJECT" };

export default function AdminWorkspaceBoardPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = String(params.code || "").toUpperCase();
  const template = useMemo(() => getAdminWorkspaceTemplate(code), [code]);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<BonPlanItem[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!template) { router.replace("/admin/workspaces"); return; }
      const session = await getSupabaseClient().auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) { router.replace("/"); return; }
      const spacesResponse = await fetch("/api/admin/workspaces", { headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" });
      const spacesBody = await spacesResponse.json().catch(() => ({}));
      const space = (spacesBody.workspaces || []).find((entry: WorkspaceRow) => entry.code === code && entry.enabled);
      if (!spacesResponse.ok || !space) { router.replace("/admin/workspaces"); return; }
      if (alive) setToken(accessToken);
      if (code === "MODERATOR") {
        const response = await fetch("/api/bon-plans/moderation", { headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || "File de modération indisponible.");
        if (alive) setItems(body.items || []);
      }
      if (alive) setLoading(false);
    })().catch((error) => { if (alive) { setMessage(error instanceof Error ? error.message : "Chargement impossible."); setLoading(false); } });
    return () => { alive = false; };
  }, [code, router, template]);

  async function decide(item: BonPlanItem, decision: "APPROVE" | "REJECT") {
    setBusy(item.id); setMessage("");
    try {
      const response = await fetch("/api/bon-plans/" + encodeURIComponent(item.id) + "/moderation", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Décision impossible.");
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setDecisions((current) => [{ id: item.id, title: item.title, decision }, ...current]);
      setMessage(body.warning || (decision === "APPROVE" ? "Proposition publiée." : "Proposition rejetée."));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Décision impossible.");
    } finally { setBusy(null); }
  }

  if (!template) return null;
  if (loading) return <main className="p-8 text-sm font-semibold">Chargement de l'espace {template.label}…</main>;

  return (
    <main className="min-h-[calc(100dvh-64px)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button onClick={() => router.push("/admin/workspaces")} className="text-xs font-bold text-[#3156A4]">← Tous les espaces</button>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3156A4]">ESPACE {template.code}</p>
            <h1 className="mt-2 text-2xl font-black text-[#10264A] sm:text-3xl">{template.title}</h1>
            <p className="mt-2 text-sm text-[#66758D]">{template.description}</p>
          </div>
          <div className="rounded-2xl border border-[#DCE4F0] bg-white px-4 py-3 text-xs font-bold text-[#43536C]">Kanban · compte ADMIN maître</div>
        </div>
        <div className="mt-5 rounded-2xl border border-[#E8D99B] bg-[#FFF9DF] px-4 py-3 text-xs leading-relaxed text-[#69551D]">{template.boundary}</div>
        {message && <p className="mt-4 rounded-xl border border-[#DCE4F0] bg-white p-3 text-sm font-semibold text-[#30435F]">{message}</p>}

        {template.code === "MODERATOR" ? (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <section className="rounded-[22px] border border-[#DCE4F0] bg-[#EDF1F7] p-3">
              <div className="flex items-center justify-between px-2 py-2"><h2 className="text-sm font-black">À examiner</h2><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black">{items.length}</span></div>
              <div className="space-y-3">
                {items.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-[#E0E7F1] bg-white p-4 shadow-sm">
                    <div className="text-[9px] font-black uppercase tracking-[0.15em] text-[#6C7A91]">{item.category} · {item.country}{item.city ? " · " + item.city : ""}</div>
                    <h3 className="mt-2 text-sm font-black text-[#10264A]">{item.title}</h3>
                    <p className="mt-2 line-clamp-4 text-xs leading-relaxed text-[#65748A]">{item.description || "Aucune description fournie."}</p>
                    <p className="mt-3 text-[10px] text-[#8290A5]">Proposé par {item.author?.displayName || item.author?.username || "Utilisateur Jobly"}</p>
                    {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-[10px] font-bold text-[#3156A4] underline">Consulter la source</a>}
                    <div className="mt-4 flex gap-2">
                      <button disabled={busy === item.id} onClick={() => decide(item, "APPROVE")} className="flex-1 rounded-xl bg-[#116B49] px-3 py-2.5 text-[10px] font-black text-white disabled:opacity-50">Approuver</button>
                      <button disabled={busy === item.id} onClick={() => decide(item, "REJECT")} className="flex-1 rounded-xl border border-[#E1BFC0] px-3 py-2.5 text-[10px] font-black text-[#A33C42] disabled:opacity-50">Rejeter</button>
                    </div>
                  </article>
                ))}
                {!items.length && <div className="rounded-2xl border border-dashed border-[#C9D3E1] bg-white/70 p-5 text-center text-xs text-[#76849A]">Aucune proposition en attente.</div>}
              </div>
            </section>
            <section className="rounded-[22px] border border-[#DCE4F0] bg-[#EDF1F7] p-3">
              <div className="px-2 py-2"><h2 className="text-sm font-black">Décisions de la session</h2><p className="mt-1 text-[10px] text-[#738198]">Actions enregistrées côté serveur</p></div>
              <div className="space-y-3">
                {decisions.map((decision) => <article key={decision.id} className="rounded-2xl bg-white p-4 shadow-sm"><h3 className="text-xs font-bold text-[#243B61]">{decision.title}</h3><p className={"mt-2 text-[10px] font-black " + (decision.decision === "APPROVE" ? "text-[#116B49]" : "text-[#A33C42]")}>{decision.decision === "APPROVE" ? "APPROUVÉE · PUBLIÉE" : "REJETÉE"}</p></article>)}
                {!decisions.length && <div className="rounded-2xl border border-dashed border-[#C9D3E1] bg-white/70 p-5 text-center text-xs text-[#76849A]">Aucune décision prise pendant cette session.</div>}
              </div>
            </section>
            <section className="rounded-[22px] border border-[#DCE4F0] bg-[#EDF1F7] p-3">
              <div className="px-2 py-2"><h2 className="text-sm font-black">Outils de contrôle</h2><p className="mt-1 text-[10px] text-[#738198]">Modules Jobly reliés</p></div>
              <div className="space-y-3">
                <button onClick={() => router.push("/admin/jobs/reprocess")} className="w-full rounded-2xl bg-white p-4 text-left shadow-sm"><b className="text-xs">Réindexation des offres</b><p className="mt-1 text-[10px] text-[#65748A]">Reprise et contrôle du pipeline d'offres agrégées.</p></button>
                <button onClick={() => router.push("/communities")} className="w-full rounded-2xl bg-white p-4 text-left shadow-sm"><b className="text-xs">Community</b><p className="mt-1 text-[10px] text-[#65748A]">La détection de contournement et le retrait sont automatisés par J’IA.</p></button>
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {template.lanes.map((lane) => (
              <section key={lane.title} className="rounded-[22px] border border-[#DCE4F0] bg-[#EDF1F7] p-3">
                <div className="px-2 py-2"><h2 className="text-sm font-black text-[#243B61]">{lane.title}</h2><p className="mt-1 text-[10px] text-[#738198]">{lane.subtitle}</p></div>
                <div className="space-y-3">
                  {lane.cards.map((card) => (
                    <button key={card.title} onClick={() => router.push(card.href)} className="w-full rounded-2xl border border-[#E2E8F1] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                      <div className="flex items-center justify-between gap-2"><h3 className="text-xs font-black text-[#10264A]">{card.title}</h3><span className="text-[#3156A4]">↗</span></div>
                      <p className="mt-2 text-[11px] leading-relaxed text-[#65748A]">{card.description}</p>
                      <p className="mt-3 text-[9px] font-black uppercase tracking-[0.14em] text-[#3156A4]">Ouvrir le module</p>
                    </button>
                  ))}
                  {!lane.cards.length && <div className="rounded-2xl border border-dashed border-[#C9D3E1] bg-white/60 p-5 text-center text-xs text-[#76849A]">Aucune opération en attente.</div>}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
