"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "./cn";

const CONTROL =
  "w-full rounded-full border border-line bg-white px-5 text-[15px] text-ink outline-none transition " +
  "placeholder:text-slate-400 focus:border-canari-blue focus:ring-4 focus:ring-canari-blue/15 " +
  "disabled:bg-slate-50 disabled:text-slate-400 aria-[invalid=true]:border-red-400 aria-[invalid=true]:ring-red-100";

type FieldWrapProps = { label?: string; hint?: string; error?: string | null; id: string; children: ReactNode; className?: string };

function FieldWrap({ label, hint, error, id, children, className }: FieldWrapProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <label htmlFor={id} className="text-[13px] font-semibold text-ink">{label}</label>}
      {children}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-xs font-bold text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

type FieldMeta = { label?: string; hint?: string; error?: string | null; wrapperClassName?: string };

/** Champ texte en pilule — même forme que les champs de l’authentification. */
export function Input({ label, hint, error, wrapperClassName, className, id, ...rest }: FieldMeta & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap id={fid} label={label} hint={hint} error={error} className={wrapperClassName}>
      <input id={fid} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        className={cn(CONTROL, "h-12", className)} {...rest} />
    </FieldWrap>
  );
}

export function Select({ label, hint, error, wrapperClassName, className, id, children, ...rest }: FieldMeta & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap id={fid} label={label} hint={hint} error={error} className={wrapperClassName}>
      <select id={fid} aria-invalid={error ? true : undefined} className={cn(CONTROL, "h-12 appearance-none bg-[length:16px] pr-10", className)} {...rest}>
        {children}
      </select>
    </FieldWrap>
  );
}

export function Textarea({ label, hint, error, wrapperClassName, className, id, ...rest }: FieldMeta & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <FieldWrap id={fid} label={label} hint={hint} error={error} className={wrapperClassName}>
      <textarea id={fid} aria-invalid={error ? true : undefined} aria-describedby={error ? `${fid}-err` : hint ? `${fid}-hint` : undefined}
        className={cn(CONTROL, "min-h-[110px] rounded-3xl py-3", className)} {...rest} />
    </FieldWrap>
  );
}

/** Interrupteur accessible (role=switch). */
export function Switch({ checked, onChange, label, description, disabled }: {
  checked: boolean; onChange: (next: boolean) => void; label: string; description?: string; disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-bold text-ink">{label}</label>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
        className={cn(
          "relative h-8 w-14 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/25 disabled:opacity-50",
          checked ? "bg-canari-blue" : "bg-slate-300",
        )}>
        <span className={cn("absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all", checked ? "left-7" : "left-1")} />
      </button>
    </div>
  );
}
