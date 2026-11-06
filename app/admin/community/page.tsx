"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Report = {
  id: string; postId: string; reason: string; details: string | null; status: string; reviewAction?: string | null; createdAt: string;
  post: { id: string; communityId: string; content: string; status: string; createdAt: string; author?: { displayName?: string | null; username?: string | null } | null } | null;
  community: { name: string; category: string } | null;
  reporter: { displayName?: string | null; username?: string | null; email?: string | null } | null;
};

export default function AdminCommunityModerationPage() {
  const [token, setToken] = useState("");
  const [reports, setReports] = useState<Report[]>([]);
  const [status, setStatus] = useState("OPEN");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async (accessToken: string, selectedStatus: string) => {
    const response = await fetch("/api/admin/moderation/community?status=" + selectedStatus, {
      headers: { Authorization: "Bearer " + accessToken }, cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "File Community indisponible.");
    setReports(body.reports || []);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) throw new Error("Session ADMIN requise.");
      if (!alive) return;
      setToken(accessToken);
      await load(accessToken, status);
      if (alive) setLoading(false);
    })().catch((error) => {
      if (alive) { setMessage(error instanceof Error ? error.message : "Chargement impossible."); setLoading(false); }
    });
    return () => { alive = false; };
  }, [load, status]);

  async function decide(report: Report, action: "HIDE_POST" | "RESTORE_POST" | "DISMISS") {
    setBusy(report.id); setMessage("");
    try {
      const response = await fetch("/api/admin/moderation/community/" + encodeURIComponent(report.id), {
        method: "PATCH", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Décision impossible.");
      await load(token, status);
      setMessage(body.message || "Décision enregistrée.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Décision impossible."); }
    finally { setBusy(null); }
  }

  if (loading) return <main className="grid min-h-[50dvh] place-items-center p-6 text-sm font-bold text-[#17315D]">Chargement des signalements Community…</main>;

  return (
    <main className="min-h-[calc(100dvh-64px)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3156A4]">ADMIN · MODERATION</p>
            <h1 className="mt-2 text-2xl font-black text-[#10264A] sm:text-3xl">Community · signalements</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#66758D]">Chaque signalement est rattaché à une publication et à son auteur. Les retraits, restaurations et classements sont journalisés.</p>
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-11 rounded-xl border border-[#DCE4F0] bg-white px-3 text-xs font-bold">
            <option value="OPEN">À traiter</option><option value="RESOLVED">Traités</option><option value="DISMISSED">Classés sans retrait</option><option value="ALL">Tous</option>
          </select>
        </header>
        {message && <p className="mt-5 rounded-xl border border-[#DCE4F0] bg-white p-3 text-sm font-semibold text-[#30435F]">{message}</p>}
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#DCE4F0] bg-white px-4 py-3">
          <b className="text-sm text-[#10264A]">{reports.length} signalement(s)</b>
          <button onClick={() => load(token, status).catch((e) => setMessage(e.message))} className="rounded-full border border-[#DCE4F0] px-4 py-2 text-xs font-bold">Actualiser</button>
        </div>
        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          {reports.map((report) => (
            <article key={report.id} className="rounded-[22px] border border-[#DCE4F0] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-[#FFF3D7] px-3 py-1 text-[10px] font-black text-[#805500]">{report.reason.replace(/_/g, " ")}</span>
                <span className="text-[10px] font-bold text-[#77849A]">{new Date(report.createdAt).toLocaleString("fr-FR")}</span>
              </div>
              <h2 className="mt-3 text-sm font-black text-[#10264A]">{report.community?.name || "Communauté"} · {report.community?.category || "—"}</h2>
              <p className="mt-1 text-xs text-[#66758D]">Signalé par {report.reporter?.displayName || report.reporter?.username || report.reporter?.email || "Membre Jobly"}</p>
              <div className="mt-3 rounded-2xl bg-[#F4F7FC] p-4">
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-[#344762]">{report.post?.content || "La publication n'est plus disponible."}</p>
                <p className="mt-2 text-[10px] text-[#8290A5]">Auteur : {report.post?.author?.displayName || report.post?.author?.username || "Membre"} · État : {report.post?.status || "Introuvable"}</p>
              </div>
              {report.details && <p className="mt-3 text-xs leading-5 text-[#65748A]">Précision : {report.details}</p>}
              {report.status === "OPEN" && report.post && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button disabled={busy === report.id} onClick={() => decide(report, "HIDE_POST")} className="rounded-full bg-[#A3333C] px-4 py-2.5 text-xs font-black text-white disabled:opacity-50">Masquer la publication</button>
                  <button disabled={busy === report.id} onClick={() => decide(report, "DISMISS")} className="rounded-full border border-[#DCE4F0] px-4 py-2.5 text-xs font-black text-[#43536C] disabled:opacity-50">Classer sans retrait</button>
                </div>
              )}
              {report.status !== "OPEN" && <p className="mt-3 text-[10px] font-black uppercase tracking-wide text-[#66758D]">Décision : {report.reviewAction || report.status}</p>}
              {report.status === "RESOLVED" && report.post?.status === "HIDDEN" && <button disabled={busy === report.id} onClick={() => decide(report, "RESTORE_POST")} className="mt-3 rounded-full border border-[#DCE4F0] px-4 py-2.5 text-xs font-black text-[#43536C] disabled:opacity-50">Restaurer la publication</button>}
            </article>
          ))}
        </section>
        {!reports.length && <div className="mt-4 rounded-2xl border border-dashed border-[#C9D5E6] bg-white p-8 text-center text-sm text-[#718097]">Aucun signalement pour ce filtre.</div>}
      </div>
    </main>
  );
}
