"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import PageHeader from "../../../components/PageHeader";
import DecorativeBackground from "../../../components/DecorativeBackground";
import ScoreRing from "../../../components/ScoreRing";

const SECTORS = [
  "Développement logiciel / IT",
  "BTP / Construction",
  "Finance / Banque",
  "Marketing / Communication",
  "Ressources Humaines",
  "Vente / Commercial",
  "Autre"
];

const SIZES = [
  "1-5 employés",
  "6-20 employés",
  "21-50 employés",
  "51-200 employés",
  "200+ employés"
];

type RecruiterProfile = {
  companyName: string;
  sector: string | null;
  website: string | null;
  location: string | null;
  city: string | null;
  quarter: string | null;
  phone: string | null;
  email: string | null;
  promoterName: string | null;
  companySize: string | null;
  verified: boolean;
};

export default function RecruiterOnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [sector, setSector] = useState("");
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [quarter, setQuarter] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [promoterName, setPromoterName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [logo, setLogo] = useState<File | null>(null);

  const calculateScore = useCallback(() => {
    let score = 0;
    const maxScore = 100;
    
    if (companyName.trim()) score += 20;
    if (sector) score += 15;
    if (website.trim()) score += 15;
    if (city.trim()) score += 15;
    
    
    return Math.round((score / maxScore) * 100);
  }, [companyName, sector, website, city, phone, email]);

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
      
      const profile = body.profile;
      setCompanyName(profile.companyName || "");
      setSector(profile.sector || "");
      setWebsite(profile.website || "");
      setCity(profile.city || "");
      setQuarter(profile.quarter || "");
      setPhone(profile.phone || "");
      setEmail(profile.email || "");
      setPromoterName(profile.promoterName || "");
      setCompanySize(profile.companySize || "");
      setCompleted(Boolean(profile.companyName && profile.sector));
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
    if (!companyName.trim() || !sector) {
      setError("Le nom et le secteur sont obligatoires.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/recruiter/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          companyName, 
          sector, 
          website, 
          location: `${city || ''}, ${quarter || ''}`.trim(),
          city,
          quarter,
          phone,
          email,
          promoterName,
          companySize
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || "Enregistrement impossible.");
      setCompleted(true);
      setTimeout(() => router.push("/recruiter"), 1000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur d'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="grid min-h-[100dvh] place-items-center bg-[#F7FAFF] font-bold text-navy">Chargement…</main>;
  }

  const score = calculateScore();

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#F7FAFF] pb-16 text-navy">
      <DecorativeBackground />
      <div className="relative z-10">
        <PageHeader label="Recruteur Brain" eyebrow="1/3" initial="R" onBack={() => router.push("/recruiter")} />

        <div className="mx-auto w-full max-w-3xl px-5 py-5 sm:px-6">
          <div className="mb-6 flex items-center gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between">
                <h1 className="font-heading text-xl font-extrabold text-navy">Onboarding Recruteur</h1>
                <span className="text-xs font-bold text-jobly-gray">{score}%</span>
              </div>
              <p className="text-xs text-jobly-gray">Complétez les informations de votre entreprise pour générer votre Hiring Score</p>
            </div>
            <ScoreRing score={score} size="md" />
          </div>

          {/* Progress bar */}
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-gradient-to-r from-jobly-blue to-violet-500 transition-all duration-500"
              style={{ width: `${score}%` }}
            />
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4 rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_16px_50px_rgba(22,37,74,0.10)]">
            <h2 className="font-heading text-base font-extrabold text-navy flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-jobly-blue">🏢</span>
              Vos informations
            </h2>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Nom entreprise *</span>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue"
                placeholder="Tech Solutions SARL"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Domaine d'activité *</span>
              <select value={sector} onChange={(e) => setSector(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue">
                <option value="">Sélectionner…</option>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Ville</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue"
                placeholder="Yaoundé"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Quartier</span>
              <input
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue"
                placeholder="Bastos"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Localisation / Adresse</span>
              <input
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue"
                placeholder="Rue 1.234 Bastos"
                value={city || ""} readOnly
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Nom du promoteur</span>
              <input
                value={promoterName}
                onChange={(e) => setPromoterName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue"
                placeholder="Sarah Mendo"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Contact / Téléphone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue"
                placeholder="+237 6 91 23 45 67"
                type="tel"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Adresse mail</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue"
                placeholder="contact@techsolutions.cm"
                type="email"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Site web</span>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue"
                placeholder="https://techsolutions.cm"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-extrabold text-navy">Taille de l'entreprise</span>
              <select value={companySize} onChange={(e) => setCompanySize(e.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue">
                <option value="">Sélectionner…</option>
                {SIZES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>

          {/* Réseaux sociaux */}
          <section className="mt-6 rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_16px_50px_rgba(22,37,74,0.10)]">
            <h3 className="mb-3 font-heading text-sm font-extrabold text-navy flex items-center gap-2">
              <span>🔗</span> Réseaux sociaux
            </h3>
            <p className="mb-3 text-xs text-jobly-gray">Liez vos réseau pour renforcer la crédibilité</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">f</span>
                <div>
                  <p className="text-xs font-bold text-navy">Facebook:</p>
                  <p className="text-xs text-jobly-gray">linkedin.com/company/techsolutions</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg">📷</span>
                <div>
                  <p className="text-xs font-bold text-navy">Instagram:</p>
                  <p className="text-xs text-jobly-gray">@techsolutions</p>
                </div>
              </div>
            </div>
          </section>

          {/* Settings */}
          <section className="mt-6 rounded-[24px] border border-slate-100 bg-white p-5 shadow-[0_16px_50px_rgba(22,37,74,0.10)]">
            <h3 className="mb-3 font-heading text-sm font-extrabold text-navy flex items-center gap-2">
              <span>⚙️</span> Paramètres
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy">Ajouter les postes recherchés</span>
                <input type="checkbox" className="h-4 w-4 rounded" />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy">Confidentialité du compte</span>
                <select className="rounded-lg border border-slate-200 px-2 py-1 text-xs">
                  <option>Public</option>
                  <option>Privé</option>
                </select>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-xs font-bold text-navy">Candidature spontanée acceptée</span>
                <input type="checkbox" className="h-4 w-4 rounded" defaultChecked />
              </label>
            </div>
          </section>

          {/* Tags */}
          <div className="mt-6 space-y-2">
            <div className="flex flex-wrap gap-2">
              {["Développeur Full Stack", "Marketing digital", "Data Analysis", "Commercial", "RH", "+ Ajouter"].map((tag) => (
                <span key={tag} className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${tag === "+ Ajouter" ? "border-2 border-dashed border-slate-200 text-jobly-gray" : "bg-blue-100 text-jobly-blue"}`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Scoring section */}
          <section className="mt-6 rounded-2xl bg-gradient-to-r from-green-50 to-emerald-50 border border-emerald-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="font-heading text-base font-extrabold text-emerald-900 mb-1">Entreprise attrayante !</h3>
                <p className="text-xs text-emerald-800">Basé sur vos infos, vous avez un fort potentiel.</p>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-600">✓</span>
                    <span className="text-emerald-800">Profil entreprise complet</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-600">✓</span>
                    <span className="text-emerald-800">Besoins alignés marché</span>
                  </div>
                </div>
              </div>
              <ScoreRing score={score} size="lg" />
            </div>
          </section>

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving || !companyName.trim() || !sector}
              className="w-full rounded-2xl bg-jobly-blue py-3.5 text-sm font-extrabold text-white shadow-[0_10px_24px_rgba(37,99,235,0.3)] transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : completed ? "Continuer vers l'analyse ✓" : "Continuer vers l'analyse →"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
