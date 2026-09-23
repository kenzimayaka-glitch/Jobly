"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../PageHeader";
import BottomNav, { PARTNER_NAV, RECRUITER_NAV, TALENT_NAV, type NavItem } from "../BottomNav";
import { cn } from "./cn";
import { useI18n } from "@/lib/i18n";

export type ShellRole = "talent" | "recruiter" | "partner";

const NAV: Record<ShellRole, NavItem[]> = { talent: TALENT_NAV, recruiter: RECRUITER_NAV, partner: PARTNER_NAV };
const HOME: Record<ShellRole, string> = { talent: "/dashboard", recruiter: "/recruiter", partner: "/partner" };
const WIDTH = { md: "max-w-3xl", lg: "max-w-5xl", xl: "max-w-6xl" } as const;

/**
 * Coque unique de toutes les pages authentifiées : en-tête Jobly, contenu centré,
 * navigation basse cohérente par écosystème, marges de sécurité mobile et lien
 * d’évitement clavier. Une page = un <AppShell> + son contenu, rien d’autre.
 */
export default function AppShell({
  role = "talent", active, title, eyebrow, avatarUrl, initial, backHref, onBack, hideNav, width = "md", className, children,
}: {
  role?: ShellRole; active: string; title?: string; eyebrow?: string; avatarUrl?: string; initial?: string;
  backHref?: string; onBack?: () => void; hideNav?: boolean; width?: keyof typeof WIDTH; className?: string; children: ReactNode;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const handleBack = onBack ?? (() => router.push(backHref ?? HOME[role]));
  return (
    <div className="jobly-page jobly-app relative min-h-[100dvh] text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] focus:rounded-full focus:bg-canari focus:px-4 focus:py-2 focus:font-bold focus:text-ink">
        {t("common.skip")}
      </a>
      <PageHeader label={title ?? ""} eyebrow={eyebrow} initial={initial ?? "J"} avatarUrl={avatarUrl} onBack={handleBack} role={role} />
      <main id="main" className={cn("mx-auto w-full px-4 pt-5 sm:px-6", WIDTH[width], hideNav ? "pb-10" : "pb-[calc(112px+env(safe-area-inset-bottom))]", className)}>
        {children}
      </main>
      {!hideNav && <BottomNav active={active} items={NAV[role]} />}
    </div>
  );
}
