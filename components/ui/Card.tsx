"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { Badge } from "./Badge";
import { Button } from "./Button";

type CardTone = "default" | "highlight" | "blue" | "dark";
const TONE: Record<CardTone, string> = {
  default: "bg-white border-line",
  highlight: "bg-canari-soft/70 border-[#F3E27A]",
  blue: "bg-canari-blue-soft border-[#CFE0F7]",
  dark: "bg-ink text-white border-ink",
};

export function Card({ tone = "default", padded = true, interactive, className, children }: {
  tone?: CardTone; padded?: boolean; interactive?: boolean; className?: string; children: ReactNode;
}) {
  return (
    <div className={cn(
      "rounded-card border shadow-soft", TONE[tone], padded && "p-5",
      interactive && "transition duration-150 hover:-translate-y-0.5 hover:shadow-card-lg", className,
    )}>
      {children}
    </div>
  );
}

/** Bloc de page : titre de section + action optionnelle. */
export function Section({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-7", className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-black tracking-[-.02em] text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Introduction de page : « Où suis-je ? Pourquoi ? Quelle est l’action principale ? » */
export function PageIntro({ eyebrow, title, subtitle, actions, className }: {
  eyebrow?: string; title: string; subtitle?: string; actions?: ReactNode; className?: string;
}) {
  return (
    <div className={cn("pt-1", className)}>
      {eyebrow && <Badge tone="yellow" className="uppercase tracking-wider">{eyebrow}</Badge>}
      <h1 className="mt-3 text-[28px] font-black leading-[1.08] tracking-[-.035em] text-ink sm:text-[34px]">{title}</h1>
      {subtitle && <p className="mt-2 max-w-2xl text-[15px] leading-6 text-muted">{subtitle}</p>}
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export type Tone = "blue" | "yellow" | "green" | "red" | "slate";
const VALUE_TONE: Record<Tone, string> = { blue: "text-canari-blue", yellow: "text-[#8A6D00]", green: "text-emerald-600", red: "text-red-600", slate: "text-ink" };

/** Indicateur chiffré (KPI). Devient cliquable si `href` est fourni. */
export function StatCard({ label, value, hint, tone = "blue", href, className }: {
  label: string; value: ReactNode; hint?: string; tone?: Tone; href?: string; className?: string;
}) {
  const body = (
    <>
      <div className="text-xs font-bold text-muted">{label}</div>
      <div className={cn("mt-1 text-[28px] font-black leading-none tracking-[-.03em]", VALUE_TONE[tone])}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] leading-4 text-muted">{hint}</div>}
    </>
  );
  const cls = cn("block rounded-[20px] border border-line bg-white p-4 shadow-soft", href && "transition hover:-translate-y-0.5 hover:shadow-card-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/25", className);
  return href ? <Link href={href} className={cls}>{body}</Link> : <div className={cls}>{body}</div>;
}

/** Carte d’accès (icône + titre + description) — l’élément de navigation des tableaux de bord. */
export function DashboardCard({ title, description, icon, href, onClick, badge, accent = "blue", className }: {
  title: string; description?: string; icon?: ReactNode; href?: string; onClick?: () => void; badge?: ReactNode; accent?: "blue" | "yellow"; className?: string;
}) {
  const inner = (
    <>
      {icon && (
        <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl", accent === "yellow" ? "bg-canari text-ink" : "bg-canari-blue-soft text-canari-blue")} aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2"><span className="truncate text-[15px] font-black text-ink">{title}</span>{badge}</span>
        {description && <span className="mt-0.5 block text-xs leading-5 text-muted">{description}</span>}
      </span>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-slate-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
    </>
  );
  const cls = cn(
    "flex w-full items-center gap-3 rounded-card border border-line bg-white p-4 shadow-soft transition duration-150",
    "hover:-translate-y-0.5 hover:shadow-card-lg active:scale-[.99] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/25", className,
  );
  return href ? <Link href={href} className={cls}>{inner}</Link> : <button type="button" onClick={onClick} className={cls}>{inner}</button>;
}

export function Progress({ value, label, tone = "blue", className }: { value: number; label?: string; tone?: "blue" | "yellow" | "green"; className?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const bar = { blue: "bg-canari-blue", yellow: "bg-canari", green: "bg-emerald-500" }[tone];
  return (
    <div className={className}>
      {label && <div className="mb-1.5 flex items-center justify-between text-xs font-bold text-muted"><span>{label}</span><span className="text-ink">{pct}%</span></div>}
      <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label} className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-all duration-500", bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Bandeau d’appel à l’action : un CTA principal (canari) + un secondaire optionnel. */
export function CTASection({ title, body, primary, secondary, tone = "highlight", className }: {
  title: string; body?: string; primary: { label: string; href?: string; onClick?: () => void; loading?: boolean };
  secondary?: { label: string; href?: string; onClick?: () => void }; tone?: CardTone; className?: string;
}) {
  return (
    <Card tone={tone} className={cn("mt-6", className)}>
      <h3 className={cn("text-lg font-black", tone === "dark" ? "text-white" : "text-ink")}>{title}</h3>
      {body && <p className={cn("mt-1.5 text-sm leading-6", tone === "dark" ? "text-white/75" : "text-muted")}>{body}</p>}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        {primary.href
          ? <Button href={primary.href} full className="sm:w-auto">{primary.label}</Button>
          : <Button onClick={primary.onClick} loading={primary.loading} full className="sm:w-auto">{primary.label}</Button>}
        {secondary && (secondary.href
          ? <Button href={secondary.href} variant="outline" full className="sm:w-auto">{secondary.label}</Button>
          : <Button onClick={secondary.onClick} variant="outline" full className="sm:w-auto">{secondary.label}</Button>)}
      </div>
    </Card>
  );
}
