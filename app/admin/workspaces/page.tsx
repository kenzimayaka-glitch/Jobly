"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { ADMIN_WORKSPACE_TEMPLATES, type AdminWorkspaceCode } from "@/lib/adminWorkspaceCatalog";

type WorkspaceRow = { id: string; code: AdminWorkspaceCode; label: string; enabled: boolean };

export default function AdminWorkspacesPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [spaces, setSpaces] = useState<WorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load(accessToken: string) {
    const response = await fetch("/api/admin/workspaces", { headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Espaces indisponibles.");
    setSpaces(body.workspaces || []);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) { router.replace("/"); return; }
      setToken(accessToken);
      await load(accessToken);
      if (alive) setLoading(false);
    })().catch((error) => { if (alive) { setMessage(error instanceof Error ? error.message : "Chargement impossible."); setLoading(false); } });
    return () => { alive = false; };
  }, [router]);

  async function provision(code: AdminWorkspaceCode, enable: boolean) {
    setBusy(code); setMessage("");
    try {
      const response = await fetch("/api/admin/workspaces", {
        method: enable ? "POST" : "DELETE",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Action impossible.");
      await load(token);
      setMessage(enable ? "Espace " + code + " créé et rattaché à votre compte maître." : "Espace " + code + " désactivé.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Action impossible.");
    } finally { setBusy(null); }
  }

  if (loading) return <main className="p-8 text-sm font-semibold">Chargement des espaces…</main>;

  return (
    <main className="min-h-[calc(100dvh-64px)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3156A4]">ADMIN · IDENTITÉ MAÎTRE</p>
            <h1 className="mt-2 text-2xl font-black text-[#10264A] sm:text-3xl">Espaces métier internes</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#66758D]">Créez les espaces Support, Finance, Modération et Analyse sous votre compte administrateur. Ils ne génèrent pas de comptes Auth séparés.</p>
          </div>
          <div className="rounded-2xl border border-[#DCE4F0] bg-white px-4 py-3 text-xs font-bold text-[#43536C]">4 espaces spécialisés · 1 identité maître</div>
        </div>

        {message && <p className="mt-5 rounded-xl border border-[#DCE4F0] bg-white p-3 text-sm font-semibold text-[#30435F]">{message}</p>}

        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {ADMIN_WORKSPACE_TEMPLATES.map((template) => {
            const space = spaces.find((item) => item.code === template.code && item.enabled);
            const pending = busy === template.code;
            return (
              <article key={template.code} className="rounded-[24px] border border-[#DCE4F0] bg-white p-5 shadow-[0_8px_28px_rgba(22,42,75,.05)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#6C7A91]">{template.code}</p>
                    <h2 className="mt-2 text-xl font-black text-[#10264A]">{template.title}</h2>
                    <p className="mt-2 text-sm text-[#66758D]">{template.description}</p>
                  </div>
                  <span className={"shrink-0 rounded-full px-3 py-1 text-[10px] font-black " + (space ? "bg-[#E6F7EF] text-[#126642]" : "bg-[#F0F3F8] text-[#6D7890]")}>{space ? "ACTIF" : "NON CRÉÉ"}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {template.lanes.flatMap((lane) => lane.cards).slice(0, 3).map((card) => (
                    <div key={card.title} className="flex items-center gap-2 rounded-xl bg-[#F6F8FC] px-3 py-2 text-xs font-semibold text-[#40516C]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#3156A4]" />{card.title}
                    </div>
                  ))}
                  {template.code === "MODERATOR" && <div className="rounded-xl bg-[#F6F8FC] px-3 py-2 text-xs font-semibold text-[#40516C]">File Bon Plans · validation humaine</div>}
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  {space ? (
                    <>
                      <button onClick={() => router.push("/admin/workspaces/" + template.code)} className="rounded-full bg-[#10264A] px-4 py-2.5 text-xs font-black text-white">Ouvrir l'espace</button>
                      <button disabled={pending} onClick={() => provision(template.code, false)} className="rounded-full border border-[#DCE4F0] px-4 py-2.5 text-xs font-bold text-[#506079] disabled:opacity-50">Désactiver</button>
                    </>
                  ) : (
                    <button disabled={pending} onClick={() => provision(template.code, true)} className="rounded-full bg-[#FFE135] px-4 py-2.5 text-xs font-black text-[#10264A] disabled:opacity-50">{pending ? "Création…" : "Créer cet espace"}</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-6 text-xs leading-relaxed text-[#77849A]">Les espaces sont des vues fonctionnelles de l'administrateur maître. Les actions sensibles continuent de passer par les API serveur et leurs contrôles d'autorisation ; créer un espace n'accorde pas un accès à une personne supplémentaire.</p>
      </div>
    </main>
  );
}
