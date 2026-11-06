"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import PageHeader from "@/components/PageHeader";

type Message = { id: string; authorRole: string; body: string; createdAt: string };
type Ticket = { id: string; subject: string; category: string; priority: string; status: string; createdAt: string; lastMessageAt: string; messages: Message[] };

const STATUS_LABEL: Record<string, string> = { OPEN: "Ouvert", IN_PROGRESS: "En cours", WAITING_USER: "Votre réponse attendue", RESOLVED: "Résolu", CLOSED: "Clôturé" };

export default function SupportPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [description, setDescription] = useState("");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/support/tickets", { headers: { Authorization: "Bearer " + accessToken }, cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Historique Support indisponible.");
    setTickets(body.tickets || []);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) { router.replace("/login?next=/support"); return; }
      if (!alive) return;
      setToken(accessToken);
      await load(accessToken);
      if (alive) setLoading(false);
    })().catch((error) => { if (alive) { setMessage(error instanceof Error ? error.message : "Chargement impossible."); setLoading(false); } });
    return () => { alive = false; };
  }, [load, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy("new"); setMessage("");
    try {
      const response = await fetch("/api/support/tickets", {
        method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ subject, category, description }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Création impossible.");
      setSubject(""); setDescription("");
      await load(token); setMessage(body.message || "Demande transmise au Support Jobly.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Création impossible."); }
    finally { setBusy(null); }
  }

  async function reply(ticket: Ticket) {
    const bodyText = (replies[ticket.id] || "").trim();
    if (!bodyText) return;
    setBusy(ticket.id); setMessage("");
    try {
      const response = await fetch("/api/support/tickets/" + ticket.id + "/messages", {
        method: "POST", headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify({ body: bodyText }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Réponse impossible.");
      setReplies((current) => ({ ...current, [ticket.id]: "" }));
      await load(token); setMessage("Réponse envoyée.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Réponse impossible."); }
    finally { setBusy(null); }
  }

  if (loading) return <main className="grid min-h-[70dvh] place-items-center text-sm font-bold text-[#17315D]">Chargement du Support Jobly…</main>;
  return (
    <main className="min-h-[100dvh] bg-[#F5F8FD] pb-10 text-[#10264A]">
      <PageHeader eyebrow="JOBLY · AIDE" label="Support & accompagnement" />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3156A4]">CENTRE D'ASSISTANCE</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">Comment pouvons-nous vous aider ?</h1>
          <p className="mt-2 text-sm text-[#66758D]">Ouvrez une demande et suivez les réponses depuis votre compte Jobly.</p>
        </header>
        {message && <p className="mt-4 rounded-xl border border-[#DCE4F0] bg-white p-3 text-sm font-semibold">{message}</p>}
        <section className="mt-6 rounded-[24px] border border-[#DCE4F0] bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-lg font-black">Nouvelle demande</h2>
          <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-[#43536C]">Sujet
              <input required minLength={4} maxLength={180} value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-[#DCE4F0] px-3 text-sm" placeholder="Décrivez brièvement votre problème" />
            </label>
            <label className="text-xs font-bold text-[#43536C]">Catégorie
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1.5 min-h-12 w-full rounded-xl border border-[#DCE4F0] bg-white px-3 text-sm">
                <option value="GENERAL">Question générale</option><option value="ACCOUNT">Compte & connexion</option><option value="PAYMENT">Paiement & abonnement</option><option value="APPLICATION">Candidature</option><option value="RECRUITER">Recruteur</option><option value="PARTNER">Partenaire</option><option value="MOBILITY">Mobilité</option><option value="COMMUNITY">Community</option><option value="TECHNICAL">Problème technique</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#43536C] sm:col-span-2">Description
              <textarea required minLength={10} maxLength={5000} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DCE4F0] px-3 py-3 text-sm" placeholder="Expliquez ce qui s'est passé et ce que vous attendiez." />
            </label>
            <div className="sm:col-span-2"><button disabled={busy === "new"} className="min-h-12 rounded-full bg-[#FFE135] px-6 text-sm font-black text-[#10264A] disabled:opacity-50">{busy === "new" ? "Envoi…" : "Envoyer ma demande"}</button></div>
          </form>
        </section>
        <section className="mt-8">
          <div className="flex items-end justify-between gap-3"><div><h2 className="text-lg font-black">Mes demandes</h2><p className="mt-1 text-xs text-[#77849A]">Les notes internes de l'équipe ne sont jamais visibles ici.</p></div><span className="text-xs font-bold text-[#77849A]">{tickets.length} dossier(s)</span></div>
          <div className="mt-4 space-y-3">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="rounded-[22px] border border-[#DCE4F0] bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-wide text-[#3156A4]">{ticket.category} · {ticket.priority}</p><h3 className="mt-1 break-words text-base font-black">{ticket.subject}</h3></div>
                  <span className="rounded-full bg-[#EDF2FA] px-3 py-1.5 text-[10px] font-black">{STATUS_LABEL[ticket.status] || ticket.status}</span>
                </div>
                <div className="mt-4 space-y-2">
                  {ticket.messages.map((item) => <div key={item.id} className={"rounded-2xl p-3 text-xs leading-5 " + (item.authorRole === "ADMIN" ? "bg-[#EEF3FF]" : "bg-[#F5F7FA]")}><div className="mb-1 flex justify-between gap-2"><b>{item.authorRole === "ADMIN" ? "Équipe Jobly" : "Vous"}</b><span className="text-[10px] text-[#8290A5]">{new Date(item.createdAt).toLocaleString("fr-FR")}</span></div>{item.body}</div>)}
                </div>
                {!["RESOLVED","CLOSED"].includes(ticket.status) && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><textarea rows={2} value={replies[ticket.id] || ""} onChange={(e) => setReplies((current) => ({ ...current, [ticket.id]: e.target.value }))} placeholder="Répondre au support…" className="min-w-0 flex-1 rounded-xl border border-[#DCE4F0] px-3 py-2 text-xs" /><button disabled={busy === ticket.id} onClick={() => reply(ticket)} className="min-h-10 rounded-xl bg-[#10264A] px-4 text-xs font-black text-white disabled:opacity-50">Répondre</button></div>}
              </article>
            ))}
            {!tickets.length && <div className="rounded-2xl border border-dashed border-[#C9D5E6] bg-white p-8 text-center text-sm text-[#718097]">Vous n'avez encore aucune demande.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
