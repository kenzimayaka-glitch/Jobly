"use client";

import { useEffect, useState } from "react";
import { JOBLY_PUBLIC_HOST } from "../../../lib/site";
import { useRouter } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import BottomNav, { RECRUITER_NAV } from "../../../components/BottomNav";
import DecorativeBackground from "../../../components/DecorativeBackground";
import { connectGmail, disconnectGmail, getGmailConnection, refreshGmailConnection } from "../../../lib/gmailService";
import { checkForRelaunch } from "../../../lib/cronService";
import SubscriptionCard from "../../../components/SubscriptionCard";

const SETTINGS_KEY = "jobly:recruiter-settings";

export default function RecruiterSettingsPage() {
  const router = useRouter();
  const [gmail, setGmail] = useState(getGmailConnection());
  const [signatureEnabled, setSignatureEnabled] = useState(false);
  const [signature, setSignature] = useState(`Recrutement géré via Jobly - Trouvez votre job sur ${JOBLY_PUBLIC_HOST}`);
  const [whatsapp, setWhatsapp] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const gmailCallback = new URLSearchParams(window.location.search).get("gmail");
    (async () => {
      if (gmailCallback === "1") {
        const current = await refreshGmailConnection();
        setGmail(current);
        setMessage(current.connected ? `Gmail connecté : ${current.email}` : "La connexion Gmail n'a pas pu être confirmée.");
      } else {
        setGmail(await refreshGmailConnection());
      }
    })();
    try {
      const data = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      setSignatureEnabled(Boolean(data.signatureEnabled));
      setSignature(data.signature || signature);
      setWhatsapp(data.whatsapp || "");
      setWhatsappEnabled(Boolean(data.whatsappEnabled));
    } catch {}
  }, []);

  function persist(next: Record<string, unknown>) {
    const current = { signatureEnabled, signature, whatsapp, whatsappEnabled, ...next };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(current));
    setMessage("Paramètres enregistrés.");
    window.setTimeout(() => setMessage(""), 2200);
  }

  async function handleGmail() {
    if (gmail.connected) {
      await disconnectGmail();
      setGmail({ connected: false, email: null, connectedAt: null });
      setMessage("Gmail déconnecté.");
      return;
    }
    try {
      await connectGmail();
      setMessage("Redirection vers Google pour autoriser Gmail…");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Connexion Gmail impossible.");
    }
  }

  return (
    <main className="relative min-h-[100dvh] bg-[#F7FAFF] pb-28 text-[#0A1931]">
      <DecorativeBackground />
      <div className="relative z-10">
        <PageHeader label="Paramètres" eyebrow="RECRUTEUR" initial="R" onBack={() => router.push("/recruiter")} />
        <div className="mx-auto max-w-3xl space-y-4 px-5 py-5">
          {message && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-extrabold text-emerald-700">{message}</div>}
          <SubscriptionCard ecosystem="RECRUITER" />

          <section className="rounded-[24px] bg-white p-5 shadow-sm">
            <h2 className="font-heading text-base font-extrabold">Auto-relance</h2>
            <p className="mt-1 text-xs text-jobly-gray">Contrôle des candidats convoqués depuis plus de 3 jours.</p>
            <button type="button" onClick={async()=>{const result=await checkForRelaunch([{id:"demo",candidateName:"Candidat démo",candidateEmail:"candidate@example.com",companyName:"Votre entreprise",interviewAt:new Date(Date.now()-4*86400000).toISOString()}],gmail.email||"rh@jobly.cm");setMessage(`${result.sent.length} relance(s) envoyée(s).`);}} className="mt-3 w-full rounded-full bg-[#2E5C9E] py-3 text-xs font-black text-white">Vérifier les relances maintenant</button>
          </section>

          <section className="rounded-[24px] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="font-heading text-lg font-extrabold">Connecter mon Gmail</h1>
                <p className="mt-1 text-xs text-jobly-gray">{gmail.connected ? `Connecté : ${gmail.email}` : "Centralise les candidatures reçues par email."}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black ${gmail.connected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-jobly-gray"}`}>{gmail.connected ? "CONNECTÉ" : "NON CONNECTÉ"}</span>
            </div>
            <button onClick={handleGmail} className="mt-4 w-full rounded-full bg-[#FFC72C] px-5 py-3 text-sm font-extrabold text-[#0A1931]">{gmail.connected ? "Déconnecter Gmail" : "Connecter mon Gmail"}</button>
            <p className="mt-3 text-[10px] font-semibold text-jobly-gray">Jobly demande uniquement les accès Gmail nécessaires à la lecture des candidatures et à l'envoi des décisions.</p>
          </section>

          <section className="rounded-[24px] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div><h2 className="font-heading text-base font-extrabold">Signature Jobly</h2><p className="mt-1 text-xs text-jobly-gray">Préférence de signature pour les emails de recrutement.</p></div>
              <button aria-label="Activer la signature" onClick={() => { const v=!signatureEnabled; setSignatureEnabled(v); persist({signatureEnabled:v}); }} className={`h-7 w-12 rounded-full p-1 ${signatureEnabled ? "bg-[#2E5C9E]" : "bg-slate-200"}`}><span className={`block h-5 w-5 rounded-full bg-white transition-transform ${signatureEnabled ? "translate-x-5" : ""}`} /></button>
            </div>
            <textarea value={signature} onChange={(e) => {setSignature(e.target.value); persist({signature:e.target.value});}} rows={3} className="mt-4 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-[#2E5C9E]" />
          </section>

          <section className="rounded-[24px] bg-white p-5 shadow-sm">
            <h2 className="font-heading text-base font-extrabold">WhatsApp Business</h2>
            <p className="mt-1 text-xs text-jobly-gray">Préparation de la candidature WhatsApp V2.</p>
            <input value={whatsapp} onChange={(e)=>{setWhatsapp(e.target.value); persist({whatsapp:e.target.value});}} placeholder="+237 6 XX XX XX XX" className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-[#2E5C9E]" />
            <button disabled className="mt-3 w-full rounded-full bg-slate-100 py-3 text-xs font-black text-slate-400">Activer candidature WhatsApp · Bientôt</button>
            <p className="mt-2 text-[10px] font-semibold text-jobly-gray">{whatsappEnabled ? "Préférences enregistrées." : "L'API payante n'est pas activée dans ce MVP."}</p>
          </section>
        </div>
      </div>
      <BottomNav active="/recruiter/profile" items={RECRUITER_NAV} />
    </main>
  );
}
