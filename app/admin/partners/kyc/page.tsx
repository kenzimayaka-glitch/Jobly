"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { getSupabaseClient } from "@/lib/supabase";

type Submission = {
  id: string;
  partnerId: string;
  locationText: string | null;
  locationLat: number | null;
  locationLng: number | null;
  termsVersion: string | null;
  acceptedAt: string | null;
  createdAt: string;
  partner: { id: string; userId: string; referralCode: string; partnerType: string | null; kycStatus: string } | null;
  applicant: { displayName: string | null; firstName: string | null; lastName: string | null; email: string | null; phone: string | null } | null;
  documents: { frontUrl: string | null; backUrl: string | null; expiresInSeconds: number };
};

export default function PartnerKycReviewPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = useCallback(async (accessToken: string) => {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/partners/kyc", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Impossible de charger les dossiers.");
    setSubmissions(body.submissions || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) { router.replace("/"); return; }
      if (!active) return;
      setToken(accessToken);
      try { await load(accessToken); }
      catch (e) {
        if (active) { setError(e instanceof Error ? e.message : "Accès refusé."); setLoading(false); }
      }
    })();
    return () => { active = false; };
  }, [load, router]);

  async function review(item: Submission, decision: "VERIFIED" | "REJECTED") {
    if (!token) return;
    const note = notes[item.partnerId] || "";
    if (decision === "REJECTED" && note.trim().length < 8) {
      setError("Le motif du rejet doit contenir au moins 8 caractères.");
      return;
    }
    setBusy(item.partnerId);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/partners/kyc", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ partnerId: item.partnerId, decision, note }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "La décision n'a pas été enregistrée.");
      setNotice(decision === "VERIFIED" ? "Dossier vérifié. Le statut partenaire est à jour." : "Dossier rejeté. Le motif a été consigné.");
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur pendant la validation.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-[#F7FAFF] pb-10 text-navy">
      <PageHeader eyebrow="ADMIN · CONFORMITÉ" label="Revue KYC partenaires" onBack={() => router.push("/admin")} />
      <div className="mx-auto max-w-5xl px-5 py-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">Dossiers Brand Ambassador</h1>
            <p className="mt-1 text-sm text-slate-500">La soumission ne vaut pas validation. Consultez les pièces puis décidez dossier par dossier.</p>
          </div>
          <span className="rounded-full bg-white px-4 py-2 text-xs font-black shadow-sm">{submissions.length} en attente</span>
        </div>
        {error && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
        {notice && <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{notice}</div>}
        {loading ? <p className="mt-8 text-sm text-slate-500">Chargement des dossiers…</p> :
          !submissions.length ? <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Aucun dossier KYC en attente.</div> :
          <div className="mt-6 space-y-4">
            {submissions.map((item) => {
              const applicant = item.applicant ?? {
                displayName: null,
                firstName: null,
                lastName: null,
                email: null,
                phone: null,
              };
              const name = [applicant.firstName, applicant.lastName].filter(Boolean).join(" ") || applicant.displayName || "Partenaire";
              return (
                <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black">{name}</h2>
                      <p className="mt-1 text-xs text-slate-500">{applicant.email || "E-mail non renseigné"} · {applicant.phone || "Téléphone non renseigné"}</p>
                      <p className="mt-1 text-xs text-slate-500">Code {item.partner?.referralCode || "—"} · Soumis le {new Date(item.createdAt).toLocaleString("fr-FR")}</p>
                    </div>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">À vérifier</span>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {item.documents.frontUrl
                      ? <a href={item.documents.frontUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border p-3 text-sm font-bold text-blue-700 underline decoration-dotted">Ouvrir le document recto ↗</a>
                      : <span className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Document recto indisponible — rechargez le dossier</span>}
                    {item.documents.backUrl
                      ? <a href={item.documents.backUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl border p-3 text-sm font-bold text-blue-700 underline decoration-dotted">Ouvrir le document verso ↗</a>
                      : <span className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Document verso indisponible — rechargez le dossier</span>}
                  </div>
                  <p className="mt-3 text-xs text-slate-600">Localisation déclarée : {item.locationText || "—"} · Consentements enregistrés · Version {item.termsVersion || "—"}</p>
                  <label className="mt-4 block text-xs font-bold text-slate-700">
                    Motif de rejet (obligatoire pour rejeter)
                    <textarea
                      value={notes[item.partnerId] || ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [item.partnerId]: event.target.value }))}
                      rows={2}
                      maxLength={500}
                      className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-sm font-normal"
                      placeholder="Précisez les pièces manquantes ou le motif de rejet…"
                    />
                  </label>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button disabled={busy === item.partnerId} onClick={() => review(item, "VERIFIED")} className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Valider l’identité</button>
                    <button disabled={busy === item.partnerId} onClick={() => review(item, "REJECTED")} className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm font-black text-red-700 disabled:opacity-50">Rejeter le dossier</button>
                  </div>
                </article>
              );
            })}
          </div>
        }
      </div>
    </main>
  );
}
