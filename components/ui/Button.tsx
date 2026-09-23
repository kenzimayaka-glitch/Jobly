"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT: Record<ButtonVariant, string> = {
  // Jaune Canari = couleur d’action principale (un seul CTA principal par écran).
  primary: "bg-canari text-ink shadow-cta hover:bg-canari-strong active:scale-[.98] border border-ink/5",
  // Bleu Canari = action secondaire forte / confiance.
  secondary: "bg-canari-blue text-white hover:bg-canari-blue-dark active:scale-[.98] shadow-[0_8px_20px_rgba(0,87,184,.22)]",
  outline: "bg-white text-canari-blue border border-line hover:border-canari-blue/40 hover:bg-canari-blue-soft active:scale-[.98]",
  ghost: "bg-transparent text-canari-blue hover:bg-canari-blue-soft active:scale-[.98]",
  danger: "bg-red-600 text-white hover:bg-red-700 active:scale-[.98]",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "min-h-[40px] px-4 text-[13px]",
  md: "min-h-[48px] px-5 text-[15px]",
  lg: "min-h-[52px] px-6 text-[15px]",
};

const BASE =
  "inline-flex select-none items-center justify-center gap-2 rounded-full font-extrabold transition duration-150 " +
  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps> & { href?: undefined };
export type LinkButtonProps = CommonProps & { href: string; disabled?: boolean; onClick?: () => void; "aria-label"?: string };

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4 animate-spin", className)} fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Bouton Jobly. Avec `href`, rend un lien Next (navigation réelle, accessible,
 * ouvrable dans un nouvel onglet) ; sinon un <button type="button"> par défaut.
 */
export function Button(props: ButtonProps | LinkButtonProps) {
  const { variant = "primary", size = "md", full, loading, leftIcon, rightIcon, children, className, ...rest } = props;
  const classes = cn(BASE, VARIANT[variant], SIZE[size], full && "w-full", className);
  const content = (
    <>
      {loading ? <Spinner /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </>
  );

  if (props.href !== undefined) {
    const { href, disabled, onClick, "aria-label": ariaLabel } = rest as Pick<LinkButtonProps, "href" | "disabled" | "onClick" | "aria-label">;
    if (disabled) return <span aria-disabled="true" className={cn(classes, "pointer-events-none opacity-60")}>{content}</span>;
    return (
      <Link href={href} onClick={onClick} aria-label={ariaLabel} className={classes}>
        {content}
      </Link>
    );
  }

  const { type = "button", disabled, ...native } = rest as Omit<ButtonProps, keyof CommonProps>;
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={classes} {...native}>
      {content}
    </button>
  );
}

export function IconButton({
  label, children, variant = "outline", className, ...rest
}: { label: string; children: ReactNode; variant?: ButtonVariant; className?: string } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition duration-150 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/25 disabled:opacity-60",
        VARIANT[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
