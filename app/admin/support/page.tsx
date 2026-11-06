"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Message = { id: string; authorRole: string; body: string; isInternal: boolean; createdAt: string };
type Ticket = { id: string; subject: string; category: string; priority: string; status: string; createdAt: string; lastMessageAt: string; requester?: { displayName?: string | null; email?: string | null; role?: string | null; phone?: string | null } | null; messages: Message[] };
const STATUSES = ["OPEN","IN_PROGRESS","WAITING_USER","RESOLVED","CLOSED"];
const PRIORITIES = ["LOW","NORMAL","HIGH","URGENT"];

export default function AdminSupportPage() {
  const [token, setToken] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async (accessToken: string, status: string) => {
    const response = await fetch("/api/admin/support/tickets?status=" + status, {
      headers: { Authorization: "Bearer " + accessToken }, cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "File Support indisponible.");
    const rows = body.tickets || [];
    setTickets(rows);
    setSelected((current) => current && rows.some((row: Ticket) => row.id === current) ? current : rows[0]?.id || null);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) throw new Error("Session ADMIN requise.");
      if (!alive) return;
      setToken(accessToken);
      await load(accessToken, filter);
      if (alive) setLoading(false);
    })().catch((error) => { if (alive) { setMessage(error instanceof Error ? error.message : "Chargement impossible."); setLoading(false); } });
    return () => { alive = false; };
  }, [filter, load]);

  async function patch(ticket: Ticket, values: Record<string, unknown>) {
    setBusy(ticket.id); setMessage("");
    try {
      const response = await fetch("/api/admin/support/tickets/" + ticket.id, {
        method: "PATCH", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.warning || "Mise à jour impossible.");
      await load(token, filter);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Mise à jour impossible."); }
    finally { setBusy(null); }
  }

  async function sendMessage(ticket: Ticket) {
    if (!reply.trim()) return;
    setBusy(ticket.id); setMessage("");
    try {
      const response = await fetch("/api/admin/support/tickets/" + ticket.id + "/messages", {
        method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply, isInternal: internal }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Envoi impossible.");
      setReply(""); await load(token, filter);
      setMessage(internal ? "Note interne enregistrée." : "Réponse envoyée au demandeur.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Envoi impossible."); }
    finally { setBusy(null); }
  }

  if (loading) return <main className="grid min-h-[50dvh] place-items-center text-sm font-bold">Chargement de la file Support…</main>;
  const current = tickets.find((ticket) => ticket.id === selected) || null;
  return (
    <main className="min-h-[calc(100dvh-64px)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3156A4]">ADMIN · SUPPORT</p><h1 className="mt-2 text-2xl font-black text-[#10264A] sm:text-3xl">Centre de tickets</h1><p className="mt-1 text-sm text-[#66758D]">Demandes réelles des utilisateurs, réponses visibles et notes internes privées.</p></div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="min-h-11 rounded-xl border border-[#DCE4F0] bg-white px-3 text-xs font-bold"><option value="ALL">Tous les statuts</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}</select>
        </header>
        {message && <p className="mt-4 rounded-xl border border-[#DCE4F0] bg-white p-3 text-sm font-semibold">{message}</p>}
        <div className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
          <section className="space-y-2">
            <div className="rounded-2xl border border-[#DCE4F0] bg-white px-4 py-3 text-sm font-black">{tickets.length} ticket(s)</div>
            {tickets.map((ticket) => <button key={ticket.id} onClick={() => { setSelected(ticket.id); setReply(""); }} className={"w-full rounded-2xl border p-4 text-left " + (selected === ticket.id ? "border-[#3156A4] bg-[#EDF2FA]" : "border-[#DCE4F0] bg-white")}>
              <div className="flex items-start justify-between gap-2"><b className="min-w-0 break-words text-sm">{ticket.subject}</b><span className="shrink-0 text-[9px] font-black text-[#3156A4]">{ticket.priority}</span></div>
              <p className="mt-1 text-[10px] text-[#728097]">{ticket.requester?.displayName || ticket.requester?.email || "Utilisateur"} · {ticket.category}</p>
              <p className="mt-2 text-[10px] font-black uppercase text-[#596A84]">{ticket.status.replace(/_/g," ")}</p>
            </button>)}
            {!tickets.length && <div className="rounded-2xl border border-dashed border-[#C9D5E6] bg-white p-7 text-center text-sm text-[#718097]">Aucun ticket dans ce filtre.</div>}
          </section>
          <section className="min-w-0">
            {!current ? <div className="rounded-2xl border border-dashed border-[#C9D5E6] bg-white p-10 text-center text-sm text-[#718097]">Sélectionne un ticket pour le traiter.</div> : <article className="rounded-[22px] border border-[#DCE4F0] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-wide text-[#3156A4]">{current.category} · {current.id.slice(0,8)}</p><h2 className="mt-1 break-words text-xl font-black">{current.subject}</h2><p className="mt-1 text-xs text-[#66758D]">{current.requester?.displayName || "Utilisateur"} · {current.requester?.email || "Email indisponible"} · {current.requester?.role || "—"}</p></div><button onClick={() => patch(current,{assignToMe:true})} disabled={busy===current.id} className="rounded-full border border-[#DCE4F0] px-3 py-2 text-[10px] font-black disabled:opacity-50">M'assigner</button></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <label className="text-[10px] font-bold text-[#5F6F87]">Statut<select value={current.status} onChange={(e) => patch(current,{status:e.target.value})} disabled={busy===current.id} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#DCE4F0] bg-white px-3 text-xs font-bold">{STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g," ")}</option>)}</select></label>
                <label className="text-[10px] font-bold text-[#5F6F87]">Priorité<select value={current.priority} onChange={(e) => patch(current,{priority:e.target.value})} disabled={busy===current.id} className="mt-1.5 min-h-11 w-full rounded-xl border border-[#DCE4F0] bg-white px-3 text-xs font-bold">{PRIORITIES.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
              </div>
              <div className="mt-5 max-h-[48dvh] space-y-2 overflow-y-auto rounded-2xl bg-[#F5F7FB] p-3">
                {current.messages.map((item) => <div key={item.id} className={"rounded-xl p-3 text-xs leading-5 " + (item.isInternal ? "border border-amber-200 bg-amber-50" : item.authorRole === "ADMIN" ? "bg-[#EAF0FF]" : "bg-white")}>
                  <div className="mb-1 flex flex-wrap justify-between gap-2"><b>{item.isInternal ? "Note interne · équipe Jobly" : item.authorRole === "ADMIN" ? "Équipe Jobly" : "Demandeur"}</b><span className="text-[9px] text-[#8290A5]">{new Date(item.createdAt).toLocaleString("fr-FR")}</span></div>{item.body}
                </div>)}
              </div>
              <div className="mt-4">
                <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={5000} placeholder={internal ? "Note privée visible uniquement par l'équipe…" : "Répondre au demandeur…"} className="w-full rounded-xl border border-[#DCE4F0] px-3 py-3 text-xs" />
                <label className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[#596A84]"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Note interne privée</label>
                <div><button disabled={busy===current.id || !reply.trim()} onClick={() => sendMessage(current)} className="mt-3 min-h-11 rounded-full bg-[#10264A] px-5 text-xs font-black text-white disabled:opacity-50">{busy===current.id ? "Traitement…" : internal ? "Enregistrer la note" : "Envoyer la réponse"}</button></div>
              </div>
            </article>}
          </section>
        </div>
      </div>
    </main>
  );
}
