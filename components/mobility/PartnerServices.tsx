"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type Service = { id: string; title: string; serviceType: string; city: string; priceAmount: number | null; currency: string; status: string };

export default function PartnerServices({ title = "Catalogue de services" }: { title?: string }) {
  const [services, setServices] = useState<Service[]>([]);
  const [providerType, setProviderType] = useState("");
  const [message, setMessage] = useState("Vérification du prestataire…");
  const [draft, setDraft] = useState({ title: "", description: "", city: "", priceAmount: "" });
  const [saving, setSaving] = useState(false);

  async function token() {
    const session = await getSupabaseClient().auth.getSession();
    return session.data.session?.access_token || "";
  }

  async function load() {
    const authToken = await token();
    if (!authToken) { setMessage("Session prestataire requise."); return; }
    const me = await fetch("/api/mobility/partner/me", { headers: { Authorization: `Bearer ${authToken}` } });
    const profile = await me.json().catch(() => ({}));
    if (!me.ok || !profile.provider) { setMessage(profile.message || "Profil prestataire non disponible."); return; }
    setProviderType(profile.provider.providerType);
    const response = await fetch("/api/mobility/partner/services", { headers: { Authorization: `Bearer ${authToken}` } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(payload.message || "Catalogue indisponible."); return; }
    setServices(payload.services || []);
    setMessage("");
  }

  useEffect(() => { load().catch(() => setMessage("Chargement impossible.")); }, []);

  async function createService() {
    setSaving(true);
    setMessage("");
    try {
      const authToken = await token();
      if (!authToken) throw new Error("Session requise.");
      const response = await fetch("/api/mobility/partner/services", {
        method: "POST",
        headers: { Authorization: `Bearer ${authToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          priceAmount: draft.priceAmount === "" ? null : Number(draft.priceAmount),
          currency: "XAF",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Création impossible.");
      setDraft({ title: "", description: "", city: "", priceAmount: "" });
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-[100dvh] bg-white px-5 py-8">
      <div className="mx-auto max-w-4xl">
        <span className="rounded-full bg-[#FFF5CC] px-3 py-1 text-xs font-black text-[#8A6500]">MOBILITY PARTNER · {providerType || "SERVICE"}</span>
        <h1 className="mt-4 text-3xl font-black">{title}</h1>
        {message && <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">{message}</p>}
        <section className="mt-6 rounded-[24px] border p-5">
          <h2 className="text-lg font-black">Publier un service</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Nom du service" className="rounded-xl border p-3 text-sm" />
            <input value={draft.city} onChange={(e) => setDraft({ ...draft, city: e.target.value })} placeholder="Ville desservie" className="rounded-xl border p-3 text-sm" />
            <input value={draft.priceAmount} onChange={(e) => setDraft({ ...draft, priceAmount: e.target.value })} type="number" min="0" placeholder="Prix XAF (facultatif)" className="rounded-xl border p-3 text-sm" />
            <input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" className="rounded-xl border p-3 text-sm" />
          </div>
          <button disabled={saving || !draft.title.trim() || !draft.city.trim()} onClick={createService} className="mt-4 rounded-full bg-[#0A3D9C] px-5 py-3 text-sm font-black text-white disabled:opacity-40">
            {saving ? "Publication…" : "Publier le service"}
          </button>
        </section>
        <section className="mt-6">
          <h2 className="text-lg font-black">Services publiés</h2>
          <div className="mt-3 grid gap-3">
            {services.map((service) => (
              <article key={service.id} className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><b>{service.title}</b><p className="text-sm text-slate-500">{service.city} · {service.serviceType}</p></div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{service.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{service.priceAmount == null ? "Sur devis" : Number(service.priceAmount).toLocaleString("fr-FR") + " XAF"}</p>
              </article>
            ))}
            {!services.length && !message && <p className="text-sm text-slate-500">Aucun service publié pour ce prestataire.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
