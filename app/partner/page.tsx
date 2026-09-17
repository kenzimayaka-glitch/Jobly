"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import { referralUrl } from "../../lib/site";
import PageHeader from "../../components/PageHeader";
import BottomNav, { PARTNER_NAV } from "../../components/BottomNav";
import DecorativeBackground from "../../components/DecorativeBackground";
import { detectReferralByEmail } from "../../lib/gmailService";

type Partner = {
  referralCode: string;
  payoutProvider: string | null;
  payoutPhone: string | null;
  kycStatus: string;
};

type Commission = {
  id: string;
  event: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

const KYC_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Vérification en attente", className: "bg-amber-50 text-amber-600" },
  VERIFIED: { label: "Compte vérifié", className: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Vérification refusée", className: "bg-red-50 text-red-500" },
};

function formatXAF(amount: number, currency: string) {
  return `${amount.toLocaleString("fr-FR")} ${currency}`;
}

// Orange Money logo SVG
function OrangeMoneyLogo() {
  return (
    <svg viewBox="0 0 80 40" className="h-10 w-auto" aria-label="Orange Money">
      <rect width="80" height="40" rx="8" fill="#FF6600" />
      <circle cx="22" cy="20" r="12" fill="white" />
      <circle cx="22" cy="20" r="7" fill="#FF6600" />
      <text x="40" y="24" fontSize="10" fontWeight="800" fill="white" fontFamily="sans-serif">Money</text>
    </svg>
  );
}

// MTN MoMo logo SVG
function MoMoLogo() {
  return (
    <svg viewBox="0 0 80 40" className="h-10 w-auto" aria-label="MTN Mobile Money">
      <rect width="80" height="40" rx="8" fill="#FFC72C" />
      <text x="10" y="16" fontSize="11" fontWeight="900" fill="#1a1a1a" fontFamily="sans-serif">MTN</text>
      <text x="10" y="30" fontSize="9" fontWeight="700" fill="#1a1a1a" fontFamily="sans-serif">MoMo</text>
      <circle cx="65" cy="20" r="12" fill="#1a1a1a" opacity="0.12" />
      <circle cx="65" cy="20" r="7" fill="#1a1a1a" opacity="0.18" />
    </svg>
  );
}

export default function PartnerDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [partner, setPartner] = useState<Partner | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [totals, setTotals] = useState({ payable: 0, paid: 0, pending: 0 });

  // Payment method selection
  const [selectedMethod, setSelectedMethod] = useState<"" | "orange" | "momo">("");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const load = useCallback(async () => {
    const session = await getSupabaseClient().auth.getSession();
    if (!session.data.session) {
      router.replace("/");
      return;
    }
    const t = session.data.session.access_token;
    setToken(t);
    try {
      const [profileRes, commissionsRes] = await Promise.all([
        fetch("/api/partner/profile", { headers: { Authorization: `Bearer ${t}` } }),
        fetch("/api/partner/commissions", { headers: { Authorization: `Bearer ${t}` } }),
      ]);
      const profileBody = await profileRes.json();
      const commissionsBody = await commissionsRes.json();
      if (!profileRes.ok) throw new Error(profileBody.message || "Profil partenaire indisponible.");
      if (!commissionsRes.ok) throw new Error(commissionsBody.message || "Commissions indisponibles.");
      setPartner(profileBody.partner);
      setAvatarUrl(profileBody.partner?.avatarUrl || "");
      // Restore previously saved method
      if (profileBody.partner?.payoutProvider) {
        setSelectedMethod(profileBody.partner.payoutProvider === "ORANGE_MONEY" ? "orange" : "momo");
      }
      setPayoutPhone(profileBody.partner?.payoutPhone || "");
      setCommissions(commissionsBody.commissions || []);
      setTotals(commissionsBody.totals || { payable: 0, paid: 0, pending: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function savePayout() {
    if (!token || !selectedMethod) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payoutProvider = selectedMethod === "orange" ? "ORANGE_MONEY" : "MTN_MOMO";
      const res = await fetch("/api/partner/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ payoutProvider, payoutPhone }),
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

  async function copyLink() {
    if (!partner) return;
    const referralLink = referralUrl(partner.referralCode);
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Presse-papier indisponible
    }
  }

  if (loading) {
    return <main className="grid min-h-[100dvh] place-items-center bg-white font-bold text-navy">Chargement…</main>;
  }

  const kyc = partner ? KYC_LABEL[partner.kycStatus] || KYC_LABEL.PENDING : KYC_LABEL.PENDING;
  const referralLink = partner ? referralUrl(partner.referralCode) : "";

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-white pb-28 text-navy">
      <DecorativeBackground />
      <div className="relative z-10">
        <PageHeader
          label="Espace Partenaire"
          eyebrow="JOBLY"
          initial="P"
          avatarUrl={avatarUrl}
          onBack={() => router.push("/ecosystem")}
        />

        <div className="mx-auto w-full max-w-3xl px-5 py-5 sm:px-6">
          {toastMessage && <button onClick={()=>setToastMessage("")} className="mb-4 w-full rounded-2xl bg-emerald-50 p-3 text-left text-xs font-extrabold text-emerald-700">{toastMessage}</button>}
          <h1 className="font-heading text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-navy sm:text-[32px]">
            Gagnez des commissions
          </h1>
          <p className="mt-1 text-sm text-jobly-gray">Partagez JOBLY, suivez vos commissions.</p>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
              {error}
            </div>
          )}

          {/* ── Lien de parrainage ───────────────────────────────────── */}
          <section className="mt-5 rounded-[20px] border border-slate-100 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-jobly-gray">Votre lien de parrainage</span>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${kyc.className}`}>{kyc.label}</span>
            </div>

            {/* Link display pill */}
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-jobly-blue" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-navy">{referralLink || "Chargement…"}</span>
            </div>

            <button
              type="button"
              onClick={copyLink}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-jobly-yellow py-3 text-sm font-extrabold text-navy shadow-[0_8px_20px_rgba(255,199,44,0.3)] transition-transform active:scale-[0.97]"
            >
              {copied ? (
                <>✓ Lien copié !</>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copier mon lien
                </>
              )}
            </button>
          </section>

          {/* ── Stats commissions ────────────────────────────────────── */}
          <section className="mt-4 grid grid-cols-3 gap-2.5">
            {[
              { label: "À payer", value: totals.payable, color: "text-jobly-blue" },
              { label: "Déjà payé", value: totals.paid, color: "text-emerald-600" },
              { label: "En attente", value: totals.pending, color: "text-amber-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center gap-1 rounded-2xl border border-slate-100 bg-white py-4 text-center shadow-card">
                <strong className={`font-heading text-sm font-extrabold ${color}`}>{formatXAF(value, "F")}</strong>
                <span className="text-[9px] font-semibold text-jobly-gray">{label}</span>
              </div>
            ))}
          </section>

          <section className="mt-5 rounded-[24px] border border-slate-100 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-base font-extrabold">Gains Passifs Détectés</h2>
                <p className="mt-1 text-xs text-jobly-gray">Jobly peut détecter les recommandations reçues par email.</p>
              </div>
              <button type="button" onClick={async()=>{const detected=await detectReferralByEmail(); setToastMessage(`${detected.length} recommandation(s) détectée(s).`);}} className="rounded-full bg-[#FFC72C] px-4 py-2 text-[10px] font-black text-navy">Scanner</button>
            </div>
            <div className="mt-3 rounded-2xl bg-blue-50 p-3 text-xs font-bold text-[#2E5C9E]">
              Les détections MVP sont simulées. Une commission n'est créditée que lorsqu'une inscription correspondante est confirmée.
            </div>
          </section>

          {/* ── Historique ───────────────────────────────────────────── */}
          <section className="mt-5">
            <h2 className="mb-2.5 font-heading text-base font-extrabold text-navy">Historique</h2>
            {commissions.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-card">
                <p className="text-sm font-semibold text-navy">Aucune commission pour l'instant.</p>
                <p className="mt-1 text-xs text-jobly-gray">
                  Partagez votre lien pour commencer à générer des commissions.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {commissions.map((c) => (
                  <div key={c.id} className="flex items-center gap-3.5 rounded-[20px] border border-slate-100 bg-white p-4 shadow-card">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-lg" aria-hidden="true">💰</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-extrabold text-navy">{c.event}</span>
                      <span className="block text-xs text-jobly-gray">{new Date(c.createdAt).toLocaleDateString("fr-FR")}</span>
                    </span>
                    <span className="shrink-0 text-sm font-extrabold text-navy">{formatXAF(c.amount, c.currency)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Infos de paiement — logos cliquables ─────────────────── */}
          <section className="mt-5">
            <h2 className="mb-3 font-heading text-base font-extrabold text-navy">Infos de paiement</h2>
            <div className="rounded-[20px] border border-slate-100 bg-white p-5 shadow-card">

              {/* Logo selector */}
              <p className="mb-3 text-xs font-bold text-jobly-gray">Sélectionnez votre opérateur :</p>
              <div className="flex items-center justify-center gap-6">
                <button
                  type="button"
                  onClick={() => { setSelectedMethod("orange"); setPayoutPhone(""); }}
                  className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                    selectedMethod === "orange"
                      ? "ring-2 ring-orange-500 bg-orange-50"
                      : "hover:bg-slate-50"
                  }`}
                  aria-pressed={selectedMethod === "orange"}
                >
                  <OrangeMoneyLogo />
                  <span className="text-[10px] font-bold text-navy">Orange Money</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setSelectedMethod("momo"); setPayoutPhone(""); }}
                  className={`flex flex-col items-center gap-2 rounded-2xl p-3 transition-all ${
                    selectedMethod === "momo"
                      ? "ring-2 ring-yellow-400 bg-yellow-50"
                      : "hover:bg-slate-50"
                  }`}
                  aria-pressed={selectedMethod === "momo"}
                >
                  <MoMoLogo />
                  <span className="text-[10px] font-bold text-navy">MTN MoMo</span>
                </button>
              </div>

              {/* Phone input — shown when method selected */}
              {selectedMethod && (
                <div className="mt-4 space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-extrabold text-navy">
                      Numéro {selectedMethod === "orange" ? "Orange Money" : "MTN MoMo"}
                    </span>
                    <input
                      type="tel"
                      value={payoutPhone}
                      onChange={(e) => setPayoutPhone(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-navy outline-none focus:border-jobly-blue focus:ring-2 focus:ring-jobly-blue/10"
                      placeholder={selectedMethod === "orange" ? "+237 6 90 00 00 00" : "+237 6 70 00 00 00"}
                    />
                    <span className="mt-1 block text-[10px] text-jobly-gray">
                      Exemple : {selectedMethod === "orange" ? "+237 6 90 00 00 00" : "+237 6 70 00 00 00"}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={savePayout}
                    disabled={saving || !payoutPhone.trim()}
                    className="w-full rounded-2xl bg-jobly-yellow py-3 text-sm font-extrabold text-navy shadow-[0_8px_20px_rgba(255,199,44,0.3)] transition-transform active:scale-[0.97] disabled:opacity-50"
                  >
                    {saving ? "Enregistrement…" : saved ? "Enregistré ✓" : "Enregistrer"}
                  </button>
                </div>
              )}
            </div>
          </section>

          <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-blue-50 px-4 py-3.5">
            <span aria-hidden="true" className="mt-0.5 text-jobly-blue">✦</span>
            <p className="text-xs leading-snug text-navy/80">
              <strong className="font-extrabold">Paiement via Mobile Money :</strong> vos infos sont enregistrées et prêtes pour quand la brique Billing sera activée.
            </p>
          </div>
        </div>
      </div>
      <BottomNav active="/partner" items={PARTNER_NAV} />
    </main>
  );
}
