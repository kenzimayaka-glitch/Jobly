"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

const TERMS_VERSION = "JOBLY-MOBILITY-PROVIDER-2026-11-05-v1";
const TERMS = "Je certifie l'exactitude des informations et documents transmis, j'accepte les contrôles KYC de Jobly, les règles de confidentialité et les conditions de service Mobility. Je reconnais qu'aucun accès aux dossiers bénéficiaires ou aux financements ne sera accordé avant vérification et activation.";

type Provider = {
  id: string; providerType: string; legalName: string; displayName: string;
  kycStatus: string; status: string; city: string; contractAcceptedAt: string;
};

export default function PartnerDashboardMobility() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [termsVersion, setTermsVersion] = useState(TERMS_VERSION);
  const [message, setMessage] = useState("Vérification du profil prestataire…");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [draft, setDraft] = useState({
    providerType: "HOUSING", legalName: "", displayName: "", registrationNumber: "",
    countryCode: "CM", city: "", contactEmail: "", contactPhone: "",
  });
  const [accepted, setAccepted] = useState(false);

  async function token() {
    const session = await getSupabaseClient().auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function load() {
    const authToken = await token();
    if (!authToken) { setMessage("Connecte-toi pour ouvrir l'espace prestataire."); return; }
    const response = await fetch("/api/mobility/partner/me", { headers: { Authorization: `Bearer ${authToken}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.message || "Profil prestataire indisponible.");
    setProvider(payload.provider || null);
    if (payload.termsVersion) setTermsVersion(payload.termsVersion);
    if (payload.provider) {
      setDraft((current) => ({
        ...current,
        providerType: payload.provider.providerType,
        legalName: payload.provider.legalName,
        displayName: payload.provider.displayName,
        registrationNumber: payload.provider.registrationNumber || "",
        countryCode: payload.provider.countryCode || "CM",
        city: payload.provider.city,
        contactEmail: payload.provider.contactEmail || "",
        contactPhone: payload.provider.contactPhone || "",
      }));
    }
    setMessage("");
  }

  useEffect(() => {
    load().catch((error) => setMessage(error instanceof Error ? error.message : "Chargement impossible."))
      .finally(() => setLoading(false));
  }, []);

  async function register() {
    setSaving(true);
    setMessage("");
    try {
      if (!file || !accepted) throw new Error("Document KYC et acceptation des conditions requis.");
      const authToken = await token();
      if (!authToken) throw new Error("Session requise.");
      const fd = new FormData();
      fd.append("file", file);
      const upload = await fetch("/api/mobility/partner/kyc-document", {
        method: "POST", headers: { Authorization: `Bearer ${authToken}` }, body: fd,
      });
      const uploadPayload = await upload.json();
      if (!upload.ok) throw new Error(uploadPayload.message || "Dépôt du document KYC impossible.");
      const response = await fetch("/api/mobility/partner/me", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          kycEvidenceStoragePath: uploadPayload.storagePath,
          acceptTerms: true,
          termsVersion,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Inscription impossible.");
      setMessage(payload.message || "Dossier transmis pour examen.");
      setFile(null);
      setAccepted(false);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Inscription impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-white px-5 py-8">
      <div className="mx-auto max-w-4xl">
        <span className="rounded-full bg-[#FFF5CC] px-3 py-1 text-xs font-black text-[#8A6500]">JOBLY MOBILITY · PRESTATAIRES</span>
        <h1 className="mt-4 text-3xl font-black">Espace prestataire Mobility</h1>
        {loading ? <p className="mt-5 text-sm text-slate-500">Chargement…</p> : provider ? (
          <section className="mt-6 rounded-[24px] border p-6">
            <p className="text-xs font-black uppercase text-slate-400">{provider.providerType}</p>
            <h2 className="mt-2 text-xl font-black">{provider.displayName}</h2>
            <p className="mt-1 text-sm text-slate-500">{provider.legalName} · {provider.city}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">KYC</p><b>{provider.kycStatus}</b></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-400">Statut</p><b>{provider.status}</b></div>
            </div>
            {provider.status !== "ACTIVE" && <p className="mt-4 text-sm text-amber-800">Ton compte reste en examen. Les demandes bénéficiaires et les services ne seront accessibles qu'après vérification KYC et activation par Jobly.</p>}
            {provider.status === "ACTIVE" && <p className="mt-4 text-sm text-emerald-700">Prestataire vérifié. Tu peux publier tes services et traiter les affectations.</p>}
          </section>
        ) : (
          <section className="mt-6 rounded-[24px] border p-6">
            <h2 className="text-xl font-black">Créer ton profil prestataire</h2>
            <p className="mt-2 text-sm text-slate-500">L'inscription ne donne pas immédiatement accès aux dossiers : Jobly vérifie les pièces et la convention.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <select value={draft.providerType} onChange={(e) => setDraft({ ...draft, providerType: e.target.value })} className="rounded-xl border p-3 text-sm">
                <option value="FINANCE">Finance / financement</option>
                <option value="HOUSING">Hébergement</option>
                <option value="TRANSPORT">Transport</option>
              </select>
              <input value={draft.legalName} onChange={(e) => setDraft({ ...draft, legalName: e.target.value })} placeholder="Raison sociale" className="rounded-xl border p-3 text-sm" />
              <input value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} placeholder="Nom commercial" className="rounded-xl border p-3 text-sm" />
              <input value={draft.registrationNumber} onChange={(e) => setDraft({ ...draft, registrationNumber: e.target.value })} placeholder="RCCM / identifiant légal" className="rounded-xl border p-3 text-sm" />
              <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Ville" className="rounded-xl border p-3 text-sm" />
              <input value={draft.contactEmail} onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })} placeholder="Email professionnel" className="rounded-xl border p-3 text-sm" />
              <input value={draft.contactPhone} onChange={(e) => setDraft({ ...draft, contactPhone: e.target.value })} placeholder="Téléphone professionnel" className="rounded-xl border p-3 text-sm" />
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} className="rounded-xl border p-3 text-sm" />
            </div>
            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{TERMS}</div>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-1" />
              J'accepte la convention prestataire Mobility ({termsVersion}).
            </label>
            <button disabled={saving || !file || !accepted || !draft.legalName || !draft.city} onClick={register} className="mt-5 rounded-full bg-[#0A3D9C] px-5 py-3 text-sm font-black text-white disabled:opacity-40">
              {saving ? "Envoi…" : "Soumettre mon dossier"}
            </button>
          </section>
        )}
        {message && <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{message}</p>}
      </div>
    </main>
  );
}
