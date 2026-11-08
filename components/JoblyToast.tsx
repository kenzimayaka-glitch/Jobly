"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  placement?: "top" | "inline";
  variant?: "info" | "error" | "success";
  duration?: number;
  instantMessage?: boolean;
  celebration?: boolean;
  sound?: "none" | "pop";
  soundEnabled?: boolean;
  onToggleSound?: () => void;
};

let notificationAudioContext: AudioContext | null = null;

export function unlockJoblyToastAudio() {
  if (typeof window === "undefined" || !window.AudioContext) return;
  try {
    notificationAudioContext ||= new window.AudioContext();
    if (notificationAudioContext.state === "suspended") {
      void notificationAudioContext.resume().catch(() => undefined);
    }
  } catch {
    // Sound is optional; the visual notification remains available.
  }
}

function playJoblyPopSound() {
  const context = notificationAudioContext;
  if (!context || context.state !== "running") return;

  try {
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(620, now + 0.16);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.linearRampToValueAtTime(0.035, now + 0.018);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + 0.19);
    oscillator.connect(envelope);
    envelope.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  } catch {
    // Audio errors must never block the notification or navigation.
  }
}

export default function JoblyToast({
  title,
  message,
  actionLabel,
  onAction,
  onClose,
  placement = "top",
  variant = "info",
  duration = 5000,
  instantMessage = false,
  celebration = false,
  sound = "none",
  soundEnabled = true,
  onToggleSound,
}: Props) {
  const [visibleText, setVisibleText] = useState(instantMessage ? message : "");
  const [exploding, setExploding] = useState(false);
  const chars = useMemo(() => Array.from(message), [message]);
  const soundPlayed = useRef(false);

  useEffect(() => {
    setVisibleText(instantMessage ? message : "");
    setExploding(false);
    let interval: number | undefined;
    if (!instantMessage) {
      let index = 0;
      interval = window.setInterval(() => {
        index += 1;
        setVisibleText(chars.slice(0, index).join(""));
        if (index >= chars.length && interval !== undefined) window.clearInterval(interval);
      }, Math.max(18, Math.min(42, 2600 / Math.max(chars.length, 1))));
    }
    const explodeAt = celebration ? Math.max(900, duration - 750) : Math.max(4200, duration - 650);
    const explodeTimer = window.setTimeout(() => setExploding(true), explodeAt);
    const closeTimer = window.setTimeout(() => onClose?.(), duration);
    return () => {
      if (interval !== undefined) window.clearInterval(interval);
      window.clearTimeout(explodeTimer);
      window.clearTimeout(closeTimer);
    };
  }, [chars, duration, onClose, instantMessage, celebration, message]);

  useEffect(() => {
    soundPlayed.current = false;
  }, [message]);

  useEffect(() => {
    if (sound === "pop" && soundEnabled && !soundPlayed.current) {
      soundPlayed.current = true;
      playJoblyPopSound();
    }
  }, [sound, soundEnabled, message]);

  const handleSoundToggle = () => {
    if (!soundEnabled) unlockJoblyToastAudio();
    onToggleSound?.();
  };

  const tone = variant === "error" ? "border-red-200 bg-white" : variant === "success" ? "border-emerald-200 bg-white" : "border-[#DCE5F1] bg-white";
  const icon = variant === "error" ? "!" : variant === "success" ? "✓" : "✦";
  const position = placement === "inline" ? "absolute left-full top-1/2 ml-3 w-[min(92vw,390px)] -translate-y-1/2" : "fixed inset-x-4 top-4 mx-auto w-[min(92vw,520px)]";
  const celebrationColors = ["#FFD60A", "#0057B8", "#22C55E", "#F97316"];

  return (
    <div role="status" aria-live="polite" className={position + " z-[160] " + tone + " rounded-[22px] border p-4 shadow-[0_20px_60px_rgba(7,27,69,.18)] " + (exploding ? "animate-jobly-toast-explode" : "animate-jobly-toast-in")}>
      <span className="sr-only">{title}: {message}</span>
      <div aria-hidden={exploding} className="flex items-start gap-3">
        <span className={"grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-black " + (variant === "error" ? "bg-red-50 text-red-600" : variant === "success" ? "bg-emerald-50 text-emerald-600" : "bg-[#FFF7C7] text-[#17212B]")}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#17212B]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[#5D6C83]">{visibleText}{!instantMessage && <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-[#0057B8] align-[-2px]" />}</p>
          {actionLabel && onAction && <button type="button" onClick={onAction} className="mt-3 rounded-full bg-[#0057B8] px-4 py-2 text-xs font-black text-white">{actionLabel}</button>}
        </div>
        {onToggleSound && <button type="button" onClick={handleSoundToggle} aria-label={soundEnabled ? "Désactiver le son des notifications" : "Activer le son des notifications"} title={soundEnabled ? "Son activé" : "Son désactivé"} className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm text-[#64748B] hover:bg-[#F1F5F9]">{soundEnabled ? "🔊" : "🔇"}</button>}
        {onClose && <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#64748B] hover:bg-[#F1F5F9]">×</button>}
      </div>
      {exploding && celebration && <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">{Array.from({ length: 18 }, (_, i) => <i key={i} className="jobly-toast-piece" style={{ "--i": i, "--piece-color": celebrationColors[i % celebrationColors.length] } as any} />)}</div>}
      {exploding && !celebration && <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">{Array.from({ length: 18 }, (_, i) => <i key={i} className="jobly-toast-piece" style={{ "--i": i } as any} />)}</div>}
      <style jsx>{`
        @keyframes joblyToastIn { from { opacity: 0; transform: translateY(-10px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes joblyToastExplode { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.72); filter: blur(1px); } }
        @keyframes joblyToastPiece { 0% { opacity: 1; transform: translate(0,0) rotate(0deg) scale(1); } 100% { opacity: 0; transform: translate(calc((var(--i) - 9) * 16px), calc((var(--i) - 9) * -7px)) rotate(calc(var(--i) * 23deg)) scale(.35); } }
        .animate-jobly-toast-in { animation: joblyToastIn .38s cubic-bezier(.2,.8,.2,1); }
        .animate-jobly-toast-explode { animation: joblyToastExplode .65s ease-out forwards; }
        .jobly-toast-piece { position:absolute; left:50%; top:50%; width:6px; height:6px; border-radius:1px; background:var(--piece-color, #0057B8); animation:joblyToastPiece .65s ease-out forwards; animation-delay:calc(var(--i) * 9ms); }
      `}</style>
    </div>
  );
}
