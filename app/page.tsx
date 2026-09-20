"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  loginWithUsernamePassword,
  requestEmailOtp,
  verifyEmailOtp,
  signInWithGoogle,
  completeSignupProfile,
  requestPasswordReset,
  validatePassword,
  checkUsernameAvailable,
} from "../lib/auth";
import { setRememberMe, getSupabaseClient } from "../lib/supabase";
import BubbleField from "../components/BubbleField";
import JoblyLogo from "../components/JoblyLogo";
import WaterScene from "../components/WaterScene";
import {
  GoogleIcon,
  PhoneIcon,
  ShieldStarIcon,
  PeopleStarIcon,
  CheckCircleIcon,
  SparkleIcon,
} from "../components/AuthIcons";

// Petit "plouf" d'eau douce, synthétisé (pas de fichier audio à charger) :
// un souffle de bruit filtré passe-bas + un léger "pitch drop" sinusoïdal,
// le tout très bas en volume pour rester discret et agréable.
function playDropletSplashSound() {
  if (typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx: AudioContext = new Ctx();
    const now = ctx.currentTime;

    // Corps du "plouf" : sinus qui plonge rapidement en fréquence.
    const tone = ctx.createOscillator();
    tone.type = "sine";
    tone.frequency.setValueAtTime(520, now);
    tone.frequency.exponentialRampToValueAtTime(120, now + 0.22);
    const toneGain = ctx.createGain();
    toneGain.gain.setValueAtTime(0.0001, now);
    toneGain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    tone.connect(toneGain).connect(ctx.destination);

    // Voile d'eau : bruit blanc court, filtré très doux (passe-bas).
    const bufferSize = Math.floor(ctx.sampleRate * 0.28);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.value = 900;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.05, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    noise.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);

    tone.start(now);
    tone.stop(now + 0.34);
    noise.start(now);
    noise.stop(now + 0.3);
    setTimeout(() => ctx.close().catch(() => {}), 600);
  } catch {
    // Silencieux si l'audio est bloqué par le navigateur : l'animation
    // visuelle reste complète sans le son.
  }
}

type Screen = "welcome" | "login" | "signup" | "signup-otp" | "signup-password" | "journey" | "jia-welcome" | "forgot" | "reset-sent";
type Language = "fr" | "en";
type CropState = { scale: number; x: number; y: number };

const COUNTRY_CODES = [
  ["AI","+1"],["AQ","+672"],["BL","+590"],["BV","+47"],["CC","+61"],["CK","+682"],["CX","+61"],["GG","+44"],["GS","+500"],["HM","+672"],["IO","+246"],["MF","+590"],["PN","+64"],["SJ","+47"],["TF","+262"],["YT","+262"],
  ["AF","+93"],["AL","+355"],["DZ","+213"],["AD","+376"],["AO","+244"],["AG","+1"],["AR","+54"],["AM","+374"],["AU","+61"],["AT","+43"],["AZ","+994"],["BS","+1"],["BH","+973"],["BD","+880"],["BB","+1"],["BY","+375"],["BE","+32"],["BZ","+501"],["BJ","+229"],["BT","+975"],["BO","+591"],["BA","+387"],["BW","+267"],["BR","+55"],["BN","+673"],["BG","+359"],["BF","+226"],["BI","+257"],["CV","+238"],["KH","+855"],["CM","+237"],["CA","+1"],["CF","+236"],["TD","+235"],["CL","+56"],["CN","+86"],["CO","+57"],["KM","+269"],["CG","+242"],["CD","+243"],["CR","+506"],["CI","+225"],["HR","+385"],["CU","+53"],["CY","+357"],["CZ","+420"],["DK","+45"],["DJ","+253"],["DM","+1"],["DO","+1"],["EC","+593"],["EG","+20"],["SV","+503"],["GQ","+240"],["ER","+291"],["EE","+372"],["SZ","+268"],["ET","+251"],["FJ","+679"],["FI","+358"],["FR","+33"],["GA","+241"],["GM","+220"],["GE","+995"],["DE","+49"],["GH","+233"],["GR","+30"],["GD","+1"],["GT","+502"],["GN","+224"],["GW","+245"],["GY","+592"],["HT","+509"],["HN","+504"],["HU","+36"],["IS","+354"],["IN","+91"],["ID","+62"],["IR","+98"],["IQ","+964"],["IE","+353"],["IL","+972"],["IT","+39"],["JM","+1"],["JP","+81"],["JO","+962"],["KZ","+7"],["KE","+254"],["KI","+686"],["KP","+850"],["KR","+82"],["KW","+965"],["KG","+996"],["LA","+856"],["LV","+371"],["LB","+961"],["LS","+266"],["LR","+231"],["LY","+218"],["LI","+423"],["LT","+370"],["LU","+352"],["MG","+261"],["MW","+265"],["MY","+60"],["MV","+960"],["ML","+223"],["MT","+356"],["MH","+692"],["MR","+222"],["MU","+230"],["MX","+52"],["FM","+691"],["MD","+373"],["MC","+377"],["MN","+976"],["ME","+382"],["MA","+212"],["MZ","+258"],["MM","+95"],["NA","+264"],["NR","+674"],["NP","+977"],["NL","+31"],["NZ","+64"],["NI","+505"],["NE","+227"],["NG","+234"],["MK","+389"],["NO","+47"],["OM","+968"],["PK","+92"],["PW","+680"],["PS","+970"],["PA","+507"],["PG","+675"],["PY","+595"],["PE","+51"],["PH","+63"],["PL","+48"],["PT","+351"],["QA","+974"],["RO","+40"],["RU","+7"],["RW","+250"],["KN","+1"],["LC","+1"],["VC","+1"],["WS","+685"],["SM","+378"],["ST","+239"],["SA","+966"],["SN","+221"],["RS","+381"],["SC","+248"],["SL","+232"],["SG","+65"],["SK","+421"],["SI","+386"],["SB","+677"],["SO","+252"],["ZA","+27"],["SS","+211"],["ES","+34"],["LK","+94"],["SD","+249"],["SR","+597"],["SE","+46"],["CH","+41"],["SY","+963"],["TW","+886"],["TJ","+992"],["TZ","+255"],["TH","+66"],["TL","+670"],["TG","+228"],["TO","+676"],["TT","+1"],["TN","+216"],["TR","+90"],["TM","+993"],["TV","+688"],["UG","+256"],["UA","+380"],["AE","+971"],["GB","+44"],["US","+1"],["UY","+598"],["UZ","+998"],["VU","+678"],["VA","+39"],["VE","+58"],["VN","+84"],["YE","+967"],["ZM","+260"],["ZW","+263"],["AX","+358"],["AS","+1"],["AW","+297"],["BM","+1"],["BQ","+599"],["VG","+1"],["KY","+1"],["CW","+599"],["FK","+500"],["FO","+298"],["GF","+594"],["PF","+689"],["GI","+350"],["GL","+299"],["GP","+590"],["GU","+1"],["HK","+852"],["IM","+44"],["JE","+44"],["MO","+853"],["MQ","+596"],["MS","+1"],["NC","+687"],["NU","+683"],["NF","+672"],["MP","+1"],["PR","+1"],["RE","+262"],["SH","+290"],["SX","+1"],["PM","+508"],["TC","+1"],["TK","+690"],["VI","+1"],["UM","+1"],["WF","+681"],["EH","+212"]
] as const;

type Country = { code: string; dialCode: string; name: string; flag: string };

