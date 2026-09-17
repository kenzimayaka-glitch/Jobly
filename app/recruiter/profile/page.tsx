"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import PageHeader from "../../../components/PageHeader";
import BottomNav, { RECRUITER_NAV } from "../../../components/BottomNav";
import DecorativeBackground from "../../../components/DecorativeBackground";

export default function RecruiterProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [website, setWebsite] = useState("");
  const [location, setLocation] = useState("");

  const load = useCallback(async () => {
    const session = await getSupabaseClient().auth.getSession();
    if (!session.data.session) {
      router.replace("/");
      return;
    }
    const t = session.data.session.access_token;
    setToken(t);
    try {
      const res = await fetch("/api/recruiter/profile", { headers: { Authorization: `Bearer ${t}` } });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Profil indisponible.");
      setCompanyName(body.profile.companyName || "");
      setSector(body.profile.sector || "");
      setWebsite(body.profile.website || "");
      setLocation(body.profile.location || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function save() {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/recruiter/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyName, sector, website, location }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Enregistrement impossible.");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Chargement…</main>;
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-white pb-28 text-navy">
      <DecorativeBackground />
      <div className="relative z-10">
        <PageHeader label="Fiche entreprise" eyebrow="RECRUTEUR" initial={companyName.charAt(0).toUpperCase() || "R"} onBack={() => router.push("/recruiter")} />

        <div className="mx-auto w-full max-w-3xl px-5 py-5 sm:px-6">
          {error && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_16px_50px_rgba(22,37,74,0.10)]">
            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Nom de l'entreprise *</span>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue"
                placeholder="Ex. Jobly SARL"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Secteur</span>
              <input
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue"
                placeholder="Ex. Technologie, BTP, Finance…"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Site web</span>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue"
                placeholder="https://…"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Localisation</span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue"
                placeholder="Ex. Douala, Cameroun"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={save}
            disabled={saving || !companyName.trim()}
            className="mt-5 w-full rounded-2xl bg-jobly-blue py-3.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(37,99,235,0.3)] transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
          </button>
        </div>
      </div>
      <div className="mx-auto mb-4 grid max-w-md grid-cols-2 gap-2 px-5">
        <button onClick={()=>router.push("/recruiter/onboarding")} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-xs font-black text-navy shadow-sm">Compléter l'onboarding →</button>
        <button onClick={()=>router.push("/recruiter/mobility")} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-left text-xs font-black text-navy shadow-sm">Mobility recruteur →</button>
      </div>
      <button onClick={()=>router.push("/recruiter/settings")} className="mx-auto mb-4 block rounded-full border border-slate-200 px-5 py-3 text-xs font-black">Paramètres recruteur</button><BottomNav active="/recruiter/profile" items={RECRUITER_NAV} />
    </main>
  );
}
