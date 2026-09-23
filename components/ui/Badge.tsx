"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "./cn";

export type BadgeTone = "blue" | "yellow" | "green" | "red" | "slate" | "violet";

const TONE: Record<BadgeTone, string> = {
  blue: "bg-canari-blue-soft text-canari-blue",
  yellow: "bg-canari-soft text-[#695500]",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-600",
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-50 text-violet-700",
};

export function Badge({ tone = "blue", children, className, dot }: { tone?: BadgeTone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold leading-none", TONE[tone], className)}>
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Correspondance statut de candidature → ton du badge (le libellé vient de i18n : status.*). */
export const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: "slate",
  SUBMITTED: "blue",
  ACKNOWLEDGED: "violet",
  INTERVIEW: "yellow",
  ACCEPTED: "green",
  REJECTED: "red",
  WITHDRAWN: "slate",
};

export type TabItem = { id: string; label: string; count?: number };

/** Onglets en pilules — navigation clavier (←/→/Début/Fin), rôle tablist. */
export function Tabs({ items, value, onChange, className, ariaLabel }: {
  items: TabItem[]; value: string; onChange: (id: string) => void; className?: string; ariaLabel?: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = items.findIndex((i) => i.id === value);
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % items.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + items.length) % items.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = items.length - 1;
    else return;
    e.preventDefault();
    onChange(items[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div role="tablist" aria-label={ariaLabel} onKeyDown={onKeyDown}
      className={cn("flex gap-1.5 overflow-x-auto rounded-full bg-canari-blue-soft/60 p-1 [scrollbar-width:none]", className)}>
      {items.map((item, i) => {
        const active = item.id === value;
        return (
          <button key={item.id} ref={(el) => { refs.current[i] = el; }} role="tab" type="button"
            aria-selected={active} tabIndex={active ? 0 : -1} onClick={() => onChange(item.id)}
            className={cn(
              "inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-extrabold transition",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/25",
              active ? "bg-canari text-ink shadow-cta" : "text-muted hover:text-canari-blue",
            )}>
            {item.label}
            {typeof item.count === "number" && (
              <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", active ? "bg-ink/10" : "bg-white text-canari-blue")}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
