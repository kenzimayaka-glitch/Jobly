"use client";

import { useEffect, useMemo, useState } from "react";

export type NoticeAnchor = { top: number; bottom: number; left: number; width: number } | null;

const TICK_MS = 28;
const BURST_AT_MS = 5300;
const TOTAL_MS = 6000;

export function AnchoredNotice({ message, anchor, onDone }: { message: string; anchor: NoticeAnchor; onDone: () => void }) {
  const [typed, setTyped] = useState("");
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    if (!message) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setBurst(false);
    setTyped(reduce ? message : "");

    let typer: number | undefined;
    if (!reduce) {
      let i = 0;
      const step = Math.max(1, Math.ceil(message.length / 150));
      typer = window.setInterval(() => {
        i += step;
        setTyped(message.slice(0, i));
        if (i >= message.length && typer) window.clearInterval(typer);
      }, TICK_MS);
    }
    const burstTimer = reduce ? undefined : window.setTimeout(() => setBurst(true), BURST_AT_MS);
    const doneTimer = window.setTimeout(onDone, TOTAL_MS);
    return () => {
      if (typer) window.clearInterval(typer);
      if (burstTimer) window.clearTimeout(burstTimer);
      window.clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  const particles = useMemo(
    () => Array.from({ length: 26 }, () => ({
      dx: Math.round((Math.random() - 0.5) * 240),
      dy: Math.round((Math.random() - 0.75) * 170),
      r: Math.round((Math.random() - 0.5) * 540),
      s: 4 + Math.round(Math.random() * 5),
    })),
    [message],
  );

  if (!message) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 390;
  const half = Math.min(160, (vw - 24) / 2);
  let style: React.CSSProperties;
  if (anchor) {
    const center = Math.min(Math.max(anchor.left + anchor.width / 2, half + 12), vw - half - 12);
    const below = anchor.top < 110;
    style = below
      ? { left: center, top: anchor.bottom + 10, transform: "translate(-50%, 0)" }
      : { left: center, top: anchor.top - 10, transform: "translate(-50%, -100%)" };
  } else {
    style = { left: "50%", bottom: 96, transform: "translateX(-50%)" };
  }

  return (
    <div className="pointer-events-none fixed z-[120] w-max max-w-[min(20rem,calc(100vw-1.5rem))]" style={style}>
      <span className="sr-only" role="status" aria-live="polite">{message}</span>
      {!burst ? (
        <div aria-hidden="true" className="rounded-2xl border border-red-200 bg-white px-4 py-3 text-xs font-bold leading-5 text-red-700 shadow-xl">
          {typed}
          <span className="ml-0.5 inline-block h-3 w-[2px] animate-pulse bg-red-400 align-middle" />
        </div>
      ) : (
        <div aria-hidden="true" className="relative h-10 w-40">
          {particles.map((p, k) => (
            <span
              key={k}
              className="absolute left-1/2 top-1/2 rounded-sm bg-red-500"
              style={{
                width: p.s, height: p.s,
                ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px`, ["--r" as string]: `${p.r}deg`,
                animation: "jobly-burst .8s ease-out forwards",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
