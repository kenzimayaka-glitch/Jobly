"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "../../lib/supabase";
import { completeSignupProfile, checkUsernameAvailable, validatePassword } from "../../lib/auth";

const DRAFT_KEY = "jobly-signup-draft";

type Draft = { firstName: string; lastName: string; phone: string; country: string };
type CropState = { scale: number; x: number; y: number };

function CameraIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7"><path d="M8.2 5.5 9.4 3.8h5.2l1.2 1.7H19a2 2 0 0 1 2 2v9.1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h3.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>;
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><path d="M2.7 12s3.2-6 9.3-6 9.3 6 9.3 6-3.2 6-9.3 6-9.3-6-9.3-6Z" fill="none" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg> : <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5"><path d="M2.7 12s3.2-6 9.3-6 9.3 6 9.3 6-3.2 6-9.3 6-9.3-6-9.3-6Z" fill="none" stroke="currentColor" strokeWidth="1.7"/><circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>;
}

// Jauge de force du mot de passe — palette "Canari" (identique à celle de la
// page de connexion / inscription rapide app/page.tsx) : la couleur de la
// BARRE change avec le score, pas seulement le libellé.
function computePasswordScore(password: string) {
  if (!password) return 0;
  let score = 0;
  score += (Math.min(password.length, 16) / 16) * 30;
  if (/[a-z]/.test(password)) score += 15;
  if (/[A-Z]/.test(password)) score += 20;
  if (/\d/.test(password)) score += 20;
  if (/[^A-Za-z0-9]/.test(password)) score += 25;
  return Math.min(100, Math.round(score));
}

const PASSWORD_TIERS = [
  { max: 25, label: "Faible", color: "#FF2D2D", accepted: false, hint: "Ajoute des minuscules, majuscules, chiffres et un symbole." },
  { max: 50, label: "Moyen", color: "#FF7900", accepted: false, hint: "Ajoute une majuscule et un symbole pour passer en bleu." },
  { max: 75, label: "Bon", color: "#FFDE00", accepted: true, hint: "Ajoute une majuscule et un symbole pour passer en bleu." },
  { max: 90, label: "Fort", color: "#214BFF", accepted: true, hint: "Encore un petit effort pour un mot de passe excellent." },
  { max: 101, label: "Excellent", color: "gradient", accepted: true, hint: "Mot de passe excellent ✨" },
] as const;

function passwordTier(score: number) {
  return PASSWORD_TIERS.find((tier) => score < tier.max) ?? PASSWORD_TIERS[PASSWORD_TIERS.length - 1];
}

function PasswordStrengthGauge({ password }: { password: string }) {
  const score = computePasswordScore(password);
  const tier = passwordTier(score);
  const isExcellent = tier.label === "Excellent";
  const width = `${Math.max(score, password ? 6 : 0)}%`;
  const background = isExcellent ? "linear-gradient(90deg, #10B981, #8B5CF6)" : tier.color;
  return (
    <div className="mt-2 rounded-2xl bg-[#F7F9FD] px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500">Sécurité du mot de passe</span>
        <span className="text-[10px] font-extrabold" style={{ color: isExcellent ? "#8B5CF6" : tier.color }}>{password ? tier.label : ""}</span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full transition-all duration-200" style={{ width, background }} />
      </div>
      <p className="mt-1.5 text-[9px] leading-[1.25] text-slate-400">{password ? tier.hint : "6 caractères minimum · chiffre · lettre · majuscule · caractère spécial"}</p>
    </div>
  );
}

