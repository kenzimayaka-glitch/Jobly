"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../lib/supabase";
import SubscriptionCard from "./SubscriptionCard";
import JiaPreferences from "./JiaPreferences";
import { useTheme, type ThemeMode } from "./ThemeProvider";

export default function AccountSettings({ ecosystem, backHref, accent = "blue" }: { ecosystem: "TALENT" | "RECRUITER" | "PARTNER"; backHref: string; accent?: "blue" | "yellow" }) {
  const router = useRouter();
  const { mode: themeMode, setThemeMode } = useTheme();
  const [message, setMessage] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [photoPublic, setPhotoPublic] = useState(false);
  const [photoHasImage, setPhotoHasImage] = useState(false);
  const [photoConsentChecked, setPhotoConsentChecked] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [aiBonus, setAiBonus] = useState<{granted:number; remaining:number} | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const session = await getSupabaseClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const preferencesResponse = await fetch("/api/account/preferences", { headers, cache: "no-store" });
      const preferences = preferencesResponse.ok ? await preferencesResponse.json().catch(() => null) : null;
      if (!cancelled && preferences) {
        setNotifications(preferences.notificationsEnabled !== false);
        if (ecosystem === "TALENT") setPrivateProfile(preferences.publicDiscoverable !== true);
      }
      if (ecosystem === "TALENT") {
        const photoResponse = await fetch("/api/auth/profile-photo/visibility", { headers, cache: "no-store" });
        const photo = photoResponse.ok ? await photoResponse.json().catch(() => null) : null;
        if (!cancelled && photo) {
          setPhotoHasImage(photo.hasPhoto === true);
          setPhotoPublic(photo.visibility === "PUBLIC" && photo.publicConsentRecorded === true);
        }
        const response = await fetch("/api/talent/ai-bonus", { headers, cache: "no-store" });
        const body = await response.json().catch(() => null);
        if (!cancelled && response.ok) setAiBonus(body);
      }
    })().catch((error) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : "Impossible de charger les préférences.");
    });
    return () => { cancelled = true; };
  }, [ecosystem]);
  async function getAccessToken() {
    const { data } = await getSupabaseClient().auth.getSession();
    if (!data.session?.access_token) throw new Error("Session Jobly requise.");
    return data.session.access_token;
  }

  async function toggleNotifications() {
    if (notificationsBusy) return;
    setNotificationsBusy(true);
    setMessage("");
    const next = !notifications;
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/account/preferences", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ notificationsEnabled: next }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Impossible d'enregistrer la préférence.");
      setNotifications(body.notificationsEnabled !== false);
      setMessage(next ? "Notifications réactivées." : "Notifications désactivées. Ton historique est conservé.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'enregistrer la préférence.");
    } finally {
      setNotificationsBusy(false);
    }
  }

  async function togglePrivacy() {
    if (privacyBusy || ecosystem !== "TALENT") return;
    setPrivacyBusy(true);
    setMessage("");
    const nextPrivate = !privateProfile;
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/talent/discoverability", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ publicDiscoverable: !nextPrivate }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Impossible de modifier la visibilité.");
      setPrivateProfile(body.publicDiscoverable !== true);
      setMessage(nextPrivate ? "Ton profil Talent est maintenant privé." : "Ton profil Talent peut être découvert par les recruteurs.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de modifier la visibilité.");
    } finally {
      setPrivacyBusy(false);
    }
  }

  async function togglePhotoVisibility() {
    if (photoBusy || ecosystem !== "TALENT" || !photoHasImage) return;
    const visibility = photoPublic ? "PRIVATE" : "PUBLIC";
    if (visibility === "PUBLIC" && !photoConsentChecked) {
      setMessage("Confirmez votre autorisation explicite avant de rendre la photo visible.");
      return;
    }
    setPhotoBusy(true);
    setMessage("");
    try {
      const token = await getAccessToken();
      const response = await fetch("/api/auth/profile-photo/visibility", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ visibility, explicitConsent: visibility === "PUBLIC" }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Impossible de modifier la visibilité de la photo.");
      setPhotoPublic(visibility === "PUBLIC");
      setPhotoConsentChecked(false);
      setMessage(visibility === "PUBLIC"
        ? "Votre photo est maintenant visible publiquement. Vous pouvez retirer ce consentement à tout moment."
        : "Votre photo est redevenue privée.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de modifier la visibilité de la photo.");
    } finally {
      setPhotoBusy(false);
    }
  }

  const bg = accent === "yellow" ? "bg-[#FFE135] text-navy" : "bg-jobly-blue text-white";

  async function logout() {
    setMessage("Déconnexion…");
    const { error } = await getSupabaseClient().auth.signOut({ scope: "local" });
    if (error) { setMessage(error.message || "Déconnexion impossible."); return; }
    localStorage.removeItem("jobly:gmail-connection");
    router.replace("/");
  }

  return <div className="space-y-4">
    <section className="jobly-appearance-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-extrabold">Apparence</h2>
          <p className="mt-1 text-xs leading-5 opacity-75">Choisissez l’ambiance de Jobly sur cet appareil.</p>
        </div>
        <span className="jobly-appearance-mark" aria-hidden="true">✦</span>
      </div>
      <div className="jobly-theme-options mt-4" role="group" aria-label="Thème de l’application">
        {([
          { value: "light", label: "Jour", icon: "☀" },
          { value: "dark", label: "Nuit", icon: "☾" },
          { value: "system", label: "Système", icon: "◐" },
        ] as { value: ThemeMode; label: string; icon: string }[]).map((option) => (
          <button
            key={option.value}
            type="button"
            className="jobly-theme-option"
            data-active={themeMode === option.value}
            aria-pressed={themeMode === option.value}
            onClick={() => setThemeMode(option.value)}
          >
            <span className="text-lg leading-none" aria-hidden="true">{option.icon}</span>
            <span>{option.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 opacity-70">Le mode Système suit automatiquement les préférences d’affichage de votre téléphone ou ordinateur.</p>
    </section>
    <section className="rounded-[24px] bg-white p-5 shadow-sm">
      <h2 className="font-heading text-lg font-extrabold">Préférences</h2>
      <label className="mt-4 flex items-center justify-between gap-4 text-sm font-bold"><span>Notifications Jobly</span><button type="button" role="switch" aria-checked={notifications} disabled={notificationsBusy} onClick={() => void toggleNotifications()} className={`h-7 w-12 rounded-full p-1 ${notifications ? "bg-jobly-blue" : "bg-slate-200"} disabled:opacity-50`}><span className={`block h-5 w-5 rounded-full bg-white transition-transform ${notifications ? "translate-x-5" : ""}`}/></button></label>
      {ecosystem === "TALENT" && <label className="mt-4 flex items-center justify-between gap-4 text-sm font-bold"><span>Profil privé</span><button type="button" role="switch" aria-checked={privateProfile} disabled={privacyBusy} onClick={() => void togglePrivacy()} className={`h-7 w-12 rounded-full p-1 ${privateProfile ? "bg-jobly-blue" : "bg-slate-200"} disabled:opacity-50`}><span className={`block h-5 w-5 rounded-full bg-white transition-transform ${privateProfile ? "translate-x-5" : ""}`}/></button></label>}
      {ecosystem === "TALENT" && photoHasImage && <div className="mt-5 rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div><p className="text-sm font-bold">Visibilité de ma photo</p><p className="mt-1 text-[11px] text-jobly-gray">{photoPublic ? "Photo publique avec consentement enregistré." : "Photo privée : visible uniquement dans votre espace connecté."}</p></div>
          <span className={`rounded-full px-3 py-1 text-[10px] font-black ${photoPublic ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{photoPublic ? "PUBLIQUE" : "PRIVÉE"}</span>
        </div>
        {!photoPublic && <label className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-jobly-gray">
          <input type="checkbox" checked={photoConsentChecked} onChange={(event) => setPhotoConsentChecked(event.target.checked)} className="mt-1"/>
          <span>J’autorise expressément Jobly à afficher ma photo de profil aux recruteurs et aux visiteurs de mon profil public. Je peux retirer cette autorisation à tout moment.</span>
        </label>}
        <button type="button" onClick={() => void togglePhotoVisibility()} disabled={photoBusy || (!photoPublic && !photoConsentChecked)} className="mt-3 w-full rounded-xl bg-jobly-blue px-4 py-3 text-xs font-black text-white disabled:opacity-40">{photoBusy ? "Enregistrement…" : photoPublic ? "Retirer mon consentement et rendre la photo privée" : "Autoriser la publication de ma photo"}</button>
      </div>}
      <p className="mt-3 text-[11px] leading-5 text-jobly-gray">Les notifications sont conservées pendant la désactivation. Le profil privé le retire de la découverte recruteur. La visibilité de la photo est un choix indépendant.</p>
    </section>
    {ecosystem === "TALENT" && aiBonus && <section className="rounded-[24px] border border-[#DCE5F1] bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-4"><div><h2 className="font-heading text-lg font-extrabold">Crédits J’IA</h2><p className="mt-1 text-xs text-jobly-gray">Bonus de bienvenue à usage unique.</p></div><div className="rounded-full bg-[#FFF7C7] px-4 py-2 text-sm font-black text-navy">{aiBonus.remaining} / {aiBonus.granted}</div></div><p className="mt-3 text-xs leading-5 text-jobly-gray">Les crédits consommés correspondent aux actions J’IA. Le bonus de bienvenue n’est pas un abonnement et ne se renouvelle pas.</p></section>}
    <JiaPreferences ecosystem={ecosystem} />
    <SubscriptionCard ecosystem={ecosystem} />
    <section className="rounded-[24px] bg-white p-5 shadow-sm">
      <h2 className="font-heading text-lg font-extrabold">Sécurité & confidentialité</h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2"><button onClick={()=>router.push("/auth/reset-password")} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold">Changer mon mot de passe</button><button onClick={()=>setMessage("Les données sensibles restent gérées par les contrôles d'accès du compte Jobly.")} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-extrabold">Voir mes contrôles</button></div>
    </section>
    <section className="rounded-[24px] border border-red-100 bg-white p-5 shadow-sm">
      <h2 className="font-heading text-lg font-extrabold">Session Jobly</h2><p className="mt-1 text-xs text-jobly-gray">Écosystème actuel : {ecosystem}. La déconnexion ferme la session Jobly.</p>
      <button onClick={logout} className="mt-4 w-full rounded-2xl bg-red-600 py-3 font-black text-white">Se déconnecter de Jobly</button>
      {message && <p className="mt-3 text-xs font-bold text-jobly-gray">{message}</p>}
    </section>
    <button onClick={()=>router.push(backHref)} className={`w-full rounded-2xl py-3.5 font-black ${bg}`}>Retour à mon profil</button>
  </div>;
}
