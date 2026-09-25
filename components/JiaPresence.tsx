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

  const modeRef = useRef<"text" | "voice">("text");
  const langRef = useRef(lang);
  const enabledRef = useRef(true);
  const recognition = useRef<RecognitionLike | null>(null);
  const shouldRestart = useRef(true);
  const lastAction = useRef("");
  const lastPrediction = useRef("");
  const lastRequest = useRef(0);
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
  const visible = true; // TEST TEMPORAIRE — diagnostic runtime J’IA
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
      const response = await fetch("/api/jia/health", { cache: "no-store" });
      setHealthStatus(response.ok ? "ready" : "error");
    } catch {
      setHealthStatus("error");
    }
  }, []);

  const sendTextCommand = useCallback(async () => {
    const command = commandInput.trim();
    if (!command || commandBusy) return;
    setCommandBusy(true);
    setCommandInput("");
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session?.access_token) throw new Error("Session requise.");
      const response = await fetch("/api/jia/brain", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ message: command, path: pathRef.current, ecosystem: ecosystemOf(pathRef.current), lang: langRef.current }),
      });
      const out = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(out.message || "J’IA est momentanément indisponible.");
      const nextSources = Array.isArray(out.sources) ? out.sources.filter((source: unknown): source is { title: string; url: string; snippet?: string } => Boolean(source && typeof source === "object" && "url" in source && typeof source.url === "string" && /^https?:\/\//i.test(source.url))).slice(0, 5) : [];
      setSourceLinks(nextSources);
      const sourceSuffix = nextSources.length
        ? `\n\nSources vérifiables : ${nextSources.slice(0, 3).map((source: { title: string; url: string }) => source.title || source.url).join(" · ")}`
        : "";
      const proposedType = out.proposedAction?.type as string | undefined;
      if (proposedType) setPendingAction({ type: proposedType, message: command, target: out.proposedAction?.target });
      say(`${out.message || "Je suis prête à t’aider."}${sourceSuffix}`, {
        gesture: proposedType ? "analyze" : "reassure",
        move: out.proposedAction ? "point_button" : undefined,
        speak: true,
        sticky: true,
      });
    } catch (error) {
      say(error instanceof Error ? error.message : "Je n’ai pas réussi à répondre.", { gesture: "secure", sticky: true, speak: false });
    } finally {
      setCommandBusy(false);
    }
  }, [commandBusy, commandInput, router, say]);

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
      say("C’est préparé. Je t’ouvre l’espace correspondant.", { gesture: "welcome", speak: true, sticky: true });
      if (pendingAction.target || result.next) router.push(pendingAction.target || result.next);
    } catch (error) {
      say(error instanceof Error ? error.message : "Je n’ai pas pu préparer cette action.", { gesture: "secure", sticky: true, speak: false });
    } finally {
      setCommandBusy(false);
    }
  }, [pendingAction, router, say]);

  // ── Réponses externes, gestes sémantiques (window.jia.play) ──────────────
  useEffect(() => {
    const onResponse = (event: Event) => {
      const d = (event as CustomEvent<{ message?: string; gesture?: JiaGesture }>).detail;
      if (d?.message) say(d.message, { gesture: d.gesture || "reassure" });
    };
    window.addEventListener("jobly:jia-response", onResponse);
    return () => window.removeEventListener("jobly:jia-response", onResponse);
  }, [say]);

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
        {/* Bulle de message + panneau d’actions — ancrés au personnage */}
        <AnimatePresence>
          {(bubble || panelOpen) && (
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
              {panelOpen && (
                <div data-jia-panel className="w-full rounded-[20px] border border-line bg-white p-3 shadow-[0_16px_40px_rgba(10,25,49,.16)]">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[13px] font-black text-ink">{t("jia.panel.title")}</div>
                    <span className="rounded-full bg-canari-blue-soft px-2 py-1 text-[10px] font-extrabold text-canari-blue">{healthStatus === "checking" ? "Vérification…" : healthStatus === "error" ? "Connexion à vérifier" : healthStatus === "ready" ? "J’IA connectée" : statusLabel}</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-4 text-muted">Parle-lui ou écris-lui ce que tu veux faire. J’IA répond et te guide vers l’action suivante.</p>
                  {pendingAction && (
                    <div className="mt-2 rounded-xl border border-canari-blue/30 bg-canari-blue-soft p-2.5 text-[11px] text-ink">
                      <p className="font-extrabold">J’IA attend ton autorisation pour préparer cette action.</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => void confirmPendingAction()} disabled={commandBusy} className="min-h-8 rounded-lg bg-canari-blue px-3 text-[11px] font-extrabold text-white disabled:opacity-50">Autoriser</button>
                        <button type="button" onClick={() => setPendingAction(null)} disabled={commandBusy} className="min-h-8 rounded-lg border border-line px-3 text-[11px] font-extrabold text-muted">Annuler</button>
                      </div>
                    </div>
                  )}
                  <form onSubmit={(event) => { event.preventDefault(); void sendTextCommand(); }} className="mt-2.5 flex items-center gap-2 rounded-xl border border-line bg-white p-1.5 focus-within:border-canari-blue">
                    <input value={commandInput} onChange={(event) => setCommandInput(event.target.value)} placeholder="Ex. Trouve-moi un emploi" aria-label="Message à J’IA" className="min-w-0 flex-1 bg-transparent px-2 py-2 text-xs font-semibold text-ink outline-none placeholder:text-muted" disabled={commandBusy} />
                    <button type="submit" aria-label="Envoyer à J’IA" disabled={commandBusy || !commandInput.trim()} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-canari-blue text-white disabled:opacity-40">{commandBusy ? "…" : "↑"}</button>
                  </form>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {CHIPS[eco].map((c) => (
                      <button key={c.href} type="button" onClick={() => go(c.href)}
                        className="min-h-[36px] rounded-full bg-canari-blue-soft px-3 text-[12px] font-extrabold text-canari-blue transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-canari-blue">
                        {t(c.key)}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2">
                    <button type="button" onClick={() => go(SETTINGS_HREF[eco])} className="min-h-[36px] text-[12px] font-extrabold text-canari-blue underline-offset-2 hover:underline">{t("jia.panel.settings")}</button>
                    <button type="button" onClick={() => { setPanelOpen(false); setHiddenPaths((p) => [...p, pathname]); }} className="min-h-[36px] text-[12px] font-bold text-muted hover:text-ink">{t("jia.hideOnPage")}</button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {showFigure ? (
          <div className="relative w-[96px] sm:w-[120px]" style={{ aspectRatio: "1200 / 1248", minHeight: "99px" }} onPointerDown={(e) => dragControls.start(e)}>
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
      </motion.div>
    </>
  );
}
