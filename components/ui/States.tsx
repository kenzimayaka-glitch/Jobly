"use client";

import type { ReactNode } from "react";
import { cn } from "./cn";
import { Button, Spinner } from "./Button";
import { useI18n } from "@/lib/i18n";

/** Carte d’état centrée : base commune de Empty / Error / Success. */
function StateShell({ icon, tone, title, body, action, className, role }: {
  icon: ReactNode; tone: "blue" | "yellow" | "red" | "green"; title: string; body?: string; action?: ReactNode; className?: string; role?: "status" | "alert";
}) {
  const ring = { blue: "bg-canari-blue-soft text-canari-blue", yellow: "bg-canari-soft text-[#695500]", red: "bg-red-50 text-red-600", green: "bg-emerald-50 text-emerald-600" }[tone];
  return (
    <div role={role} className={cn("mx-auto flex w-full max-w-md flex-col items-center rounded-[24px] border border-dashed border-line bg-white/80 px-6 py-10 text-center", className)}>
      <span className={cn("grid h-14 w-14 place-items-center rounded-2xl", ring)} aria-hidden="true">{icon}</span>
      <h3 className="mt-4 text-lg font-black text-ink">{title}</h3>
      {body && <p className="mt-1.5 text-sm leading-6 text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

const svg = "h-7 w-7";
const IconInbox = () => (<svg viewBox="0 0 24 24" className={svg} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 13l2.5-7.5A2 2 0 0 1 7.4 4h9.2a2 2 0 0 1 1.9 1.5L21 13" /><path d="M3 13v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5h-5.5a3.5 3.5 0 0 1-7 0H3Z" /></svg>);
const IconAlert = () => (<svg viewBox="0 0 24 24" className={svg} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 10v4M12 17.5v.01" /></svg>);
const IconCheck = () => (<svg viewBox="0 0 24 24" className={svg} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>);

export function EmptyState({ title, body, action, icon, className }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return <StateShell tone="blue" icon={icon ?? <IconInbox />} title={title} body={body} action={action} className={className} role="status" />;
}

export function ErrorState({ title, body, onRetry, retryLabel, action, className }: {
  title?: string; body?: string; onRetry?: () => void; retryLabel?: string; action?: ReactNode; className?: string;
}) {
  const { t } = useI18n();
  return (
    <StateShell tone="red" role="alert" icon={<IconAlert />} title={title ?? t("common.error.generic")} body={body} className={className}
      action={action ?? (onRetry ? <Button variant="outline" size="sm" onClick={onRetry}>{retryLabel ?? t("common.retry")}</Button> : undefined)} />
  );
}

export function SuccessState({ title, body, action, className }: { title?: string; body?: string; action?: ReactNode; className?: string }) {
  const { t } = useI18n();
  return <StateShell tone="green" role="status" icon={<IconCheck />} title={title ?? t("common.success")} body={body} action={action} className={className} />;
}

/** État de chargement : `page` (plein écran) ou en ligne dans une carte. */
export function LoadingState({ label, page, className }: { label?: string; page?: boolean; className?: string }) {
  const { t } = useI18n();
  const text = label ?? t("common.loading");
  return (
    <div role="status" aria-live="polite" className={cn("flex items-center justify-center gap-3 text-sm font-bold text-muted", page ? "min-h-[60dvh]" : "py-10", className)}>
      <Spinner className="h-5 w-5 text-canari-blue" />
      <span>{text}</span>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true"
      className={cn("animate-ui-shimmer rounded-2xl bg-[linear-gradient(90deg,#EEF3FA_25%,#F8FAFD_50%,#EEF3FA_75%)] bg-[length:200%_100%]", className)} />
  );
}
