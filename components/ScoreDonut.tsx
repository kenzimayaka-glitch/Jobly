"use client";

import { useEffect, useState } from "react";

export default function ScoreDonut({ value, size = 96, tone = "light" }: { value: number; size?: number; tone?: "light" | "dark" }) {
  const v = Math.max(0, Math.min(100, Math.round(Number.isFinite(value) ? value : 0)));
  const [drawn, setDrawn] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setDrawn(v));
    return () => cancelAnimationFrame(id);
  }, [v]);

  const r = 42;
  const c = 2 * Math.PI * r;
  const arc = tone === "dark" ? "#FFE135" : v >= 75 ? "#10B981" : v >= 50 ? "#F59E0B" : "#EF4444";
  const track = tone === "dark" ? "rgba(255,255,255,.18)" : "#E2E8F0";
  const text = tone === "dark" ? "#FFE135" : "#17212B";

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Score de compatibilité ${v}%`} className="shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke={track} strokeWidth="11" />
      <circle
        cx="50" cy="50" r={r} fill="none" stroke={arc} strokeWidth="11" strokeLinecap="round"
        strokeDasharray={`${(drawn / 100) * c} ${c}`} transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray .9s ease" }}
      />
      <text x="50" y="58" textAnchor="middle" fontSize="26" fontWeight="900" fill={text}>{v}%</text>
    </svg>
  );
}
