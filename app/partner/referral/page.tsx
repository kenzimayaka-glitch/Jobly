"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase";
import BottomNav, { PARTNER_NAV } from "../../../components/BottomNav";
import PageHeader from "../../../components/PageHeader";
import { referralUrl } from "../../../lib/site";

export default function PartnerReferral() {
  const router = useRouter();
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      if (!session.data.session) { router.replace("/"); return; }
      const res = await fetch("/api/partner/profile", { headers: { Authorization: `Bearer ${session.data.session.access_token}` } });
      if (res.ok) {
        const body = await res.json();
        setReferralCode(body.partner?.referralCode || "");
      }
    })();
  }, [router]);

  const referralLink = referralCode ? referralUrl(referralCode) : "";

  async function copy() {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <main className="relative min-h-[100dvh] bg-white pb-28 text-navy">
      <PageHeader label="Parrainage" eyebrow="PARTNER" onBack={() => router.push("/partner")} />
      <div className="mx-auto max-w-3xl px-5 py-6 space-y-4">
        <h1 className="font-heading text-2xl font-extrabold">Mon lien de parrainage</h1>
        <div className="rounded-[20px] border border-slate-100 bg-white p-5 shadow-card space-y-3">
          <p className="text-xs text-jobly-gray font-semibold">Partagez ce lien unique et gagnez une commission à chaque inscription.</p>
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-navy">{referralLink || "Chargement…"}</span>
          </div>
          <button
            type="button"
            onClick={copy}
            className="w-full rounded-2xl bg-jobly-yellow py-3 text-sm font-extrabold text-navy shadow-[0_8px_20px_rgba(255,199,44,0.3)] transition-transform active:scale-[0.97]"
          >
            {copied ? "✓ Copié !" : "Copier mon lien"}
          </button>
        </div>
        <div className="rounded-2xl bg-blue-50 px-4 py-3.5 flex gap-2.5">
          <span className="text-jobly-blue mt-0.5">✦</span>
          <p className="text-xs text-navy/80"><strong>Comment ça marche ?</strong> Chaque personne qui s'inscrit via votre lien et souscrit à un abonnement payant vous rapporte une commission.</p>
        </div>
      </div>
      <BottomNav active="/partner/referral" items={PARTNER_NAV} />
    </main>
  );
}
