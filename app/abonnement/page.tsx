"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PLAN_CATALOG, PlanCode } from "../../lib/billingCatalog";

const ORDER: PlanCode[] = ["FREE", "START", "PREMIUM", "PRO"];
const paid = ORDER.filter((c) => c !== "FREE");

function fmt(n: number) {
  return n === Infinity ? "Illimité" : n.toLocaleString("fr-FR");
}

export default function AbonnementPage() {
  const [annual, setAnnual] = useState(true);
  const [current, setCurrent] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MTN MoMo");
  const [busy, setBusy] = useState(false);
  const [paymentId, setPaymentId] = useState("");

  useEffect(() => {
    fetch("/api/subscription").then((r) => r.json()).then((b) => setCurrent(b.subscription)).catch(() => {});
  }, []);

  async function choose(code: string) {
    setMessage("");
    if (!phone.trim()) { setMessage("Saisissez le numéro Mobile Money à débiter."); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ plan: code, interval: annual ? "ANNUAL" : "MONTHLY", provider: "ICLAN", phone: phone.trim(), paymentMethod }),
      });
      const b = await r.json();
      if (r.ok) { setCurrent(b.subscription); setPaymentId(b.payment?.id || ""); setMessage(`${b.instructions} Utilisez ensuite « Vérifier le paiement » après validation sur votre téléphone.`); }
      else setMessage(b.message || "Impossible de lancer le paiement.");
    } catch { setMessage("Erreur réseau pendant le lancement du paiement."); }
    finally { setBusy(false); }
  }

  async function verify() {
    if (!paymentId) return;
    setBusy(true); setMessage("");
    try {
      const r = await fetch(`/api/payments/${paymentId}/verify`, { method: "POST" });
      const b = await r.json();
      if (r.ok) { setCurrent(b.payment?.subscriptionId ? { ...current, status: b.payment.status } : current); setMessage(`Statut iClan : ${b.verification?.status || b.payment?.status || "inconnu"}.`); }
      else setMessage(b.message || "Vérification impossible.");
    } catch { setMessage("Erreur réseau pendant la vérification."); }
    finally { setBusy(false); }
  }

  const currentPlan = current?.plan || "FREE";

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-sm font-bold text-slate-500">← Jobly</Link>
        <div className="mt-8 text-center">
          <p className="text-xs font-black uppercase tracking-[.25em] text-slate-500">JOBLY</p>
          <h1 className="mt-2 text-4xl font-black text-slate-900">Choisissez votre niveau</h1>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">FREE → START → PREMIUM → PRO. Paiement Mobile Money via Eduklan/iClan UAT. L'abonnement n'est activé qu'après vérification serveur d'un paiement réussi.</p>
          <div className="mx-auto mt-6 grid max-w-xl gap-3 rounded-2xl bg-white p-4 text-left shadow-sm">
            <label className="text-sm font-bold text-slate-700">Numéro Mobile Money
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="2376XXXXXXXX" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none" />
            </label>
            <label className="text-sm font-bold text-slate-700">Mode de paiement
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3">
                <option>MTN MoMo</option>
                <option>Orange Money</option>
              </select>
            </label>
          </div>
          <div className="mx-auto mt-4 inline-flex rounded-full bg-white p-1 shadow-sm">
            <button onClick={() => setAnnual(false)} className={`rounded-full px-5 py-2 text-sm font-bold ${!annual ? "bg-slate-900 text-white" : "text-slate-600"}`}>Mensuel</button>
            <button onClick={() => setAnnual(true)} className={`rounded-full px-5 py-2 text-sm font-bold ${annual ? "bg-slate-900 text-white" : "text-slate-600"}`}>Annuel</button>
          </div>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {ORDER.map((code) => {
            const p = PLAN_CATALOG[code];
            const isCurrent = currentPlan === code;
            return (
              <section key={code} className={`rounded-3xl bg-white p-6 shadow-sm ring-1 ${code === "PREMIUM" ? "ring-amber-300" : "ring-slate-100"}`}>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-black">{p.name}</h2>
                  {code === "PREMIUM" && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">Recommandé</span>}
                  {isCurrent && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Actuel</span>}
                </div>
                <p className="mt-2 text-sm text-slate-500">{p.tagline}</p>
                <div className="mt-6">
                  <span className="text-3xl font-black">{code === "FREE" ? "0" : (annual ? p.annualPriceXaf : p.monthlyPriceXaf).toLocaleString("fr-FR")}</span>
                  <span className="ml-1 text-sm font-bold text-slate-500">FCFA / {annual ? "an" : "mois"}</span>
                </div>
                <ul className="mt-4 space-y-1 text-xs font-bold text-slate-500">
                  <li>{fmt(p.applicationsPerWeek)} candidatures / semaine</li>
                  <li>Multi-postulation : {p.bulkApplicationLimit > 1 ? `jusqu'à ${p.bulkApplicationLimit}` : "—"}</li>
                  <li>{p.aiCredits} crédits IA / mois</li>
                  <li>{p.storageMb} Mo de stockage</li>
                  <li>CV → ATS : {p.atsConversionIncluded ? "inclus" : `${p.atsConversionPriceXaf.toLocaleString("fr-FR")} FCFA / conversion`}</li>
                </ul>
                <ul className="mt-6 space-y-2 text-sm text-slate-700">
                  {p.features.map((f) => <li key={f}>✓ {f}</li>)}
                </ul>
                {code === "FREE" ? (
                  <div className="mt-7 w-full rounded-2xl bg-slate-100 px-4 py-3 text-center font-black text-slate-500">Formule gratuite</div>
                ) : (
                  <button disabled={busy || isCurrent} onClick={() => choose(code)} className="mt-7 w-full rounded-2xl bg-slate-900 px-4 py-3 font-black text-white disabled:opacity-50">
                    {isCurrent ? "Formule actuelle" : busy ? "Traitement…" : `Payer avec ${paymentMethod}`}
                  </button>
                )}
              </section>
            );
          })}
        </div>

        {paymentId && <button disabled={busy} onClick={verify} className="mx-auto mt-6 block rounded-2xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-50">Vérifier le paiement</button>}
        {current && <div className="mx-auto mt-8 max-w-xl rounded-2xl bg-white p-4 text-center text-sm font-bold text-slate-700">Plan actuel : {current.plan} · statut {current.status}</div>}
        {message && <p className="mx-auto mt-5 max-w-2xl rounded-2xl bg-amber-50 p-4 text-center text-sm font-bold text-amber-900">{message}</p>}
      </div>
    </main>
  );
}
