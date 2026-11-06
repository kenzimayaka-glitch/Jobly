"use client";

import { useCallback, useEffect, useState } from "react";
import {
  enqueueOfflineOperation,
  getOfflineDocument,
  getOfflineSnapshot,
  getOfflineUserId,
  saveOfflineSnapshot,
  type OfflineSnapshot,
} from "@/lib/offline-store";
import { getSupabaseClient } from "@/lib/supabase";

type Notice = { tone: "success" | "error" | "info"; message: string };

export default function OfflineWorkspacePage() {
  const [snapshot, setSnapshot] = useState<OfflineSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [online, setOnline] = useState(true);
  const [headline, setHeadline] = useState("");
  const [summary, setSummary] = useState("");
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftLocation, setDraftLocation] = useState("");
  const [cvAvailable, setCvAvailable] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadLocal = useCallback(async () => {
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
    try {
      const { data } = await getSupabaseClient().auth.getSession();
      const authUserId = data.session?.user?.id;
      const cached = authUserId ? await getOfflineSnapshot(getOfflineUserId(authUserId ?? undefined), authUserId) : null;
      setSnapshot(cached);
      if (cached && authUserId) setCvAvailable(Boolean(await getOfflineDocument(cached.userId)));
      setHeadline(String(cached?.profile?.headline || ""));
      setSummary(String(cached?.profile?.summary || ""));
    } catch {
      setSnapshot(null);
      setCvAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLocal();
    const onlineHandler = () => { setOnline(true); void loadLocal(); };
    const offlineHandler = () => setOnline(false);
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
    };
  }, [loadLocal]);

  async function saveProfile() {
    if (!snapshot) return;
    const operation = {
      id: crypto.randomUUID(),
      type: "profile.update" as const,
      createdAt: new Date().toISOString(),
      payload: { headline: headline.trim(), summary: summary.trim() },
    };
    try {
      const updated = {
        ...snapshot,
        profile: { ...snapshot.profile, headline: headline.trim(), summary: summary.trim() },
      };
      await saveOfflineSnapshot(updated);
      await enqueueOfflineOperation(snapshot.userId, operation);
      setSnapshot(updated);
      setNotice({ tone: "success", message: online
        ? "Modification enregistrée sur cet appareil. Elle sera synchronisée automatiquement."
        : "Modification sauvegardée localement. Elle sera envoyée au retour d'Internet." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Impossible d'enregistrer la modification." });
    }
  }

  async function saveRecruiterDraft() {
    if (!snapshot) return;
    if (!draftTitle.trim() || !draftDescription.trim()) {
      setNotice({ tone: "error", message: "Le titre et la description de l'offre sont obligatoires." });
      return;
    }
    try {
      await enqueueOfflineOperation(snapshot.userId, {
        id: crypto.randomUUID(),
        type: "recruiter.job-draft",
        createdAt: new Date().toISOString(),
        payload: { title: draftTitle.trim(), description: draftDescription.trim(), location: draftLocation.trim() },
      });
      setNotice({ tone: "success", message: "Brouillon de poste enregistré localement. Il sera créé comme brouillon non publié dès le retour d'Internet." });
      setDraftTitle("");
      setDraftDescription("");
      setDraftLocation("");
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Impossible d'enregistrer le brouillon." });
    }
  }

  async function prepareApplication(jobId: string) {
    if (!snapshot) return;
    try {
      const operation = {
        id: crypto.randomUUID(),
        type: "application.prepare" as const,
        createdAt: new Date().toISOString(),
        payload: { jobId, language: "fr" },
      };
      await enqueueOfflineOperation(snapshot.userId, operation);
      setNotice({ tone: "success", message: "Candidature préparée et enregistrée dans la file de synchronisation. Elle n'a pas été envoyée au recruteur." });
    } catch (error) {
      setNotice({ tone: "error", message: error instanceof Error ? error.message : "Impossible de préparer la candidature." });
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#F5F7FB] px-4 pt-24 text-center text-sm text-slate-600">Chargement de votre espace hors connexion…</main>;
  }

  if (!snapshot) {
    return (
      <main className="min-h-screen bg-[#F5F7FB] px-4 pb-12 pt-24 text-[#0A1931]">
        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <a href="/settings" className="text-sm font-bold text-[#2457B8]">← Paramètres</a>
          <div className="mt-6 grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-2xl">☁️</div>
          <h1 className="mt-4 text-2xl font-black">Votre espace hors connexion</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Aucune copie locale n'est encore disponible sur cet appareil. Lorsque vous avez Internet, ouvrez les paramètres et téléchargez vos données pour préparer l'accès hors connexion.</p>
          <a href="/settings" className="mt-5 inline-flex rounded-2xl bg-[#FFD60A] px-5 py-3 text-sm font-extrabold text-[#0A1931]">Préparer cet appareil</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-4 pb-16 pt-24 text-[#0A1931]">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a href="/dashboard" className="text-sm font-bold text-[#2457B8]">← Retour au tableau de bord</a>
          <span className={`rounded-full px-3 py-1.5 text-xs font-extrabold ${online ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
            {online ? "● En ligne" : "● Hors connexion"}
          </span>
        </div>
        <header className="mt-5 rounded-3xl bg-[#0A1931] p-6 text-white shadow-[0_18px_45px_rgba(10,25,49,.15)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#FFD60A]">JOBLY · OFFLINE-FIRST</p>
          <h1 className="mt-3 text-3xl font-black sm:text-4xl">Continuez, même sans réseau.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">Vos données enregistrées sur cet appareil restent consultables. Les modifications autorisées seront synchronisées dès que la connexion revient.</p>
          <p className="mt-4 text-xs text-white/60">Copie du {new Date(snapshot.generatedAt).toLocaleString("fr-FR")} · Expire le {new Date(snapshot.expiresAt).toLocaleDateString("fr-FR")}</p>
        </header>

        {notice ? (
          <div role="status" className={`mt-4 rounded-2xl border p-3 text-sm font-semibold ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : notice.tone === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-blue-200 bg-blue-50 text-blue-900"}`}>
            {notice.message}
          </div>
        ) : null}

        {cvAvailable && snapshot ? (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black">Votre CV original est disponible hors connexion</h2>
                <p className="mt-1 text-xs text-slate-500">Le PDF est chiffré dans le stockage privé de cet appareil.</p>
              </div>
              <button type="button" onClick={async () => {
                const pdf = await getOfflineDocument(snapshot.userId);
                if (!pdf) return;
                const url = URL.createObjectURL(pdf);
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = String(snapshot.user.cvOriginalFileName || "mon-cv.pdf");
                anchor.click();
                URL.revokeObjectURL(url);
              }} className="rounded-xl bg-[#0A1931] px-4 py-2.5 text-xs font-bold text-white">Ouvrir mon CV</button>
            </div>
          </section>
        ) : null}

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">Votre profil</h2>
            <p className="mt-1 text-xs text-slate-500">Les modifications sont gardées sur cet appareil avant synchronisation.</p>
            <label className="mt-4 block text-xs font-bold text-slate-600">Titre professionnel
              <input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={180} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-blue-500"/>
            </label>
            <label className="mt-3 block text-xs font-bold text-slate-600">Résumé
              <textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={6000} rows={5} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"/>
            </label>
            <button type="button" onClick={saveProfile} className="mt-4 h-11 w-full rounded-xl bg-[#FFD60A] px-4 text-sm font-extrabold text-[#0A1931]">Enregistrer les modifications</button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">Votre espace professionnel</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ["Expériences", snapshot.experiences.length],
                ["Compétences", snapshot.skills.length],
                ["Formations", snapshot.education.length],
                ["Candidatures", snapshot.applications.length],
                ["Offres enregistrées localement", snapshot.offers.length],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl bg-slate-50 p-3">
                  <p className="text-xl font-black">{value}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-500">{label}</p>
                </div>
              ))}
            </div>
            <h3 className="mt-5 text-sm font-extrabold">Déjà dans vos données</h3>
            <div className="mt-2 space-y-2 text-sm text-slate-600">
              {snapshot.experiences.slice(0, 3).map((experience, index) => (
                <div key={String(experience.id || index)} className="rounded-xl border border-slate-100 p-3">
                  <p className="font-bold text-[#0A1931]">{String(experience.title || "Expérience")}</p>
                  <p className="text-xs">{String(experience.company || "")}</p>
                </div>
              ))}
              {snapshot.experiences.length === 0 ? <p className="text-xs text-slate-500">Aucune expérience enregistrée.</p> : null}
            </div>
          </div>
        </section>

        {snapshot.recruiterProfile ? (
          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">Espace recruteur hors connexion</h2>
            <p className="mt-1 text-xs text-slate-500">Vous pouvez préparer des offres. Elles seront créées en brouillon et ne seront jamais publiées automatiquement.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-slate-600">Intitulé du poste
                <input value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} maxLength={180} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/>
              </label>
              <label className="text-xs font-bold text-slate-600">Lieu
                <input value={draftLocation} onChange={(event) => setDraftLocation(event.target.value)} maxLength={180} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"/>
              </label>
            </div>
            <label className="mt-3 block text-xs font-bold text-slate-600">Description
              <textarea value={draftDescription} onChange={(event) => setDraftDescription(event.target.value)} maxLength={12000} rows={5} className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-sm"/>
            </label>
            <button type="button" onClick={() => void saveRecruiterDraft()} className="mt-3 h-11 rounded-xl bg-[#FFD60A] px-5 text-sm font-extrabold text-[#0A1931]">Enregistrer comme brouillon</button>
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-extrabold">Offres de votre compte mises en cache</h3>
              {(snapshot.recruiterJobs || []).slice(0, 20).map((job) => (
                <div key={String(job.id)} className="rounded-xl border border-slate-100 p-3">
                  <p className="text-sm font-bold">{String(job.title)}</p>
                  <p className="text-xs text-slate-500">{String(job.status)} · {String(job.location || "Lieu non précisé")}</p>
                </div>
              ))}
              {(snapshot.recruiterJobs || []).length === 0 ? <p className="text-xs text-slate-500">Aucune offre recruteur enregistrée sur cet appareil.</p> : null}
            </div>
          </section>
        ) : null}

        {snapshot.partnerProfile ? (
          <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">Espace partenaire hors connexion</h2>
            <p className="mt-2 text-sm text-slate-600">Code de parrainage : <strong>{String(snapshot.partnerProfile.referralCode || "—")}</strong></p>
            <p className="mt-1 text-xs text-slate-500">Statut KYC : {String(snapshot.partnerProfile.kycStatus || "Non renseigné")} · {String(snapshot.partnerProfile.partnerType || "Partenaire")}</p>
            <p className="mt-2 text-xs text-slate-500">Les commissions et actions financières restent accessibles uniquement en ligne.</p>
          </section>
        ) : null}

        <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Offres déjà disponibles sur cet appareil</h2>
              <p className="mt-1 text-xs text-slate-500">Préparez une candidature sans réseau ; l'envoi réel reste soumis à une confirmation en ligne.</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-900">{snapshot.offers.length} offres</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {snapshot.offers.slice(0, 50).map((offer) => {
              const company = offer.company && typeof offer.company === "object"
                ? offer.company as Record<string, unknown>
                : null;
              return (
                <article key={String(offer.id)} className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="font-extrabold">{String(offer.title || "Offre Jobly")}</h3>
                  <p className="mt-1 text-xs text-slate-500">{String(company?.name || "Entreprise non précisée")} · {String(offer.location || "Afrique")}</p>
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-600">{String(offer.description || "")}</p>
                  <button type="button" onClick={() => void prepareApplication(String(offer.id))} disabled={offer.applicationReady !== true} className="mt-3 rounded-xl bg-[#0A1931] px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Préparer ma candidature</button>
                </article>
              );
            })}
            {snapshot.offers.length === 0 ? <p className="text-sm text-slate-500">Aucune offre n'a été téléchargée. Revenez dans les paramètres lorsque vous serez en ligne.</p> : null}
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-950">
          **Certaines fonctions exigent Internet :** connexion à un nouveau compte, offres en direct, cerveau Internet de J’IA, envoi définitif d'une candidature, paiements, vidéo en direct et actions recruteur. Les données locales expirent après 7 jours et doivent être actualisées en ligne.
        </section>
      </div>
    </main>
  );
}
