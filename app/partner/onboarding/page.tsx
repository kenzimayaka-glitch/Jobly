"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../../lib/supabase";

export default function BrandAmbassadorOnboardingPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationText, setLocationText] = useState("");
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [consents, setConsents] = useState({ programme: false, privacy: false, security: false, antiFraud: false, location: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [agreement, setAgreement] = useState<string | null>(null);

  useEffect(() => {
    getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
      else setToken(data.session.access_token);
      setLoading(false);
    });
  }, [router]);

  function activateLocation() {
    setError("");
    if (!navigator.geolocation) { setError("La géolocalisation n'est pas disponible sur cet appareil."); return; }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setConsents((v) => ({ ...v, location: true }));
        if (!locationText) setLocationText("Position GPS actuelle");
      },
      () => setError("Autorisez la localisation pour continuer le parcours Brand Ambassador."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  async function submit() {
    if (!token || !location || !front || !back || !Object.values(consents).every(Boolean)) return;
    setSaving(true); setError("");
    try {
      const form = new FormData();
      form.set("locationText", locationText);
      form.set("locationLat", String(location.lat));
      form.set("locationLng", String(location.lng));
      form.set("locationConsent", "true");
      form.set("consentProgramme", String(consents.programme));
      form.set("consentPrivacy", String(consents.privacy));
      form.set("consentSecurity", String(consents.security));
      form.set("consentAntiFraud", String(consents.antiFraud));
      form.set("identityFront", front);
      form.set("identityBack", back);
      const res = await fetch("/api/partner/ba-onboarding", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Impossible de finaliser l'inscription.");
      setAgreement(body.agreement?.documentContent || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'inscription.");
    } finally { setSaving(false); }
  }

  if (loading) return <main className="grid min-h-screen place-items-center">Chargement…</main>;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-900">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-[28px] bg-white p-6 shadow-card sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-jobly-blue">JOBLY · PARTNER</p>
          <h1 className="mt-2 text-2xl font-black">Devenir Brand Ambassador</h1>
          <p className="mt-2 text-sm text-slate-500">Votre compte Jobly existe déjà. Nous ajoutons uniquement les informations nécessaires à votre statut de BA.</p>

          {error && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

          <section className="mt-6 rounded-2xl border p-4">
            <h2 className="font-black">1. Localisation terrain</h2>
            <p className="mt-1 text-xs text-slate-500">Elle sert à proposer chaque jour des entreprises proches de vous. Jobly ne demande pas un suivi GPS permanent.</p>
            <button type="button" onClick={activateLocation} className="mt-3 rounded-xl bg-jobly-blue px-4 py-3 text-sm font-black text-white">{location ? "✓ Localisation activée" : "Activer ma localisation"}</button>
            {location && <p className="mt-2 text-xs font-semibold text-emerald-700">Position enregistrée pour le programme BA.</p>}
          </section>

          <section className="mt-4 rounded-2xl border p-4">
            <h2 className="font-black">2. Document d'identité</h2>
            <p className="mt-1 text-xs text-slate-500">Téléversez les deux faces. Ces documents sont conservés dans un espace privé.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="rounded-xl border border-dashed p-4 text-sm font-bold">Recto<input className="mt-2 block w-full text-xs" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setFront(e.target.files?.[0] || null)} /></label>
              <label className="rounded-xl border border-dashed p-4 text-sm font-bold">Verso<input className="mt-2 block w-full text-xs" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setBack(e.target.files?.[0] || null)} /></label>
            </div>
          </section>

          <section className="mt-4 rounded-2xl border p-4">
            <h2 className="font-black">3. Conditions et engagements</h2>
            <p className="mt-1 text-xs text-slate-500">Lisez les documents complets disponibles dans les paramètres avant de confirmer.</p>
            {[
              ["programme", "J'accepte les conditions du programme Brand Ambassador et ses règles de rémunération."],
              ["privacy", "J'accepte les règles de confidentialité et de protection des données applicables à mon activité."],
              ["security", "Je m'engage à respecter les règles de sécurité et à protéger mon accès Jobly."],
              ["antiFraud", "Je m'engage à respecter les règles d'intégrité et de lutte contre la fraude."],
            ].map(([key, label]) => <label key={key} className="mt-3 flex gap-3 text-sm font-semibold"><input type="checkbox" checked={consents[key as keyof typeof consents]} onChange={(e) => setConsents((v) => ({ ...v, [key]: e.target.checked }))} />{label}</label>)}
          </section>

          {!agreement ? (
            <button type="button" disabled={saving || !token || !location || !front || !back || !Object.values(consents).every(Boolean)} onClick={submit} className="mt-6 w-full rounded-2xl bg-jobly-yellow py-4 text-sm font-black text-navy disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Génération de l'accord…" : "Suivant — Générer mon accord"}</button>
          ) : (
            <section className="mt-6">
              <div className="rounded-2xl border bg-slate-50 p-5 whitespace-pre-wrap text-xs leading-5">{agreement}</div>
              <button type="button" onClick={() => router.push("/partner")} className="mt-4 w-full rounded-2xl bg-emerald-600 py-4 text-sm font-black text-white">✓ Valider et accéder à mon espace BA</button>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
