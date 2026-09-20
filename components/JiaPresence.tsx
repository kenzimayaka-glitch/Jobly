"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { JiaCharacter, type JiaGesture } from "./WaterScene";

type Prediction = {
  message: string;
  gesture: JiaGesture;
  shouldSpeak: boolean;
  target?: string;
};

const DEFAULT: Prediction = {
  message: "Je reste attentive. Si quelque chose peut accélérer ton parcours, je te le signalerai.",
  gesture: "curious",
  shouldSpeak: false,
};

const HIDDEN_PATHS = new Set(["/ecosystem"]);

function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis || !text) {
    onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = document.documentElement.lang?.startsWith("en") ? "en-US" : "fr-FR";
  utterance.rate = 0.94;
  utterance.pitch = 1.04;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export default function JiaPresence() {
  const pathname = usePathname();
  const [prediction, setPrediction] = useState<Prediction>(DEFAULT);
  const [speaking, setSpeaking] = useState(false);
  const [viewport, setViewport] = useState({ w: 1280, h: 800 });
  const [interacted, setInteracted] = useState(false);
  const lastAction = useRef("");
  const lastPrediction = useRef("");
  const pending = useRef<number | null>(null);
  const lastRequest = useRef(0);

  const hidden = pathname === "/" || HIDDEN_PATHS.has(pathname);

  useEffect(() => {
    const sync = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    if (hidden) return;
    const onInteract = () => setInteracted(true);
    window.addEventListener("pointerdown", onInteract, { passive: true });
    window.addEventListener("keydown", onInteract, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, [hidden]);

  useEffect(() => {
    if (hidden) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const label = target?.closest("button,a,[role='button'],input,select,textarea") as HTMLElement | null;
      if (!label) return;
      const action = (label.getAttribute("aria-label") || label.textContent || label.getAttribute("name") || "").trim().replace(/\s+/g, " ").slice(0, 220);
      if (action) lastAction.current = action;
      setInteracted(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [hidden]);

  useEffect(() => {
    if (hidden) return;
    const requestPrediction = async () => {
      const now = Date.now();
      if (now - lastRequest.current < 9000) return;
      lastRequest.current = now;
      const visibleText = document.body.innerText.slice(0, 1800);
      try {
        const response = await fetch("/api/jia/predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: pathname,
            action: lastAction.current,
            visibleText,
            recentDialogue: lastPrediction.current ? [lastPrediction.current] : [],
            idleMs: 0,
          }),
        });
        if (!response.ok) return;
        const next = (await response.json()) as Prediction;
        if (!next.message || next.message === lastPrediction.current) return;
        if (!next.gesture) next.gesture = "curious";
        lastPrediction.current = next.message;
        setPrediction(next);
        if (next.shouldSpeak && interacted) {
          setSpeaking(true);
          speak(next.message, () => setSpeaking(false));
        }
      } catch {
        // J’IA remains present even if predictive AI is temporarily unavailable.
      }
    };

    const schedule = (delay: number) => {
      if (pending.current) window.clearTimeout(pending.current);
      pending.current = window.setTimeout(requestPrediction, delay);
    };

    schedule(6500);
    const onActivity = () => schedule(2200);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    window.addEventListener("scroll", onActivity, { passive: true });

    return () => {
      if (pending.current) window.clearTimeout(pending.current);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("scroll", onActivity);
      window.speechSynthesis?.cancel();
    };
  }, [hidden, pathname, interacted]);

  const roamX = Math.max(30, Math.min(viewport.w * 0.68, viewport.w - 250));
  const roamY = Math.max(30, Math.min(viewport.h * 0.62, viewport.h - 320));

  const x = useMemo(() => [0, -roamX * 0.18, roamX * 0.42, roamX * 0.08, -roamX * 0.3, 0], [roamX]);
  const y = useMemo(() => [0, -roamY * 0.22, -roamY * 0.5, -roamY * 0.12, roamY * 0.12, 0], [roamY]);

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-label="J’IA — présence intelligente de Jobly">
      <motion.div
        className="pointer-events-auto fixed bottom-4 right-4 h-[245px] w-[175px] cursor-grab touch-none sm:h-[285px] sm:w-[205px]"
        drag
        dragMomentum
        dragElastic={0.14}
        dragConstraints={{ left: -Math.max(0, viewport.w - 235), right: 0, top: -Math.max(0, viewport.h - 320), bottom: 0 }}
        animate={{ x, y }}
        transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        whileTap={{ cursor: "grabbing", scale: 0.985 }}
      >
        <JiaCharacter speaking={speaking} gesture={prediction.gesture} />
      </motion.div>

      {prediction.message && (
        <motion.div
          key={prediction.message}
          className="pointer-events-none fixed bottom-5 right-[195px] z-[81] max-w-[min(380px,62vw)]"
          initial={{ opacity: 0, y: 10, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.28 }}
        >
          <div className="rounded-[20px] border border-white/15 bg-[#061226]/78 px-4 py-3 text-[13px] font-semibold leading-relaxed text-white shadow-2xl backdrop-blur-xl">
            {prediction.message}
          </div>
        </motion.div>
      )}
    </div>
  );
}
