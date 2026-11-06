"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";

type TorchTarget = { x: number; y: number; width: number; height: number; originX: number; originY: number };

const HIDDEN_JIA_ROUTES = [
  /^\/$/, /^\/ecosystem/, /^\/auth\//, /^\/onboarding/, /^\/legal\//,
  /^\/cv\/share\//, /^\/pass\//, /^\/download/, /^\/join/,
  /^\/recruiter\/discover\//, /^\/admin\/login/, /^\/admin\/jia\/chat/,
];

export default function JiaTorchEffect() {
  const { resolvedTheme } = useTheme();
  const pathname = usePathname() ?? "";
  const [target, setTarget] = useState<TorchTarget | null>(null);
  const hideTimer = useRef<number | null>(null);
  const jiaVisible = !HIDDEN_JIA_ROUTES.some((route) => route.test(pathname));

  useEffect(() => {
    if (resolvedTheme !== "dark" || !jiaVisible) {
      setTarget(null);
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      const anchor = document.querySelector<HTMLElement>("[data-jia-presence-anchor]");
      const rect = anchor?.getBoundingClientRect();
      const fallbackX = Math.max(24, window.innerWidth - 58);
      const fallbackY = Math.max(24, window.innerHeight - 153);
      setTarget({
        x: event.clientX,
        y: event.clientY,
        width: window.innerWidth,
        height: window.innerHeight,
        originX: rect ? rect.left + rect.width * 0.78 : fallbackX,
        originY: rect ? rect.top + rect.height * 0.54 : fallbackY,
      });
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
      hideTimer.current = window.setTimeout(() => setTarget(null), 1050);
    };

    window.addEventListener("pointerdown", onPointerDown, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
  }, [resolvedTheme, jiaVisible]);

  if (resolvedTheme !== "dark" || !jiaVisible || !target) return null;

  // J’IA lives at the lower-right edge; the torch is anchored beside her hand.
  const origin = { x: target.originX, y: target.originY };
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / distance;
  const ny = dx / distance;
  const spread = Math.min(76, Math.max(18, distance * 0.13));
  const base = 7;
  const points = [
    [origin.x + nx * base, origin.y + ny * base],
    [target.x + nx * spread, target.y + ny * spread],
    [target.x - nx * spread, target.y - ny * spread],
    [origin.x - nx * base, origin.y - ny * base],
  ].map(([x, y]) => x.toFixed(1) + "," + y.toFixed(1)).join(" ");
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <>
      <svg
        aria-hidden="true"
        className="jia-torch-beam"
        viewBox={"0 0 " + target.width + " " + target.height}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="jia-torch-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFD21A" stopOpacity="0.01" />
            <stop offset="58%" stopColor="#FFD98A" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FFF0C2" stopOpacity="0.25" />
          </linearGradient>
          <filter id="jia-torch-blur"><feGaussianBlur stdDeviation="13" /></filter>
          <radialGradient id="jia-torch-impact">
            <stop offset="0%" stopColor="#FFF4C5" stopOpacity="0.32" />
            <stop offset="48%" stopColor="#FFD21A" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FFD21A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <polygon points={points} fill="url(#jia-torch-gradient)" filter="url(#jia-torch-blur)" />
        <polygon points={points} fill="url(#jia-torch-gradient)" />
        <circle cx={target.x} cy={target.y} r={Math.min(132, Math.max(70, distance * 0.12))} fill="url(#jia-torch-impact)" />
        <circle cx={target.x} cy={target.y} r="13" className="jia-torch-spark" />
      </svg>

      <div
        className="jia-torch-prop"
        style={{ left: origin.x + "px", top: origin.y + "px", transform: "translate(-50%, -50%) rotate(" + angle + "deg)" }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 42 28" width="38" height="26" fill="none">
          <path d="M4 14h20" stroke="#D7A947" strokeWidth="7" strokeLinecap="round" />
          <path d="M6 14h16" stroke="#FFF0B3" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 14c4-9 9-10 15 0-6 10-11 9-15 0Z" fill="#FFD21A" />
          <path d="M27 14c2-5 5-5 7 0-2 5-5 5-7 0Z" fill="#FFF7D6" />
          <path d="M3 9v10" stroke="#8C6425" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
}
