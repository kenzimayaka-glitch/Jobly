"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import BottomNav, { TALENT_NAV } from "../../../components/BottomNav";
import TalentBackground from "../../../components/TalentBackground";
import { PremiumDiamond } from "../../../components/ui/PremiumDiamond";

type CV = {
  id: string; name: string; source: string; fullName: string; headline: string; email: string; phone: string;
  summary: string; skills: string; experience: string; education: string;
  activities: string[]; interests: string[]; references: string[]; referencesVisible: boolean;
  languages: string[]; achievements: string[]; atsKeywords: string[];
  ats: number; createdAt: string;
};
const KEY = "jobly:talent-cvs";
const empty: CV = { id: "", name: "Mon CV Jobly", source: "Créé dans Jobly", fullName: "", headline: "", email: "", phone: "", summary: "", skills: "", experience: "", education: "", activities: [], interests: [], references: [], referencesVisible: false, languages: [], achievements: [], atsKeywords: [], ats: 0, createdAt: "" };

function score(c: CV) {
  let n = 0;
  if (c.fullName.trim()) n += 15;
  if (c.headline.trim()) n += 10;
  if (c.email.trim()) n += 10;
  if (c.phone.trim()) n += 5;
  if (c.summary.trim().length >= 80) n += 15; else if (c.summary.trim()) n += 7;
  if (c.skills.split(",").filter(Boolean).length >= 5) n += 20; else if (c.skills.trim()) n += 10;
  if (c.experience.trim().length >= 120) n += 15; else if (c.experience.trim()) n += 7;
  if (c.education.trim()) n += 10;
  return Math.min(100, n);
}

