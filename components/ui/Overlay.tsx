"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./cn";
import { useI18n } from "@/lib/i18n";

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useOverlayBehavior(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem.focus(); }
      else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

type OverlayProps = { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; footer?: ReactNode; className?: string };

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** Modale : feuille basse sur mobile, boîte centrée dès `sm`. Piège le focus, ferme sur Échap / fond. */
export function Modal({ open, onClose, title, description, children, footer, className }: OverlayProps) {
  const { t } = useI18n();
  const ref = useOverlayBehavior(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className={cn("w-full max-w-lg animate-ui-sheet rounded-t-[28px] bg-white p-5 shadow-2xl outline-none sm:rounded-[28px] sm:p-6", className)}
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-canari-blue-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/25">
            <CloseIcon />
          </button>
        </div>
        <div className="mt-4 max-h-[65dvh] overflow-y-auto">{children}</div>
        {footer && <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}

/** Tiroir latéral (desktop) / feuille basse (mobile) pour filtres et détails. */
export function Drawer({ open, onClose, title, description, children, footer, className }: OverlayProps) {
  const { t } = useI18n();
  const ref = useOverlayBehavior(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-end bg-ink/45 backdrop-blur-[2px] sm:items-stretch" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside ref={ref} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
        className={cn("flex max-h-[88dvh] w-full animate-ui-sheet flex-col rounded-t-[28px] bg-white shadow-2xl outline-none sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-[28px]", className)}>
        <header className="flex items-start justify-between gap-3 border-b border-line p-5">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-ink">{title}</h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label={t("common.close")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-canari-blue-soft focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/25">
            <CloseIcon />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <footer className="flex gap-2 border-t border-line p-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>{footer}</footer>}
      </aside>
    </div>
  );
}
