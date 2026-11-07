"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";

type Review = {
  application: { id: string; status: string; letterText: string | null; tailoredCvText: string | null };
  job: { title: string; company: string; location: string | null };
  channel: string;
  recipient: string | null;
  phone: string | null;
  applicationTargetUrl: string | null;
  subject: string;
};

async function authHeaders() {
  const { data } = await getSupabaseClient().auth.getSession();
  if (!data.session?.access_token) throw new Error("Session Jobly requise. Reconnectez-vous pour relire ou envoyer cette candidature.");
  return { Authorization: `Bearer ${data.session.access_token}` };
}

export default function ApplicationReviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Review | null>(null);
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const headers = await authHeaders();
        const response = await fetch("/api/applications/" + encodeURIComponent(params.id) + "/submit", {
          headers,
          cache: "no-store",
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || "Impossible de charger la préparation.");
        if (!cancelled) {
          setData(body as Review);
          setLetter((body as Review).application.letterText || "");
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Impossible de charger la préparation.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params.id]);

  async function confirm() {
    if (!data || sending) return;
    if (data.channel.toUpperCase() !== "EMAIL") {
      setError("Ce canal exige une action manuelle sur le téléphone ou la plateforme d’origine. Aucun e-mail ne sera envoyé.");
      return;
    }
    setSending(true); setError("");
    try {
      const r = await fetch("/api/applications/" + encodeURIComponent(params.id) + "/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ letterText: letter }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok && r.status !== 202) throw new Error(body.message || "Impossible d'envoyer la candidature.");
      router.replace("/jobs?applicationSent=1");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'envoyer la candidature.");
    } finally { setSending(false); }
  }

  if (loading) return <main className="min-h-[100dvh] grid place-items-center bg-[#F7FAFF] font-bold text-[#17212B]">Préparation de votre candidature…</main>;
  if (error && !data) return <main className="min-h-[100dvh] bg-[#F7FAFF] p-5"><div className="mx-auto mt-12 max-w-2xl rounded-[28px] bg-white p-6 shadow-sm"><h1 className="text-xl font-black">Préparation indisponible</h1><p className="mt-2 text-sm text-slate-600">{error}</p><button onClick={() => router.back()} className="mt-5 rounded-full bg-[#22448B] px-5 py-3 text-sm font-black text-white">Retour</button></div></main>;

  return <main className="min-h-[100dvh] bg-[#F7FAFF] px-4 py-6 text-[#17212B]">
    <div className="mx-auto max-w-2xl">
      <button onClick={() => router.back()} className="mb-4 text-sm font-black text-[#22448B]">← Retour à l'offre</button>
      <section className="rounded-[28px] bg-white p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[1.8px] text-[#B59A00]">J’IA · traitement de candidature</p>
        <h1 className="mt-2 text-2xl font-black">Votre candidature est prête</h1>
        <p className="mt-1 text-sm text-slate-500">{data?.job.title} · {data?.job.company}</p>
        {data?.channel?.toUpperCase() === "EMAIL" ? (
          <>
            <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-4 text-xs">
              {data.recipient && <p><span className="font-black text-slate-400">DESTINATAIRE</span><br/><span className="font-bold text-[#22448B]">{data.recipient}</span></p>}
              {data.subject && <p><span className="font-black text-slate-400">OBJET</span><br/><span className="font-bold">{data.subject}</span></p>}
            </div>
            <label className="mt-5 block text-xs font-black uppercase tracking-[1.2px] text-slate-400">Lettre de candidature</label>
            <textarea value={letter} onChange={e => setLetter(e.target.value)} className="mt-2 min-h-64 w-full rounded-2xl border border-slate-200 p-4 text-sm leading-6 outline-none focus:border-[#FFE135]" />
            <div className="mt-4 rounded-2xl border border-[#FFE135]/60 bg-[#FFFBE0] p-4 text-xs leading-5 text-slate-600"><b className="text-[#17212B]">Pièce jointe :</b> le CV préparé à partir de votre profil Jobly sera envoyé avec le message.</div>
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-slate-700">
            <b className="block text-[#17212B]">Action manuelle nécessaire</b>
            <p className="mt-1">Ce canal n’est pas automatisé par Jobly. J’IA ne transmettra pas votre candidature par e-mail.</p>
            {data?.phone && <a className="mt-3 inline-flex rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-extrabold text-[#22448B]" href={`tel:${data.phone.replace(/[^0-9+]/g, "")}`}>Appeler {data.phone}</a>}
            {data?.applicationTargetUrl && <a className="mt-3 inline-flex rounded-full bg-[#22448B] px-4 py-2 text-xs font-extrabold text-white" href={data.applicationTargetUrl} target="_blank" rel="noopener noreferrer">Ouvrir la plateforme officielle ↗</a>}
          </div>
        )}
        <details className="mt-4 rounded-2xl border border-slate-200 p-4">
          <summary className="cursor-pointer text-xs font-black">Voir le CV préparé</summary>
          <pre className="mt-3 whitespace-pre-wrap text-xs leading-5 text-slate-600">{data?.application.tailoredCvText || "CV non disponible."}</pre>
        </details>
        {error && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        <p className="mt-4 text-[11px] leading-5 text-slate-500">J’IA prépare. Vous relisez et décidez avant l’envoi. Pour une candidature email, Jobly enverra ensuite le message et le CV via votre connexion Gmail.</p>
        {data?.channel?.toUpperCase() === "EMAIL" && (
          <>
            <button type="button" onClick={() => router.push("/candidatures/gmail")} className="mt-4 w-full rounded-full border border-slate-200 px-5 py-3 text-xs font-extrabold text-[#22448B]">
              Connecter ou gérer Gmail
            </button>
            <button disabled={sending} onClick={() => void confirm()} className="mt-3 w-full rounded-full bg-[#FFE135] px-5 py-3.5 text-sm font-black text-[#2E3F4F] disabled:opacity-50">{sending ? "Envoi en cours…" : "Confirmer et envoyer la candidature"}</button>
          </>
        )}
      </section>
    </div>
  </main>;
}
