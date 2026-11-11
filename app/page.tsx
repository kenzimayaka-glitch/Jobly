"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, animate, useReducedMotion } from "framer-motion";
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
import { assertPasswordNotPwned } from "../lib/pwnedPasswords";
import BubbleField from "../components/BubbleField";
import JoblyLogo from "../components/JoblyLogo";
import AuthExperienceShell from "../components/AuthExperienceShell";
import HomeCtaStory, { type HomeCtaStoryKind } from "../components/HomeCtaStory";
import WaterScene from "../components/WaterScene";
import {
  GoogleIcon,
  PhoneIcon,
  ShieldStarIcon,
  PeopleStarIcon,
  CheckCircleIcon,
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
    signupTitle: "Créer votre compte",
    signupSubtitle: "Veuillez renseigner vos informations d’identification.",
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

const HOME_HEADLINES = {
  fr: [
    "L’Afrique regorge de talents, d’idées et d’opportunités.",
    "Trouvez les talents qui feront grandir votre organisation.",
    "Accédez à des milliers d’opportunités à travers l’Afrique.",
    "Recrutez autrement et découvrez de nouveaux potentiels.",
    "Développez votre carrière, vos projets et votre réseau.",
    "Connectez votre entreprise aux compétences dont elle a besoin.",
    "Faites avancer vos ambitions avec un écosystème qui vous accompagne.",
    "Créez des connexions, développez des partenariats et ouvrez de nouvelles perspectives.",
    "Avec J’IA, transformez vos idées en actions.",
    "Ensemble, construisons l’avenir professionnel de l’Afrique.",
  ],
  en: [
    "Africa is rich in talent, ideas and opportunities.",
    "Find the talent that will help your organization grow.",
    "Access thousands of opportunities across Africa.",
    "Recruit differently and discover new potential.",
    "Grow your career, projects and network.",
    "Connect your business with the skills it needs.",
    "Move your ambitions forward with an ecosystem that supports you.",
    "Build connections, grow partnerships and open new perspectives.",
    "With J’IA, turn your ideas into action.",
    "Together, let’s build Africa’s professional future.",
  ],
} as const;

const BENEFITS = {
  fr: [
    { Icon: ShieldStarIcon, kind: "static", title: "100 % GRATUIT", subtitle: "Accédez aux opportunités qui correspondent le mieux à votre profil.", iconClass: "text-[#3478C8]" },
    { Icon: PeopleStarIcon, kind: "offers", title: "DES OFFRES DE TOUTE L’AFRIQUE", subtitle: "Offres disponibles sur Jobly à travers l’Afrique.", iconClass: "text-[#8064D8]" },
    { Icon: CheckCircleIcon, kind: "talents", title: "UN PIPELINE DE TALENT", subtitle: "Talents partout en Afrique.", iconClass: "text-[#28A99B]" },
    { Icon: ShieldStarIcon, kind: "static", title: "J’IA", subtitle: "Postulez à 50+ offres en un clic. Simplifiez vos candidatures avec J’IA.", iconClass: "text-[#D99A16]" },
  ],
  en: [
    { Icon: ShieldStarIcon, kind: "static", title: "100% FREE", subtitle: "Access opportunities that best match your profile.", iconClass: "text-[#3478C8]" },
    { Icon: PeopleStarIcon, kind: "offers", title: "OFFERS ACROSS AFRICA", subtitle: "Offers available on Jobly across Africa.", iconClass: "text-[#8064D8]" },
    { Icon: CheckCircleIcon, kind: "talents", title: "A TALENT PIPELINE", subtitle: "Talents across Africa.", iconClass: "text-[#28A99B]" },
    { Icon: ShieldStarIcon, kind: "static", title: "J’IA", subtitle: "Apply to 50+ offers in one click. Simplify your applications with J’IA.", iconClass: "text-[#D99A16]" },
  ],
} as const;

const PUBLIC_HOME_OFFERS_BASE = 75_000;
const PUBLIC_HOME_TALENTS_BASE = 415_000;

type PublicHomeStats = { offersCount: number; talentsCount: number };

function AnimatedCounter({ value, locale }: { value: number | null; locale: string }) {
  const [displayedValue, setDisplayedValue] = useState<number | null>(null);
  const previousValue = useRef(0);

  useEffect(() => {
    if (value === null) return;
    const controls = animate(previousValue.current, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (latest) => {
        previousValue.current = latest;
        setDisplayedValue(Math.round(latest));
      },
      onComplete: () => {
        previousValue.current = value;
        setDisplayedValue(value);
      },
    });
    return () => controls.stop();
  }, [value]);

  if (value === null) return <span aria-label="Chargement">…</span>;
  return <span>{new Intl.NumberFormat(locale).format(displayedValue ?? 0)}</span>;
}

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
  { emoji: "💼", tint: "#EAF2FF", accent: "#0057B8", title: "1500+ offres vérifiées près de toi", subtitle: "De vraies opportunités, en temps réel." },
  { emoji: "🧠", tint: "#F0E9FF", accent: "#8B5CF6", title: "J'IA corrige ton CV en 10s", subtitle: "J'IA relit, corrige et améliore ton profil." },
  { emoji: "📄", tint: "#E8F5E9", accent: "#10B981", title: "Un CV qui passe les robots recruteurs", subtitle: "Optimisé pour être vu, pas juste envoyé." },
  { emoji: "🎯", tint: "#FFF3E8", accent: "#FFE135", title: "Ne postule plus au hasard", subtitle: "Un score de matching te dit où tu as vraiment ta chance." },
  { emoji: "🌍", tint: "#EAF2FF", accent: "#0A1931", title: "Entreprise, Candidat, Freelance… Choisis ton monde", subtitle: "J'IA s'adapte à qui tu es aujourd'hui." },
] as const;

