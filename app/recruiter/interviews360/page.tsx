"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import { Button, Card } from "@/components/ui";
import { getSupabaseClient } from "@/lib/supabase";

type Candidate = { id: string; candidateName?: string; recruiterJobId: string };
type Interview = {
  id: string; applicationId: string; candidateName: string; title: string;
  startsAt: string; endsAt: string; timezone: string; status: string;
  meetingProvider: string; meetingUrl?: string | null; location?: string | null;
};

export default function Recruitment360InterviewsPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [applicationId, setApplicationId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [title, setTitle] = useState("Entretien Jobly");
  const [meetingProvider, setMeetingProvider] = useState("EXTERNAL");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) { router.replace("/"); return; }
      const headers = { Authorization: `Bearer ${session.access_token}` };
      const [candidateResponse, interviewResponse] = await Promise.all([
        fetch("/api/recruitment360/applications", { headers, cache: "no-store" }),
        fetch("/api/recruitment360/interviews", { headers, cache: "no-store" }),
      ]);
      const [candidatePayload, interviewPayload] = await Promise.all([candidateResponse.json(), interviewResponse.json()]);
      if (!candidateResponse.ok) throw new Error(candidatePayload.message || "Candidatures indisponibles.");
      if (!interviewResponse.ok) throw new Error(interviewPayload.message || "Entretiens indisponibles.");
      setCandidates(candidatePayload.applications ?? []);
      setInterviews(interviewPayload.interviews ?? []);
      setApplicationId((current) => current || candidatePayload.applications?.[0]?.id || "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Chargement impossible.");
    } finally { setLoading(false); }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function submit(body: Record<string, unknown>, key: string) {
    setBusy(key); setError("");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) { router.replace("/"); return; }
      const response = await fetch("/api/recruitment360/interviews", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Opération impossible.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Opération impossible.");
    } finally { setBusy(null); }
  }

  return (
    <AppShell role="recruiter" active="/recruiter/applications360" title="Entretiens 360°" eyebrow="RECRUTEMENT 360°" initial="R" width="lg">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Lot 5 · Entretiens</p><h1 className="text-2xl font-black">Planifier et suivre les entretiens</h1><p className="mt-1 text-sm text-slate-600">Créneaux, invitation, lien de réunion et statut.</p></div>
        <Button href="/recruiter/applications360" variant="ghost">Candidatures</Button>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Card>
        <form className="grid gap-3" onSubmit={(event) => {
          event.preventDefault();
          void submit({ action: "schedule", applicationId, title, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), meetingProvider, meetingUrl, location, notes, timezone: "Africa/Douala" }, "schedule");
        }}>
          <h2 className="font-bold">Nouvel entretien</h2>
          <label className="grid gap-1 text-sm">Candidat
            <select required value={applicationId} onChange={(event) => setApplicationId(event.target.value)} className="rounded-xl border p-3">
              <option value="">Choisir une candidature</option>
              {candidates.map((item) => <option key={item.id} value={item.id}>{item.candidateName || "Candidat"} · {item.id.slice(0, 8)}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Titre<input required value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl border p-3" /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">Début<input required type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="rounded-xl border p-3" /></label>
            <label className="grid gap-1 text-sm">Fin<input required type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="rounded-xl border p-3" /></label>
          </div>
          <label className="grid gap-1 text-sm">Canal de réunion
            <select value={meetingProvider} onChange={(event) => setMeetingProvider(event.target.value)} className="rounded-xl border p-3">
              <option value="EXTERNAL">Lien externe</option><option value="GOOGLE_MEET">Google Meet</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">Lien HTTPS de réunion<input required type="url" value={meetingUrl} onChange={(event) => setMeetingUrl(event.target.value)} placeholder="https://…" className="rounded-xl border p-3" /></label>
          <label className="grid gap-1 text-sm">Lieu (facultatif)<input value={location} onChange={(event) => setLocation(event.target.value)} className="rounded-xl border p-3" /></label>
          <label className="grid gap-1 text-sm">Notes (facultatif)<textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20 rounded-xl border p-3" /></label>
          <Button submit disabled={!applicationId || !startsAt || !endsAt || !meetingUrl || busy !== null} loading={busy === "schedule"}>Planifier l'entretien</Button>
        </form>
      </Card>
      <section className="mt-6 space-y-3">
        <h2 className="text-lg font-bold">Entretiens planifiés</h2>
        {loading ? <Card>Chargement…</Card> : interviews.length === 0 ? <Card className="text-sm text-slate-600">Aucun entretien planifié pour les recrutements accessibles.</Card> : interviews.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div><h3 className="font-bold">{item.title}</h3><p className="text-sm">{item.candidateName} · {item.status}</p><p className="text-sm text-slate-600">{new Date(item.startsAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })} – {new Date(item.endsAt).toLocaleTimeString("fr-FR", { timeStyle: "short" })}</p>{item.location && <p className="text-sm">{item.location}</p>}{item.meetingUrl && <a className="text-sm text-blue-700 underline" href={item.meetingUrl} target="_blank" rel="noreferrer">Ouvrir la réunion</a>}</div>
              <div className="flex flex-wrap gap-2">
                {item.status === "SCHEDULED" && <Button size="sm" disabled={busy !== null} loading={busy === item.id + ":confirm"} onClick={() => void submit({action:"status",interviewId:item.id,status:"CONFIRMED"},item.id+":confirm")}>Confirmer</Button>}
                {["SCHEDULED","CONFIRMED"].includes(item.status) && <Button size="sm" variant="ghost" disabled={busy !== null} loading={busy === item.id + ":cancel"} onClick={() => {const reason=window.prompt("Motif de l'annulation (5 caractères minimum)")?.trim()||"";if(reason.length>=5)void submit({action:"status",interviewId:item.id,status:"CANCELLED",reason},item.id+":cancel");}}>Annuler</Button>}
                {["SCHEDULED","CONFIRMED","STARTED"].includes(item.status) && <Button size="sm" variant="ghost" disabled={busy !== null} loading={busy === item.id + ":complete"} onClick={() => void submit({action:"status",interviewId:item.id,status:"COMPLETED"},item.id+":complete")}>Terminer</Button>}
              </div>
            </div>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
