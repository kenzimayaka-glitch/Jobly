"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

type AccountType = "TALENT" | "RECRUITER" | "PARTNER";
type AccountRow = {
  id: string;
  userId: string;
  accountType: AccountType;
  organizationType?: string | null;
  organizationName?: string | null;
  website?: string | null;
  city?: string | null;
  country?: string | null;
  status: "INVITED" | "ACTIVE" | "SUSPENDED";
  createdAt: string;
  user?: { email?: string | null; displayName?: string | null; firstName?: string | null; lastName?: string | null; role?: string | null } | null;
};

const PARTNER_TYPES = [
  ["UNIVERSITY", "Université / établissement supérieur"],
  ["HIGHER_EDUCATION", "École supérieure / institut"],
  ["TRAINING_CENTER", "Centre de formation"],
  ["PUBLIC_INSTITUTION", "Institution publique"],
  ["MINISTRY", "Ministère / organisme public"],
  ["NGO", "ONG"],
  ["ASSOCIATION", "Association / fondation"],
  ["EMPLOYER", "Entreprise / employeur partenaire"],
  ["FINANCIAL_INSTITUTION", "Banque / microfinance / financeur"],
  ["MOBILITY_PROVIDER", "Mobilité / accompagnement"],
  ["HOUSING_PROVIDER", "Hébergement / logement"],
  ["TRANSPORT_PROVIDER", "Transport"],
  ["CAMPUS", "Campus / communauté étudiante"],
  ["MEDIA", "Média"],
  ["EVENTS", "Événement / organisateur"],
  ["OTHER", "Autre partenaire"],
] as const;

const emptyForm = {
  accountType: "PARTNER" as AccountType,
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  country: "CM",
  organizationName: "",
  organizationType: "UNIVERSITY",
  website: "",
  city: "",
};

function accountLabel(type: AccountType) {
  return type === "TALENT" ? "Talent" : type === "RECRUITER" ? "Recruteur" : "Partenaire";
}
function statusLabel(status: AccountRow["status"]) {
  return status === "ACTIVE" ? "Activé" : status === "SUSPENDED" ? "Suspendu" : "Invitation envoyée";
}
function partnerTypeLabel(code?: string | null) {
  return PARTNER_TYPES.find(([key]) => key === code)?.[1] || code || "Partenaire";
}

