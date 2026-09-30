"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import BottomNav, { TALENT_NAV } from "../../../components/BottomNav";
import TalentBackground from "../../../components/TalentBackground";

type CV = {
  id: string; name: string; source: string; fullName: string; headline: string; email: string; phone: string;
  summary: string; skills: string; experience: string; education: string; ats: number; createdAt: string;
};
type PaymentState = { paymentId: string; instructions: string; priceXaf: number; pending?: boolean } | null;

const KEY = "jobly:talent-cvs";
const empty: CV = { id: "", name: "Mon CV Jobly", source: "Créé dans Jobly", fullName: "", headline: "", email: "", phone: "", summary: "", skills: "", experience: "", education: "", ats: 0, createdAt: "" };

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
  const [extracted, setExtracted] = useState<any>(null);
  const [originalMeta, setOriginalMeta] = useState<{ pages?: number; storagePath?: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [originalBusy, setOriginalBusy] = useState(false);
  const [plan, setPlan] = useState("FREE");
  const [paymentPhone, setPaymentPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("MTN MoMo");
  const [payment, setPayment] = useState<PaymentState>(null);

  useEffect(() => {
    try { setCvs(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch {}
    fetch("/api/entitlements", { cache: "no-store" }).then(r => r.ok ? r.json() : null).then(x => x?.subscription?.plan && setPlan(x.subscription.plan)).catch(() => {});
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
        skills: (extracted.skills || []).join(", "),
        experience: extracted.experience || cv.experience,
        education: extracted.education || cv.education,
        source: file ? `CV original importé : ${file}` : cv.source,
        ats: Number(extracted.atsScore || 0) || score(cv),
      };
      setCv(next);
      const token = await getAccessToken();
      if (token) {
        const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
        const profileRes = await fetch("/api/profile", { method: "PUT", headers, body: JSON.stringify({ section: "profil", displayName: next.fullName, phone: next.phone, headline: next.headline, summary: next.summary })});
        if (!profileRes.ok) throw new Error((await profileRes.json().catch(() => ({}))).message || "Le profil Jobly n’a pas pu être synchronisé.");
        const skillsRes = await fetch("/api/profile", { method: "PUT", headers, body: JSON.stringify({ section: "skills", skills: (extracted.skills || []).map((name: string) => ({ name })) })});
        if (!skillsRes.ok) throw new Error("Les compétences n’ont pas pu être synchronisées.");
      }
      const all = [next, ...cvs.filter(x => x.id !== next.id)];
      setCvs(all); localStorage.setItem(KEY, JSON.stringify(all));
      setMessage(token ? "Données extraites : les champs sont remplis et le profil Talent est synchronisé." : "Données extraites : les champs sont remplis. Connecte-toi pour synchroniser le profil Jobly.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Extraction impossible."); }
    finally { setBusy(false); }
  }

  function save() {
    const next = { ...cv, ats, createdAt: cv.createdAt || new Date().toISOString(), name: cv.name || "Mon CV Jobly" };
    const all = [next, ...cvs.filter(x => x.id !== next.id)];
    setCvs(all); localStorage.setItem(KEY, JSON.stringify(all)); setCv(next); setMessage("CV enregistré.");
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
      setOriginalMeta({ pages: data.pages, storagePath: data.originalCv?.storagePath });
      setMessage(`CV importé${data.originalCv?.stored ? " et conservé comme document original" : ""}. Clique sur « Extraire les données » pour remplir les champs. ${data.credits} crédit(s) IA utilisé(s).`);
    } catch (err) { setMessage(err instanceof Error ? err.message : "Import impossible."); }
    finally { setBusy(false); }
  }

  function openOriginalCv() {
    setOriginalBusy(true);
    router.push("/talent/cvs/original");
  }

  async function exportPdf(paymentId?: string) {
    setBusy(true); setMessage(paymentId ? "Vérification du paiement…" : "Préparation du CV ATS…");
    try {
      const res = await fetch("/api/talent/cv/export", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ cv: { ...cv, skills: cv.skills.split(",").map(x => x.trim()).filter(Boolean) }, paymentId, paymentPhone, paymentMethod }) });
      if (res.status === 402) {
        const data = await res.json();
        if (data.paymentRequired && data.paymentId) {
          setPayment({ paymentId: data.paymentId, instructions: data.instructions || "Valide le paiement sur ton téléphone.", priceXaf: data.priceXaf || 1000 });
          setMessage("Le téléchargement ATS est à 1 000 FCFA pour Free et Start.");
        } else setMessage(data.message || "Paiement requis.");
        return;
      }
      if (res.status === 202) { const data = await res.json(); setPayment(p => p ? { ...p, pending: true } : p); setMessage(data.message || "Paiement en attente."); return; }
      if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message || "Téléchargement impossible."); }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${cv.fullName || "CV-Jobly"}-ATS.pdf`; a.click(); URL.revokeObjectURL(url);
      setPayment(null); setMessage("CV ATS téléchargé.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Téléchargement impossible."); }
    finally { setBusy(false); }
  }

  function load(x: CV) { setCv(x); setMessage("Version chargée."); }

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
              <button onClick={() => exportPdf()} disabled={busy} className="rounded-xl bg-[#FFE135] py-3 font-black disabled:opacity-50">Télécharger ATS</button>
              <button onClick={() => router.push("/career-os")} className="rounded-xl border py-3 font-black">Career OS →</button>
            </div>
            {message && <div role="status" aria-live="polite" className="fixed bottom-5 left-1/2 z-[120] w-[min(92vw,520px)] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-[#17212B] shadow-2xl print:hidden">{message}</div>}
            {payment && <div className="mt-4 rounded-2xl border border-[#FFE135] bg-[#FFF9E6] p-4 print:hidden">
              <p className="font-black">Téléchargement ATS — {payment.priceXaf.toLocaleString("fr-FR")} FCFA</p>
              <p className="mt-1 text-xs">{payment.instructions}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <input value={paymentPhone} onChange={e => setPaymentPhone(e.target.value)} placeholder="Numéro Mobile Money" className="rounded-xl border px-3 py-2" />
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="rounded-xl border px-3 py-2"><option>MTN MoMo</option><option>Orange Money</option></select>
              </div>
              <button onClick={() => exportPdf(payment.paymentId)} disabled={busy} className="mt-3 w-full rounded-xl bg-jobly-blue py-3 font-black text-white disabled:opacity-50">{payment.pending ? "Vérifier le paiement" : "J’ai payé — télécharger"}</button>
            </div>}
          </section>
          <aside className="space-y-4 print:hidden">
            <section className="rounded-[24px] bg-white p-5 shadow-sm"><span className="text-xs font-black uppercase text-jobly-gray">Score ATS</span><div className="mt-2 text-5xl font-black text-jobly-blue">{ats}%</div><p className="mt-2 text-xs text-jobly-gray">Score déterministe de lisibilité et de complétude. J’IA peut aussi analyser le contenu importé.</p></section>
            <section className="rounded-[24px] bg-white p-5 shadow-sm"><h2 className="font-black">Téléchargement</h2><p className="mt-2 text-xs text-jobly-gray">Premium et Pro : inclus. Free et Start : 1 000 FCFA par CV ATS.</p><p className="mt-2 text-[10px] font-bold uppercase text-jobly-gray">Plan actuel : {plan}</p></section>
            <section className="rounded-[24px] bg-white p-5 shadow-sm"><h2 className="font-black">Mes versions</h2>{cvs.length === 0 ? <p className="mt-2 text-xs text-jobly-gray">Aucune version enregistrée.</p> : <div className="mt-3 space-y-2">{cvs.slice(0, 8).map(x => <button key={x.id} onClick={() => load(x)} className="w-full rounded-xl border p-3 text-left"><b className="block text-xs">{x.name}</b><span className="text-[10px] text-jobly-gray">ATS {x.ats}% · {x.source}</span></button>)}</div>}</section>
          </aside>
        </div>

        <section id="cv-print" className="mx-auto max-w-3xl rounded-[8px] bg-white p-8 shadow-sm print:mt-0 print:p-0 print:shadow-none">
          <h2 className="text-3xl font-black">{cv.fullName || "Nom complet"}</h2><p className="mt-1 text-lg font-bold text-jobly-blue">{cv.headline || "Titre professionnel"}</p><p className="mt-2 text-xs">{[cv.email, cv.phone].filter(Boolean).join(" · ")}</p>
          {[['Profil', cv.summary], ['Compétences', cv.skills], ['Expérience', cv.experience], ['Formation', cv.education]].map(([h, v]) => v ? <div key={h} className="mt-5"><h3 className="border-b pb-1 text-sm font-black uppercase">{h}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{v}</p></div> : null)}
        </section>
      </div>
      <BottomNav active="/dashboard" items={TALENT_NAV} />
    </div>
  </main>;
}
