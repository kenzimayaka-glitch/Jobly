"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { PLAN_CATALOG, RECRUITER_PLAN_CATALOG, PlanCode } from "../../lib/billingCatalog";
import { getSupabaseClient } from "../../lib/supabase";

const ORDER: PlanCode[] = ["FREE", "START", "PREMIUM", "PRO"];
function fmt(n: number) { return n === Infinity ? "Illimité" : n.toLocaleString("fr-FR"); }

export default function AbonnementPage() {
  const [annual, setAnnual] = useState(true), [current, setCurrent] = useState<any>(null), [message, setMessage] = useState("");
  const [productType, setProductType] = useState<"TALENT" | "RECRUITER">("TALENT");
  const [phone, setPhone] = useState(""), [paymentMethod, setPaymentMethod] = useState("MTN MoMo"), [busy, setBusy] = useState(false), [paymentId, setPaymentId] = useState("");
  const [checkout, setCheckout] = useState<any>(null), [transactionId, setTransactionId] = useState("");
  const [promoCode, setPromoCode] = useState(""), [promoMessage, setPromoMessage] = useState(""), [promoBusy, setPromoBusy] = useState(false), [promo, setPromo] = useState<any>(null);

  useEffect(() => { let alive=true; (async()=>{const requested = new URLSearchParams(window.location.search).get("productType")==="RECRUITER"?"RECRUITER":"TALENT";setProductType(requested);const {data:{session}}=await getSupabaseClient().auth.getSession();const token=session?.access_token;if(!token)return;const headers={Authorization:`Bearer ${token}`};const [sr,er]=await Promise.all([fetch(`/api/subscription?productType=${requested}`,{headers}),fetch(`/api/entitlements?productType=${requested}`,{headers})]);const [s,e]=await Promise.all([sr.json(),er.json()]);if(alive){setCurrent(s.subscription||null);setPaymentId(s.payment?.id||"");setCheckout(s.checkout||null);setTransactionId(s.checkout?.reportedTransactionId||"");setPromo(e.promo||null);}})().catch(()=>{});return ()=>{alive=false;}; }, []);

  // Quiet refresh: this never blocks checkout or navigation in Jobly.
  useEffect(() => {
    if (!paymentId) return;
    let alive = true;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        const token = session?.access_token;
        if (!token) return;
        const response = await fetch("/api/subscription?productType=" + productType, {
          headers: { Authorization: "Bearer " + token },
          cache: "no-store",
        });
        if (!response.ok) return;
        const latest = await response.json();
        if (!alive) return;
        setCurrent(latest.subscription || null);
        setPaymentId(latest.payment?.id || "");
        setCheckout(latest.checkout || null);
        setTransactionId(latest.checkout?.reportedTransactionId || "");
      } catch {
        // Transient refresh errors do not interrupt the customer session.
      }
    };
    const timer = window.setInterval(() => { void refresh(); }, 8000);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [paymentId, productType]);
  async function choose(code: string) {
    setMessage("");
    if (!phone.trim()) { setMessage("Saisissez le numéro Mobile Money à débiter."); return; }
    setBusy(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const token = session?.access_token;
      if (!token) { setMessage("Connectez-vous pour lancer un paiement."); return; }
      const r = await fetch("/api/subscription", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ plan: code, productType, interval: annual ? "ANNUAL" : "MONTHLY", provider: paymentMethod === "MTN MoMo" ? "SMS_MTN" : "SMS_ORANGE", phone: phone.trim(), paymentMethod }),
      });
      const b = await r.json();
      if (r.ok) {
        setCurrent(b.subscription);
        setPaymentId(b.payment?.id || "");
        setCheckout(b.checkout || null);
        setTransactionId("");
        setMessage(b.instructions || "Votre commande est créée.");
      } else setMessage(b.message || "Impossible de lancer le paiement.");
    } catch { setMessage("Erreur réseau pendant le lancement du paiement."); }
    finally { setBusy(false); }
  }
  async function verify() {
    if (!paymentId) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const token = session?.access_token;
      if (!token) { setMessage("Connectez-vous pour vérifier le paiement."); return; }
      const r = await fetch(`/api/payments/${paymentId}/verify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(transactionId.trim() ? { transactionId: transactionId.trim() } : {}),
      });
      const b = await r.json();
      if (r.ok) {
        const refreshed = await fetch(`/api/subscription?productType=${productType}`, {
          headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-cache" },
          cache: "no-store",
        });
        if (refreshed.ok) {
          const latest = await refreshed.json();
          setCurrent(latest.subscription || null);
          setPaymentId(latest.payment?.id || "");
          setCheckout(latest.checkout || null);
        }
        setMessage(b.matched ? "Paiement confirmé. Votre abonnement est actif." : (b.message || "Confirmation opérateur en cours de rapprochement automatique. Vous pouvez continuer à utiliser Jobly."));
      } else setMessage(b.message || "Vérification impossible.");
    } catch { setMessage("Erreur réseau pendant la vérification."); }
    finally { setBusy(false); }
  }
  async function redeemPromo(){
    setPromoMessage("");
    if(!promoCode.trim()){setPromoMessage("Saisissez un code promo.");return;}
    setPromoBusy(true);
    try {
      const s=await getSupabaseClient().auth.getSession();
      const token=s.data.session?.access_token;
      if(!token){setPromoMessage("Connectez-vous pour utiliser un code promo.");return;}
      const r=await fetch("/api/promo/redeem",{
        method:"POST",
        headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},
        body:JSON.stringify({code:promoCode,productType})
      });
      const b=await r.json();
      if(!r.ok){setPromoMessage(b.message||"Code promo invalide.");return;}
      const [sr,er]=await Promise.all([
        fetch(`/api/subscription?productType=${productType}`,{headers:{Authorization:`Bearer ${token}`}}),
        fetch(`/api/entitlements?productType=${productType}`,{headers:{Authorization:`Bearer ${token}`}})
      ]);
      const [subscriptionData,entitlementsData]=await Promise.all([sr.json(),er.json()]);
      setCurrent(subscriptionData.subscription||null);
      setPaymentId(subscriptionData.payment?.id||"");
      setPromo(entitlementsData.promo||null);
      setPromoCode("");
      setPromoMessage(`Accès PRO activé jusqu'au ${new Date(b.redemption.endsAt).toLocaleDateString("fr-FR")}.`);
    } catch { setPromoMessage("Erreur réseau pendant l'activation du code."); }
    finally { setPromoBusy(false); }
  }

  const currentPlan=current?.plan||"FREE";
  const pendingPlan=current?.status==="PENDING"?(current?.requestedPlan||current?.planCode||null):null;
  return <main className="min-h-screen bg-slate-50 px-5 py-10"><div className="mx-auto max-w-6xl"><Link href="/" className="text-sm font-bold text-slate-500">← Jobly</Link>
    <div className="mt-8 text-center"><p className="text-xs font-black uppercase tracking-[.25em] text-slate-500">JOBLY</p><h1 className="mt-2 text-4xl font-black text-slate-900">Choisissez votre niveau {productType==="RECRUITER"?"Recruteur":"Talent"}</h1><p className="mx-auto mt-3 max-w-2xl text-slate-600">FREE → START → PREMIUM → PRO. Paiement direct MTN Mobile Money ou Orange Money. Le code de paiement s'affiche dans Jobly et la confirmation opérateur active automatiquement l'abonnement.</p>
      <div className="mx-auto mt-6 grid max-w-xl gap-3 rounded-2xl bg-white p-4 text-left shadow-sm"><label className="text-sm font-bold text-slate-700">Numéro Mobile Money<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="2376XXXXXXXX" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none"/></label><label className="text-sm font-bold text-slate-700">Mode de paiement<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3"><option>MTN MoMo</option><option>Orange Money</option></select></label></div>
      <div className="mx-auto mt-4 max-w-xl rounded-2xl bg-slate-900 p-4 text-left text-white shadow-sm"><div className="text-sm font-black">Vous avez un code partenaire / institutionnel ?</div><div className="mt-1 text-xs text-slate-300">Un code autorisé peut donner temporairement accès au mode Pro selon votre profil.</div><div className="mt-3 flex gap-2"><input value={promoCode} onChange={e=>setPromoCode(e.target.value.toUpperCase())} placeholder="JOBLY-PRO-..." className="min-w-0 flex-1 rounded-xl px-4 py-3 font-mono text-sm text-slate-900"/><button onClick={redeemPromo} disabled={promoBusy} className="rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-900 disabled:opacity-50">{promoBusy?"…":"Activer"}</button></div>{promoMessage&&<div className="mt-3 text-sm font-bold text-emerald-200">{promoMessage}</div>}{promo?.endsAt&&<div className="mt-2 text-xs text-slate-300">Accès Pro actif jusqu'au {new Date(promo.endsAt).toLocaleDateString("fr-FR")}.</div>}</div>
      <div className="mx-auto mt-4 inline-flex rounded-full bg-white p-1 shadow-sm"><button onClick={()=>setAnnual(false)} className={`rounded-full px-5 py-2 text-sm font-bold ${!annual?"bg-slate-900 text-white":"text-slate-600"}`}>Mensuel</button><button onClick={()=>setAnnual(true)} className={`rounded-full px-5 py-2 text-sm font-bold ${annual?"bg-slate-900 text-white":"text-slate-600"}`}>Annuel</button></div>
    </div>
    <div className="mt-10 grid gap-5 md:grid-cols-4">{ORDER.map(code=>{
      const isCurrent=currentPlan===code,isPending=pendingPlan===code;
      const shell=`rounded-3xl bg-white p-6 shadow-sm ring-1 ${code==="PREMIUM"?"ring-amber-300":"ring-slate-100"}`;
      const action=code==="FREE"?<div className="mt-7 w-full rounded-2xl bg-slate-100 px-4 py-3 text-center font-black text-slate-500">Formule gratuite</div>:<button disabled={busy||isCurrent||Boolean(pendingPlan)} onClick={()=>choose(code)} className="mt-7 w-full rounded-2xl bg-slate-900 px-4 py-3 font-black text-white disabled:opacity-50">{isPending?"Commande créée":pendingPlan?"Commande existante":isCurrent?"Formule actuelle":busy?"Traitement…":`Payer avec ${paymentMethod}`}</button>;
      if(productType==="RECRUITER"){
        const p=RECRUITER_PLAN_CATALOG[code];
        return <section key={code} className={shell}><div className="flex items-center justify-between"><h2 className="text-xl font-black">{p.name}</h2>{code==="PREMIUM"&&<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">Recommandé</span>}{isCurrent&&<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Actuel</span>}</div><p className="mt-2 text-sm text-slate-500">{p.tagline}</p><div className="mt-6"><span className="text-3xl font-black">{code==="FREE"?"0":(annual?p.annualPriceXaf:p.monthlyPriceXaf).toLocaleString("fr-FR")}</span><span className="ml-1 text-sm font-bold text-slate-500">FCFA / {annual?"an":"mois"}</span></div><ul className="mt-4 space-y-1 text-xs font-bold text-slate-500"><li>{p.aiCredits} crédits IA / mois</li><li>Préparation multi-pays : {p.multiCountryDraft?"Incluse":"—"}</li><li>Optimisation marché : {p.marketOptimization?"Incluse":"—"}</li><li>Diffusion panafricaine : {p.panAfricanDistribution?"Incluse":"—"}</li></ul><ul className="mt-6 space-y-2 text-sm text-slate-700">{p.features.map(f=><li key={f}>✓ {f}</li>)}</ul>{action}</section>;
      }
      const p=PLAN_CATALOG[code];
      return <section key={code} className={shell}><div className="flex items-center justify-between"><h2 className="text-xl font-black">{p.name}</h2>{code==="PREMIUM"&&<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">Recommandé</span>}{isCurrent&&<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">Actuel</span>}</div><p className="mt-2 text-sm text-slate-500">{p.tagline}</p><div className="mt-6"><span className="text-3xl font-black">{code==="FREE"?"0":(annual?p.annualPriceXaf:p.monthlyPriceXaf).toLocaleString("fr-FR")}</span><span className="ml-1 text-sm font-bold text-slate-500">FCFA / {annual?"an":"mois"}</span></div><ul className="mt-4 space-y-1 text-xs font-bold text-slate-500"><li>{fmt(p.applicationsPerWeek)} candidatures / semaine</li><li>Multi-postulation : {p.bulkApplicationLimit>1?`jusqu'à ${p.bulkApplicationLimit}`:"—"}</li><li>{p.aiCredits} crédits IA / mois</li><li>{p.storageMb} Mo de stockage</li><li>CV → ATS : {p.atsConversionIncluded?"inclus":`${p.atsConversionPriceXaf.toLocaleString("fr-FR")} FCFA / conversion`}</li></ul><ul className="mt-6 space-y-2 text-sm text-slate-700">{p.features.map(f=><li key={f}>✓ {f}</li>)}</ul>{action}</section>;
    })}</div>
    {checkout&&<section className="mx-auto mt-6 max-w-xl rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm"><div className="text-xs font-black uppercase tracking-wide text-slate-500">{checkout.providerLabel} · Code court de paiement</div><div className="mt-2 flex items-center gap-2"><div className="min-w-0 flex-1 rounded-xl bg-slate-50 px-4 py-3 font-mono text-2xl font-black text-slate-900">{checkout.paymentCode}</div><button onClick={()=>navigator.clipboard?.writeText(checkout.paymentCode)} className="rounded-xl bg-slate-900 px-3 py-3 text-xs font-black text-white">Copier</button></div><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><div><div className="text-xs text-slate-500">Compte marchand</div><div className="font-black text-slate-900">{checkout.merchantAccount}</div></div><div><div className="text-xs text-slate-500">Montant exact</div><div className="font-black text-slate-900">{Number(checkout.amount).toLocaleString("fr-FR")} {checkout.currency}</div></div></div><div className="mt-3 text-xs text-slate-500">Référence Jobly : <span className="font-mono font-bold text-slate-800">{checkout.paymentReference}</span></div><a href={"tel:" + String(checkout.ussdCode || "").replace(/#/g, "%23")} className="mt-4 block rounded-xl bg-amber-400 px-4 py-3 text-center font-black text-slate-900">Ouvrir le composeur USSD</a><p className="mt-3 text-xs leading-relaxed text-slate-600">Effectuez le paiement sur votre téléphone et validez-le dans le menu de l’opérateur. Ne communiquez jamais votre PIN à Jobly.</p></section>}{paymentId&&checkout&&<div className="mx-auto mt-4 max-w-xl rounded-2xl bg-white p-4"><p className="text-sm font-bold text-slate-700">Confirmation automatique par J’IA</p><p className="mt-1 text-xs leading-relaxed text-slate-500">Après réception du SMS sur le téléphone marchand appairé, J’IA extrait la référence et rapproche automatiquement le montant, l’opérateur, le numéro payeur et le compte marchand. Vous pouvez continuer à utiliser Jobly pendant ce contrôle.</p><details className="mt-3"><summary className="cursor-pointer text-xs font-bold text-slate-600">Ajouter une référence SMS (facultatif)</summary><input value={transactionId} onChange={e=>setTransactionId(e.target.value)} placeholder="Référence exacte de la transaction" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-mono outline-none"/></details><button disabled={busy} onClick={verify} className="mt-3 w-full rounded-2xl bg-emerald-700 px-6 py-3 font-black text-white disabled:opacity-50">{busy?"Actualisation…":"Actualiser le statut"}</button></div>}{current&&<div className="mx-auto mt-8 max-w-xl rounded-2xl bg-white p-4 text-center text-sm font-bold text-slate-700">{current.status==="PENDING" ? ("Plan actuel : " + (current.plan || "FREE") + " · demande " + (current.requestedPlan || current.planCode) + " enregistrée. Vous pouvez continuer à utiliser Jobly ; la confirmation est automatique.") : ("Plan actuel : " + current.plan + " · statut " + current.status)}</div>}{message&&<p className="mx-auto mt-5 max-w-2xl rounded-2xl bg-amber-50 p-4 text-center text-sm font-bold text-amber-900">{message}</p>}
  </div></main>;
}