export default function AdminAccountsPage() {
  const [token, setToken] = useState("");
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (accessToken: string) => {
    const response = await fetch("/api/admin/accounts", {
      headers: { Authorization: "Bearer " + accessToken },
      cache: "no-store",
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Impossible de charger les comptes.");
    setAccounts(body.accounts || []);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) throw new Error("Connectez-vous à votre compte ADMIN.");
      if (!alive) return;
      setToken(accessToken);
      await load(accessToken);
      if (alive) setLoading(false);
    })().catch((e) => {
      if (alive) {
        setError(e instanceof Error ? e.message : "Chargement impossible.");
        setLoading(false);
      }
    });
    return () => { alive = false; };
  }, [load]);

  const totalPartners = useMemo(() => accounts.filter((item) => item.accountType === "PARTNER").length, [accounts]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Création impossible.");
      setNotice(body.message || "Compte créé.");
      setForm({ ...emptyForm, accountType: form.accountType });
      await load(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="grid min-h-[60dvh] place-items-center px-5 text-sm font-bold text-[#17315D]">Chargement des comptes Jobly…</main>;
  }

  return (
    <main className="min-h-[calc(100dvh-64px)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#3156A4]">ADMIN 360° · GESTION DES IDENTITÉS</p>
            <h1 className="mt-2 text-2xl font-black text-[#10264A] sm:text-3xl">Comptes & partenaires institutionnels</h1>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[#66758D]">Créez les comptes Talent, Recruteur et Partenaire depuis le compte maître. Les universités, écoles, institutions, ministères, ONG, entreprises, financeurs, prestataires de mobilité, d’hébergement, campus et organisateurs reçoivent chacun leur propre invitation sécurisée.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-[#DCE4F0] bg-white px-4 py-3">
              <div className="text-xl font-black tabular-nums text-[#10264A]">{accounts.length}</div>
              <div className="text-[10px] font-bold text-[#718097]">Comptes gérés</div>
            </div>
            <div className="rounded-2xl border border-[#DCE4F0] bg-white px-4 py-3">
              <div className="text-xl font-black tabular-nums text-[#10264A]">{totalPartners}</div>
              <div className="text-[10px] font-bold text-[#718097]">Partenaires</div>
            </div>
          </div>
        </header>

        {(error || notice) && (
          <div className={"mt-5 rounded-2xl border px-4 py-3 text-sm font-semibold " + (error ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800")}>
            {error || notice}
          </div>
        )}

        <section className="mt-7 rounded-[24px] border border-[#DCE4F0] bg-white p-4 shadow-[0_8px_28px_rgba(22,42,75,.05)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#10264A]">Créer un compte / envoyer une invitation</h2>
              <p className="mt-1 text-xs text-[#728097]">Le titulaire choisit son mot de passe lui-même. Aucun mot de passe n’est créé ou affiché par l’administrateur.</p>
            </div>
            <span className="rounded-full bg-[#EDF2FA] px-3 py-1.5 text-[10px] font-black text-[#3156A4]">Accès nominatif</span>
          </div>

          <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <label className="text-xs font-bold text-[#40516C]">
              Type de compte
              <select value={form.accountType} onChange={(e) => setForm((s) => ({ ...s, accountType: e.target.value as AccountType }))} className="mt-1.5 min-h-12 w-full rounded-xl border border-[#DCE4F0] bg-white px-3 text-sm text-[#10264A]">
                <option value="PARTNER">Partenaire institutionnel</option>
                <option value="RECRUITER">Recruteur / entreprise</option>
                <option value="TALENT">Talent / candidat</option>
              </select>
            </label>
            <label className="text-xs font-bold text-[#40516C]">
              Adresse e-mail
              <input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} placeholder="contact@organisation.org" className="mt-1.5 min-h-12 w-full rounded-xl border border-[#DCE4F0] px-3 text-sm text-[#10264A]" />
            </label>
            <label className="text-xs font-bold text-[#40516C]">
              Prénom du titulaire
              <input required value={form.firstName} onChange={(e) => setForm((s) => ({ ...s, firstName: e.target.value }))} autoComplete="given-name" className="mt-1.5 min-h-12 w-full rounded-xl border border-[#DCE4F0] px-3 text-sm text-[#10264A]" />
            </label>
            <label className="text-xs font-bold text-[#40516C]">
              Nom du titulaire
              <input required value={form.lastName} onChange={(e) => setForm((s) => ({ ...s, lastName: e.target.value }))} autoComplete="family-name" className="mt-1.5 min-h-12 w-full rounded-xl border border-[#DCE4F0] px-3 text-sm text-[#10264A]" />
            </label>
            <label className="text-xs font-bold text-[#40516C]">
              Téléphone (facultatif)
              <input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} autoComplete="tel" className="mt-1.5 min-h-12 w-full rounded-xl border border-[#DCE4F0] px-3 text-sm text-[#10264A]" />
            </label>
            <label className="text-xs font-bold text-[#40516C]">
              Pays (code ISO)
              <input required maxLength={3} value={form.country} onChange={(e) => setForm((s) => ({ ...s, country: e.target.value.toUpperCase() }))} placeholder="CM" className="mt-1.5 min-h-12 w-full rounded-xl border border-[#DCE4F0] px-3 text-sm uppercase text-[#10264A]" />
            </label>

            {form.accountType !== "TALENT" && (
              <>
                <label className="text-xs font-bold text-[#40516C] sm:col-span-2 xl:col-span-1">
                  Nom de l'organisation
                  <input required value={form.organizationName} onChange={(e) => setForm((s) => ({ ...s, organizationName: e.target.value }))} placeholder="Nom légal ou nom commercial" className="mt-1.5 min-h-12 w-full rounded-xl border border-[#DCE4F0] px-3 text-sm text-[#10264A]" />
                </label>
                <label className="text-xs font-bold text-[#40516C]">
                  Site web (facultatif)
                  <input type="url" value={form.website} onChange={(e) => setForm((s) => ({ ...s, website: e.target.value }))} placeholder="https://" className="mt-1.5 min-h-12 w-full rounded-xl border border-[#DCE4F0] px-3 text-sm text-[#10264A]" />
                </label>
                <label className="text-xs font-bold text-[#40516C]">
                  Ville (facultatif)
                  <input value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} placeholder="Yaoundé" className="mt-1.5 min-h-12 w-full rounded-xl border border-[#DCE4F0] px-3 text-sm text-[#10264A]" />
                </label>
                {form.accountType === "PARTNER" && (
                  <label className="text-xs font-bold text-[#40516C] sm:col-span-2 xl:col-span-1">
                    Catégorie du partenaire
                    <select value={form.organizationType} onChange={(e) => setForm((s) => ({ ...s, organizationType: e.target.value }))} className="mt-1.5 min-h-12 w-full rounded-xl border border-[#DCE4F0] bg-white px-3 text-sm text-[#10264A]">
                      {PARTNER_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                )}
              </>
            )}

            <div className="flex items-end sm:col-span-2 xl:col-span-3">
              <button type="submit" disabled={saving} className="min-h-12 w-full rounded-full bg-[#FFE135] px-6 py-3 text-sm font-black text-[#10264A] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {saving ? "Création et envoi…" : "Créer le compte et envoyer l’invitation"}
              </button>
            </div>
          </form>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#10264A]">Comptes créés par le compte maître</h2>
              <p className="mt-1 text-xs text-[#728097]">Le statut Activé est basé sur la confirmation de l’adresse e-mail par le titulaire.</p>
            </div>
            <span className="text-xs font-bold text-[#728097]">{accounts.length} identité(s)</span>
          </div>
          {accounts.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-[#C9D5E6] bg-white p-8 text-center text-sm font-semibold text-[#718097]">Aucun compte supplémentaire créé pour le moment.</div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {accounts.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[#DCE4F0] bg-white p-4 shadow-[0_4px_18px_rgba(22,42,75,.04)] sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[#718097]">{accountLabel(item.accountType)}</div>
                      <h3 className="mt-1 break-words text-base font-black text-[#10264A]">{item.organizationName || item.user?.displayName || [item.user?.firstName, item.user?.lastName].filter(Boolean).join(" ") || "Compte Jobly"}</h3>
                      <p className="mt-1 break-all text-xs text-[#65748A]">{item.user?.email || "Adresse non disponible"}</p>
                    </div>
                    <span className={"rounded-full px-3 py-1 text-[10px] font-black " + (item.status === "ACTIVE" ? "bg-[#E6F7EF] text-[#126642]" : item.status === "SUSPENDED" ? "bg-[#FFF0F0] text-[#A12D2D]" : "bg-[#FFF5D8] text-[#875C00]")}>{statusLabel(item.status)}</span>
                  </div>
                  {item.accountType === "PARTNER" && <p className="mt-3 text-xs font-semibold text-[#3156A4]">{partnerTypeLabel(item.organizationType)}</p>}
                  <div className="mt-3 flex flex-wrap gap-3 text-[10px] font-semibold text-[#8290A5]">
                    {item.city && <span>{item.city}</span>}
                    {item.country && <span>{item.country}</span>}
                    <span>Créé le {new Date(item.createdAt).toLocaleDateString("fr-FR")}</span>
                  </div>
                  <button type="button" onClick={() => router.push("/admin/accounts/" + encodeURIComponent(item.id))} className="mt-4 rounded-full bg-[#10264A] px-4 py-2.5 text-[10px] font-black text-white">Sélectionner ce compte ↗</button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl border border-[#DCE4F0] bg-[#EDF2FA] p-4 sm:p-5">
          <h2 className="text-sm font-black text-[#10264A]">Espaces internes du compte ADMIN</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#53627B]">SUPPORT, FINANCE, MODERATOR et ANALYST restent des espaces de travail du compte maître, déjà provisionnés dans le panneau latéral. Ils ne créent pas de comptes de connexion distincts et ne sont pas des rôles de partenaire.</p>
          <a href="/admin/workspaces" className="mt-3 inline-flex rounded-full bg-[#10264A] px-4 py-2.5 text-xs font-black text-white">Gérer les espaces internes</a>
        </section>
      </div>
    </main>
  );
}