function Cropper({ src, onCancel, onConfirm }: { src: string; onCancel: () => void; onConfirm: (file: File) => void }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<CropState>({ scale: 1, x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function pointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX - crop.x, y: e.clientY - crop.y };
    setDragging(true);
  }
  function pointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setCrop((c) => ({ ...c, x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y }));
  }
  function pointerUp() { setDragging(false); }

  async function confirm() {
    const image = imageRef.current;
    if (!image) return;
    setBusy(true); setError("");
    try {
      // Filet de sécurité (15/09/2026) : un clic rapide sur "Sélectionner"
      // pouvait survenir avant la fin du chargement de l'<img>, produisant un
      // canvas vide et un blob ignoré silencieusement.
      if (!image.complete || image.naturalWidth === 0) {
        await new Promise<void>((resolve, reject) => {
          const onLoad = () => { cleanup(); resolve(); };
          const onError = () => { cleanup(); reject(new Error("load-failed")); };
          const cleanup = () => { image.removeEventListener("load", onLoad); image.removeEventListener("error", onError); };
          image.addEventListener("load", onLoad, { once: true });
          image.addEventListener("error", onError, { once: true });
        });
      }
      const canvas = document.createElement("canvas");
      canvas.width = 900; canvas.height = 900;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas-unavailable");
      const naturalW = image.naturalWidth;
      const naturalH = image.naturalHeight;
      const base = Math.max(naturalW, naturalH);
      if (!base) throw new Error("empty-image");
      const visibleSize = 220;
      const renderedW = (naturalW / base) * visibleSize * crop.scale;
      const renderedH = (naturalH / base) * visibleSize * crop.scale;
      const sourceScale = 900 / visibleSize;
      const dx = (visibleSize - renderedW) / 2 + crop.x;
      const dy = (visibleSize - renderedH) / 2 + crop.y;
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 900, 900);
      ctx.drawImage(image, dx * sourceScale, dy * sourceScale, renderedW * sourceScale, renderedH * sourceScale);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
      if (!blob) throw new Error("blob-failed");
      onConfirm(Object.assign(blob, { name: "jobly-profile.jpg", lastModified: Date.now() }) as File);
    } catch {
      setError("La photo n'a pas pu être traitée. Réessaie avec une autre image.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1931]/70 px-5 backdrop-blur-sm">
    <div className="w-full max-w-[360px] rounded-[28px] bg-white p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-[#0A1931]">Rogner la photo</h2><p className="text-xs text-slate-400">Déplace la photo puis ajuste le zoom.</p></div><button type="button" onClick={onCancel} className="rounded-full px-3 py-1 text-sm font-bold text-slate-500">Fermer</button></div>
      <div className="mx-auto h-[220px] w-[220px] overflow-hidden rounded-full bg-slate-100 ring-4 ring-[#FFC72C]/35" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}>
        <img ref={imageRef} src={src} alt="Aperçu à rogner" draggable={false} className="pointer-events-none h-full w-full select-none object-contain" style={{ transform: `translate(${crop.x}px, ${crop.y}px) scale(${crop.scale})` }} />
      </div>
      <input aria-label="Zoom de la photo" type="range" min="1" max="2.2" step="0.01" value={crop.scale} onChange={(e) => setCrop((c) => ({ ...c, scale: Number(e.target.value) }))} className="mt-5 w-full accent-[#0D4BE0]" />
      {error && <p className="mt-3 text-center text-xs font-bold text-red-600" role="alert">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="h-12 rounded-2xl border border-slate-200 font-bold text-[#0A1931]">Annuler</button><button type="button" onClick={confirm} disabled={busy} className="h-12 rounded-2xl bg-[#FFD21A] font-extrabold text-[#0A1931] shadow-lg disabled:opacity-60">{busy ? "…" : "Sélectionner"}</button></div>
    </div>
  </div>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({ firstName: "", lastName: "", phone: "", country: "CM" });
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [cropSource, setCropSource] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (!data.session?.user) { router.replace("/"); return; }
      setEmail(data.session.user.email || "");
      try { const raw = window.localStorage.getItem(DRAFT_KEY); if (raw) setDraft({ ...{ firstName: "", lastName: "", phone: "", country: "CM" }, ...JSON.parse(raw) }); } catch {}
      const metadata = data.session.user.user_metadata || {};
      setUsername(typeof metadata.username === "string" ? metadata.username : "");
    })();
    return () => { mounted = false; };
  }, [router]);

  // Vérification en direct de la disponibilité du username — normalisée en
  // trim()+toLowerCase() dans lib/auth.ts, donc "Kenzi", "KENZI" et " kenzi "
  // sont traités comme le même username, majuscules/espaces compris.
  // 15/09/2026 : sur demande, il n'y a plus aucune contrainte de format sur le
  // username (plus de regex lettres/chiffres/3-15 caractères) — la SEULE règle
  // qui reste est l'unicité, vérifiée côté serveur via checkUsernameAvailable().
  useEffect(() => {
    const value = username.trim();
    if (!value) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    const handle = setTimeout(async () => {
      try { setUsernameStatus((await checkUsernameAvailable(value)) ? "available" : "taken"); }
      catch {
        // Un échec ponctuel ne doit pas bloquer silencieusement le coche —
        // on retente une fois avant d'abandonner en "idle".
        try { setUsernameStatus((await checkUsernameAvailable(value)) ? "available" : "taken"); }
        catch { setUsernameStatus("idle"); }
      }
    }, 420);
    return () => clearTimeout(handle);
  }, [username]);

  function choosePhoto(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setMessage("Choisis une image valide.");
    if (file.size > 8 * 1024 * 1024) return setMessage("La photo doit faire au maximum 8 Mo.");
    const url = URL.createObjectURL(file);
    setCropSource(url); setMessage("");
  }

  function acceptCrop(file: File) {
    setPhoto(file); setPreview(URL.createObjectURL(file)); setCropSource("");
  }

  async function submit() {
    if (!draft.firstName.trim() || !draft.lastName.trim() || !draft.phone.trim() || !draft.country) return setMessage("Les informations d'inscription sont introuvables. Reviens à l'inscription et réessaie.");
    if (!email) return setMessage("Adresse e-mail vérifiée introuvable.");
    if (usernameStatus === "taken") return setMessage("Username indisponible");
    if (usernameStatus !== "available") {
      // API check may have failed — retry once before blocking
      try {
        const ok = await checkUsernameAvailable(username.trim());
        if (!ok) return setMessage("Username indisponible. Choisis-en un autre.");
      } catch {
        return setMessage("Impossible de vérifier le username. Vérifie ta connexion et réessaie.");
      }
    }
    const passwordError = validatePassword(password);
    if (passwordError) return setMessage(passwordError);
    if (!privacyAccepted) return setMessage("Tu dois accepter les conditions et la politique de confidentialité.");

    setBusy(true); setMessage("");
    try {
      const supabase = getSupabaseClient();
      // 15/09/2026 : le profil est désormais créé AVANT de définir le mot de
      // passe (et non après). "Session requise après vérification de
      // l'e-mail." réapparaissait car updateUser({ password }) peut faire
      // tourner/invalider côté Supabase le jeton de la session en cours ;
      // le retry-après-refresh ajouté le 14/09/2026 ne suffisait pas quand
      // le refresh token lui-même n'était plus valide. En appelant
      // completeSignupProfile() avec le jeton encore garanti frais (obtenu
      // juste après la vérification de l'e-mail, jamais touché par
      // updateUser), on supprime la dépendance à l'ordre qui causait le bug.
      await completeSignupProfile({ firstName: draft.firstName, lastName: draft.lastName, email, phone: draft.phone, country: draft.country, username: username.trim(), privacyAccepted });
      const { error: updateError } = await supabase.auth.updateUser({ password, data: { first_name: draft.firstName.trim(), last_name: draft.lastName.trim(), username: username.trim() } });
      if (updateError) throw updateError;
      if (photo) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) {
          const form = new FormData(); form.append("photo", photo);
          const response = await fetch("/api/auth/profile-photo", { method: "POST", headers: { Authorization: `Bearer ${sessionData.session.access_token}` }, body: form });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.message || "La photo n'a pas pu être enregistrée.");
        }
      }
      try { window.localStorage.removeItem(DRAFT_KEY); } catch {}
      // Après l'identité créée : parcours "Journey" (5 pages) puis animation
      // J'IA, tous deux déjà présents sur la page d'accueil (app/page.tsx),
      // avant l'arrivée sur le choix d'écosystème.
      router.replace(`/?screen=journey&u=${encodeURIComponent(username.trim())}`);
    } catch (err) { setMessage(err instanceof Error ? err.message : "Impossible de finaliser ton profil."); }
    finally { setBusy(false); }
  }

  return <main className="relative h-[100dvh] w-full overflow-hidden bg-white px-4 text-[#0A1931]">
    <div className="pointer-events-none absolute -left-16 top-16 h-28 w-28 rounded-full bg-[#8B5CF6]/15 blur-xl" />
    <div className="pointer-events-none absolute -right-12 bottom-24 h-36 w-36 rounded-full bg-[#FFC72C]/20 blur-2xl" />
    <section className="relative mx-auto flex h-full w-full max-w-[420px] flex-col pt-5 pb-4">
      <header className="flex shrink-0 items-center justify-between">
        <img src="/jobly-logo-reference.jpg" alt="JOBLY" className="h-auto w-[132px] mix-blend-multiply" />
      </header>

      <div className="mt-2 flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-start justify-between gap-4">
          <div className="pt-2 text-center"><p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#0D4BE0]">Dernière étape</p><h1 className="mt-1 text-[31px] font-extrabold leading-[1.02] tracking-[-0.035em]">Crée ton accès<br/><span className="relative inline-block">JOBLY<span className="absolute -bottom-1 left-0 h-1.5 w-16 rounded-full bg-[#FFD21A]" /></span></h1><p className="mt-6 max-w-[235px] text-[13px] leading-[1.35] text-slate-500">Choisi ton Username et ton Mot de passe pour commencer</p></div>
          <label className="group relative mt-1 block shrink-0 cursor-pointer text-center"><div className="relative grid h-[82px] w-[82px] place-items-center overflow-hidden rounded-full border-[3px] border-[#FFD21A] bg-[#FFF8D8] text-[#0D4BE0] shadow-lg shadow-[#FFD21A]/20">{preview ? <img src={preview} alt="Photo de profil" className="h-full w-full object-cover"/> : <CameraIcon />}<span className="absolute inset-x-0 bottom-0 bg-[#0A1931]/75 py-1 text-[8px] font-extrabold text-white">PHOTO</span></div><span className="mt-1 block text-[10px] font-extrabold text-[#0A1931]">Photo de Profil</span><input type="file" accept="image/*" className="hidden" onChange={(e) => choosePhoto(e.target.files?.[0])}/></label>
        </div>

        <div className="mt-4 shrink-0">
          <label className="block">
            <span className="mb-1 block text-[11px] font-extrabold text-[#0A1931]">Username</span>
            <div className="relative">
              <input
                value={username}
                onChange={(e)=>setUsername(e.target.value.replace(/\s/g, "").slice(0,15))}
                placeholder="ex. Giovanni"
                autoComplete="username"
                aria-invalid={usernameStatus === "taken"}
                className={`h-[47px] w-full rounded-2xl border bg-white px-4 pr-10 text-[14px] font-semibold outline-none shadow-sm focus:ring-2 focus:ring-[#0D4BE0]/10 ${usernameStatus === "taken" ? "border-[#FF2D2D]" : usernameStatus === "available" ? "border-[#FFDE00]" : "border-slate-200 focus:border-[#0D4BE0]"}`}
              />
              {usernameStatus === "available" && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFDE00"><circle cx="12" cy="12" r="12" /><path d="M7 12.5l3 3 7-7" stroke="#0A1931" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              )}
              {usernameStatus === "checking" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400" aria-hidden="true">…</span>}
            </div>
            <p className="mt-1 text-[10px] text-slate-400">Choisi un Username unique</p>
            {usernameStatus === "taken" && <p className="mt-1 text-[11px] font-bold" style={{ color: "#FF2D2D" }} role="alert">Username indisponible</p>}
          </label>
          <label className="mt-2.5 block"><span className="mb-1 block text-[11px] font-extrabold text-[#0A1931]">Mot de passe</span><div className="flex h-[47px] items-center rounded-2xl border border-slate-200 bg-white px-4 shadow-sm focus-within:border-[#0D4BE0] focus-within:ring-2 focus-within:ring-[#0D4BE0]/10"><input type={showPassword ? "text" : "password"} value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Crée un mot de passe sécurisé" autoComplete="new-password" className="w-full bg-transparent text-[14px] font-semibold outline-none"/><button type="button" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={()=>setShowPassword(v=>!v)} className="ml-2 text-slate-400"><EyeIcon open={showPassword}/></button></div></label>
          <PasswordStrengthGauge password={password} />
          <p className="mt-3 text-[10px] leading-[1.35] text-slate-500">En continuant, tu acceptes nos Conditions et Politique de confidentialité.</p>
          <label className="mt-1.5 flex items-start gap-2.5"><input type="checkbox" checked={privacyAccepted} onChange={e=>setPrivacyAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0D4BE0]"/><span className="text-[10px] leading-[1.35] text-slate-500">J'accepte les <a href="/legal/terms" className="font-bold text-[#0D4BE0] underline">Conditions d'utilisation</a> et la <a href="/legal/privacy" className="font-bold text-[#0D4BE0] underline">Politique de confidentialité</a>.</span></label>
        </div>

        <div className="mt-auto shrink-0 pt-3"><button type="button" disabled={busy} onClick={submit} className="h-[52px] w-full rounded-2xl bg-[#FFDE00] text-[15px] font-extrabold text-[#0A1931] shadow-[0_10px_24px_rgba(255,222,0,0.28)] transition-transform active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Création…" : "Commencer →"}</button>{message && <p role="alert" className="mt-2 text-center text-[11px] font-semibold text-red-600">{message}</p>}</div>
      </div>
    </section>
    {cropSource && <Cropper src={cropSource} onCancel={()=>setCropSource("")} onConfirm={acceptCrop}/>} 
  </main>;
}