export default function TalentCVs() {
  const router = useRouter();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [cv, setCv] = useState<CV>({ ...empty, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  const [file, setFile] = useState("");
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<any>(null);
  const [originalMeta, setOriginalMeta] = useState<{ pages?: number; storagePath?: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timer);
  }, [message]);
  const [originalBusy, setOriginalBusy] = useState(false);
  const [plan, setPlan] = useState("FREE");
  const [cvPaymentAmount, setCvPaymentAmount] = useState(500);
  const [cvPaymentOpen, setCvPaymentOpen] = useState(false);
  const [cvPaymentPhone, setCvPaymentPhone] = useState("");
  const [cvPaymentMethod, setCvPaymentMethod] = useState("MTN MoMo");
  const [cvPaymentBusy, setCvPaymentBusy] = useState(false);
  const [cvPaymentId, setCvPaymentId] = useState("");
  const [cvPaymentMessage, setCvPaymentMessage] = useState("");
  const [previewVersion, setPreviewVersion] = useState<"jobly" | "ats" | null>(null);

  useEffect(() => {
    try { setCvs(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
    fetch("/api/entitlements", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(x => {
      if (x?.subscription?.plan) setPlan(x.subscription.plan);
      if (Number.isFinite(Number(x?.entitlements?.cvDownloadPriceXaf))) setCvPaymentAmount(Number(x.entitlements.cvDownloadPriceXaf));
    }).catch(() => {});
  }, []);

  const ats = useMemo(() => score(cv), [cv]);
  const update = (k: keyof CV, v: string) => setCv(x => ({ ...x, [k]: v }));

  async function getAccessToken() {
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.access_token) return null;
      const expiresAt = Number(session.expires_at || 0) * 1000;
      if (!expiresAt || expiresAt - Date.now() > 60_000) return session.access_token;
      const refreshed = await supabase.auth.refreshSession();
      return refreshed.data.session?.access_token || null;
    } catch { return null; }
  }

  async function extractIntoFields() {
    if (!extracted) { setMessage("Importe d’abord ton CV PDF."); return; }
    setBusy(true);
    try {
      const next: CV = {
        ...cv,
        fullName: extracted.fullName || cv.fullName,
        headline: extracted.headline || cv.headline,
        email: extracted.email || cv.email,
        phone: extracted.phone || cv.phone,
        summary: extracted.summary || cv.summary,
        skills: Array.isArray(extracted.skills) ? extracted.skills.join(", ") : cv.skills,
        experience: extracted.experience || cv.experience,
        education: extracted.education || cv.education,
        activities: Array.isArray(extracted.activities) ? extracted.activities : cv.activities,
        interests: Array.isArray(extracted.interests) ? extracted.interests : cv.interests,
        references: Array.isArray(extracted.references) ? extracted.references : cv.references,
        referencesVisible: extracted.referencesVisible === true || cv.referencesVisible,
        languages: Array.isArray(extracted.languages) ? extracted.languages : cv.languages,
        achievements: Array.isArray(extracted.achievements) ? extracted.achievements : cv.achievements,
        atsKeywords: Array.isArray(extracted.atsKeywords) ? extracted.atsKeywords : cv.atsKeywords,
        source: file ? `CV original importé : ${file}` : cv.source,
        ats: Number(extracted.atsScore || 0) || score(cv),
      };
      setCv(next);
      setMessage("Données extraites : les champs sont remplis. Vérifie-les puis clique sur « Enregistrer » pour les conserver.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Extraction impossible."); }
    finally { setBusy(false); }
  }

  async function save() {
    setBusy(true);
    try {
      const next = { ...cv, ats, createdAt: cv.createdAt || new Date().toISOString(), name: cv.name || "Mon CV Jobly" };
      const token = await getAccessToken();
      if (!token) throw new Error("Ta session Jobly n’est plus active. Reconnecte-toi avant d’enregistrer ton CV.");
      {
        const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
        const profileRes = await fetch("/api/profile", { method: "PUT", headers, body: JSON.stringify({ section: "profil", displayName: next.fullName, phone: next.phone, headline: next.headline, summary: next.summary })});
        if (!profileRes.ok) throw new Error((await profileRes.json().catch(() => ({}))).message || "Le profil Jobly n’a pas pu être synchronisé.");
        const skillsRes = await fetch("/api/profile", { method: "PUT", headers, body: JSON.stringify({ section: "skills", skills: next.skills.split(",").map(name => ({ name: name.trim() })).filter(x => x.name) })});
        if (!skillsRes.ok) throw new Error("Les compétences n’ont pas pu être synchronisées.");
        if (originalFile) {
          const form = new FormData(); form.append("file", originalFile); if (originalMeta?.pages) form.append("pages", String(originalMeta.pages));
          const originalRes = await fetch("/api/talent/cv/original", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
          const originalBody = await originalRes.json().catch(() => ({}));
          if (!originalRes.ok) throw new Error(originalBody.message || "Le CV original n’a pas pu être enregistré.");
          setOriginalMeta({ storagePath: originalBody.storagePath });
        }
      }
      const all = [next, ...cvs.filter(x => x.id !== next.id)];
      setCvs(all); localStorage.setItem(KEY, JSON.stringify(all)); setCv(next);
      setMessage("CV enregistré : version Jobly, données de profil et document original sont conservés.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  }

  async function importPdf(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f.name); setBusy(true); setMessage("J’IA lit ton CV et prépare les champs…");
    try {
      const form = new FormData(); form.append("file", f);
      let token = await getAccessToken();
      if (!token) throw new Error("Impossible de récupérer ta session Jobly active. Recharge la page puis réessaie.");
      let res = await fetch("/api/talent/cv/import", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      if (res.status === 401) {
        token = await (async () => { try { const refreshed = await getSupabaseClient().auth.refreshSession(); return refreshed.data.session?.access_token || null; } catch { return null; } })();
        if (token) res = await fetch("/api/talent/cv/import", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      }
      const responseText = await res.text();
      let data: any = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        const htmlTitle = responseText.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim();
        throw new Error(htmlTitle ? `Le serveur a renvoyé une page HTML au lieu de la réponse JSON attendue (${htmlTitle}). Réessaie dans un instant.` : `Le serveur a renvoyé une réponse invalide au lieu du JSON attendu (HTTP ${res.status}).`);
      }
      if (!res.ok) {
        if (res.status === 401) throw new Error("Ta session Jobly n’est plus valide. Reconnecte-toi puis réessaie.");
        throw new Error(data.message || "Import impossible.");
      }
      setExtracted(data.cv);
      setOriginalMeta({ pages: data.pages });
      setOriginalFile(f);
      setMessage(`CV importé en prévisualisation. Clique sur « Extraire les données », vérifie les champs, puis « Enregistrer » pour conserver le CV. ${data.credits ?? 0} crédit(s) IA utilisé(s).`);
    } catch (err) { setMessage(err instanceof Error ? err.message : "Import impossible."); }
    finally { setBusy(false); }
  }

  function openOriginalCv() {
    setOriginalBusy(true);
    router.push("/talent/cvs/original");
  }

  function openCvPayment() {
    setCvPaymentMessage("");
    setCvPaymentId("");
    setCvPaymentOpen(true);
  }

  async function exportPdf(paymentId?: string) {
    if (plan !== "PREMIUM" && plan !== "PRO") {
      openCvPayment();
      return;
    }
    setBusy(true); setMessage("Préparation du CV ATS…");
    try {
      const res = await fetch("/api/talent/cv/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cv: { ...cv, skills: cv.skills.split(",").map(x => x.trim()).filter(Boolean) }, ...(paymentId ? { paymentId } : {}) }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Téléchargement impossible.");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${cv.fullName || "CV-Jobly"}-ATS.pdf`; a.click(); URL.revokeObjectURL(url);
      setMessage("CV ATS téléchargé.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Téléchargement impossible."); }
    finally { setBusy(false); }
  }

  async function startCvPayment() {
    setCvPaymentBusy(true);
    setCvPaymentMessage("");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Ta session Jobly n’est plus active. Reconnecte-toi puis réessaie.");
      const res = await fetch("/api/talent/cv/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          feature: "CV_ATS_DOWNLOAD",
          provider: "ICLAN",
          phone: cvPaymentPhone.trim(),
          paymentMethod: cvPaymentMethod,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Impossible de lancer le paiement.");
      if (data.included) {
        setCvPaymentOpen(false);
        await exportPdf();
        return;
      }
      setCvPaymentId(String(data.payment?.id || ""));
      setCvPaymentMessage(data.instructions || "Validez le paiement sur votre téléphone, puis cliquez sur « Vérifier le paiement ».");
    } catch (err) {
      setCvPaymentMessage(err instanceof Error ? err.message : "Impossible de lancer le paiement.");
    } finally {
      setCvPaymentBusy(false);
    }
  }

  async function verifyCvPayment() {
    if (!cvPaymentId) return;
    setCvPaymentBusy(true);
    setCvPaymentMessage("");
    try {
      const res = await fetch(`/api/payments/${cvPaymentId}/verify`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Vérification impossible.");
      if (data.payment?.status !== "SUCCESSFUL") {
        setCvPaymentMessage(`Statut du paiement : ${data.verification?.status || data.payment?.status || "inconnu"}. Validez le paiement puis réessayez.`);
        return;
      }
      setCvPaymentOpen(false);
      setCvPaymentId("");
      setMessage("Paiement confirmé. Préparation du CV ATS…");
      await exportPdf(cvPaymentId);
    } catch (err) {
      setCvPaymentMessage(err instanceof Error ? err.message : "Vérification impossible.");
    } finally {
      setCvPaymentBusy(false);
    }
  }

  function openVersion(version: "jobly" | "ats") {
    setPreviewVersion(version);
  }


  return <main className="talent-shell relative min-h-[100dvh] bg-[#F7FAFF] pb-28 text-navy">
    <TalentBackground />
    <div className="relative z-10 print:bg-white">
      <PageHeader label="Mes CV" eyebrow="TALENT" initial="T" onBack={() => router.push("/talent/profile")} theme="talent" />
      <div className="mx-auto max-w-4xl space-y-4 px-5 py-5">
        <section className="rounded-[24px] bg-white p-5 shadow-sm print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h1 className="text-xl font-black">CV Builder + ATS</h1><p className="mt-1 text-xs text-jobly-gray">Importe ton PDF : J’IA extrait les données et remplit automatiquement ton CV.</p></div>
            <div className="flex flex-wrap gap-2">
              <label className={`cursor-pointer rounded-full bg-[#FFE135] px-4 py-3 text-xs font-black ${busy ? "pointer-events-none opacity-50" : ""}`}>Importer mon CV PDF<input type="file" accept="application/pdf,.pdf" onChange={importPdf} className="hidden" disabled={busy} /></label>
              <button type="button" onClick={extractIntoFields} disabled={!extracted || busy} className="rounded-full bg-[#BFFF00] px-4 py-3 text-xs font-black text-navy disabled:cursor-not-allowed disabled:opacity-40">Extraire les données</button>
            </div>
          </div>
          {file && <p className="mt-3 text-xs font-bold text-jobly-blue">Fichier : {file}{originalMeta?.pages ? ` · ${originalMeta.pages} page(s)` : ""}</p>}
          {extracted && <p className="mt-2 text-[11px] font-semibold text-jobly-gray">Données prêtes à être injectées dans les champs correspondants. Le PDF original reste séparé du CV interne Jobly.</p>}
          {originalMeta?.storagePath && <button type="button" onClick={openOriginalCv} disabled={busy || originalBusy} className="mt-3 rounded-xl border border-jobly-blue px-4 py-2 text-xs font-black text-jobly-blue disabled:opacity-50">{originalBusy ? "Ouverture…" : "Ouvrir mon CV original"}</button>}
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_.6fr]">
          <section className="rounded-[24px] bg-white p-5 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={cv.fullName} onChange={e => update("fullName", e.target.value)} placeholder="Nom complet" className="rounded-xl border px-4 py-3" />
              <input value={cv.headline} onChange={e => update("headline", e.target.value)} placeholder="Titre professionnel" className="rounded-xl border px-4 py-3" />
              <input value={cv.email} onChange={e => update("email", e.target.value)} placeholder="Email" className="rounded-xl border px-4 py-3" />
              <input value={cv.phone} onChange={e => update("phone", e.target.value)} placeholder="Téléphone" className="rounded-xl border px-4 py-3" />
            </div>
            <textarea value={cv.summary} onChange={e => update("summary", e.target.value)} placeholder="Résumé professionnel" rows={4} className="mt-3 w-full rounded-xl border px-4 py-3" />
            <textarea value={cv.skills} onChange={e => update("skills", e.target.value)} placeholder="Compétences (séparées par des virgules)" rows={3} className="mt-3 w-full rounded-xl border px-4 py-3" />
            <textarea value={cv.experience} onChange={e => update("experience", e.target.value)} placeholder="Expériences professionnelles" rows={7} className="mt-3 w-full rounded-xl border px-4 py-3" />
            <textarea value={cv.education} onChange={e => update("education", e.target.value)} placeholder="Formation / certifications" rows={4} className="mt-3 w-full rounded-xl border px-4 py-3" />
            <div className="mt-4 grid gap-2 sm:grid-cols-3 print:hidden">
              <button onClick={save} className="rounded-xl bg-jobly-blue py-3 font-black text-white">Enregistrer</button>
              <button onClick={() => exportPdf()} disabled={busy} className="rounded-xl bg-[#FFE135] py-3 font-black disabled:opacity-50"><span className="inline-flex items-center gap-1.5"><PremiumDiamond />Télécharger ATS</span>{plan !== "PREMIUM" && plan !== "PRO" ? <span className="ml-1 text-[10px]">· {cvPaymentAmount.toLocaleString("fr-FR")} FCFA / téléchargement</span> : <span className="ml-1 text-[10px]">· inclus</span>}</button>
              <button onClick={() => router.push("/career-os")} className="rounded-xl border py-3 font-black">Career OS →</button>
            </div>
            {message && <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-[120] w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#17212B] shadow-2xl print:hidden">{message}</div>}

          </section>
          <aside className="space-y-4 print:hidden">
            <section className="rounded-[24px] bg-white p-5 shadow-sm"><span className="text-xs font-black uppercase text-jobly-gray">Score ATS</span><div className="mt-2 text-5xl font-black text-jobly-blue">{ats}%</div><p className="mt-2 text-xs text-jobly-gray">Score déterministe de lisibilité et de complétude. J’IA peut aussi analyser le contenu importé.</p></section>
            <section className="rounded-[24px] bg-white p-5 shadow-sm"><h2 className="font-black">Mes versions</h2>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><b className="block text-xs">Mon CV Jobly</b><span className="text-[10px] text-jobly-gray">Version professionnelle Jobly</span></div><button type="button" onClick={() => openVersion("jobly")} className="shrink-0 rounded-lg bg-jobly-blue px-3 py-2 text-[11px] font-black text-white">Ouvrir</button></div>
                <div className="flex items-center justify-between gap-3 rounded-xl border p-3"><div><b className="block text-xs">Mon CV ATS</b><span className="text-[10px] text-jobly-gray">Version structurée pour les ATS</span></div><button type="button" onClick={() => openVersion("ats")} className="shrink-0 rounded-lg bg-jobly-blue px-3 py-2 text-[11px] font-black text-white">Ouvrir</button></div>
              </div></section>
          </aside>
        </div>

        <section id="cv-print" className="mx-auto max-w-3xl rounded-[8px] bg-white p-8 shadow-sm print:mt-0 print:p-0 print:shadow-none">
          <h2 className="text-3xl font-black">{cv.fullName || "Nom complet"}</h2><p className="mt-1 text-lg font-bold text-jobly-blue">{cv.headline || "Titre professionnel"}</p><p className="mt-2 text-xs">{[cv.email, cv.phone].filter(Boolean).join(" · ")}</p>
          {[['Profil', cv.summary], ['Compétences', cv.skills], ['Expérience', cv.experience], ['Formation', cv.education]].map(([h, v]) => v ? <div key={h} className="mt-5"><h3 className="border-b pb-1 text-sm font-black uppercase">{h}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{v}</p></div> : null)}
        </section>
        {cvPaymentOpen && (
          <div className="fixed inset-0 z-[140] grid place-items-center bg-slate-950/45 px-4 py-6 print:hidden" role="dialog" aria-modal="true" aria-label="Paiement du téléchargement CV ATS">
            <div className="w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-jobly-gray">Accès CV ATS</p>
                    <h2 className="mt-1 text-xl font-black">Télécharger mon CV ATS</h2>
                  </div>
                  <button type="button" onClick={() => setCvPaymentOpen(false)} className="rounded-full border px-3 py-2 text-sm font-black" aria-label="Fermer">×</button>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div className="rounded-2xl bg-[#F7FAFF] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-xs font-black text-slate-500">Votre formule</p><p className="mt-1 text-lg font-black">{plan}</p></div>
                    <div className="text-right"><p className="text-xs font-black text-slate-500">Paiement ponctuel</p><p className="mt-1 text-2xl font-black text-jobly-blue">{cvPaymentAmount.toLocaleString("fr-FR")} FCFA</p></div>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-slate-600">Ce paiement concerne uniquement ce téléchargement. Il ne modifie pas votre abonnement et ne crée aucun renouvellement.</p>
                </div>
                <label className="block text-xs font-black text-slate-700">Numéro Mobile Money
                  <input value={cvPaymentPhone} onChange={e => setCvPaymentPhone(e.target.value)} placeholder="2376XXXXXXXX" className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-jobly-blue" />
                </label>
                <label className="block text-xs font-black text-slate-700">Mode de paiement
                  <select value={cvPaymentMethod} onChange={e => setCvPaymentMethod(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none">
                    <option>MTN MoMo</option><option>Orange Money</option>
                  </select>
                </label>
                {cvPaymentMessage && <div role="status" aria-live="polite" className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">{cvPaymentMessage}</div>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCvPaymentOpen(false)} className="flex-1 rounded-xl border px-4 py-3 text-xs font-black">Annuler</button>
                  {!cvPaymentId ? (
                    <button type="button" onClick={startCvPayment} disabled={cvPaymentBusy || !cvPaymentPhone.trim()} className="flex-1 rounded-xl bg-jobly-blue px-4 py-3 text-xs font-black text-white disabled:opacity-50">{cvPaymentBusy ? "Préparation…" : `Payer ${cvPaymentAmount.toLocaleString("fr-FR")} FCFA`}</button>
                  ) : (
                    <button type="button" onClick={verifyCvPayment} disabled={cvPaymentBusy} className="flex-1 rounded-xl bg-jobly-blue px-4 py-3 text-xs font-black text-white disabled:opacity-50">{cvPaymentBusy ? "Vérification…" : "Vérifier le paiement"}</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {previewVersion && (
          <div className="fixed inset-0 z-[135] overflow-y-auto bg-slate-950/45 px-4 py-8 print:hidden" role="dialog" aria-modal="true" aria-label={previewVersion === "jobly" ? "Mon CV Jobly" : "Mon CV ATS"}>
            <div className="mx-auto max-w-3xl rounded-[8px] bg-white p-8 shadow-2xl">
              <div className="mb-6 flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-jobly-gray">Visualisation uniquement</p><h2 className="mt-1 text-2xl font-black">{previewVersion === "jobly" ? "Mon CV Jobly" : "Mon CV ATS"}</h2></div><button type="button" onClick={() => setPreviewVersion(null)} className="rounded-full border px-3 py-2 text-sm font-black">Fermer</button></div>
              <h3 className="text-3xl font-black">{cv.fullName || "Nom complet"}</h3><p className="mt-1 text-lg font-bold text-jobly-blue">{cv.headline || "Titre professionnel"}</p><p className="mt-2 text-xs">{[cv.email, cv.phone].filter(Boolean).join(" · ")}</p>
              {[["Profil", cv.summary], ["Compétences", cv.skills], ["Expérience", cv.experience], ["Formation", cv.education]].map(([h,v]) => v ? <div key={h} className="mt-5"><h3 className="border-b pb-1 text-sm font-black uppercase">{h}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{v}</p></div> : null)}
            </div>
          </div>
        )}
      </div>
      <BottomNav active="/dashboard" items={TALENT_NAV} />
    </div>
  </main>;
}
