"use client";
import { useEffect, useMemo, useState } from "react";

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose?: () => void;
  placement?: "top" | "inline";
  variant?: "info" | "error" | "success";
  duration?: number;
};

export default function JoblyToast({ title, message, actionLabel, onAction, onClose, placement = "top", variant = "info", duration = 5000 }: Props) {
  const [visibleText, setVisibleText] = useState("");
  const [exploding, setExploding] = useState(false);
  const chars = useMemo(() => Array.from(message), [message]);

  useEffect(() => {
    setVisibleText("");
    setExploding(false);
    let index = 0;
    const interval = window.setInterval(() => {
      index += 1;
      setVisibleText(chars.slice(0, index).join(""));
      if (index >= chars.length) window.clearInterval(interval);
    }, Math.max(18, Math.min(42, 2600 / Math.max(chars.length, 1))));
    const explodeAt = Math.max(4200, duration - 650);
    const explodeTimer = window.setTimeout(() => setExploding(true), explodeAt);
    const closeTimer = window.setTimeout(() => onClose?.(), duration);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(explodeTimer);
      window.clearTimeout(closeTimer);
    };
  }, [chars, duration, onClose]);

  const tone = variant === "error"
    ? "border-red-200 bg-white"
    : variant === "success"
      ? "border-emerald-200 bg-white"
      : "border-[#DCE5F1] bg-white";
  const icon = variant === "error" ? "!" : variant === "success" ? "✓" : "✦";
  const position = placement === "inline"
    ? "absolute left-full top-1/2 ml-3 w-[min(92vw,390px)] -translate-y-1/2"
    : "fixed inset-x-4 top-4 mx-auto w-[min(92vw,520px)]";

  return (
    <div role="status" aria-live="polite" className={`${position} z-[160] ${tone} rounded-[22px] border p-4 shadow-[0_20px_60px_rgba(7,27,69,.18)] ${exploding ? "pointer-events-none animate-jobly-toast-explode" : "animate-jobly-toast-in"}`}>
      <span className="sr-only">{title}: {message}</span>
      <div aria-hidden={exploding} className="flex items-start gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg font-black ${variant === "error" ? "bg-red-50 text-red-600" : variant === "success" ? "bg-emerald-50 text-emerald-600" : "bg-[#FFF7C7] text-[#17212B]"}`}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#17212B]">{title}</p>
          <p className="mt-1 text-xs leading-5 text-[#5D6C83]">{visibleText}<span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-[#0057B8] align-[-2px]" /></p>
          {actionLabel && onAction && <button type="button" onClick={onAction} className="mt-3 rounded-full bg-[#0057B8] px-4 py-2 text-xs font-black text-white">{actionLabel}</button>}
        </div>
        {onClose && <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#64748B] hover:bg-[#F1F5F9]">×</button>}
      </div>
      {exploding && <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">{Array.from({length: 18}, (_, i) => <i key={i} className="jobly-toast-piece" style={{ "--i": i } as React.CSSProperties} />)}</div>}
      <style jsx>{`
        @keyframes joblyToastIn { from { opacity: 0; transform: translateY(-10px) scale(.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes joblyToastExplode { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(.72); filter: blur(1px); } }
        @keyframes joblyToastPiece { 0% { opacity: 1; transform: translate(0,0) rotate(0deg) scale(1); } 100% { opacity: 0; transform: translate(calc((var(--i) - 9) * 16px), calc(-35px + (var(--i) % 5) * 18px)) rotate(calc(var(--i) * 23deg)) scale(.35); } }
        .animate-jobly-toast-in { animation: joblyToastIn .38s cubic-bezier(.2,.8,.2,1); }
        .animate-jobly-toast-explode { animation: joblyToastExplode .65s ease-out forwards; }
        .jobly-toast-piece { position:absolute; left:50%; top:50%; width:6px; height:6px; border-radius:1px; background:#0057B8; animation:joblyToastPiece .65s ease-out forwards; animation-delay:calc(var(--i) * 9ms); }
      `}</style>
    </div>
  );
}