function countryFlag(code: string) {
  return code.toUpperCase().replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function getCountryName(code: string) {
  try {
    return new Intl.DisplayNames(["fr"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

const COUNTRIES: Country[] = COUNTRY_CODES.map(([code, dialCode]) => ({
  code, dialCode, name: getCountryName(code), flag: countryFlag(code),
})).sort((a, b) => a.name.localeCompare(b.name, "fr"));

function formatPhoneDisplay(digits: string, countryCode: string) {
  if (countryCode !== "CM") return digits;
  const clean = digits.slice(0, 9);
  const groups = [clean.slice(0, 1), clean.slice(1, 3), clean.slice(3, 5), clean.slice(5, 7), clean.slice(7, 9)].filter(Boolean);
  return groups.join(" ");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2.5 12s3.3-6 9.5-6 9.5 6 9.5 6-3.3 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></svg>
  ) : (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.9A9.7 9.7 0 0 1 12 5.8c6.2 0 9.5 6.2 9.5 6.2a16.2 16.2 0 0 1-3.1 3.8M6.3 6.8C3.9 8.5 2.5 12 2.5 12s3.3 6.2 9.5 6.2c1.1 0 2.1-.2 3-.5"/><path d="M9.7 9.7a3.2 3.2 0 0 0 4.6 4.6"/></svg>
  );
}

function CameraIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7"><path d="M8.2 5.5 9.4 3.8h5.2l1.2 1.7H19a2 2 0 0 1 2 2v9.1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7.5a2 2 0 0 1 2-2h3.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg>;
}

function CountryPicker({ country, onChange, placeholder }: { country: Country; onChange: (country: Country) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((item) => `${item.name} ${item.dialCode} ${item.code}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="relative shrink-0">
      <button type="button" aria-label="Choisir le pays" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="flex h-10 items-center gap-1.5 rounded-xl px-1.5 text-navy hover:bg-slate-50">
        <span className="text-[20px] leading-none">{country.flag}</span>
        <span className="text-[14px] font-extrabold">{country.dialCode}</span>
        <span className="text-[11px] text-slate-400">⌄</span>
      </button>
      {open && (
        <div className="absolute left-0 top-[46px] z-50 w-[300px] max-w-[calc(100vw-78px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(10,42,94,0.18)]">
          <div className="border-b border-slate-100 p-2">
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="h-9 w-full rounded-xl bg-slate-50 px-3 text-[13px] outline-none" />
          </div>
          <div className="max-h-[260px] overflow-y-auto overscroll-contain p-1">
            {filtered.map((item) => (
              <button key={`${item.code}-${item.dialCode}`} type="button" onClick={() => { onChange(item); setOpen(false); setQuery(""); }} className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-slate-50">
                <span className="w-7 text-[19px]">{item.flag}</span><span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-navy">{item.name}</span><span className="text-[12px] font-bold text-slate-500">{item.dialCode}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



const translations = {
  fr: {
    title: "Votre avenir\ncommence ici",
    subtitle: "Rejoignez des milliers de talents et obtenez votre emploi idéal en quelques clics. CV, opportunités, coaching — tout est prêt pour vous.",
    google: "Continuer avec Google",
    conditions: "En continuant, vous acceptez nos Conditions et Politique de confidentialité",
    create: "Créer mon compte",
    login: "Se connecter",
    loginTitle: "Connexion",
    loginSubtitle: "Entrez votre Username et votre Mot de passe",
    username: "Username",
    password: "Mot de passe",
    forgot: "Mot de passe oublié ?",
    noAccount: "Pas encore de compte ?",
    signupTitle: "Crée ton compte",
    signupSubtitle: "Veuillez remplir vos informations d’identification.",
    lastName: "Nom",
    firstName: "Prénom",
    phone: "Numéro de téléphone",
    email: "Adresse e-mail",
    continue: "Continuer →",
    verifyTitle: "Vérifie ton e-mail",
    verifyText: "Un code à 6 chiffres a été envoyé à",
    verify: "Vérifier le code →",
    resend: "Renvoyer le code",
    finalTitle: "Crée ton accès JOBLY",
    finalSubtitle: "Choisi ton Username et ton Mot de passe pour commencer",
    exampleUsername: "Exemple : BITSEKI MAYAKA →",
    uniqueUsername: "Le username doit être unique.",
    usernameFormatHint: "Choisi un Username unique",
    usernameTaken: "Username indisponible",
    usernameChecking: "Vérification…",
    accept: "J'accepte les Conditions d'utilisation et la Politique de confidentialité.",
    signup: "Commencer →",
    forgotTitle: "Mot de passe oublié ?",
    forgotText: "Entre l'adresse e-mail associée à ton compte. JOBLY t'enverra un lien sécurisé pour créer un nouveau mot de passe.",
    reset: "Réinitialiser par e-mail →",
    sentTitle: "E-mail envoyé",
    sentText: "Vérifie ta boîte e-mail et suis le lien sécurisé pour définir ton nouveau mot de passe.",
    backLogin: "Retour à la connexion",
    back: "← Retour",
    or: "ou",
    terms: "Conditions d'utilisation",
    privacy: "Politique de confidentialité",
    phoneNote: "Ton téléphone est enregistré dans ton profil, mais il n'est pas utilisé pour la connexion.",
    countrySearch: "Rechercher un pays",
    codePlaceholder: "Code à 6 chiffres",
    madeWith: "Conçu avec",
    by: "par MAYAKA",
  },
  en: {
    title: "Your future\nstarts here",
    subtitle: "Join thousands of talents and get your ideal job in just a few clicks. CV, opportunities, coaching — everything is ready for you.",
    google: "Continue with Google",
    conditions: "By continuing, you agree to our Terms and Privacy Policy",
    create: "Create my account",
    login: "Sign in",
    loginTitle: "Sign in",
    loginSubtitle: "Username + password",
    username: "Username",
    password: "Password",
    forgot: "Forgot password?",
    noAccount: "Don't have an account?",
    signupTitle: "Create your account",
    signupSubtitle: "Please fill in your identification information.",
    lastName: "Last name",
    firstName: "First name",
    phone: "Phone number",
    email: "Email address",
    continue: "Continue →",
    verifyTitle: "Verify your email",
    verifyText: "A 6-digit code was sent to",
    verify: "Verify code →",
    resend: "Resend code",
    finalTitle: "Create Your Jobly Identity",
    finalSubtitle: "Choose a strong username and password to secure your JOBLY account.",
    exampleUsername: "Example: BITSEKI MAYAKA →",
    uniqueUsername: "The username must be unique.",
    usernameFormatHint: "Choose a unique Username",
    usernameTaken: "Username unavailable",
    usernameChecking: "Checking…",
    accept: "I accept the Terms of Use and Privacy Policy.",
    signup: "Get started →",
    forgotTitle: "Forgot password?",
    forgotText: "Enter the email address associated with your account. JOBLY will send you a secure link to create a new password.",
    reset: "Reset by email →",
    sentTitle: "Email sent",
    sentText: "Check your inbox and follow the secure link to set a new password.",
    backLogin: "Back to sign in",
    back: "← Back",
    or: "or",
    terms: "Terms of Use",
    privacy: "Privacy Policy",
    phoneNote: "Your phone is saved in your profile, but it is not used to sign in.",
    countrySearch: "Search a country",
    codePlaceholder: "6-digit code",
    madeWith: "Made with",
    by: "by MAYAKA",
  },
} as const;

const BENEFITS = {
  fr: [
    { Icon: ShieldStarIcon, title: "100% gratuit", subtitle: "Accès à un univers de possibilités" },
    { Icon: PeopleStarIcon, title: "J'IA matche sur-mesure", subtitle: "Ne cherche plus, choisis" },
    { Icon: CheckCircleIcon, title: "J'IA postule à ta place", subtitle: "50 offres, un clic, zéro effort" },
    { Icon: SparkleIcon, title: "Assistance mobilité", subtitle: "Fini les frictions du premier mois" },
  ],
  en: [
    { Icon: ShieldStarIcon, title: "100% Free", subtitle: "Access a universe of possibilities" },
    { Icon: PeopleStarIcon, title: "J'IA matches for you", subtitle: "Stop searching, start choosing" },
    { Icon: CheckCircleIcon, title: "J'IA applies for you", subtitle: "50 jobs, one click, zero effort" },
    { Icon: SparkleIcon, title: "Mobility assistance", subtitle: "No more first-month friction" },
  ],
} as const;

function PasswordRules({ password }: { password: string }) {
  const rules = [
    ["6 caractères minimum", password.length >= 6],
    ["Une minuscule", /[a-z]/.test(password)],
    ["Une majuscule", /[A-Z]/.test(password)],
    ["Un chiffre", /\d/.test(password)],
    ["Un caractère spécial", /[^A-Za-z0-9]/.test(password)],
  ] as const;
  return <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500">{rules.map(([label, ok]) => <span key={label} className={ok ? "font-bold text-emerald-600" : ""}>{ok ? "✓" : "○"} {label}</span>)}</div>;
}

// Jauge de force du mot de passe — palette "Canari" demandée par le CEO
// (14/09/2026). Le score (0-100) détermine à la fois la couleur de la barre
// et si le mot de passe est accepté : en dessous de 50 (Faible/Moyen), le
// bouton "Commencer" reste désactivé.
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
  const barStyle = isExcellent
    ? { width: `${score}%`, background: "linear-gradient(90deg, #10B981, #8B5CF6)" }
    : { width: `${Math.max(score, password ? 6 : 0)}%`, background: tier.color };
  return (
    <div className="mb-1">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className="h-full rounded-full"
          style={barStyle}
          initial={false}
          animate={{ width: barStyle.width }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className="font-bold" style={{ color: isExcellent ? "#8B5CF6" : tier.color }}>
          {password ? tier.label : ""}
          {isExcellent && <motion.span className="ml-1 inline-block" animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }} transition={{ duration: 1.1, repeat: Infinity }} aria-hidden="true">✨</motion.span>}
        </span>
        {password && <span className="text-slate-400">{tier.hint}</span>}
      </div>
    </div>
  );
}

// Rognage de photo de profil — même logique que app/onboarding/page.tsx
// (déplacement + zoom sur canvas 900x900) pour un comportement identique
// entre les deux parcours d'inscription.
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
      // Filet de sécurité (15/09/2026) : sur certains mobiles, un clic rapide
      // sur "Sélectionner" pouvait survenir avant la fin du chargement de
      // l'<img> (naturalWidth/naturalHeight encore à 0), ce qui produisait un
      // canvas vide et un blob silencieusement ignoré — "le clic ne prenait
      // pas". On attend explicitement la fin du chargement avant de rogner.
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

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/70 px-5 backdrop-blur-sm">
    <div className="w-full max-w-[360px] rounded-2xl bg-white p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-navy">Rogner la photo</h2><p className="text-xs text-slate-400">Déplace la photo puis ajuste le zoom.</p></div><button type="button" onClick={onCancel} className="rounded-full px-3 py-1 text-sm font-bold text-slate-500">Fermer</button></div>
      <div className="mx-auto h-[220px] w-[220px] overflow-hidden rounded-full bg-slate-100 ring-4 ring-[#FFDE00]/35" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}>
        <img ref={imageRef} src={src} alt="Aperçu à rogner" draggable={false} className="pointer-events-none h-full w-full select-none object-contain" style={{ transform: `translate(${crop.x}px, ${crop.y}px) scale(${crop.scale})` }} />
      </div>
      <input aria-label="Zoom de la photo" type="range" min="1" max="2.2" step="0.01" value={crop.scale} onChange={(e) => setCrop((c) => ({ ...c, scale: Number(e.target.value) }))} className="mt-5 w-full accent-[#FFDE00]" />
      {error && <p className="mt-3 text-center text-xs font-bold text-red-600" role="alert">{error}</p>}
      <div className="mt-4 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="h-12 rounded-2xl border border-slate-200 font-bold text-navy">Annuler</button><button type="button" onClick={confirm} disabled={busy} className="h-12 rounded-2xl bg-[#FFDE00] font-extrabold text-black shadow-lg disabled:opacity-60">{busy ? "…" : "Sélectionner"}</button></div>
    </div>
  </div>;
}

// 5 pages "journey" après la création de l'identité — inspiré Duolingo/TikTok :
// on montre la valeur de l'app avant de demander quoi que ce soit d'autre.
const JOURNEY_SLIDES = [
  { emoji: "💼", tint: "#EAF2FF", accent: "#2E5C9E", title: "1500+ offres vérifiées près de toi", subtitle: "De vraies opportunités, en temps réel." },
  { emoji: "🧠", tint: "#F0E9FF", accent: "#8B5CF6", title: "J'IA corrige ton CV en 10s", subtitle: "J'IA relit, corrige et améliore ton profil." },
  { emoji: "📄", tint: "#E8F5E9", accent: "#10B981", title: "Un CV qui passe les robots recruteurs", subtitle: "Optimisé pour être vu, pas juste envoyé." },
  { emoji: "🎯", tint: "#FFF3E8", accent: "#FFC72C", title: "Ne postule plus au hasard", subtitle: "Un score de matching te dit où tu as vraiment ta chance." },
  { emoji: "🌍", tint: "#EAF2FF", accent: "#0A1931", title: "Entreprise, Candidat, Freelance… Choisis ton monde", subtitle: "J'IA s'adapte à qui tu es aujourd'hui." },
] as const;

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [cropSource, setCropSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [lang, setLang] = useState<"fr" | "en">("fr");
  const [country, setCountry] = useState<Country>(() => COUNTRIES.find((item) => item.code === "CM") || COUNTRIES[0]);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [journeyIndex, setJourneyIndex] = useState(0);
  const journeyPointerRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const [jiaLine, setJiaLine] = useState(0);
  const [dropLanded, setDropLanded] = useState(false);
  const logoRef = useRef<HTMLDivElement>(null);
  const heartTargetRef = useRef<HTMLSpanElement>(null);
  const [heartPath, setHeartPath] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [rememberMe, setRememberMeState] = useState(false);

  // Piège "retour" DÉFINITIF (15/09/2026) : la version du 14/09 encodait bien
  // l'écran dans history.state, mais elle ne posait qu'UNE seule entrée de
  // "socle" (replaceState sur l'entrée de chargement de page elle-même).
  // Sur certains WebView Android en mode PWA installée (display:standalone),
  // cette entrée de socle peut être confondue avec l'entrée "hors app" par le
  // système, et la touche retour matérielle ferme alors l'app dès le premier
  // appui sur un écran comme "login". On rend le piège hermétique : (1) on
  // EMPILE (pushState, jamais replaceState) une entrée de garde dédiée
  // au-dessus de l'entrée de chargement, donc il y a toujours au moins un
  // niveau "à nous" ; (2) si jamais le popstate remonte quand même jusqu'à
  // une entrée qui ne nous appartient pas (state.jobly absent/faux — donc
  // qu'on est retombé sur l'entrée d'avant l'app), on ré-empile
  // IMMÉDIATEMENT une nouvelle entrée de garde et on réaffiche "welcome" au
  // lieu de laisser le navigateur/l'app se fermer. Résultat : peu importe le
  // nombre d'appuis sur retour, l'app ne se ferme jamais toute seule ; elle
  // retombe toujours sur l'écran d'accueil en dernier recours.
  useEffect(() => {
    try {
      if (!(window.history.state && window.history.state.jobly)) {
        window.history.pushState({ jobly: true, screen: "welcome", joblyGuard: true }, "", window.location.href);
      }
    } catch {}
  }, []);

  // Restauration après actualisation (15/09/2026) : un F5/rechargement de
  // page réinitialise systématiquement le state React à "welcome", alors que
  // window.history.state garde en mémoire l'écran réel où l'utilisateur se
  // trouvait (voir goTo ci-dessous). On restaure les écrans qui ne dépendent
  // que de champs déjà persistés (nom/prénom/téléphone dans le brouillon
  // localStorage) directement ; pour l'écran "Crée tes accès Jobly", qui
  // suppose un e-mail déjà vérifié par OTP, on vérifie qu'une session
  // Supabase active existe avant de restaurer — sinon on retombe sur la
  // connexion plutôt que de laisser l'écran s'afficher à moitié vide.
  useEffect(() => {
    try {
      const state = window.history.state as { jobly?: boolean; screen?: Screen } | null;
      const restored = state?.jobly ? state.screen : undefined;
      if (!restored || restored === "welcome") return;
      const restoreDraft = () => {
        try {
          const raw = window.localStorage.getItem("jobly-signup-draft");
          if (!raw) return;
          const d = JSON.parse(raw);
          if (d.firstName) setFirstName(d.firstName);
          if (d.lastName) setLastName(d.lastName);
          if (d.phone) setPhone(d.phone);
        } catch {}
      };
      const SAFE_SCREENS: Screen[] = ["login", "signup", "forgot", "reset-sent"];
      if (SAFE_SCREENS.includes(restored)) {
        restoreDraft();
        setScreen(restored);
        return;
      }
      if (restored === "signup-otp" || restored === "signup-password") {
        (async () => {
          const { data } = await getSupabaseClient().auth.getSession();
          if (data.session?.user?.email) {
            setEmail(data.session.user.email);
            restoreDraft();
            setScreen("signup-password");
          } else {
            setScreen("login");
          }
        })();
      }
    } catch {}
  }, []);

  function goTo(next: Screen) {
    try { window.history.pushState({ jobly: true, screen: next }, "", window.location.href); } catch {}
    setScreen(next);
  }

  // Navigation "arrière" (bouton retour intégré) : on délègue à history.back() pour
  // que ce soit le MÊME code (le listener popstate ci-dessous) qui restaure l'écran
  // précédent, que le déclencheur soit ce bouton ou la touche retour native.
  function goBack() {
    try { window.history.back(); } catch { setScreen("welcome"); }
  }

  // Touche retour du téléphone / navigateur : restaure l'écran encodé dans
  // l'entrée d'historique visée. Si l'entrée visée n'appartient pas à l'app
  // (on est remonté au-delà de notre garde), on ré-arme immédiatement une
  // nouvelle garde par-dessus et on retombe sur "welcome" — l'app ne se
  // décharge jamais.
  useEffect(() => {
    function onPopState(event: PopStateEvent) {
      const state = event.state as { jobly?: boolean; screen?: Screen } | null;
      if (!state || !state.jobly) {
        try { window.history.pushState({ jobly: true, screen: "welcome", joblyGuard: true }, "", window.location.href); } catch {}
        setScreen("welcome");
        return;
      }
      setScreen(state.screen || "welcome");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Mode nuit — bascule manuelle, indépendante des préférences système,
  // mémorisée pour les prochaines visites.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("jobly-theme");
      if (saved === "dark") setDarkMode(true);
    } catch {}
  }, []);
  useEffect(() => {
    try { document.documentElement.classList.toggle("dark", darkMode); } catch {}
  }, [darkMode]);
  function toggleDarkMode() {
    setDarkMode((v) => { const next = !v; try { window.localStorage.setItem("jobly-theme", next ? "dark" : "light"); } catch {}; return next; });
  }

  // Arrivée depuis /onboarding après création de l'identité : on saute
  // directement sur le parcours "Journey" + animation J'IA avec le username
  // fraîchement choisi, sans repasser par l'écran d'accueil.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("screen") === "journey") {
        const u = params.get("u");
        if (u) setUsername(u);
        setJourneyIndex(0);
        setScreen("journey");
        window.history.replaceState({ jobly: true, screen: "journey" }, "", "/");
      }
    } catch {}
  }, []);

  // 15/09/2026 : un numéro tapé avec le 0 initial ("0681972237", habitude
  // fréquente) était rejeté car le 0 n'appartient pas au numéro E.164 — on le
  // retire avant validation, comme le font la plupart des apps de téléphonie.
  const rawPhoneDigits = phone.replace(/\D/g, "");
  const phoneDigits = rawPhoneDigits.length > 1 && rawPhoneDigits.startsWith("0") ? rawPhoneDigits.slice(1) : rawPhoneDigits;
  const phoneE164 = `${country.dialCode}${phoneDigits}`;
  const validPhone = country.code === "CM" ? /^6\d{8}$/.test(phoneDigits) : phoneDigits.length >= 6 && phoneDigits.length <= 15;
  const validUsername = /^[A-Za-z0-9._]{3,15}$/.test(username.trim());
  const passwordError = validatePassword(password);

  useEffect(() => { try { const saved = window.localStorage.getItem("jobly-lang") as "fr" | "en" | null; if (saved === "fr" || saved === "en") setLang(saved); } catch {} }, []);

  // Vérification en direct de la disponibilité du username (débouncée) — le
  // système normalise déjà en trim()+toLowerCase() côté lib/auth.ts, donc
  // "Kenzi", "KENZI" et " kenzi " sont traités comme un seul et même username.
  // 15/09/2026 : même règle que app/onboarding/page.tsx — seule l'unicité du
  // username compte désormais, plus de contrainte de format.
  useEffect(() => {
    if (screen !== "signup-password") return;
    const value = username.trim();
    if (!value) { setUsernameStatus("idle"); return; }
    setUsernameStatus("checking");
    const handle = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(value);
        setUsernameStatus(available ? "available" : "taken");
      } catch {
        // Un échec réseau/API ponctuel ne doit pas bloquer silencieusement le
        // coche canari : on retente une fois avant d'abandonner en "idle".
        try {
          const available = await checkUsernameAvailable(value);
          setUsernameStatus(available ? "available" : "taken");
        } catch { setUsernameStatus("idle"); }
      }
    }, 420);
    return () => clearTimeout(handle);
  }, [username, screen]);

  // Animation J'IA (6s) : une goutte tombe du haut, se dépose en douceur sur
  // une flaque (clapotis + petit son d'eau synthétisé), la bulle J'IA éclot
  // à cet endroit, puis les phrases s'affichent l'une après l'autre avant
  // d'enchaîner automatiquement vers le choix d'écosystème.
  useEffect(() => {
    if (screen !== "jia-welcome") return;
    setJiaLine(0);
    setDropLanded(true);
    const tImpact = setTimeout(() => playDropletSplashSound(), 1100);
    const t1 = setTimeout(() => setJiaLine(1), 2400);
    const t2 = setTimeout(() => setJiaLine(2), 3800);
    const t4 = setTimeout(() => { window.location.assign("/ecosystem"); }, 6000);
    return () => { clearTimeout(tImpact); clearTimeout(t1); clearTimeout(t2); clearTimeout(t4); };
  }, [screen]);
  useEffect(() => {
    if (screen !== "welcome") return;
    const measureHeartPath = () => {
      const logo = logoRef.current;
      const target = heartTargetRef.current;
      if (!logo || !target) return;
      const logoRect = logo.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      setHeartPath({
        startX: logoRect.left + logoRect.width - 18,
        startY: logoRect.top + logoRect.height * 0.42,
        endX: targetRect.left + targetRect.width / 2 - 9,
        endY: targetRect.top + targetRect.height / 2 - 9,
      });
    };
    const frame = window.requestAnimationFrame(measureHeartPath);
    window.addEventListener("resize", measureHeartPath);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", measureHeartPath); };
  }, [screen, lang]);
  const reset = () => { setMessage(""); setBusy(false); setResendBusy(false); setOtp(""); };

  // Filet de sécurité (14/09/2026) : si l'utilisateur clique quand même sur un
  // lien reçu par e-mail (au lieu de saisir le code sur cet écran), Supabase
  // ouvre /auth/callback dans un NOUVEL onglet et y crée la session. Comme ce
  // nouvel onglet écrit dans localStorage, le navigateur émet un évènement
  // "storage" que ce premier onglet (resté figé sur signup-otp) peut capter
  // via onAuthStateChange. On ne bloque donc plus sur la saisie du code : dès
  // qu'une session valide pour le même e-mail apparaît, on avance tout seul.
  useEffect(() => {
    if (screen !== "signup-otp") return;
    const supabase = getSupabaseClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionEmail = session?.user?.email?.trim().toLowerCase();
      if (sessionEmail && sessionEmail === email.trim().toLowerCase()) {
        goTo("signup-password");
        setMessage("E-mail vérifié (lien ouvert dans un autre onglet). Choisis maintenant ton username et ton mot de passe.");
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [screen, email]);

  async function google() { setBusy(true); setMessage(""); try { await signInWithGoogle(); } catch (e) { setMessage(e instanceof Error ? e.message : "Connexion Google impossible."); setBusy(false); } }
  async function login() { if (!validUsername) return setMessage("Entre un username valide (3 à 15 caractères)."); if (passwordError) return setMessage(passwordError); setBusy(true); setMessage(""); try { setRememberMe(rememberMe); await loginWithUsernamePassword(username, password); const afterLogin = window.sessionStorage.getItem("jobly:after-login"); if (afterLogin) { window.sessionStorage.removeItem("jobly:after-login"); window.location.assign(afterLogin); } else { window.location.assign((window.localStorage.getItem("jobly:last-ecosystem") === "recruiter") ? "/recruiter" : (window.localStorage.getItem("jobly:last-ecosystem") === "partner") ? "/partner" : (window.localStorage.getItem("jobly:last-ecosystem") === "talent") ? "/career-brain" : "/ecosystem"); } } catch (e) { setMessage(e instanceof Error ? e.message : "Connexion impossible."); } finally { setBusy(false); } }
  async function startSignup() {
    if (!firstName.trim() || !lastName.trim()) return setMessage("Nom et prénom sont obligatoires.");
    if (!isValidEmail(email)) return setMessage("Entre une adresse e-mail valide.");
    if (!validPhone) return setMessage("Entre un numéro de téléphone valide.");
    setBusy(true); setMessage("");
    try {
      try { window.localStorage.setItem("jobly-signup-draft", JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phoneE164, country: country.code })); } catch {}
      await requestEmailOtp(email); goTo("signup-otp"); setMessage("Code envoyé par e-mail. Vérifie ta boîte Gmail / e-mail.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Impossible d'envoyer le code."); } finally { setBusy(false); }
  }
  async function verifySignupOtp() {
    if (otp.length !== 6) return setMessage("Entre le code à 6 chiffres reçu par e-mail.");
    setBusy(true); setMessage("");
    try { await verifyEmailOtp(email, otp); goTo("signup-password"); setMessage("E-mail vérifié. Choisis maintenant ton username et ton mot de passe."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Code incorrect ou expiré."); }
    finally { setBusy(false); }
  }
  async function resendSignupOtp() {
    if (!isValidEmail(email)) return setMessage("Entre une adresse e-mail valide.");
    setResendBusy(true); setMessage("");
    try { await requestEmailOtp(email); setOtp(""); setMessage("Un nouveau code vient d'être envoyé."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Impossible de renvoyer le code."); }
    finally { setResendBusy(false); }
  }
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
  async function finishSignup() {
    if (usernameStatus === "taken") return setMessage(translations[lang].usernameTaken);
    if (usernameStatus !== "available") {
      // API check may have failed — retry once before blocking
      try {
        const ok = await checkUsernameAvailable(username.trim());
        if (!ok) return setMessage(translations[lang].usernameTaken);
      } catch {
        return setMessage("Impossible de vérifier le username. Vérifie ta connexion et réessaie.");
      }
    }
    if (passwordError) return setMessage(passwordError);
    if (!privacyAccepted) return setMessage("Tu dois accepter la politique de confidentialité.");
    setBusy(true); setMessage("");
    try {
      // 15/09/2026 : même ordre que dans app/onboarding/page.tsx — le profil
      // est créé AVANT updateUser({ password }), pour ne plus dépendre d'un
      // jeton potentiellement tourné/invalidé par le changement de mot de
      // passe (cause du "Session requise après vérification de l'e-mail.").
      await completeSignupProfile({ firstName, lastName, email, phone: phoneE164, country: country.code, username, privacyAccepted });
      const { error } = await (await import("../lib/supabase")).getSupabaseClient().auth.updateUser({ password, data: { first_name: firstName.trim(), last_name: lastName.trim(), username: username.trim() } });
      if (error) throw new Error(error.message);
      if (photo) {
        const { data: sessionData } = await getSupabaseClient().auth.getSession();
        if (sessionData.session) {
          const form = new FormData(); form.append("photo", photo);
          const response = await fetch("/api/auth/profile-photo", { method: "POST", headers: { Authorization: `Bearer ${sessionData.session.access_token}` }, body: form });
          const body = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(body.message || "La photo n'a pas pu être enregistrée.");
        }
      }
      setJourneyIndex(0);
      goTo("journey");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Impossible de finaliser le compte."); } finally { setBusy(false); }
  }
  async function forgot() { if (!email.includes("@")) return setMessage("Entre l'adresse e-mail associée à ton compte."); setBusy(true); setMessage(""); try { await requestPasswordReset(email); goTo("reset-sent"); } catch (e) { setMessage(e instanceof Error ? e.message : "Impossible d'envoyer l'e-mail de récupération."); } finally { setBusy(false); } }

  return <main className={`relative min-h-screen flex flex-col justify-between w-full bg-off-white dark:bg-[#0A1931] dark:text-white ${(screen === "welcome" || screen === "signup") ? "overflow-hidden" : "overflow-y-auto"}`}>
    {screen === "welcome" && <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 z-0 h-[340px] w-[340px] rounded-full bg-sky-blue/25 blur-[90px]" />}
    <BubbleField />
    {screen === "welcome" && (
      <div className="fixed right-4 top-4 z-30 flex gap-1 rounded-full border border-white/40 bg-white/40 p-1 shadow-premium backdrop-blur-xl"><button type="button" onClick={()=>{setLang("fr");try{localStorage.setItem("jobly-lang","fr")}catch{}}} className={`rounded-full px-3 py-1.5 text-[13px] transition-all ${lang==="fr"?"bg-canari font-semibold text-deep-blue shadow-glow-canari":"text-deep-blue/50"}`}>🇫🇷 FR</button><button type="button" onClick={()=>{setLang("en");try{localStorage.setItem("jobly-lang","en")}catch{}}} className={`rounded-full px-3 py-1.5 text-[13px] transition-all ${lang==="en"?"bg-canari font-semibold text-deep-blue shadow-glow-canari":"text-deep-blue/50"}`}>🇬🇧 EN</button></div>
    )}
    <div className="relative flex min-h-0 flex-1 w-full flex-col gap-0">
      {screen !== "login" && screen !== "signup" && <header className="z-20 flex h-[84px] shrink-0 items-start px-5 pt-5 sm:px-8"><JoblyLogo ref={logoRef} size="hero" showTagline /></header>}
      {screen === "welcome" && (
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={lang}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="relative min-h-0 flex-1 overflow-hidden px-4 pt-0">
              <div aria-hidden="true" className="pointer-events-none absolute left-[10%] top-[-5%] z-[2] h-[64%] w-[44%] opacity-60">
                <div className="h-full w-full -rotate-[26deg] border-l border-dashed border-sky-blue/50" />
              </div>

              <div className="relative z-20 mt-6 w-[45%]">
                
                <h1 className="font-[var(--font-inter)] text-[28px] leading-[31px] font-extrabold tracking-[-0.8px] text-deep-blue">
                  {translations[lang].title.split("\n").map((line, i) => (
                    <span key={line}>{line}{i === 0 && <br />}</span>
                  ))}
                </h1>
                <svg aria-hidden="true" width="54" height="5" viewBox="0 0 54 5" className="mt-3 overflow-visible">
                  <path d="M1 1.5 C17 4.8 37 4.8 53 1.5" fill="none" stroke="#FFD60A" strokeWidth="5" strokeLinecap="round" />
                </svg>
                <p className="mt-2.5 max-w-[165px] font-[var(--font-inter)] text-[12px] font-bold tracking-[0.01em] text-deep-blue/75">
                  Powered by <span className="font-black tracking-[-0.055em]"><span className="text-deep-blue">J'</span><span className="text-[#39D7FF]">I</span><span className="bg-gradient-to-br from-[#39D7FF] via-[#5BCBFF] to-[#FFC72C] bg-clip-text text-transparent">A</span></span>
                </p>
                <p className="relative z-10 mt-3 w-[95%] text-[13px] leading-[18px] font-[var(--font-inter)] font-bold italic text-[#4a4a4a]">
                  {translations[lang].subtitle}
                </p>
              </div>

              <div className="absolute top-[2cm] right-0 z-[5] h-[82%] w-[62%]">
                <Image
                  fill
                  priority
                  src="/hero-jobly-community.webp"
                  alt="Communauté Jobly diverse"
                  sizes="62vw"
                  className="object-cover object-top"
                  style={{
                    WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 14%, black 100%), linear-gradient(to bottom, transparent 0%, black 14%, black 78%, transparent 100%)",
                    maskImage: "linear-gradient(to right, transparent 0%, black 14%, black 100%), linear-gradient(to bottom, transparent 0%, black 14%, black 78%, transparent 100%)",
                    WebkitMaskComposite: "destination-in",
                    maskComposite: "intersect",
                  }}
                />
              </div>
            </div>

            <div className="relative z-20 mt-8 shrink-0 flex flex-row gap-3 px-4">
              <button type="button" onClick={() => { reset(); goTo("signup"); }} className="h-[56px] w-[48%] rounded-xl bg-canari font-[var(--font-inter)] font-bold text-[14px] text-deep-blue shadow-glow-canari transition-transform active:scale-[0.96]">
                {translations[lang].create}
              </button>
              <button type="button" onClick={() => { reset(); goTo("login"); }} className="h-[56px] w-[48%] rounded-xl border border-white/50 bg-deep-blue/90 font-[var(--font-inter)] font-bold text-[14px] text-off-white shadow-premium backdrop-blur-xl transition-transform active:scale-[0.96]">
                {translations[lang].login}
              </button>
            </div>

            <div className="relative z-20 mt-6 shrink-0 grid grid-cols-4 gap-2.5 px-3">
              {BENEFITS[lang].map(({ Icon, title, subtitle }) => (
                <div key={title} className="relative overflow-hidden rounded-[24px]">
                  <div className="pointer-events-none absolute -top-20 -left-20 h-[300px] w-[300px] rounded-full bg-[#FFD400]/30 blur-[80px]" />
                  <div className="pointer-events-none absolute -bottom-20 -right-20 h-[300px] w-[300px] rounded-full bg-[#22448B]/20 blur-[80px]" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF8C00]/15 blur-[90px]" />
                  <div className="relative min-h-[82px] rounded-[24px] border border-white/40 bg-white/20 p-3 text-center font-[var(--font-inter)] shadow-premium backdrop-blur-[40px]">
                    <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-sky-blue sm:h-4 sm:w-4" />
                    <p className="font-[var(--font-inter)] text-[11px] font-bold leading-[12px] text-deep-blue">{title}</p>
                    <p className="mt-1 font-[var(--font-inter)] text-[9px] font-bold leading-[10px] text-[#7a7f89]">{subtitle}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </AnimatePresence>
      )}

      {screen === "login" && (
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-[420px] flex flex-col gap-8">
            <div className="flex justify-between items-center">
              <JoblyLogo size="hero" showTagline />
              <button type="button" onClick={toggleDarkMode} aria-label={darkMode ? "Désactiver le mode nuit" : "Activer le mode nuit"} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[15px] text-navy">
                {darkMode ? "☀️" : "🌙"}
              </button>
            </div>
            <div className="flex flex-col gap-2 text-left">
              <h1 className="text-[32px] font-bold leading-none text-[#0A1931]">{translations[lang].loginTitle}</h1>
              <p className="text-[14px] text-gray-500">{translations[lang].loginSubtitle}</p>
            </div>
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); login(); }}>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[#0A1931]">{translations[lang].username}</label>
                <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="ex. Kenzi" autoComplete="username" className="h-[48px] w-full rounded-full border border-gray-200 px-5 text-[15px] outline-none focus:border-jobly-blue" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[#0A1931]">{translations[lang].password}</label>
                <div className="flex h-[48px] items-center rounded-full border border-gray-200 px-5">
                  <input type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" className="w-full bg-transparent outline-none" placeholder="••••••••" />
                  <button type="button" aria-label={showPassword?"Masquer le mot de passe":"Afficher le mot de passe"} onClick={()=>setShowPassword(v=>!v)} className="text-slate-400"><EyeIcon open={showPassword}/></button>
                </div>
              </div>
              <div className="flex justify-between items-center px-1 mt-1">
                <label className="flex items-center gap-2 text-[13px] font-semibold text-[#0A1931]">
                  <input type="checkbox" checked={rememberMe} onChange={e=>setRememberMeState(e.target.checked)} className="h-4 w-4 rounded accent-[#FFD400]" />Rester connecté
                </label>
                <button type="button" onClick={()=>{setMessage("");goTo("forgot");}} className="text-[13px] font-bold text-[#22448B]">{translations[lang].forgot}</button>
              </div>
              <button type="submit" disabled={busy} className="mt-6 h-[52px] w-full rounded-full bg-[#FFD400] font-bold text-[#0A1931]">{busy ? "Connexion…" : `${translations[lang].login} →`}</button>
              <div className="flex items-center gap-4 my-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">{translations[lang].or}</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              <button type="button" onClick={google} disabled={busy} className="h-[52px] rounded-full border border-gray-200 bg-white font-semibold flex items-center justify-center gap-2">
                <GoogleIcon className="w-5 h-5" />{translations[lang].google}
              </button>
              {message && <div role="alert" aria-live="assertive" className="rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-center text-[13px] font-semibold text-red-700">{message}</div>}
            </form>
            <p className="relative -translate-y-1 text-center text-[13px] text-gray-500">{translations[lang].noAccount}{" "}<button type="button" onClick={()=>{reset();goTo("signup");}} className="font-bold text-[#22448B]">{translations[lang].create}</button></p>
          </div>
        </section>
      )}

{screen === "signup" && (
        <section className="min-h-screen flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-[420px] flex flex-col gap-8">
            <div className="flex justify-start">
              <JoblyLogo size="hero" showTagline />
            </div>
            <div className="flex flex-col gap-2 text-left">
              <h1 className="text-[32px] font-bold leading-none text-[#0A1931]">{translations[lang].signupTitle}</h1>
              <p className="text-[14px] text-gray-500">{translations[lang].signupSubtitle}</p>
            </div>
            <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); startSignup(); }}>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#0A1931]">{translations[lang].lastName}</label>
                  <input value={lastName} onChange={e=>setLastName(e.target.value)} autoComplete="family-name" className="h-[48px] w-full rounded-full border border-gray-200 px-5 text-[15px] outline-none focus:border-jobly-blue" placeholder="BITSEKI" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-[#0A1931]">{translations[lang].firstName}</label>
                  <input value={firstName} onChange={e=>setFirstName(e.target.value)} autoComplete="given-name" className="h-[48px] w-full rounded-full border border-gray-200 px-5 text-[15px] outline-none focus:border-jobly-blue" placeholder="MAYAKA" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[#0A1931]">{translations[lang].phone}</label>
                <div className="flex h-[48px] items-center rounded-full border border-gray-200 px-3">
                  <CountryPicker country={country} placeholder={translations[lang].countrySearch} onChange={(c)=>{setCountry(c);setPhone("")}} />
                  <span className="mx-1 h-6 w-px bg-gray-200" />
                  <input value={formatPhoneDisplay(phone,country.code)} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,15))} inputMode="tel" autoComplete="tel" placeholder={country.code==="CM"?"6 12 34 56 78":"Numéro"} className="w-full bg-transparent text-[15px] outline-none" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[#0A1931]">{translations[lang].email}</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} inputMode="email" autoComplete="email" placeholder="vous@exemple.com" className="h-[48px] w-full rounded-full border border-gray-200 px-5 text-[15px] outline-none focus:border-jobly-blue" />
              </div>
              <button type="submit" disabled={busy} className="mt-6 h-[52px] w-full rounded-full bg-[#FFD400] font-bold text-[#0A1931]">{busy ? "Envoi du code…" : translations[lang].continue}</button>
            </form>
          </div>
        </section>
      )}

{screen === "signup-otp" && <section className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center px-4 py-4 text-center"><div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EAF0FF] text-[#FFDE00]"><PhoneIcon className="h-8 w-8"/></div><h1 className="mb-2 text-[32px] font-extrabold text-navy">{translations[lang].verifyTitle}</h1><p className="mb-5 text-sm text-jobly-gray">{translations[lang].verifyText} <strong>{email}</strong>.</p><input value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" placeholder={translations[lang].codePlaceholder} aria-label={translations[lang].codePlaceholder} className="mb-3 h-[54px] w-full rounded-2xl border text-center text-xl tracking-[0.25em]"/><button type="button" onClick={verifySignupOtp} disabled={busy||otp.length!==6} className="h-[52px] w-full rounded-2xl bg-[#FFDE00] font-extrabold text-black">{busy?"Vérification…":translations[lang].verify}</button><button type="button" onClick={resendSignupOtp} disabled={busy||resendBusy} className="mt-2 text-[13px] font-bold text-jobly-blue">{resendBusy?"Envoi…":translations[lang].resend}</button></section>}

      {screen === "signup-password" && <section className="mx-auto w-full max-w-[420px] flex-1 px-4 py-4">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="text-center">
            <h1 className="text-[32px] font-extrabold text-navy">{translations[lang].finalTitle}</h1>
            <p className="mt-1 text-sm text-jobly-gray">{translations[lang].finalSubtitle}</p>
          </div>
          <label className="group relative mt-1 block shrink-0 cursor-pointer text-center">
            <div className="relative grid h-[82px] w-[82px] place-items-center overflow-hidden rounded-full border-[3px] border-[#FFDE00] bg-[#FFF8D8] text-jobly-blue shadow-lg shadow-[#FFDE00]/20">
              {preview ? <img src={preview} alt="Photo de profil" className="h-full w-full object-cover"/> : <CameraIcon />}
              <span className="absolute inset-x-0 bottom-0 bg-navy/75 py-1 text-[8px] font-extrabold text-white">PHOTO</span>
            </div>
            <span className="mt-1 block text-[10px] font-extrabold text-navy">Photo de profil</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => choosePhoto(e.target.files?.[0])}/>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-bold">{translations[lang].username}</span>
          <div className="relative">
            <input
              value={username}
              onChange={e=>setUsername(e.target.value.replace(/\s/g,"").slice(0,15))}
              autoComplete="username"
              placeholder="Kenzi"
              aria-invalid={usernameStatus === "taken"}
              className={`h-12 w-full rounded-2xl border px-3 pr-10 ${usernameStatus === "taken" ? "border-[#FF2D2D]" : usernameStatus === "available" ? "border-[#FFDE00]" : "border-slate-200"}`}
            />
            {usernameStatus === "available" && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="#FFDE00"><circle cx="12" cy="12" r="12" /><path d="M7 12.5l3 3 7-7" stroke="#0A1931" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
            )}
            {usernameStatus === "checking" && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400" aria-hidden="true">…</span>
            )}
          </div>
        </label>
        <p className="my-1.5 text-[11px] text-slate-400">{translations[lang].usernameFormatHint}</p>
        {usernameStatus === "taken" && <p className="mb-2 text-[12px] font-bold" style={{ color: "#FF2D2D" }} role="alert">{translations[lang].usernameTaken}</p>}
        <label className="mt-2 block">
          <span className="mb-1 block text-xs font-bold">{translations[lang].password}</span>
          <div className="flex h-12 items-center rounded-2xl border px-3">
            <input type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" className="w-full outline-none" placeholder="••••••••"/>
            <button type="button" aria-label={showPassword?"Masquer le mot de passe":"Afficher le mot de passe"} onClick={()=>setShowPassword(v=>!v)}><EyeIcon open={showPassword}/></button>
          </div>
        </label>
        <div className="my-3"><PasswordStrengthGauge password={password}/></div>
        <p className="mb-1.5 text-[11px] leading-[1.35] text-slate-500">{translations[lang].conditions}</p>
        <label className="mb-4 flex items-start gap-2 text-xs text-slate-600"><input type="checkbox" checked={privacyAccepted} onChange={e=>setPrivacyAccepted(e.target.checked)} className="mt-0.5"/><span>{translations[lang].accept}</span></label>
        <button
          type="button"
          onClick={finishSignup}
          disabled={busy}
          className="h-[52px] w-full rounded-2xl bg-[#FFDE00] font-extrabold text-black disabled:opacity-40"
        >{busy?"Création…":translations[lang].signup}</button>
      </section>}

      {cropSource && <Cropper src={cropSource} onCancel={() => setCropSource("")} onConfirm={acceptCrop} />}

      {screen === "journey" && (() => {
        const slide = JOURNEY_SLIDES[journeyIndex];
        const isLast = journeyIndex === JOURNEY_SLIDES.length - 1;

        // Navigation tactile : un balayage horizontal (gauche/droite) fait
        // exactement la même chose que le bouton "Suivant" / retour.
        // `pan-y` laisse le défilement vertical au navigateur et évite de
        // transformer un mouvement vertical accidentel en changement de slide.
        function handleJourneyPointerDown(e: React.PointerEvent<HTMLElement>) {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          journeyPointerRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
        }

        function handleJourneyPointerUp(e: React.PointerEvent<HTMLElement>) {
          const start = journeyPointerRef.current;
          journeyPointerRef.current = null;
          if (!start) return;

          const dx = e.clientX - start.x;
          const dy = e.clientY - start.y;
          const elapsed = Math.max(Date.now() - start.time, 1);
          const distance = Math.abs(dx);
          const velocity = distance / elapsed;
          const isHorizontal = distance >= 55 && distance > Math.abs(dy) * 1.2;
          const isFastEnough = velocity >= 0.18 || distance >= 90;
          if (!isHorizontal || !isFastEnough) return;

          if (dx < 0) {
            if (isLast) goTo("jia-welcome");
            else setJourneyIndex((i) => Math.min(i + 1, JOURNEY_SLIDES.length - 1));
          } else {
            setJourneyIndex((i) => Math.max(i - 1, 0));
          }
        }

        return (
          <section
            className="mx-auto flex w-full max-w-[420px] flex-1 flex-col py-4"
            onPointerDown={handleJourneyPointerDown}
            onPointerUp={handleJourneyPointerUp}
            onPointerCancel={() => { journeyPointerRef.current = null; }}
            style={{ touchAction: "pan-y" }}
          >
            <div className="mb-2 flex items-center justify-end">
              <button type="button" onClick={() => goTo("jia-welcome")} className="text-[13px] font-bold text-slate-400">Passer</button>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={journeyIndex} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.32, ease: "easeOut" }} className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="mb-6 flex h-40 w-40 items-center justify-center rounded-[32px] text-[64px]" style={{ background: slide.tint }} aria-hidden="true">{slide.emoji}</div>
                <h2 className="mb-2 px-2 text-[24px] font-extrabold leading-tight text-navy">{slide.title}</h2>
                <p className="max-w-[300px] text-sm text-jobly-gray">{slide.subtitle}</p>
              </motion.div>
            </AnimatePresence>
            <div className="my-5 flex items-center justify-center gap-2" role="tablist" aria-label="Progression">
              {JOURNEY_SLIDES.map((s, i) => (
                <span key={s.title} className="h-2 rounded-full transition-all" style={{ width: i === journeyIndex ? 22 : 8, background: i === journeyIndex ? slide.accent : "#E2E8F0" }} />
              ))}
            </div>
            <p className="mb-2 text-center text-[10px] font-semibold text-slate-400" aria-hidden="true">Glisse vers la gauche pour continuer · vers la droite pour revenir</p>
            <button
              type="button"
              onClick={() => isLast ? goTo("jia-welcome") : setJourneyIndex((i) => i + 1)}
              className="h-[52px] w-full rounded-2xl font-extrabold text-white"
              style={{ background: "#214BFF" }}
            >{isLast ? "C'est parti →" : "Suivant →"}</button>
          </section>
        );
      })()}

      {screen === "jia-welcome" && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-[#020410]">
          <WaterScene />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,rgba(2,4,16,0.08)_48%,rgba(2,4,16,0.42)_100%)]" />
          <div className="relative z-10 flex h-full flex-col items-center justify-end px-8 pb-[12vh] text-center">
            <AnimatePresence mode="wait">
              {jiaLine === 0 && (
                <motion.p key="l0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[20px] font-extrabold text-white">
                  Bienvenue sur Jobly, <span style={{ color: "#FFDE00" }}>{username || "toi"}</span>…
                </motion.p>
              )}
              {jiaLine === 1 && (
                <motion.p key="l1" initial={{ opacity: 0, y: 10, scale: 0.92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 200, damping: 16 }} className="text-[20px] font-extrabold text-white">
                  Je suis <span className="font-black tracking-[-0.055em]"><span className="text-white">J'</span><span className="text-[#39D7FF]">I</span><span className="bg-gradient-to-br from-[#39D7FF] via-[#5BCBFF] to-[#FFC72C] bg-clip-text text-transparent">A</span></span>,
                </motion.p>
              )}
              {jiaLine >= 2 && (
                <motion.p key="l2" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[17px] font-medium text-white/90">
                  Je serai à ton service tout au long de ta carrière.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {screen === "forgot" && (
        <section className="container mx-auto flex w-[92%] max-w-[440px] flex-1 flex-col justify-center px-4 py-4">
          <div className="mb-3 flex w-full items-center justify-end">
            <button type="button" onClick={toggleDarkMode} aria-label={darkMode ? "Désactiver le mode nuit" : "Activer le mode nuit"} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9] text-[15px] text-navy">{darkMode ? "☀️" : "🌙"}</button>
          </div>
          <h1 className="mb-1 w-full text-center text-[36px] font-extrabold leading-none tracking-[-0.03em] text-navy">{translations[lang].forgotTitle}</h1>
          <p className="mb-5 w-full text-center text-sm text-jobly-gray">{translations[lang].forgotText}</p>
          <label className="mb-3 block w-full">
            <span className="mb-1.5 block text-[13px] font-bold text-navy">{translations[lang].email}</span>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} inputMode="email" autoComplete="email" placeholder="vous@exemple.com" className="h-[50px] w-full rounded-2xl border border-slate-300 px-4 text-[15px] outline-none focus:border-jobly-blue"/>
          </label>
          <button type="button" onClick={forgot} disabled={busy} className="h-[52px] w-full rounded-2xl bg-[#FFDE00] text-base font-extrabold text-black">{busy?"Envoi…":translations[lang].reset}</button>
          <button type="button" onClick={()=>goTo("login")} className="mt-4 w-full text-center text-[13px] font-extrabold text-jobly-blue">← {translations[lang].login}</button>
        </section>
      )}
      {screen === "reset-sent" && <section className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-4 text-center"><div className="mx-auto mb-4 text-5xl" aria-hidden="true">✉️</div><h1 className="text-[32px] font-extrabold text-navy">{translations[lang].sentTitle}</h1><p className="my-3 text-sm text-jobly-gray">{translations[lang].sentText}</p><button type="button" onClick={()=>{reset();goTo("login");}} className="h-[52px] rounded-2xl bg-jobly-blue font-extrabold text-white">{translations[lang].backLogin}</button></section>}

      {message && screen !== "journey" && screen !== "jia-welcome" && screen !== "login" && <div role="status" aria-live="polite" className="rounded-2xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-center text-xs text-blue-800">{message}</div>}
      {screen !== "journey" && screen !== "jia-welcome" && screen !== "signup" && screen !== "signup-otp" && screen !== "signup-password" && screen !== "login" && <footer className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2 text-center">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`footer-${lang}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: "easeOut" }}>
            
            
            {screen === "welcome" && <div className="relative mx-auto mt-1 h-[29px] w-[120px]" aria-hidden="true">
              <motion.svg viewBox="0 0 120 29" className="absolute inset-0 h-full w-full">
                <motion.path d="M58 27 C44 23 46 12 61 9 C72 7 77 2 74 0" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 0.7, 0.12, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }} />
              </motion.svg>
            </div>}
            {screen === "welcome" && <p className="text-[11px] text-jobly-gray">{translations[lang].madeWith} <span ref={heartTargetRef} className="inline-block h-[14px] w-[14px] align-[-3px]" aria-hidden="true">&nbsp;</span> {translations[lang].by}</p>}
          </motion.div>
        </AnimatePresence>
      </footer>}
    </div>
    {screen === "welcome" && heartPath && <motion.span className="pointer-events-none fixed left-0 top-0 z-[60] text-[16px] leading-none drop-shadow-[0_2px_5px_rgba(239,68,68,0.28)]" initial={{ x: heartPath.startX, y: heartPath.startY, scale: 0.94 }} animate={{ x: heartPath.endX, y: heartPath.endY, scale: [0.94, 0.9, 1.02, 0.88, 0.98] }} transition={{ x: { duration: 2.65, ease: [0.16, 1, 0.3, 1] }, y: { duration: 2.65, ease: [0.16, 1, 0.3, 1] }, scale: { delay: 2.65, duration: 0.82, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" } }} aria-hidden="true">❤️</motion.span>}
  </main>;
}