export default function Home() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [homeStory, setHomeStory] = useState<HomeCtaStoryKind | null>(null);
  const [headlineIndex, setHeadlineIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();
  const [homeStats, setHomeStats] = useState<PublicHomeStats | null>(null);
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
  const homeRootRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const heartTargetRef = useRef<HTMLSpanElement>(null);
  const [heartPath, setHeartPath] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [rememberMe, setRememberMeState] = useState(false);

  useEffect(() => {
    let active = true;
    let controller: AbortController | null = null;

    const refreshStats = async () => {
      controller?.abort();
      controller = new AbortController();

      try {
        const response = await fetch("/api/public/home-stats", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("home-stats-unavailable");

        const payload = await response.json() as Partial<PublicHomeStats>;
        if (
          !Number.isSafeInteger(payload.offersCount) ||
          !Number.isSafeInteger(payload.talentsCount) ||
          (payload.offersCount ?? -1) < 0 ||
          (payload.talentsCount ?? -1) < 0
        ) throw new Error("invalid-home-stats");

        if (active) {
          setHomeStats({
            offersCount: payload.offersCount as number,
            talentsCount: payload.talentsCount as number,
          });
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        // Keep the last verified values; never replace unavailable data with marketing numbers.
      }
    };

    void refreshStats();
    const interval = window.setInterval(() => void refreshStats(), 60_000);

    return () => {
      active = false;
      controller?.abort();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (screen !== "welcome") return;
    const interval = window.setInterval(() => {
      setHeadlineIndex((current) => (current + 1) % HOME_HEADLINES.fr.length);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [screen]);

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
      const recruiterShareToken = params.get("shareToken");
      if (params.get("recruiterSignup") === "1" && recruiterShareToken && /^[A-Za-z0-9_-]{20,80}$/.test(recruiterShareToken)) {
        const destination = `/recruiter/onboarding?shareToken=${encodeURIComponent(recruiterShareToken)}`;
        window.sessionStorage.setItem("jobly:recruiter-share-token", recruiterShareToken);
        window.sessionStorage.setItem("jobly:after-login", destination);
        window.localStorage.setItem("jobly:last-ecosystem", "recruiter");
        setScreen("signup");
        return;
      }
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
  // Le username est soumis à la même règle partout : non vide, 40 caractères max.
  // L'unicité est ensuite vérifiée côté API avant la création du compte.
  const validUsername = username.trim().length > 0 && username.trim().length <= 40;
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

    const heartSize = 18;
    let active = true;
    let firstFrame = 0;
    let secondFrame = 0;

    const measureHeartPath = () => {
      if (!active) return;
      const logo = logoRef.current;
      const target = heartTargetRef.current;
      if (!logo || !target) return;

      const logoRect = logo.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      setHeartPath({
        startX: logoRect.right - heartSize,
        startY: logoRect.top + logoRect.height * 0.42,
        endX: targetRect.left + (targetRect.width - heartSize) / 2,
        endY: targetRect.top + (targetRect.height - heartSize) / 2,
      });
    };

    // Wait for the page's first layout pass before measuring the landing slot.
    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(measureHeartPath);
    });

    const resizeObserver = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(measureHeartPath)
      : null;
    if (logoRef.current) resizeObserver?.observe(logoRef.current);
    if (heartTargetRef.current) resizeObserver?.observe(heartTargetRef.current);
    if (homeRootRef.current) resizeObserver?.observe(homeRootRef.current);

    window.addEventListener("resize", measureHeartPath, { passive: true });
    window.addEventListener("scroll", measureHeartPath, true);
    document.fonts?.ready.then(measureHeartPath).catch(() => {});

    return () => {
      active = false;
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", measureHeartPath);
      window.removeEventListener("scroll", measureHeartPath, true);
    };
  }, [screen, lang]);
  const reset = () => { setMessage(""); setBusy(false); setResendBusy(false); setOtp(""); };
  function startHomeStory(next: HomeCtaStoryKind) {
    if (homeStory || busy) return;
    if (prefersReducedMotion) {
      reset();
      goTo(next);
      return;
    }
    setHomeStory(next);
  }

  function finishHomeStory(next: HomeCtaStoryKind) {
    setHomeStory(null);
    reset();
    goTo(next);
  }


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
  async function login() { if (!validUsername) return setMessage("Entre un username valide (1 à 40 caractères)."); if (!password) return setMessage("Entre ton mot de passe."); setBusy(true); setMessage(""); try { setRememberMe(rememberMe); await loginWithUsernamePassword(username, password); const afterLogin = window.sessionStorage.getItem("jobly:after-login"); if (afterLogin) { window.sessionStorage.removeItem("jobly:after-login"); window.location.assign(afterLogin); } else { window.location.assign((window.localStorage.getItem("jobly:last-ecosystem") === "recruiter") ? "/recruiter" : (window.localStorage.getItem("jobly:last-ecosystem") === "partner") ? "/partner" : (window.localStorage.getItem("jobly:last-ecosystem") === "talent") ? "/career-brain" : "/ecosystem"); } } catch (e) { setMessage(e instanceof Error ? e.message : "Connexion impossible."); } finally { setBusy(false); } }
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
    // Verrouille immédiatement le bouton pour éviter les doubles soumissions
    // et valide localement les trois prérequis avant tout appel réseau.
    if (!validUsername) return setMessage("Choisis un username non vide (40 caractères maximum).");
    if (passwordError) return setMessage(passwordError);
    if (!privacyAccepted) return setMessage("Tu dois accepter la politique de confidentialité.");
    setBusy(true); setMessage("");
    try {
      // La vérification d'unicité est toujours refaite au moment critique :
      // l'état affiché "disponible" peut être devenu obsolète entre-temps.
      const usernameAvailable = await checkUsernameAvailable(username.trim());
      if (!usernameAvailable) {
        setMessage(translations[lang].usernameTaken);
        return;
      }
      // Vérification HIBP uniquement à la validation finale (pas à chaque frappe),
      // avant toute écriture du profil. Le mot de passe reste dans le navigateur.
      await assertPasswordNotPwned(password);
      // 15/09/2026 : même ordre que dans app/onboarding/page.tsx — le profil
      // est créé AVANT updateUser({ password }), pour ne plus dépendre d'un
      // jeton potentiellement tourné/invalidé par le changement de mot de
      // passe (cause du "Session requise après vérification de l'e-mail.").
      await completeSignupProfile({ firstName, lastName, email, phone: phoneE164, country: country.code, username, privacyAccepted });
      const { error } = await (await import("../lib/supabase")).getSupabaseClient().auth.updateUser({ password, data: { first_name: firstName.trim(), last_name: lastName.trim(), username: username.trim() } });
      if (error) throw new Error(error.message);
      if (photo) {
        const { data: sessionData } = await getSupabaseClient().auth.getSession();
        if (!sessionData.session) throw new Error("Ta session n'est plus active. Reconnecte-toi puis réessaie.");
        const form = new FormData(); form.append("photo", photo);
        const response = await fetch("/api/auth/profile-photo", { method: "POST", headers: { Authorization: `Bearer ${sessionData.session.access_token}` }, body: form });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.message || "La photo n'a pas pu être enregistrée.");
      }
      let recruiterShareToken: string | null = null;
      try {
        recruiterShareToken = window.sessionStorage.getItem("jobly:recruiter-share-token");
        if (recruiterShareToken) window.sessionStorage.removeItem("jobly:recruiter-share-token");
      } catch {}
      if (recruiterShareToken && /^[A-Za-z0-9_-]{20,80}$/.test(recruiterShareToken)) {
        window.location.assign(`/recruiter/onboarding?shareToken=${encodeURIComponent(recruiterShareToken)}`);
        return;
      }
      setJourneyIndex(0);
      goTo("journey");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Impossible de finaliser le compte."); } finally { setBusy(false); }
  }
  async function forgot() { if (!email.includes("@")) return setMessage("Entre l'adresse e-mail associée à ton compte."); setBusy(true); setMessage(""); try { await requestPasswordReset(email); goTo("reset-sent"); } catch (e) { setMessage(e instanceof Error ? e.message : "Impossible d'envoyer l'e-mail de récupération."); } finally { setBusy(false); } }

  return <main ref={homeRootRef} className={`relative isolate flex w-full flex-col ${screen === "welcome" ? "jobly-public-home bg-white text-[#0A1931]" : "min-h-[100dvh] overflow-x-hidden bg-off-white dark:bg-[#0A1931] dark:text-white overflow-y-auto"}`}>
    {screen === "welcome" && <BubbleField />}
    <div className="relative z-10 flex min-h-0 flex-1 w-full flex-col gap-0">
      {!["login", "signup", "signup-otp", "signup-password", "forgot", "reset-sent"].includes(screen) && <header className={screen === "welcome" ? "jobly-public-home-header relative z-30 flex shrink-0 items-center justify-between px-4 pt-[max(4px,env(safe-area-inset-top))] sm:h-[104px] sm:px-8" : "relative z-20 flex h-[84px] w-full shrink-0 items-start px-4 pt-5 sm:px-8"}>
        <div ref={logoRef} className={screen === "welcome" ? "shrink-0" : "rounded-2xl bg-white/95 p-2 shadow-2xl"}>
          <Image src="/jobly-logo-official-transparent.png" alt="JOBLY — Your Career OS" width={400} height={120} className={screen === "welcome" ? "h-auto w-[116px] object-contain sm:w-[175px]" : "h-auto w-[150px] object-contain"} priority />
        </div>
        {screen === "welcome" && <div role="group" aria-label="Choisir la langue / Choose language" className="relative isolate flex items-center gap-1 rounded-full bg-[#EEF1F5] p-1.5 shadow-inner">
          <motion.button type="button" aria-label="Français" aria-pressed={lang === "fr"} whileTap={{ scale: 0.94 }} onClick={() => { setLang("fr"); setHeadlineIndex(0); try { localStorage.setItem("jobly-lang", "fr"); } catch {} }} className="relative isolate inline-flex min-w-[64px] items-center justify-center gap-1 rounded-full px-2 py-2.5 text-[13px] font-bold tracking-wide text-[#0A1931] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD60A] focus-visible:ring-offset-2">
            {lang === "fr" && <motion.span layoutId="jobly-language-active" transition={{ type: "spring", stiffness: 420, damping: 32 }} className="absolute inset-0 -z-10 rounded-full bg-white shadow-[0_2px_9px_rgba(10,25,49,0.13)]" />}
            <motion.span aria-hidden="true" animate={lang === "fr" ? { y: [0, -1, 0], rotate: [0, -3, 0, 3, 0] } : { y: 0, rotate: 0 }} transition={lang === "fr" ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.18 }} className="relative z-10 text-[21px] leading-none">🇫🇷</motion.span>
            <span className="relative z-10">FR</span>
          </motion.button>
          <motion.button type="button" aria-label="English" aria-pressed={lang === "en"} whileTap={{ scale: 0.94 }} onClick={() => { setLang("en"); setHeadlineIndex(0); try { localStorage.setItem("jobly-lang", "en"); } catch {} }} className="relative isolate inline-flex min-w-[64px] items-center justify-center gap-1 rounded-full px-2 py-2.5 text-[13px] font-bold tracking-wide text-[#0A1931] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD60A] focus-visible:ring-offset-2">
            {lang === "en" && <motion.span layoutId="jobly-language-active" transition={{ type: "spring", stiffness: 420, damping: 32 }} className="absolute inset-0 -z-10 rounded-full bg-white shadow-[0_2px_9px_rgba(10,25,49,0.13)]" />}
            <motion.span aria-hidden="true" animate={lang === "en" ? { y: [0, -1, 0], rotate: [0, -3, 0, 3, 0] } : { y: 0, rotate: 0 }} transition={lang === "en" ? { duration: 2.8, repeat: Infinity, ease: "easeInOut" } : { duration: 0.18 }} className="relative z-10 text-[21px] leading-none">🇬🇧</motion.span>
            <span className="relative z-10">EN</span>
          </motion.button>
        </div>}
      </header>}
      {screen === "welcome" && (
        <>
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={lang}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.32, ease: "easeOut" }}
              className="jobly-public-home-hero relative z-10 mx-auto flex w-full max-w-[1200px] flex-1 flex-col overflow-hidden lg:flex-row lg:items-center lg:px-10"
            >
              <div className="jobly-public-home-hero-inner relative w-full flex-1">
                <div aria-hidden="true" className="pointer-events-none absolute right-[7%] top-[13%] z-[3] text-[#FFD60A]">
                  <svg viewBox="0 0 54 58" className="h-12 w-12 sm:h-14 sm:w-14" fill="none">
                    <path d="M25 1l4.5 17.5L47 23l-17.5 4.5L25 45l-4.5-17.5L3 23l17.5-4.5L25 1Z" fill="currentColor"/>
                    <path d="M46 38l2.2 7.8L56 48l-7.8 2.2L46 58l-2.2-7.8L36 48l7.8-2.2L46 38Z" fill="currentColor" opacity=".65"/>
                  </svg>
                </div>
                <div className="jobly-public-home-copy relative z-20 ml-4 sm:ml-8 lg:ml-0 lg:mt-0 lg:w-[43%]">
                  <h1 className="font-[var(--font-inter)] text-[clamp(2rem,7.4vw,3.8rem)] font-extrabold leading-[0.98] tracking-[-1.25px] text-[#0A1931]">
                    {translations[lang].title.split("\n").map((line, i) => (
                      <span key={i} className="block">{line}</span>
                    ))}
                  </h1>
                  <svg aria-hidden="true" width="56" height="8" viewBox="0 0 56 8" className="mt-4 overflow-visible sm:mt-5">
                    <path d="M2 2 C18 6 39 6 54 2" fill="none" stroke="#FFD60A" strokeWidth="5" strokeLinecap="round" />
                  </svg>
                  <div aria-live="off" className="relative mt-3 h-[76px] w-full max-w-[220px] sm:mt-4 sm:h-[80px] sm:max-w-[250px]">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.p
                        key={`${lang}-${headlineIndex}`}
                        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 7 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -7 }}
                        transition={{ duration: prefersReducedMotion ? 0.18 : 0.55, ease: "easeOut" }}
                        className="absolute inset-0 flex items-center font-[var(--font-inter)] text-[13px] font-semibold leading-[1.3] tracking-[-0.01em] text-[#27364A] sm:text-[15px]"
                      >
                        {HOME_HEADLINES[lang][headlineIndex]}
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>
                <div className="jobly-public-home-image pointer-events-none absolute bottom-0 right-[-10%] top-[10%] z-10 w-[82%] sm:right-[-5%] sm:top-[8%] sm:w-[78%] lg:right-0 lg:top-[2%] lg:w-[62%]">
                  <Image
                    fill
                    priority
                    src="/hero-jobly-community.webp"
                    alt="Des jeunes professionnels africains réunis au sein de la communauté Jobly"
                    sizes="(max-width: 640px) 82vw, 62vw"
                    className="object-cover object-top drop-shadow-[0_18px_34px_rgba(10,25,49,0.16)]"
                    style={{
                      WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 16%, black 100%), linear-gradient(to bottom, transparent 0%, black 8%, black 86%, transparent 100%)",
                      maskImage: "linear-gradient(to right, transparent 0%, black 16%, black 100%), linear-gradient(to bottom, transparent 0%, black 8%, black 86%, transparent 100%)",
                      WebkitMaskComposite: "destination-in",
                      maskComposite: "intersect",
                    }}
                  />
                </div>
              </div>
            </motion.section>
          </AnimatePresence>
          <div className="jobly-public-home-cta relative z-20 mx-auto grid min-h-[52px] w-full max-w-[1100px] grid-cols-2 gap-2 px-4 sm:min-h-[66px] sm:gap-5 sm:px-8" aria-busy={Boolean(homeStory)}>
            {homeStory === "signup" ? (
              <HomeCtaStory kind="signup" lang={lang} onComplete={() => finishHomeStory("signup")} />
            ) : (
              <button type="button" onClick={() => startHomeStory("signup")} className="min-h-[52px] rounded-[18px] bg-[#2865DC] px-2 font-[var(--font-inter)] font-extrabold text-white shadow-[0_10px_24px_rgba(40,101,220,0.2)] transition-transform hover:-translate-y-0.5 active:scale-[0.97] sm:h-[66px] sm:rounded-[22px] sm:text-[17px]">
                {translations[lang].create}
              </button>
            )}
            {homeStory === "login" ? (
              <HomeCtaStory kind="login" lang={lang} onComplete={() => finishHomeStory("login")} />
            ) : (
              <button type="button" onClick={() => startHomeStory("login")} className="min-h-[52px] rounded-[18px] bg-[#FFD60A] px-2 font-[var(--font-inter)] font-extrabold text-[#0A1931] shadow-[0_10px_24px_rgba(255,214,10,0.2)] transition-transform hover:-translate-y-0.5 active:scale-[0.97] sm:h-[66px] sm:rounded-[22px] sm:text-[17px]">
                {translations[lang].login}
              </button>
            )}
          </div>
          <div className="jobly-public-home-benefits relative z-20 mx-auto mt-2 grid w-full max-w-[1100px] grid-cols-2 gap-2 px-3 sm:mt-6 sm:grid-cols-4 sm:gap-3 sm:px-6 lg:gap-4 lg:px-8">
            {BENEFITS[lang].map(({ Icon, kind, title, subtitle, iconClass }) => {
              const metric = kind === "offers"
                ? homeStats?.offersCount ?? null
                : kind === "talents"
                  ? homeStats?.talentsCount ?? null
                  : null;
              const displayedMetric = metric === null
                ? null
                : metric + (kind === "offers" ? PUBLIC_HOME_OFFERS_BASE : PUBLIC_HOME_TALENTS_BASE);

              return (
                <div key={title} className="flex min-w-0 flex-col items-center justify-center rounded-[16px] border border-slate-100 bg-white px-1 py-2 text-center shadow-[0_5px_18px_rgba(10,25,49,0.055)] sm:min-h-[124px] sm:rounded-[24px] sm:px-2 sm:py-3 lg:rounded-[28px] lg:px-3">
                  <Icon className={`mb-1 h-6 w-6 sm:mb-2 sm:h-7 sm:w-7 ${iconClass}`} />
                  <p className="font-[var(--font-inter)] text-[10px] font-extrabold leading-tight text-[#0A1931] sm:text-[14px]">{title}</p>
                  {kind !== "static" && (
                    <div className="mt-1 font-[var(--font-inter)] text-[18px] font-extrabold leading-none tracking-tight text-[#0A1931] sm:text-[25px]">
                      <AnimatedCounter value={displayedMetric} locale={lang === "fr" ? "fr-FR" : "en-US"} />
                    </div>
                  )}
                  <p className="mt-1 font-[var(--font-inter)] text-[9px] leading-tight text-[#737A85] sm:text-[12px]">{subtitle}</p>
                </div>
              );
            })}
          </div>
        </>
      )}

            {screen === "login" && (
        <AuthExperienceShell
          language={lang}
          eyebrow={lang === "fr" ? "ESPACE PERSONNEL" : "YOUR ACCOUNT"}
          title={translations[lang].loginTitle}
          description={translations[lang].loginSubtitle}
          headerAction={
            <button type="button" onClick={toggleDarkMode} aria-label={darkMode ? "Désactiver le mode nuit" : "Activer le mode nuit"} className="grid h-10 w-10 place-items-center rounded-xl border border-[#E8EDF4] bg-white text-base shadow-sm transition hover:border-[#C7D3E3] dark:border-white/10 dark:bg-white/10 dark:text-white">
              {darkMode ? "☀️" : "🌙"}
            </button>
          }
          footer={
            <p className="text-center text-[13px] text-[#6E7A8C] dark:text-slate-300">
              {translations[lang].noAccount}{" "}
              <button type="button" onClick={() => { reset(); goTo("signup"); }} className="font-extrabold text-[#2457A7] underline-offset-4 hover:underline dark:text-[#91B7FF]">Créer un compte</button>
            </p>
          }
        >
          <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); login(); }}>
            <label className="block">
              <span className="mb-2 block text-[12px] font-bold text-[#344258] dark:text-slate-200">{translations[lang].username}</span>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex. Kenzi" autoComplete="username" autoCapitalize="none" spellCheck={false} required className="h-[54px] w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-[15px] font-medium text-[#0A1931] outline-none transition placeholder:text-[#A4ADBA] hover:border-[#C8D3E1] focus:border-[#2457A7] focus:bg-white focus:ring-4 focus:ring-[#2457A7]/10 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-white/10" />
            </label>
            <label className="block">
              <span className="mb-2 block text-[12px] font-bold text-[#344258] dark:text-slate-200">{translations[lang].password}</span>
              <div className="flex h-[54px] items-center rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 transition hover:border-[#C8D3E1] focus-within:border-[#2457A7] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2457A7]/10 dark:border-white/10 dark:bg-white/5 dark:focus-within:bg-white/10">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="w-full bg-transparent text-[15px] font-medium text-[#0A1931] outline-none placeholder:text-[#A4ADBA] dark:text-white dark:placeholder:text-slate-500" placeholder="••••••••" />
                <button type="button" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setShowPassword((value) => !value)} className="ml-3 shrink-0 text-[#7D8998] transition hover:text-[#2457A7] dark:text-slate-400"><EyeIcon open={showPassword} /></button>
              </div>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <label className="flex items-center gap-2 text-[12px] font-semibold text-[#536176] dark:text-slate-300">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMeState(e.target.checked)} className="h-4 w-4 rounded accent-[#FFD60A]" />
                Rester connecté
              </label>
              <button type="button" onClick={() => { setMessage(""); goTo("forgot"); }} className="text-[12px] font-extrabold text-[#2457A7] hover:underline dark:text-[#91B7FF]">{translations[lang].forgot}</button>
            </div>

            <button type="submit" disabled={busy} aria-busy={busy} className="mt-1 flex h-[54px] w-full items-center justify-center rounded-2xl bg-[#FFD60A] px-5 text-[14px] font-extrabold text-[#0A1931] shadow-[0_10px_24px_rgba(255,214,10,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(255,214,10,0.28)] active:translate-y-0 disabled:cursor-wait disabled:opacity-60">
              {busy ? "Connexion…" : `${translations[lang].login} →`}
            </button>

            <div className="flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-[#E8EDF4] dark:bg-white/10" />
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A0AAB8]">{translations[lang].or}</span>
              <span className="h-px flex-1 bg-[#E8EDF4] dark:bg-white/10" />
            </div>

            <button type="button" onClick={google} disabled={busy} className="flex h-[54px] w-full items-center justify-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white text-[13px] font-bold text-[#24344B] shadow-sm transition hover:border-[#B9C8DC] hover:bg-[#FAFBFD] disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
              <GoogleIcon className="h-5 w-5" />
              {translations[lang].google}
            </button>
            <p className="-mt-2 text-center text-[10px] text-[#9AA4B2] dark:text-slate-500">{lang === "fr" ? "Le sélecteur Google te permet de choisir le compte à utiliser." : "Google will let you choose which account to use."}</p>

            {message && <div role="alert" aria-live="assertive" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-[12px] font-semibold leading-5 text-red-700">{message}</div>}
          </form>
        </AuthExperienceShell>
      )}

      {screen === "signup" && (
        <AuthExperienceShell
          language={lang}
          eyebrow={lang === "fr" ? "REJOINDRE JOBLY" : "JOIN JOBLY"}
          title={translations[lang].signupTitle}
          description={translations[lang].signupSubtitle}
          step={1}
          stepLabel={lang === "fr" ? "Informations" : "Details"}
          footer={
            <p className="text-center text-[13px] text-[#6E7A8C] dark:text-slate-300">
              {lang === "fr" ? "Tu as déjà un compte ?" : "Already have an account?"}{" "}
              <button type="button" onClick={() => { reset(); goTo("login"); }} className="font-extrabold text-[#2457A7] underline-offset-4 hover:underline dark:text-[#91B7FF]">{translations[lang].login}</button>
            </p>
          }
        >
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); startSignup(); }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[12px] font-bold text-[#344258] dark:text-slate-200">{translations[lang].lastName}</span>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" required placeholder="BITSEKI" className="h-[52px] w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-[14px] text-[#0A1931] outline-none transition placeholder:text-[#A4ADBA] focus:border-[#2457A7] focus:bg-white focus:ring-4 focus:ring-[#2457A7]/10 dark:border-white/10 dark:bg-white/5 dark:text-white" />
              </label>
              <label className="block">
                <span className="mb-2 block text-[12px] font-bold text-[#344258] dark:text-slate-200">{translations[lang].firstName}</span>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required placeholder="MAYAKA" className="h-[52px] w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-[14px] text-[#0A1931] outline-none transition placeholder:text-[#A4ADBA] focus:border-[#2457A7] focus:bg-white focus:ring-4 focus:ring-[#2457A7]/10 dark:border-white/10 dark:bg-white/5 dark:text-white" />
              </label>
            </div>
            <label className="block">
              <span className="mb-2 block text-[12px] font-bold text-[#344258] dark:text-slate-200">{translations[lang].phone}</span>
              <div className="flex h-[52px] items-center rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 transition focus-within:border-[#2457A7] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2457A7]/10 dark:border-white/10 dark:bg-white/5 dark:focus-within:bg-white/10">
                <CountryPicker country={country} placeholder={translations[lang].countrySearch} onChange={(value) => { setCountry(value); setPhone(""); }} />
                <span className="mx-2 h-6 w-px bg-[#E2E8F0] dark:bg-white/10" />
                <input value={formatPhoneDisplay(phone, country.code)} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 15))} inputMode="tel" autoComplete="tel" required placeholder={country.code === "CM" ? "6 12 34 56 78" : "Numéro"} className="min-w-0 w-full bg-transparent text-[14px] text-[#0A1931] outline-none dark:text-white" />
              </div>
            </label>
            <label className="block">
              <span className="mb-2 block text-[12px] font-bold text-[#344258] dark:text-slate-200">{translations[lang].email}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" required placeholder="vous@exemple.com" className="h-[52px] w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-[14px] text-[#0A1931] outline-none transition placeholder:text-[#A4ADBA] focus:border-[#2457A7] focus:bg-white focus:ring-4 focus:ring-[#2457A7]/10 dark:border-white/10 dark:bg-white/5 dark:text-white" />
            </label>
            <button type="submit" disabled={busy} aria-busy={busy} className="mt-2 flex h-[54px] w-full items-center justify-center rounded-2xl bg-[#FFD60A] px-5 text-[14px] font-extrabold text-[#0A1931] shadow-[0_10px_24px_rgba(255,214,10,0.22)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{busy ? "Envoi du code…" : translations[lang].continue + " →"}</button>
            {message && <div role="status" aria-live="polite" className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center text-[12px] font-semibold leading-5 text-blue-800">{message}</div>}
          </form>
        </AuthExperienceShell>
      )}

      {screen === "signup-otp" && (
        <AuthExperienceShell
          language={lang}
          eyebrow={lang === "fr" ? "VÉRIFICATION DE L’E-MAIL" : "EMAIL VERIFICATION"}
          title={translations[lang].verifyTitle}
          description={`${translations[lang].verifyText} ${email}.`}
          step={2}
          stepLabel={lang === "fr" ? "Vérification" : "Verification"}
          footer={<p className="text-center text-[12px] text-[#8792A2]">{lang === "fr" ? "Ton adresse e-mail reste liée à ton compte JOBLY." : "Your email stays linked to your JOBLY account."}</p>}
        >
          <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); verifySignupOtp(); }}>
            <div className="relative rounded-2xl border border-[#DDE5EF] bg-[#F8FAFC] p-3 transition focus-within:border-[#2457A7] focus-within:ring-4 focus-within:ring-[#2457A7]/10 dark:border-white/10 dark:bg-white/5">
              <div className="grid grid-cols-6 gap-2" aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => (
                  <span key={index} className={`grid h-[54px] place-items-center rounded-xl border text-xl font-extrabold text-[#0A1931] dark:text-white ${otp[index] ? "border-[#FFD60A] bg-white dark:bg-white/10" : "border-[#E4EAF2] bg-white/70 dark:border-white/10 dark:bg-white/5"}`}>{otp[index] || "·"}</span>
                ))}
              </div>
              <input value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} required aria-label={translations[lang].codePlaceholder} className="absolute inset-0 h-full w-full cursor-text opacity-[0.015]" />
            </div>
            <button type="submit" disabled={busy || otp.length !== 6} aria-busy={busy} className="flex h-[54px] w-full items-center justify-center rounded-2xl bg-[#FFD60A] text-[14px] font-extrabold text-[#0A1931] shadow-[0_10px_24px_rgba(255,214,10,0.22)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Vérification…" : translations[lang].verify + " →"}</button>
            <div className="text-center">
              <p className="text-[12px] text-[#8792A2]">{lang === "fr" ? "Tu n’as pas reçu le code ?" : "Didn't receive the code?"}</p>
              <button type="button" onClick={resendSignupOtp} disabled={busy || resendBusy} className="mt-1 text-[12px] font-extrabold text-[#2457A7] hover:underline disabled:opacity-50 dark:text-[#91B7FF]">{resendBusy ? "Envoi…" : translations[lang].resend}</button>
            </div>
            {message && <div role="status" aria-live="polite" className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center text-[12px] font-semibold leading-5 text-blue-800">{message}</div>}
          </form>
        </AuthExperienceShell>
      )}

      {screen === "signup-password" && (
        <AuthExperienceShell
          language={lang}
          eyebrow={lang === "fr" ? "SÉCURISER TON COMPTE" : "SECURE YOUR ACCOUNT"}
          title={translations[lang].finalTitle}
          description={translations[lang].finalSubtitle}
          step={3}
          stepLabel={lang === "fr" ? "Accès personnel" : "Personal access"}
        >
          <div className="mb-5 flex items-center gap-4 rounded-2xl border border-[#E8EDF4] bg-[#F8FAFC] p-3 dark:border-white/10 dark:bg-white/5">
            <label className="group relative block shrink-0 cursor-pointer">
              <span className="relative grid h-[64px] w-[64px] place-items-center overflow-hidden rounded-2xl border-2 border-[#FFD60A] bg-[#FFF8D8] text-[#2457A7]">
                {preview ? <img src={preview} alt="Photo de profil" className="h-full w-full object-cover" /> : <CameraIcon />}
              </span>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => choosePhoto(e.target.files?.[0])} />
            </label>
            <div className="min-w-0">
              <p className="text-[12px] font-extrabold text-[#1D2C42] dark:text-white">Personnalise ton espace</p>
              <p className="mt-1 text-[11px] leading-5 text-[#8792A2] dark:text-slate-400">Ajoute une photo maintenant ou plus tard depuis ton profil.</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="mb-2 block text-[12px] font-bold text-[#344258] dark:text-slate-200">{translations[lang].username}</span>
              <div className="relative">
                <input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").slice(0, 40))} autoComplete="username" placeholder="Kenzi" aria-invalid={usernameStatus === "taken"} required className={`h-[52px] w-full rounded-2xl border bg-[#F8FAFC] px-4 pr-11 text-[14px] font-semibold text-[#0A1931] outline-none transition focus:ring-4 focus:ring-[#2457A7]/10 dark:bg-white/5 dark:text-white ${usernameStatus === "taken" ? "border-red-400" : usernameStatus === "available" ? "border-[#FFD60A]" : "border-[#E2E8F0] focus:border-[#2457A7] dark:border-white/10"}`} />
                {usernameStatus === "available" && <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#16834B]" aria-hidden="true">✓</span>}
                {usernameStatus === "checking" && <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[11px] text-slate-400" aria-hidden="true">…</span>}
              </div>
              <p className="mt-1.5 text-[10px] text-[#929EAE]">{translations[lang].usernameFormatHint}</p>
              {usernameStatus === "taken" && <p className="mt-1 text-[11px] font-bold text-red-600" role="alert">{translations[lang].usernameTaken}</p>}
            </label>

            <label className="block">
              <span className="mb-2 block text-[12px] font-bold text-[#344258] dark:text-slate-200">{translations[lang].password}</span>
              <div className="flex h-[52px] items-center rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 transition focus-within:border-[#2457A7] focus-within:bg-white focus-within:ring-4 focus-within:ring-[#2457A7]/10 dark:border-white/10 dark:bg-white/5 dark:focus-within:bg-white/10">
                <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required className="w-full bg-transparent text-[14px] text-[#0A1931] outline-none dark:text-white" placeholder="••••••••" />
                <button type="button" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setShowPassword((value) => !value)} className="ml-3 text-slate-400"><EyeIcon open={showPassword} /></button>
              </div>
            </label>
            <PasswordStrengthGauge password={password} />
            <p className="text-[10px] leading-[1.45] text-[#8792A2] dark:text-slate-400">{translations[lang].conditions}</p>
            <label className="flex items-start gap-2.5 text-[11px] leading-5 text-[#647184] dark:text-slate-300">
              <input type="checkbox" checked={privacyAccepted} onChange={(e) => setPrivacyAccepted(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#FFD60A]" />
              <span>{translations[lang].accept}</span>
            </label>
            <button type="button" onClick={finishSignup} disabled={busy} aria-busy={busy} className="flex h-[54px] w-full items-center justify-center rounded-2xl bg-[#FFD60A] text-[14px] font-extrabold text-[#0A1931] shadow-[0_10px_24px_rgba(255,214,10,0.22)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-50">{busy ? "Création…" : translations[lang].signup + " →"}</button>
            {message && <div role="alert" aria-live="assertive" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-[12px] font-semibold leading-5 text-red-700">{message}</div>}
          </div>
        </AuthExperienceShell>
      )}

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
                  Je suis <span className="font-black tracking-[-0.055em]"><span className="text-white">J'</span><span className="text-[#39D7FF]">I</span><span className="bg-gradient-to-br from-[#39D7FF] via-[#5BCBFF] to-[#FFE135] bg-clip-text text-transparent">A</span></span>,
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
        <AuthExperienceShell
          language={lang}
          eyebrow={lang === "fr" ? "RÉCUPÉRER L’ACCÈS" : "ACCOUNT RECOVERY"}
          title={translations[lang].forgotTitle}
          description={translations[lang].forgotText}
          headerAction={
            <button type="button" onClick={toggleDarkMode} aria-label={darkMode ? "Désactiver le mode nuit" : "Activer le mode nuit"} className="grid h-10 w-10 place-items-center rounded-xl border border-[#E8EDF4] bg-white text-base shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-white">{darkMode ? "☀️" : "🌙"}</button>
          }
        >
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); forgot(); }}>
            <label className="block">
              <span className="mb-2 block text-[12px] font-bold text-[#344258] dark:text-slate-200">{translations[lang].email}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" required placeholder="vous@exemple.com" className="h-[54px] w-full rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 text-[14px] text-[#0A1931] outline-none transition placeholder:text-[#A4ADBA] focus:border-[#2457A7] focus:bg-white focus:ring-4 focus:ring-[#2457A7]/10 dark:border-white/10 dark:bg-white/5 dark:text-white" />
            </label>
            <button type="submit" disabled={busy} aria-busy={busy} className="mt-1 flex h-[54px] w-full items-center justify-center rounded-2xl bg-[#FFD60A] text-[14px] font-extrabold text-[#0A1931] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{busy ? "Envoi…" : translations[lang].reset + " →"}</button>
            <button type="button" onClick={() => goTo("login")} className="h-11 text-[12px] font-extrabold text-[#2457A7] hover:underline dark:text-[#91B7FF]">← {translations[lang].login}</button>
            {message && <div role="status" aria-live="polite" className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-center text-[12px] font-semibold leading-5 text-blue-800">{message}</div>}
          </form>
        </AuthExperienceShell>
      )}
      {screen === "reset-sent" && (
        <AuthExperienceShell
          language={lang}
          eyebrow={lang === "fr" ? "E-MAIL ENVOYÉ" : "EMAIL SENT"}
          title={translations[lang].sentTitle}
          description={translations[lang].sentText}
          footer={<p className="text-center text-[12px] text-[#8792A2]">{lang === "fr" ? "Pense à vérifier tes courriers indésirables." : "Remember to check your spam folder."}</p>}
        >
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 grid h-20 w-20 place-items-center rounded-[26px] bg-[#FFF7D6] text-3xl" aria-hidden="true">✉️</div>
            <button type="button" onClick={() => { reset(); goTo("login"); }} className="flex h-[54px] w-full items-center justify-center rounded-2xl bg-[#FFD60A] text-[14px] font-extrabold text-[#0A1931] shadow-[0_10px_24px_rgba(255,214,10,0.2)]">{translations[lang].backLogin} →</button>
          </div>
        </AuthExperienceShell>
      )}

{message && screen !== "journey" && screen !== "jia-welcome" && !["login", "signup", "signup-otp", "signup-password", "forgot", "reset-sent"].includes(screen) && <div role="status" aria-live="polite" className="rounded-2xl border border-blue-100 bg-blue-50 px-3.5 py-2.5 text-center text-xs text-blue-800">{message}</div>}
      {!["journey", "jia-welcome", "login", "signup", "signup-otp", "signup-password", "forgot", "reset-sent"].includes(screen) && <footer className={screen === "welcome" ? "jobly-public-home-footer relative z-30 mt-auto w-full px-3 text-center sm:px-4 sm:pb-6 sm:pt-5" : "absolute bottom-0 left-0 right-0 z-30 px-4 pb-4 pt-2 text-center"}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`footer-${lang}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.28, ease: "easeOut" }}>
            
            
            {screen === "welcome" && (
              <>
                <div className="jobly-public-home-footer-divider mx-auto h-px w-[120px] bg-slate-200"/>
                <div className="jobly-public-home-footer-trail relative mx-auto h-[12px] w-[120px]" aria-hidden="true">
                  <motion.svg viewBox="0 0 120 29" className="absolute inset-0 h-full w-full">
                    <motion.path d="M58 27 C44 23 46 12 61 9 C72 7 77 2 74 0" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: [0, 0.7, 0.12, 0] }} transition={{ duration: 2.2, ease: "easeOut" }} />
                  </motion.svg>
                </div>
                <p className="jobly-public-home-footer-signature mt-1 text-[13px] leading-none text-[#5F6670] sm:mt-2 sm:text-[15px]">Built with <span ref={heartTargetRef} className="mx-[2px] inline-block h-[14px] w-[22px] align-[-3px]" aria-hidden="true">&nbsp;</span> by Team <strong className="ml-1 text-[17px] font-extrabold text-[#FFD60A] sm:text-[18px]">M</strong></p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </footer>}
    </div>
    {screen === "welcome" && heartPath && (
      <motion.span
        className="pointer-events-none fixed left-0 top-0 z-[60] grid h-[18px] w-[18px] place-items-center text-[16px] leading-none drop-shadow-[0_2px_5px_rgba(239,68,68,0.28)]"
        initial={{ x: heartPath.startX, y: heartPath.startY, scale: 0.94 }}
        animate={{ x: heartPath.endX, y: heartPath.endY, scale: [0.94, 1.06, 1] }}
        transition={{
          x: { duration: 2.65, ease: [0.16, 1, 0.3, 1] },
          y: { duration: 2.65, ease: [0.16, 1, 0.3, 1] },
          scale: { duration: 2.65, ease: "easeOut" },
        }}
        aria-hidden="true"
      >
        <span className="block">❤️</span>
      </motion.span>
    )}
  </main>;
}
