"use client";

/**
 * J’IA — présence intelligente, intégrée à l’interface (jamais au-dessus du contenu).
 *
 * Chaîne : CONTEXTE → INTENTION → MESSAGE → GESTE → POSITION → VOIX → ACTION
 *   • CONTEXTE  : route, préférences par écosystème, dernière action, langue FR/EN ;
 *   • INTENTION : commande vocale (mot-clé « J’IA ») ou proposition proactive (/api/jia/predict) ;
 *   • MESSAGE   : bulle canari (#FFE135 / bleu #0057B8, identité validée) ;
 *   • GESTE     : vocabulaire sémantique lib/jia/gestures.ts → mouvements du rig (JIA.tsx) ;
 *   • POSITION  : ancrée au-dessus de la BottomNav, déplaçable à la main uniquement ;
 *   • VOIX      : Web Speech (FR/EN), uniquement en mode Vocal ;
 *   • ACTION    : événements jobly:jia-command / jobly:jia-response + Brain serveur.
 *
 * Règles UX (refonte 21/09/2026) :
 *   – taille réduite (≈ 96–120 px) ; mode « bulle-visage » (launcher) pour libérer l’écran ;
 *   – elle ne bloque jamais : masquée pendant la saisie clavier, sous une modale, ou sur
 *     les écrans d’authentification / onboarding ; réductible et masquable par page ;
 *   – aucun mouvement aléatoire permanent : le rig ne joue un geste que sur une intention ;
 *   – la barrière financière (lib/jia/guard.ts) s’applique avant tout geste, voix ou action.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import JIA3D from "./JIA/JIA3D";
import type { JIAMove } from "./JIA/JIA";
import type { JiaGesture } from "./WaterScene";
import { GESTURE_TO_MOVE } from "./JIA/gestureMap";
import { useOutfit, type Outfit } from "@/lib/jia/outfit";
import { GESTURES, type GestureId } from "@/lib/jia/gestures";
import { commandIntent, extractWakeCommand, isFinancialRequest } from "@/lib/jia/guard";
import { getSupabaseClient } from "../lib/supabase";
import { useI18n, type DictKey } from "@/lib/i18n";
import { decide as decideAutonomy, observe as observeAutonomy } from "@/lib/jia/autonomy";
import JiaConversationSurface, { type JiaConversationMessage } from "@/components/jia/JiaConversationSurface";
import {
  buildJiaPracticeQuestionnaire,
  detectJiaWorkspaceIntent,
  type JiaWorkspaceBlock,
  type JiaWorkspaceIntent,
  type JiaWorkspaceOffer,
} from "@/lib/jia/workspace";


type Ecosystem = "TALENT" | "RECRUITER" | "PARTNER";
type Bubble = { id: number; text: string; gesture?: JiaGesture; move?: JIAMove };
type Prefs = { enabled: boolean; mode: "text" | "voice"; proactive: boolean };

type RecognitionLike = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void;
};
type RecognitionConstructor = new () => RecognitionLike;
declare global {
  interface Window {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
    jia?: { play: (gesture: GestureId, opts?: { message?: string; target?: string }) => void; stop: () => void };
  }
}

// Écrans où J’IA ne s’affiche jamais (auth, onboarding, pages publiques, scène dédiée).
const HIDDEN_ROUTES = [/^\/$/, /^\/ecosystem/, /^\/auth\//, /^\/onboarding/, /^\/legal\//, /^\/cv\/share\//, /^\/pass\//, /^\/download/, /^\/join/, /^\/recruiter\/discover\//, /^\/admin/];
// Écrans denses (formulaires, ATS, CV, paiement) : J’IA démarre en bulle-visage.
const COMPACT_ROUTES = [/^\/recruiter\/jobs\/new/, /^\/recruiter\/onboarding/, /^\/partner\/onboarding/, /^\/recruiter\/ats/, /^\/talent\/cvs/, /^\/abonnement/, /^\/partner\/(payment|kyc)/, /^\/recruiter\/settings/, /^\/talent\/settings/, /^\/partner\/settings/];
// Écrans sensibles : le texte visible n’est jamais transmis au modèle proactif.
const SENSITIVE_ROUTES = [/^\/abonnement/, /^\/partner\/(payment|kyc)/, /settings/, /reset-password/, /^\/talent\/cvs/, /^\/pass\//];

const COLLAPSE_KEY = "jobly-jia-collapsed";
const PREDICT_MIN_INTERVAL = 30_000;

function ecosystemOf(pathname: string): Ecosystem {
  if (pathname.startsWith("/recruiter")) return "RECRUITER";
  if (pathname.startsWith("/partner")) return "PARTNER";
  return "TALENT";
}

const CHIPS: Record<Ecosystem, { key: DictKey; href: string }[]> = {
  TALENT: [
    { key: "jia.panel.jobs", href: "/jobs" },
    { key: "jia.panel.careerOs", href: "/career-os" },
    { key: "jia.panel.applications", href: "/candidatures" },
  ],
  RECRUITER: [
    { key: "jia.panel.myJobs", href: "/recruiter/jobs" },
    { key: "jia.panel.candidates", href: "/recruiter/candidatures" },
    { key: "jia.panel.ats", href: "/recruiter/ats" },
  ],
  PARTNER: [
    { key: "jia.panel.dashboard", href: "/partner" },
    { key: "jia.panel.referral", href: "/partner/referral" },
    { key: "jia.panel.commissions", href: "/partner/payment" },
  ],
};
const SETTINGS_HREF: Record<Ecosystem, string> = { TALENT: "/talent/settings", RECRUITER: "/recruiter/settings", PARTNER: "/partner/settings" };

async function loadJiaWorkspace(
  intent: JiaWorkspaceIntent,
  command: string,
  accessToken: string,
): Promise<JiaWorkspaceBlock | null> {
  if (!intent) return null;
  const headers = { Authorization: "Bearer " + accessToken };

  if (intent === "OFFERS") {
    const scope = /\bafrique\b/i.test(command) ? "&scope=africa" : "";
    const roleMatch = command.match(/\b(?:offre|emploi|poste)\s+(?:de|pour)\s+(.+?)(?:\s+(?:à|au|aux|en|dans|avec)\b|[?.!,]|$)/i);
    const query = roleMatch?.[1]?.trim().slice(0, 80);
    const search = query ? "&q=" + encodeURIComponent(query) : "";
    const response = await fetch("/api/jobs?limit=5" + scope + search, { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Le flux des offres est momentanément indisponible.");
    const jobs = Array.isArray(json.jobs) ? json.jobs : [];
    return {
      kind: "offers",
      totalAvailable: Number(json.totalAvailable) || 0,
      matchingCount: Number(json.matchingCount) || 0,
      offers: jobs.slice(0, 5).map((job: Record<string, any>) => ({
        id: String(job.id || ""),
        source: job.source === "recruiter" ? "recruiter" : "discovery",
        title: String(job.title || "Offre sans titre"),
        companyName: typeof job.company?.name === "string" ? job.company.name : null,
        location: typeof job.location === "string" ? job.location : null,
        contractType: typeof job.contractType === "string" ? job.contractType : null,
        remoteMode: typeof job.remoteMode === "string" ? job.remoteMode : null,
        matchPercent: Number.isFinite(Number(job.matchPercent)) ? Number(job.matchPercent) : null,
        deadline: typeof job.deadline === "string" ? job.deadline : null,
        sourceUrl: typeof job.sourceUrl === "string" ? job.sourceUrl : null,
        applicationReady: job.applicationReady === true,
      })).filter((job: JiaWorkspaceOffer) => Boolean(job.id)),
    };
  }

  if (intent === "APPLICATIONS") {
    const response = await fetch("/api/applications", { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Le suivi des candidatures est indisponible.");
    const applications = Array.isArray(json.applications) ? json.applications : [];
    return {
      kind: "applications",
      counters: {
        envoyees: Number(json.counters?.envoyees) || 0,
        vues: Number(json.counters?.vues) || 0,
        entretien: Number(json.counters?.entretien) || 0,
      },
      applications: applications.slice(0, 8).map((item: Record<string, any>) => ({
        id: String(item.id || ""),
        status: String(item.status || "UNKNOWN"),
        statusLabel: String(item.statusLabel || item.status || "À suivre"),
        createdAt: String(item.createdAt || ""),
        updatedAt: String(item.updatedAt || ""),
        job: item.job ? {
          title: String(item.job.title || "Offre"),
          companyName: typeof item.job.companyName === "string" ? item.job.companyName : null,
          location: typeof item.job.location === "string" ? item.job.location : null,
        } : null,
      })).filter((item: { id: string }) => Boolean(item.id)),
    };
  }

  if (intent === "PROFILE") {
    const response = await fetch("/api/profile", { headers, cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(json.message || "Le profil Talent est indisponible.");
    const user = json.user || {};
    const profile = json.profile || {};
    const skills = Array.isArray(json.skills) ? json.skills.map((skill: any) => String(skill?.name || "")).filter(Boolean) : [];
    return {
      kind: "profile",
      displayName: String(user.displayName || [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Profil Talent"),
      email: typeof user.email === "string" ? user.email : null,
      headline: String(profile.headline || ""),
      summary: String(profile.summary || ""),
      skills,
      experiences: Array.isArray(json.experiences) ? json.experiences.slice(0, 5).map((item: any) => ({
        title: String(item?.title || ""),
        company: String(item?.company || ""),
        startDate: typeof item?.startDate === "string" ? item.startDate : null,
        endDate: typeof item?.endDate === "string" ? item.endDate : null,
        description: typeof item?.description === "string" ? item.description : null,
      })) : [],
      education: Array.isArray(json.education) ? json.education.slice(0, 4).map((item: any) => ({
        institution: String(item?.institution || ""),
        degree: typeof item?.degree === "string" ? item.degree : null,
        field: typeof item?.field === "string" ? item.field : null,
        startDate: typeof item?.startDate === "string" ? item.startDate : null,
        endDate: typeof item?.endDate === "string" ? item.endDate : null,
      })) : [],
      experienceCount: Array.isArray(json.experiences) ? json.experiences.length : 0,
      educationCount: Array.isArray(json.education) ? json.education.length : 0,
      cvOriginalUrl: typeof user.cvOriginalUrl === "string" ? user.cvOriginalUrl : null,
      cvOriginalFileName: typeof user.cvOriginalFileName === "string" ? user.cvOriginalFileName : null,
    };
  }

  const practice = buildJiaPracticeQuestionnaire(command);
  const response = await fetch("/api/career-journey/assessments", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({
      competency: practice.competency,
      title: practice.title,
      objective: practice.objective,
      format: "MCQ",
      adaptive: false,
      voiceAllowed: true,
      questions: practice.questions.map((question) => ({ prompt: question.prompt, choices: question.choices })),
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(json.message || "Je n'ai pas pu créer cet exercice.");
  const assessmentId = typeof json.assessment?.id === "string" ? json.assessment.id : "";
  if (!assessmentId) throw new Error("L'évaluation n'a pas reçu d'identifiant Jobly.");
  return {
    kind: "questionnaire",
    assessmentId,
    title: practice.title,
    competency: practice.competency,
    objective: practice.objective,
    questions: practice.questions,
  };
}


function speak(text: string, lang: "fr" | "en", onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "en" ? "en-US" : "fr-FR";
  u.rate = 0.94;
  u.pitch = 1.04;
  u.onend = () => onEnd?.();
  u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
  // Certains navigateurs suspendent SpeechSynthesis après un changement de route.
  window.setTimeout(() => {
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
  }, 80);
}

function isTypingTarget(el: Element | null) {
  if (!el || el.closest("[data-jia-panel]")) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (el as HTMLElement).isContentEditable === true;
}

/** Visage de J’IA (recadrage du master validé) — sert de bouton lorsqu’elle est réduite. */
function FaceLauncher({ onClick, label, listening, outfit }: { onClick: () => void; label: string; listening: boolean; outfit: Outfit }) {
  // Chaque tenue a désormais son propre head.webp (public/jia/outfits/<outfit>/) : le visage
  // n'est plus partagé, donc le lanceur réduit doit connaître la tenue courante.
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className="relative grid h-[52px] w-[52px] place-items-center overflow-hidden rounded-full border-2 border-canari-blue bg-canari-soft shadow-[0_10px_26px_rgba(0,87,184,.28)] transition active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/30">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/jia/outfits/${outfit}/head.webp`} alt="" aria-hidden="true" className="h-[54px] w-[54px] scale-[1.7] translate-y-[6px] object-contain" />
      {listening && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500" />}
    </button>
  );
}

export default function JiaPresence() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { t, lang } = useI18n();
  const eco = ecosystemOf(pathname);

  const [signedIn, setSignedIn] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ enabled: true, mode: "text", proactive: true });
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [gesture, setGesture] = useState<JiaGesture>("welcome");
  const [move, setMove] = useState<JIAMove | undefined>(undefined);
  const outfit = useOutfit();
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedHere, setExpandedHere] = useState(false);
  const [hiddenPaths, setHiddenPaths] = useState<string[]>([]);
  const [typing, setTyping] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const [commandBusy, setCommandBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: string; message: string; target?: string } | null>(null);
  const [sourceLinks, setSourceLinks] = useState<Array<{ title: string; url: string; snippet?: string }>>([]);
  const [healthStatus, setHealthStatus] = useState<"idle" | "checking" | "ready" | "error">("idle");
  const [recentDialogue, setRecentDialogue] = useState<string[]>([]);
  const [conversationMessages, setConversationMessages] = useState<JiaConversationMessage[]>([]);

  const modeRef = useRef<"text" | "voice">("text");
  const langRef = useRef(lang);
  const enabledRef = useRef(true);
  const recognition = useRef<RecognitionLike | null>(null);
  const shouldRestart = useRef(true);
  const lastAction = useRef("");
  const lastPrediction = useRef("");
  const lastRequest = useRef(0);
  const externalSignalRef = useRef<{ summary: string; confidence: number; status: "CONFIRMED" | "LIKELY" | "CONTESTED" | "UNKNOWN" } | undefined>(undefined);
  const bubbleTimer = useRef<number | null>(null);
  const idSeq = useRef(0);
  const introSpoken = useRef(false);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const wasDragged = useRef(false);
  const tRef = useRef(t);
  const pathRef = useRef(pathname);

  tRef.current = t;
  pathRef.current = pathname;
  langRef.current = lang;
  enabledRef.current = prefs.enabled;

  const hiddenRoute = HIDDEN_ROUTES.some((r) => r.test(pathname));
  const compactRoute = COMPACT_ROUTES.some((r) => r.test(pathname));
  const sensitiveRoute = SENSITIVE_ROUTES.some((r) => r.test(pathname));
  const hiddenHere = hiddenPaths.includes(pathname);
  const showFigure = compactRoute ? expandedHere : !collapsed;
  const visible = signedIn && prefs.enabled && !hiddenRoute && !hiddenHere;
  const suspended = typing || dialogOpen;

  // ── Message / voix ────────────────────────────────────────────────────────
  const dismissBubble = useCallback(() => {
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = null;
    setBubble(null);
  }, []);

  const say = useCallback((text: string, opts?: { gesture?: JiaGesture; move?: JIAMove; speak?: boolean; sticky?: boolean }) => {
    if (!text) return;
    idSeq.current += 1;
    setBubble({ id: idSeq.current, text, gesture: opts?.gesture, move: opts?.move });
    if (opts?.gesture) setGesture(opts.gesture);
    setMove(opts?.move);
    if (opts?.move && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("jobly:jia-move", { detail: { move: opts.move, autonomous: true } }));
    }
    if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current);
    if (!opts?.sticky) bubbleTimer.current = window.setTimeout(() => setBubble(null), 12_000);
    if (opts?.speak !== false && modeRef.current === "voice") {
      setSpeaking(true);
      speak(text, langRef.current, () => setSpeaking(false));
    }
  }, []);

  // ── Session + préférences par écosystème ─────────────────────────────────
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        if (!active) return;
        if (!session?.access_token) { setSignedIn(false); return; }
        setSignedIn(true);
        const res = await fetch(`/api/jia/preferences?ecosystem=${eco}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
        if (!res.ok || !active) return;
        const data = await res.json();
        const mode = data.interaction_mode === "voice" ? "voice" : "text";
        modeRef.current = mode;
        setPrefs({ enabled: data.access_enabled !== false, mode, proactive: data.proactive_recommendations !== false });
        if (mode === "voice") {
          shouldRestart.current = true;
          window.setTimeout(() => startListening(), 250);
        } else {
          shouldRestart.current = false;
          recognition.current?.stop();
          recognition.current = null;
        }
      } catch { /* silence : pas d’état optimiste sur les préférences */ }
    })();
    return () => { active = false; };
  }, [pathname, eco]);

  // Réduction persistée (préférence d’affichage locale).
  useEffect(() => { try { setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1"); } catch {} }, []);
  useEffect(() => {
    setPanelOpen(false);
    setExpandedHere(false);
    const pageGesture: JiaGesture = pathname.startsWith("/jobs") ? "curious" : pathname.startsWith("/candidatures") ? "reassure" : pathname.startsWith("/career") ? "analyze" : pathname.startsWith("/recruiter") ? "proud" : pathname.startsWith("/partner") ? "welcome" : "curious";
    setGesture(pageGesture);
    setMove(undefined);
  }, [pathname]);

  // ── Ne jamais gêner : saisie clavier, modales ouvertes ───────────────────
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => setTyping(isTypingTarget(e.target as Element | null));
    const onFocusOut = () => setTyping(false);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    let raf = 0;
    const check = () => { raf = 0; setDialogOpen(!!document.querySelector('[role="dialog"][aria-modal="true"]')); };
    const observer = new MutationObserver(() => { if (!raf) raf = window.requestAnimationFrame(check); });
    observer.observe(document.body, { childList: true, subtree: true });
    check();
    return () => {
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  // ── Voix : reconnaissance + mot-clé « J’IA » ─────────────────────────────
  const startListening = useCallback(() => {
    if (typeof window === "undefined" || modeRef.current !== "voice" || !enabledRef.current) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setVoiceSupported(false); return; }
    if (recognition.current) return;
    const r = new Recognition();
    r.continuous = true;
    r.interimResults = false;
    r.lang = langRef.current === "en" ? "en-US" : "fr-FR";
    r.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript: string = result?.[0]?.transcript?.trim() || "";
      const command = extractWakeCommand(transcript);
      if (command === null) return; // pas de mot-clé : on ignore (jamais d’écoute « libre »)
      if (!command) { say(tRef.current("jia.reply.yes"), { gesture: "curious" }); return; }
      if (isFinancialRequest(command)) { say(tRef.current("jia.reply.payment"), { gesture: "secure" }); return; }
      const intent = commandIntent(command);
      window.dispatchEvent(new CustomEvent("jobly:jia-command", { detail: { command, intent } }));
      window.dispatchEvent(new CustomEvent("jobly:jia-transcript", { detail: { transcript, command, intent } }));
      void (async () => {
        try {
          const { data: { session } } = await getSupabaseClient().auth.getSession();
          if (!session?.access_token) return;
          const response = await fetch("/api/jia/brain", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify({ message: command, path: pathRef.current, action: intent, ecosystem: ecosystemOf(pathRef.current), lang: langRef.current }),
          });
          if (!response.ok) return;
          const out = await response.json();
          if (out.message) window.dispatchEvent(new CustomEvent("jobly:jia-response", { detail: { message: out.message, gesture: intent === "search_jobs" ? "analyze" : "reassure" } }));
        } catch { /* le Brain est optionnel : la commande locale a déjà ét������ émise */ }
      })();
      if (intent === "assistant_command") say(tRef.current("jia.reply.understood"), { gesture: "analyze" });
    };
    r.onerror = () => setListening(false);
    r.onend = () => {
      setListening(false);
      recognition.current = null;
      if (shouldRestart.current && modeRef.current === "voice" && enabledRef.current) window.setTimeout(startListening, 700);
    };
    recognition.current = r;
    shouldRestart.current = true;
    try { r.start(); setListening(true); } catch { setListening(false); }
  }, [say]);

  // La présence reste montée entre les routes : on relance seulement la reconnaissance vocale.
  useEffect(() => {
    if (recognition.current) {
      recognition.current.stop();
      recognition.current = null;
    }
    if (modeRef.current === "voice" && enabledRef.current) {
      shouldRestart.current = true;
      const timer = window.setTimeout(() => startListening(), 180);
      return () => window.clearTimeout(timer);
    }
  }, [lang, pathname, startListening]);

  useEffect(() => {
    const onInteract = () => {
      if (modeRef.current === "voice") startListening();
      if (!introSpoken.current && modeRef.current === "voice" && enabledRef.current) {
        introSpoken.current = true;
        window.setTimeout(() => speak(tRef.current("jia.intro"), langRef.current), 250);
      }
    };
    window.addEventListener("pointerdown", onInteract, { passive: true });
    window.addEventListener("keydown", onInteract, { passive: true });
    return () => {
      shouldRestart.current = false;
      recognition.current?.stop();
      recognition.current = null;
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, [startListening]);


  useEffect(() => {
    const onPreferencesChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ mode?: "text" | "voice"; enabled?: boolean; proactive?: boolean }>).detail;
      const mode = detail.mode === "voice" ? "voice" : "text";
      modeRef.current = mode;
      enabledRef.current = detail.enabled !== false;
      setPrefs((current) => ({ ...current, mode, enabled: detail.enabled !== false, proactive: detail.proactive !== false }));
      if (mode === "voice" && enabledRef.current) {
        shouldRestart.current = true;
        window.setTimeout(() => startListening(), 150);
      } else {
        shouldRestart.current = false;
        recognition.current?.stop();
        recognition.current = null;
        window.speechSynthesis?.cancel();
      }
    };
    window.addEventListener("jobly:jia-preferences-changed", onPreferencesChanged);
    return () => window.removeEventListener("jobly:jia-preferences-changed", onPreferencesChanged);
  }, [startListening]);

  const checkJiaHealth = useCallback(async () => {
    setHealthStatus("checking");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const response = await fetch("/api/jia/health", {
        cache: "no-store",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      setHealthStatus(response.ok ? "ready" : "error");
    } catch {
      setHealthStatus("error");
    }
  }, []);

  const appendConversationMessage = useCallback((role: "user" | "assistant", text: string, sources?: JiaConversationMessage["sources"], workspace?: JiaWorkspaceBlock) => {
    const normalized = text.trim();
    if (!normalized) return;
    idSeq.current += 1;
    setConversationMessages((current) => [...current, {
      id: `jia-${Date.now()}-${idSeq.current}`,
      role,
      text: normalized,
      createdAt: Date.now(),
      ...(sources?.length ? { sources } : {}),
      ...(workspace ? { workspace } : {}),
    }]);
  }, []);

  useEffect(() => {
    const onTranscript = (event: Event) => {
      const detail = (event as CustomEvent<{ command?: string; transcript?: string }>).detail;
      const text = typeof detail?.command === "string" && detail.command.trim()
        ? detail.command.trim()
        : typeof detail?.transcript === "string" ? detail.transcript.trim() : "";
      if (text) appendConversationMessage("user", text);
    };
    window.addEventListener("jobly:jia-transcript", onTranscript);
    return () => window.removeEventListener("jobly:jia-transcript", onTranscript);
  }, [appendConversationMessage]);

  const sendTextCommand = useCallback(async () => {
    const command = commandInput.trim();
    if (!command || commandBusy) return;
    appendConversationMessage("user", command);
    setCommandBusy(true);
    setCommandInput("");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.access_token) throw new Error("Session requise.");
      const response = await fetch("/api/jia/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          message: command,
          path: pathRef.current,
          ecosystem: ecosystemOf(pathRef.current),
          lang: langRef.current,
          recentDialogue: recentDialogue.slice(-6),
        }),
      });
      const out = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(out.message || "J’IA est momentanément indisponible.");
      const nextSources = Array.isArray(out.sources) ? out.sources.filter((source: unknown): source is { title: string; url: string; snippet?: string } => Boolean(source && typeof source === "object" && "url" in source && typeof source.url === "string" && /^https?:\/\//i.test(source.url))).slice(0, 5) : [];
      setSourceLinks(nextSources);
      const workspaceIntent = detectJiaWorkspaceIntent(command, eco);
      let workspaceBlock: JiaWorkspaceBlock | null = null;
      if (workspaceIntent) {
        try {
          workspaceBlock = await loadJiaWorkspace(workspaceIntent, command, session.access_token);
        } catch (workspaceError) {
          workspaceBlock = {
            kind: "notice",
            title: "Espace Jobly non disponible",
            message: workspaceError instanceof Error ? workspaceError.message : "Le service Jobly demandé n'a pas répondu.",
            href: workspaceIntent === "OFFERS" ? "/jobs" : workspaceIntent === "APPLICATIONS" ? "/candidatures" : workspaceIntent === "PROFILE" ? "/talent/profile" : "/career-journey",
          };
        }
      }
      const answer = typeof out.message === "string" ? out.message.trim() : "";
      const previousAnswer = recentDialogue[recentDialogue.length - 1]?.trim().toLocaleLowerCase();
      if (answer && answer.toLocaleLowerCase() === previousAnswer) {
        throw new Error("J’IA a produit une réponse répétée ; nouvelle réponse demandée.");
      }
      setRecentDialogue((history) => [...history, command, answer].filter(Boolean).slice(-12));
      const proposedType = out.proposedAction?.type as string | undefined;
      appendConversationMessage("assistant", out.message || "Je suis prête à t’aider.", nextSources, workspaceBlock || undefined);
      const sourceSuffix = nextSources.length
        ? `\n\nSources vérifiables : ${nextSources.slice(0, 3).map((source: { title: string; url: string }) => source.title || source.url).join(" · ")}`
        : "";
      if (proposedType) setPendingAction({ type: proposedType, message: command, target: out.proposedAction?.target });
      say(`${out.message || "Je suis prête à t’aider."}${sourceSuffix}`, {
        gesture: proposedType ? "analyze" : "reassure",
        move: out.proposedAction ? "point_button" : undefined,
        speak: true,
        sticky: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Je n’ai pas réussi à répondre.";
      appendConversationMessage("assistant", message);
      say(message, { gesture: "secure", sticky: true, speak: false });
    } finally {
      setCommandBusy(false);
    }
  }, [appendConversationMessage, commandBusy, commandInput, eco, recentDialogue, say]);


  const prepareJiaApplication = useCallback(async (offer: JiaWorkspaceOffer) => {
    setCommandBusy(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.access_token) throw new Error("Session requise pour préparer une candidature.");
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({ source: offer.source, jobId: offer.id, locale: langRef.current === "en" ? "en" : "fr" }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Jobly n'a pas pu préparer cette candidature.");
      const prepared = result.prepared || {};
      const applicationProfile = result.applicationProfile || {};
      const block: JiaWorkspaceBlock = {
        kind: "prepared-application",
        title: offer.title,
        channel: String(prepared.channel?.channel || "À confirmer"),
        subject: String(prepared.subject || ""),
        letter: String(prepared.letter || ""),
        email: typeof applicationProfile.applicationEmail === "string" ? applicationProfile.applicationEmail : null,
        phone: typeof applicationProfile.applicationPhone === "string" ? applicationProfile.applicationPhone : null,
        warnings: Array.isArray(prepared.warnings) ? prepared.warnings.filter((item: unknown): item is string => typeof item === "string") : [],
        sourceUrl: offer.sourceUrl,
      };
      appendConversationMessage(
        "assistant",
        "La candidature pour « " + offer.title + " » a été préparée dans Jobly. Relis le contenu et vérifie le canal ci-dessous : rien n'a été envoyé automatiquement.",
        undefined,
        block,
      );
      say("Ta candidature est préparée et reste sous ton contrôle. Elle n'a pas été envoyée.", { gesture: "welcome", speak: true, sticky: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Impossible de préparer cette candidature.";
      appendConversationMessage("assistant", message);
      say(message, { gesture: "secure", speak: false, sticky: true });
    } finally {
      setCommandBusy(false);
    }
  }, [appendConversationMessage, say]);

  const submitJiaAssessment = useCallback(async (args: {
    messageId: string;
    assessmentId: string;
    answers: Record<string, unknown>;
    score: number;
    resultSummary: string;
  }) => {
    setCommandBusy(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.access_token) throw new Error("Session requise pour enregistrer cet exercice.");
      const response = await fetch("/api/career-journey/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify({
          action: "ATTEMPT",
          assessmentId: args.assessmentId,
          answers: args.answers,
          completed: true,
          feedback: { evaluated: "Auto-évaluation formative locale", limitation: "Le score indicatif est calculé dans l'interface et n'est pas enregistré comme une preuve évaluée par IA ni comme une certification." },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "L'enregistrement de l'évaluation a échoué.");
      setConversationMessages((current) => current.map((message) => {
        if (message.id !== args.messageId || message.workspace?.kind !== "questionnaire") return message;
        return { ...message, workspace: { ...message.workspace, result: { score: args.score, summary: args.resultSummary } } };
      }));
      appendConversationMessage("assistant", "Ton exercice est enregistré dans Career Journey. Le résultat reste indicatif et ne vaut pas certification.");
    } finally {
      setCommandBusy(false);
    }
  }, [appendConversationMessage]);

  const confirmPendingAction = useCallback(async () => {
    if (!pendingAction) return;
    setCommandBusy(true);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      const response = await fetch("/api/jia/action", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ type: pendingAction.type, message: pendingAction.message, confirmed: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || "Action non disponible.");
      setPendingAction(null);
      const confirmation = typeof result.message === "string" && result.message.trim()
        ? result.message.trim()
        : "L’action a été acceptée par le service Jobly.";
      appendConversationMessage("assistant", confirmation);
      say(confirmation, { gesture: "welcome", speak: true, sticky: true });
      if (pendingAction.target || result.next) { setPanelOpen(false); router.push(pendingAction.target || result.next); }
    } catch (error) {
      say(error instanceof Error ? error.message : "Je n’ai pas pu préparer cette action.", { gesture: "secure", sticky: true, speak: false });
    } finally {
      setCommandBusy(false);
    }
  }, [appendConversationMessage, pendingAction, router, say]);

  // ── Candidature externe : ouvrir J'IA avec le contexte de l'offre ─────────
  useEffect(() => {
    const onApplicationAssist = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail || {};
      const prompt = typeof detail.prompt === "string" ? detail.prompt.trim().slice(0, 9000) : "";
      if (!prompt) return;
      setHiddenPaths((current) => current.filter((path) => path !== pathname));
      setCollapsed(false);
      setExpandedHere(true);
      setPanelOpen(true);
      setCommandInput(prompt);
      appendConversationMessage("assistant", "Le contexte de cette candidature externe est prêt. Vérifie les informations puis envoie ta demande pour préparer tes réponses.");
      say("J’ai préparé le contexte de cette candidature. Vérifie la demande dans mon panneau, puis envoie-la pour préparer tes réponses.", { gesture: "analyze", speak: false, sticky: true });
    };
    window.addEventListener("jobly:jia-application-assist", onApplicationAssist);
    return () => window.removeEventListener("jobly:jia-application-assist", onApplicationAssist);
  }, [appendConversationMessage, pathname, say]);

  useEffect(() => {
    window.dispatchEvent(new Event("jobly:jia-ready"));
  }, []);

  // ── Réponses externes, gestes sémantiques (window.jia.play) ──────────────
  useEffect(() => {
    const onResponse = (event: Event) => {
      const d = (event as CustomEvent<{ message?: string; gesture?: JiaGesture }>).detail;
      if (d?.message) {
        appendConversationMessage("assistant", d.message);
        say(d.message, { gesture: d.gesture || "reassure" });
      }
    };
    window.addEventListener("jobly:jia-response", onResponse);
    return () => window.removeEventListener("jobly:jia-response", onResponse);
  }, [appendConversationMessage, say]);

  useEffect(() => {
    const play = (id: GestureId, opts?: { message?: string; target?: string }) => {
      if (!enabledRef.current || !GESTURES[id]) return;
      const spec = GESTURES[id];
      const message = opts?.message ?? "";
      // Défense en profondeur : jamais de voix ni de geste « action » sur un sujet financier.
      const financial = message ? isFinancialRequest(message) : false;
      setTargetRect(null);
      if (opts?.target) {
        try { setTargetRect(document.querySelector(opts.target)?.getBoundingClientRect() ?? null); } catch { /* sélecteur invalide */ }
        window.setTimeout(() => setTargetRect(null), spec.duration + 600);
      }
      if (message) say(message, { move: GESTURE_TO_MOVE[id], speak: !financial });
      else setMove(GESTURE_TO_MOVE[id]);
    };
    const stop = () => { window.speechSynthesis?.cancel(); setSpeaking(false); dismissBubble(); setTargetRect(null); setMove(undefined); };
    window.jia = { play, stop };
    const onPlay = (e: Event) => { const d = (e as CustomEvent<{ gesture: GestureId; message?: string; target?: string }>).detail; if (d?.gesture) play(d.gesture, d); };
    window.addEventListener("jobly:jia-play", onPlay);
    return () => { window.removeEventListener("jobly:jia-play", onPlay); delete window.jia; };
  }, [say, dismissBubble]);

  // ── Autonomie locale : OBSERVER → ÉVALUER → DÉCIDER → AGIR ───────────────
  // Moteur gratuit : aucune API payante n’est nécessaire pour l’initiative de base.
  useEffect(() => {
    if (!visible || !prefs.proactive) return;
    let lastAutonomousAt = 0;
    const cycle = () => {
      if (document.hidden || suspended || panelOpen || bubble || Date.now() - lastAutonomousAt < 12_000) return;
      const text = document.body.innerText.slice(0, 5000);
      const percent = text.match(/(?:profil|profile)[^%]{0,80}(\d{1,3})\s*%/i)?.[1];
      const w = window as Window & { __jiaIdleMs?: number };
      const decision = decideAutonomy(observeAutonomy({
        path: pathname,
        lastAction: lastAction.current,
        idleMs: Math.min(300_000, w.__jiaIdleMs || 0),
        recentActions: [lastAction.current].filter(Boolean),
        profileCompletion: percent ? Math.min(100, Number(percent)) : undefined,
        matchingOffers: pathname.includes("/jobs") ? document.querySelectorAll('a[href*="/jobs/"]').length : 0,
        pendingApplications: pathname.includes("/candidatures") ? document.querySelectorAll('[data-application], a[href*="candidatures"]').length : 0,
        currentLanguage: langRef.current === "en" ? "en" : "fr",
        externalSignal: externalSignalRef.current,
      }));
      if (!decision) return;
      lastAutonomousAt = Date.now();
      say(decision.message[langRef.current === "en" ? "en" : "fr"], {
        gesture: decision.gesture,
        move: decision.move,
        speak: decision.speak,
      });
      window.dispatchEvent(new CustomEvent("jobly:jia-autonomous-decision", { detail: decision }));
    };
    const onActivity = () => { (window as Window & { __jiaIdleMs?: number }).__jiaIdleMs = 0; };
    const idleTimer = window.setInterval(() => {
      const w = window as Window & { __jiaIdleMs?: number };
      w.__jiaIdleMs = Math.min(300_000, (w.__jiaIdleMs || 0) + 1_000);
      cycle();
    }, 5_000);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    cycle();
    return () => {
      window.clearInterval(idleTimer);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [visible, prefs.proactive, pathname, suspended, panelOpen, bubble, say]);

  // ── Cycle cognitif unifié : la présence UI alimente le même cerveau que le reste du produit ──
  useEffect(() => {
    if (!visible || !prefs.proactive || sensitiveRoute) return;
    let active = true;
    const runCycle = async () => {
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        if (!session?.access_token || document.hidden || !active) return;
        const response = await fetch("/api/jia/cycle", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            ecosystem: ecosystemOf(pathname),
            path: pathRef.current,
            action: lastAction.current,
            includeInternet: false,
          }),
        });
        if (!response.ok || !active) return;
        const result = await response.json();
        window.dispatchEvent(new CustomEvent("jobly:jia-cognitive-cycle", { detail: result }));
        const recommendation = result?.recommendations?.[0];
        if (recommendation?.title && recommendation?.confidence !== "LOW") {
          externalSignalRef.current = undefined;
          say(recommendation.title, { gesture: "analyze", speak: false });
        }
      } catch {
        // Le cycle cognitif est opportuniste côté UI : l’autonomie offline reste indépendante.
      }
    };
    const initial = window.setTimeout(runCycle, 15_000);
    const interval = window.setInterval(runCycle, 300_000);
    return () => { active = false; window.clearTimeout(initial); window.clearInterval(interval); };
  }, [visible, prefs.proactive, pathname, sensitiveRoute, say]);

  // ── Internet Brain : perception externe proactive ───────────────────────
  useEffect(() => {
    if (!visible || !prefs.proactive || sensitiveRoute) return;
    if (!/\/jobs|\/career|\/recruiter|\/partner|\/candidatures/.test(pathname)) return;
    let active = true;
    const queryForRoute = () => {
      const action = lastAction.current.replace(/[^a-zA-ZÀ-ÿ0-9 _-]/g, " ").trim().slice(0, 100);
      if (pathname.startsWith("/recruiter")) return "recrutement emploi Cameroun " + action;
      if (pathname.startsWith("/partner")) return "partenariat emploi Cameroun " + action;
      if (pathname.includes("/career")) return "carrière compétences emploi Cameroun " + action;
      if (pathname.includes("/candidatures")) return "candidature recrutement emploi Cameroun " + action;
      return "offres emploi Cameroun " + action;
    };
    const requestExternalSignal = async () => {
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        if (!session?.access_token || document.hidden || !active) return;
        const res = await fetch("/api/jia/internet", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ query: queryForRoute(), mode: "PROACTIVE", maxQueries: 1, maxSources: 5 }),
        });
        if (!res.ok || !active) return;
        const signal = await res.json() as {
          type?: string; proposal?: string;
          beliefCandidate?: { confidence?: number; status?: "CONFIRMED"|"LIKELY"|"CONTESTED"|"UNKNOWN"; belief?: string };
          observation?: { internetAvailable?: boolean; confidence?: number; status?: "CONFIRMED"|"LIKELY"|"CONTESTED"|"UNKNOWN"; facts?: string[]; sourcesUsed?: Array<{title?:string;url?:string}> };
        };
        window.dispatchEvent(new CustomEvent("jobly:jia-external-signal", { detail: signal }));
        const o = signal.observation;
        const confidence = signal.beliefCandidate?.confidence ?? o?.confidence ?? 0;
        const status = signal.beliefCandidate?.status ?? o?.status ?? "UNKNOWN";
        const summary = signal.beliefCandidate?.belief || o?.facts?.[0] || "";
        if (o?.internetAvailable && summary) {
          externalSignalRef.current = { summary: summary.slice(0, 280), confidence, status };
          try {
            const key = "jobly-jia-internet-memory-v1";
            const prior = JSON.parse(window.localStorage.getItem(key) || "[]") as Array<{summary:string;confidence:number;status:string;at:string}>;
            const next = [{summary:summary.slice(0,280),confidence,status,at:new Date().toISOString()},...prior].slice(0,50);
            window.localStorage.setItem(key, JSON.stringify(next));
          } catch {}
        }
      } catch { /* Internet Brain failure never stops offline autonomy. */ }
    };
    const timer = window.setTimeout(requestExternalSignal, 20_000);
    const interval = window.setInterval(requestExternalSignal, 300_000);
    return () => { active = false; window.clearTimeout(timer); window.clearInterval(interval); };
  }, [visible, prefs.proactive, pathname, sensitiveRoute]);

  // ── Proactivité (si autorisée) ───────────────────────���───────────────────
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const el = (event.target as HTMLElement | null)?.closest("button,a,[role=button],input,select,textarea") as HTMLElement | null;
      if (!el) return;
      const label = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("name") || "").trim().replace(/\s+/g, " ").slice(0, 220);
      if (label) lastAction.current = label;
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!visible || !prefs.proactive) return;
    let timer: number | null = null;
    const request = async () => {
      const now = Date.now();
      if (now - lastRequest.current < PREDICT_MIN_INTERVAL || document.hidden) return;
      lastRequest.current = now;
      try {
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        if (!session?.access_token) return;
        const res = await fetch("/api/jia/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            path: pathname, action: lastAction.current, lang: langRef.current,
            visibleText: sensitiveRoute ? "" : document.body.innerText.slice(0, 1200),
            recentDialogue: lastPrediction.current ? [lastPrediction.current] : [], idleMs: 0,
          }),
        });
        if (!res.ok) return;
        const next = await res.json() as { message?: string; gesture?: string; shouldSpeak?: boolean };
        if (!next.message || next.message === lastPrediction.current) return;
        lastPrediction.current = next.message;
        say(next.message, { gesture: (next.gesture as JiaGesture) || "curious", speak: next.shouldSpeak === true });
      } catch { /* proactivité facultative */ }
    };
    const schedule = (delay: number) => { if (timer) window.clearTimeout(timer); timer = window.setTimeout(request, delay); };
    schedule(pathname === "/" ? 8_000 : 2_500);
    void checkJiaHealth();
    const interval = window.setInterval(request, PREDICT_MIN_INTERVAL);
    const onActivity = () => schedule(4_000);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    return () => {
      if (timer) window.clearTimeout(timer);
      window.clearInterval(interval);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [checkJiaHealth, pathname, visible, prefs.proactive, sensitiveRoute, say]);

  useEffect(() => () => { if (bubbleTimer.current) window.clearTimeout(bubbleTimer.current); }, []);
  useEffect(() => { if (!speaking) return; const id = window.setTimeout(() => setSpeaking(false), 30_000); return () => window.clearTimeout(id); }, [speaking]);

  // ── Actions UI ───────────────────────────────────────────────────────────
  function minimize() {
    setPanelOpen(false);
    dismissBubble();
    if (compactRoute) { setExpandedHere(false); return; }
    setCollapsed(true);
    try { window.localStorage.setItem(COLLAPSE_KEY, "1"); } catch {}
  }
  function expand() {
    if (compactRoute) { setExpandedHere(true); return; }
    setCollapsed(false);
    try { window.localStorage.removeItem(COLLAPSE_KEY); } catch {}
  }
  function go(href: string) { setPanelOpen(false); router.push(href); }

  const enableVoiceFromConversation = useCallback(() => {
    if (!voiceSupported) return;
    window.dispatchEvent(new CustomEvent("jobly:jia-preferences-changed", {
      detail: { mode: "voice", enabled: true, proactive: prefs.proactive },
    }));
  }, [prefs.proactive, voiceSupported]);

  if (!visible) return null;

  const statusLabel = prefs.mode === "voice"
    ? (voiceSupported ? (listening ? t("jia.state.listening") : t("jia.state.voice")) : t("jia.state.voiceUnavailable"))
    : t("jia.state.text");

  return (
    <>
      <div ref={constraintsRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[44]" />

      {targetRect && (
        <div aria-hidden="true" className="pointer-events-none fixed z-[44] rounded-xl border-[3px] border-canari-blue"
          style={{ left: targetRect.left - 4, top: targetRect.top - 4, width: targetRect.width + 8, height: targetRect.height + 8 }} />
      )}

      <motion.div
        drag dragControls={dragControls} dragListener={false} dragMomentum={false} dragElastic={0.05} dragConstraints={constraintsRef}
        onDragStart={() => { wasDragged.current = true; }}
        onDragEnd={() => { window.setTimeout(() => { wasDragged.current = false; }, 60); }}
        aria-label={t("jia.aria")}
        className={`fixed right-2 z-[45] flex flex-col items-end gap-2 sm:right-4 ${suspended ? "pointer-events-none invisible" : "pointer-events-auto"}`}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)", touchAction: "none" }}
        animate={{ opacity: suspended ? 0 : 1 }} transition={{ duration: 0.15 }}
      >
        {!panelOpen && (
          <>
        {/* Bulle de message + panneau d’actions — ancrés au personnage */}
        <AnimatePresence>
          {bubble && !panelOpen && (
            <motion.div key="stack" initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6 }} transition={{ duration: 0.2 }}
              className="absolute bottom-full right-0 mb-2 flex w-[min(280px,calc(100vw-24px))] flex-col items-end gap-2">
                  {bubble && (
                <div role="status" aria-live="polite" className="relative w-full rounded-[18px] border-2 border-canari-blue bg-canari py-2.5 pl-3.5 pr-9 text-[13px] font-extrabold leading-[1.4] text-canari-blue shadow-[0_12px_30px_rgba(0,87,184,.2)]">
                  {bubble.text}
                  {sourceLinks.length > 0 && (
                    <div className="mt-2 border-t border-canari-blue/20 pt-2 text-[10px] font-semibold">
                      <p className="mb-1 font-black uppercase tracking-[0.08em]">Sources consultées</p>
                      <div className="flex flex-col gap-1">
                        {sourceLinks.map((source) => (
                          <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="truncate underline underline-offset-2 hover:opacity-70">{source.title || source.url}</a>
                        ))}
                      </div>
                    </div>
                  )}
                  <button type="button" onClick={dismissBubble} aria-label={t("jia.dismiss")}
                    className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full text-canari-blue/70 hover:bg-white/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canari-blue">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </div>
              )}

            </motion.div>
          )}
        </AnimatePresence>

        {showFigure ? (
          <div className="relative w-[96px] sm:w-[120px]" style={{ aspectRatio: "1200 / 1248" }} onPointerDown={(e) => dragControls.start(e)}>
            <button type="button" onClick={() => { if (!wasDragged.current) setPanelOpen((v) => !v); }} aria-expanded={panelOpen} aria-label={t("jia.open")} title={t("jia.move")}
              className="absolute inset-0 cursor-grab rounded-3xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/30 active:cursor-grabbing">
              <JIA3D speaking={speaking} />
            </button>
            <button type="button" onClick={minimize} aria-label={t("jia.minimize")} title={t("jia.minimize")}
              className="absolute -left-1 top-0 grid h-9 w-9 place-items-center rounded-full border border-line bg-white/95 text-muted shadow-md transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canari-blue">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M6 12h12" /></svg>
            </button>
            {prefs.mode === "voice" && (
              <span aria-hidden="true" className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-canari-blue bg-canari px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-canari-blue">
                {statusLabel}
              </span>
            )}
          </div>
        ) : (
          <div onPointerDown={(e) => dragControls.start(e)}>
            <FaceLauncher onClick={() => { if (!wasDragged.current) expand(); }} label={t("jia.open")} listening={listening} outfit={outfit} />
          </div>
        )}
          </>
        )}
      </motion.div>

      <JiaConversationSurface
        open={panelOpen}
        ecosystem={eco}
        messages={conversationMessages}
        inputValue={commandInput}
        busy={commandBusy}
        status={healthStatus}
        voiceMode={prefs.mode === "voice"}
        listening={listening}
        speaking={speaking}
        pendingAction={pendingAction}
        quickLinks={[...CHIPS[eco].map((item) => ({ label: t(item.key), href: item.href })), { label: "Extension J’IA pour ordinateur", href: "/jia/extension" }]}
        onClose={() => { setPanelOpen(false); dismissBubble(); }}
        onInputChange={setCommandInput}
        onSubmit={() => void sendTextCommand()}
        onConfirmAction={() => void confirmPendingAction()}
        onCancelAction={() => setPendingAction(null)}
        onNavigate={(href) => href === "/jia/extension" ? go("/jia/extension") : go(href)}
        onPrepareApplication={prepareJiaApplication}
        onSubmitAssessment={submitJiaAssessment}
        onEnableVoice={voiceSupported ? enableVoiceFromConversation : undefined}
      />
    </>
  );
}
