"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { JiaCharacter, type JiaGesture } from "./WaterScene";
import { getSupabaseClient } from "../lib/supabase";

type Prediction = { message: string; gesture: JiaGesture; shouldSpeak: boolean; target?: string };
type RecognitionLike = { continuous: boolean; interimResults: boolean; lang: string; onresult: ((event: any) => void) | null; onerror: ((event: any) => void) | null; onend: (() => void) | null; start: () => void; stop: () => void };
type RecognitionConstructor = new () => RecognitionLike;
declare global { interface Window { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor } }

const DEFAULT: Prediction = { message: "Pour me donner une action, commence toujours ta phrase par « J’IA ». ", gesture: "welcome", shouldSpeak: false };

function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) { onEnd?.(); return; }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = document.documentElement.lang?.startsWith("en") ? "en-US" : "fr-FR";
  u.rate = 0.94; u.pitch = 1.04;
  u.onend = () => onEnd?.(); u.onerror = () => onEnd?.();
  window.speechSynthesis.speak(u);
}

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[’‘`]/g, "'").replace(/\\s+/g, " ").trim();
}
function extractWakeCommand(transcript: string) {
  const clean = normalize(transcript);
  const match = clean.match(/^J\\s*'?IA(?:\\s|,|$)/i);
  if (!match) return null;
  return clean.slice(match[0].length).replace(/^[,;:\\s]+/, "").trim();
}
function isPaymentCommand(command: string) {
  return /\\b(paie|payer|paiement|payes|paye|transfere|transfert|argent|transaction|checkout)\\b/i.test(command);
}
function commandIntent(command: string) {
  const c = normalize(command).toLowerCase();
  if (/\\b(recherche|cherche|trouve|montre).*(offre|emploi|poste)|\\b(offres|emplois).*(compatible|correspond|match)/.test(c)) return "search_jobs";
  if (/\\b(postule|postuler|candidature|envoie.*candidature|envoie.*cv)/.test(c)) return "apply_job";
  if (/\\b(ouvre|ouvrir|affiche).*(offre|poste|emploi)/.test(c)) return "open_job";
  if (/\\b(sauvegarde|enregistre|favori|garde).*(offre|poste|emploi)/.test(c)) return "save_job";
  if (/\\b(filtre|filtrer|uniquement).*/.test(c)) return "filter_jobs";
  return "assistant_command";
}

export default function JiaPresence() {
  const pathname = usePathname();
  const [prediction, setPrediction] = useState<Prediction>(DEFAULT);
  const [speaking, setSpeaking] = useState(false);
  const [viewport, setViewport] = useState({ w: 1280, h: 800 });
  const [interacted, setInteracted] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [jiaEnabled, setJiaEnabled] = useState(true);
  const [interactionMode, setInteractionMode] = useState<"text" | "voice">("text");
  const interactionModeRef = useRef<"text" | "voice">("text");
  const recognition = useRef<RecognitionLike | null>(null);
  const shouldRestart = useRef(true);
  const lastAction = useRef(""); const lastPrediction = useRef("");
  const pending = useRef<number | null>(null); const lastRequest = useRef(0);
  const introSpoken = useRef(false);

  const say = (message: string, gesture: JiaGesture = "reassure") => {
    const canSpeak = interactionModeRef.current === "voice";
    setPrediction({ message, gesture, shouldSpeak: canSpeak });
    if (canSpeak) { setSpeaking(true); speak(message, () => setSpeaking(false)); }
  };
  const startListening = () => {
    if (typeof window === "undefined" || interactionModeRef.current !== "voice" || !jiaEnabled) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) { setVoiceSupported(false); return; }
    if (recognition.current) return;
    const r = new Recognition(); r.continuous = true; r.interimResults = false;
    r.lang = document.documentElement.lang?.startsWith("en") ? "en-US" : "fr-FR";
    r.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const transcript = result?.[0]?.transcript?.trim() || "";
      const command = extractWakeCommand(transcript);
      if (command === null) return;
      if (!command) { say("Oui. Dis-moi ce que tu veux que je fasse.", "curious"); return; }
      if (isPaymentCommand(command)) { say("Je peux t’accompagner, mais je ne peux jamais exécuter ni confirmer un paiement.", "secure"); return; }
      const intent = commandIntent(command);
      window.dispatchEvent(new CustomEvent("jobly:jia-command", { detail: { command, intent } }));
      void (async () => {
        try {
          const { data: { session } } = await getSupabaseClient().auth.getSession();
          if (!session?.access_token) return;
          const response = await fetch("/api/jia/brain", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
            body: JSON.stringify({ message: command, path: pathname, action: intent, ecosystem: pathname.startsWith("/recruiter") ? "RECRUITER" : pathname.startsWith("/partner") ? "PARTNER" : "TALENT" })
          });
          if (!response.ok) return;
          const result = await response.json();
          if (result.message) window.dispatchEvent(new CustomEvent("jobly:jia-response", { detail: { message: result.message, gesture: intent === "search_jobs" ? "analyze" : "reassure" } }));
        } catch {}
      })();
      window.dispatchEvent(new CustomEvent("jobly:jia-transcript", { detail: { transcript, command, intent } }));
      if (intent === "assistant_command") say("J’ai compris ta demande. Je vais te guider depuis Jobly.", "analyze");
    };
    r.onerror = () => setListening(false);
    r.onend = () => { setListening(false); recognition.current = null; if (shouldRestart.current && interactionModeRef.current === "voice" && jiaEnabled) window.setTimeout(startListening, 700); };
    recognition.current = r; shouldRestart.current = true;
    try { r.start(); setListening(true); } catch { setListening(false); }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ecosystem = pathname.startsWith("/recruiter") ? "RECRUITER" : pathname.startsWith("/partner") ? "PARTNER" : "TALENT";
        const { data: { session } } = await getSupabaseClient().auth.getSession();
        if (!session?.access_token) return;
        const response = await fetch("/api/jia/preferences?ecosystem=" + ecosystem, { headers: { Authorization: "Bearer " + session.access_token } });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        setJiaEnabled(data.access_enabled !== false);
        const mode = data.interaction_mode === "voice" ? "voice" : "text";
        setInteractionMode(mode);
        interactionModeRef.current = mode;
      } catch {}
    })();
    return () => { active = false; };
  }, [pathname]);
  useEffect(() => { const sync = () => setViewport({ w: window.innerWidth, h: window.innerHeight }); sync(); window.addEventListener("resize", sync); return () => window.removeEventListener("resize", sync); }, []);
  useEffect(() => {
    const onInteract = () => {
      setInteracted(true);
      if (interactionModeRef.current === "voice") startListening();
      if (!introSpoken.current && interactionModeRef.current === "voice") { introSpoken.current = true; window.setTimeout(() => speak("Pour me donner une action, commence ta phrase par J’IA. Je peux rechercher, filtrer, ouvrir ou préparer une candidature."), 250); }
    };
    window.addEventListener("pointerdown", onInteract, { passive: true }); window.addEventListener("keydown", onInteract, { passive: true });
    return () => { shouldRestart.current = false; recognition.current?.stop(); recognition.current = null; window.removeEventListener("pointerdown", onInteract); window.removeEventListener("keydown", onInteract); };
  }, []);
  useEffect(() => {
    const onResponse = (event: Event) => { const detail = (event as CustomEvent<{ message?: string; gesture?: JiaGesture }>).detail; if (detail?.message) say(detail.message, detail.gesture || "reassure"); };
    window.addEventListener("jobly:jia-response", onResponse); return () => window.removeEventListener("jobly:jia-response", onResponse);
  }, []);
  useEffect(() => {
    const onClick = (event: MouseEvent) => { const target = event.target as HTMLElement | null; const label = target?.closest("button,a,[role=button],input,select,textarea") as HTMLElement | null; if (!label) return; const action = (label.getAttribute("aria-label") || label.textContent || label.getAttribute("name") || "").trim().replace(/\\s+/g, " ").slice(0, 220); if (action) lastAction.current = action; setInteracted(true); };
    document.addEventListener("click", onClick, true); return () => document.removeEventListener("click", onClick, true);
  }, []);
  useEffect(() => {
    const requestPrediction = async () => { if (!jiaEnabled) return; const now = Date.now(); if (now - lastRequest.current < 9000) return; lastRequest.current = now; try {
      const response = await fetch("/api/jia/predict", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: pathname, action: lastAction.current, visibleText: document.body.innerText.slice(0, 1800), recentDialogue: lastPrediction.current ? [lastPrediction.current] : [], idleMs: 0 }) });
      if (!response.ok) return; const next = (await response.json()) as Prediction; if (!next.message || next.message === lastPrediction.current) return; if (!next.gesture) next.gesture = "curious"; lastPrediction.current = next.message; setPrediction({ ...next, shouldSpeak: interactionModeRef.current === "voice" && next.shouldSpeak === true });
      if (interactionModeRef.current === "voice" && next.shouldSpeak && interacted) { setSpeaking(true); speak(next.message, () => setSpeaking(false)); }
    } catch {} };
    const schedule = (delay: number) => { if (pending.current) window.clearTimeout(pending.current); pending.current = window.setTimeout(requestPrediction, delay); };
    schedule(6500); const onActivity = () => schedule(2200);
    window.addEventListener("pointerdown", onActivity, { passive: true }); window.addEventListener("keydown", onActivity, { passive: true }); window.addEventListener("scroll", onActivity, { passive: true });
    return () => { if (pending.current) window.clearTimeout(pending.current); window.removeEventListener("pointerdown", onActivity); window.removeEventListener("keydown", onActivity); window.removeEventListener("scroll", onActivity); window.speechSynthesis?.cancel(); };
  }, [pathname, interacted, jiaEnabled]);

  if (!jiaEnabled) return null;
  return <div className="pointer-events-none fixed inset-0 z-[80] overflow-visible" aria-label="J’IA — présence intelligente de Jobly">
    <motion.div className="pointer-events-auto fixed bottom-3 right-3 h-[300px] w-[205px] max-w-[calc(100vw-24px)] cursor-grab touch-none sm:bottom-4 sm:right-4 sm:h-[370px] sm:w-[270px]" drag dragMomentum={false} dragElastic={0.06} dragConstraints={{ left: -Math.max(0, viewport.w - 300), right: 0, top: -Math.max(0, viewport.h - 430), bottom: 0 }} whileTap={{ cursor: "grabbing", scale: 0.99 }}>
      <JiaCharacter speaking={speaking} gesture={prediction.gesture} />
      <motion.div className="pointer-events-none absolute -top-2 left-1/2 z-[82] -translate-x-1/2 rounded-full border-2 border-[#0057B8] bg-[#FFE135] px-3 py-1.5 text-[10px] font-black uppercase tracking-[.11em] text-[#0057B8] shadow-md">{interactionMode === "voice" ? (voiceSupported ? (listening ? "J’IA · écoute" : "J’IA · vocal") : "J’IA · vocal indisponible") : "J’IA · texte"}</motion.div>
      {prediction.message && <motion.div key={prediction.message} className="pointer-events-none absolute right-[calc(100%+10px)] bottom-12 z-[81] w-[min(310px,68vw)] sm:right-[calc(100%+14px)] sm:bottom-16 sm:w-[min(390px,68vw)]" initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.28 }}><div className="rounded-[20px] border-2 border-[#0057B8] bg-[#FFE135] px-4 py-3 text-[13px] font-extrabold leading-[1.4] text-[#0057B8] shadow-[0_14px_35px_rgba(0,87,184,.20)] sm:px-5 sm:py-4 sm:text-[14px]">{prediction.message}</div></motion.div>}
    </motion.div>
  </div>;
}