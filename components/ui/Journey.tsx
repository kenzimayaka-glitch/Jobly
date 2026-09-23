"use client";

import Link from "next/link";
import { cn } from "./cn";
import { useI18n, type DictKey } from "@/lib/i18n";

export type JourneyStage = "discover" | "understand" | "prepare" | "apply" | "progress" | "succeed";

const STAGES: { id: JourneyStage; key: DictKey; href: string }[] = [
  { id: "discover", key: "career.journey.discover", href: "/jobs" },
  { id: "understand", key: "career.journey.understand", href: "/career-gps" },
  { id: "prepare", key: "career.journey.prepare", href: "/talent/cvs" },
  { id: "apply", key: "career.journey.apply", href: "/candidatures" },
  { id: "progress", key: "career.journey.progress", href: "/career-os" },
  { id: "succeed", key: "career.journey.succeed", href: "/opportunities" },
];

/**
 * Fil d’Ariane produit du parcours Talent :
 * Découvrir → Comprendre → Préparer → Candidater → Progresser → Réussir.
 * Chaque étape est un vrai lien : l’écran courant est mis en avant, les autres
 * mènent à l’étape correspondante (aucune page ne reste un cul-de-sac).
 */
export function JourneyBar({ current, className }: { current: JourneyStage; className?: string }) {
  const { t } = useI18n();
  const idx = STAGES.findIndex((s) => s.id === current);
  return (
    <nav aria-label={t("career.journey")} className={cn("-mx-1 overflow-x-auto px-1 [scrollbar-width:none]", className)}>
      <ol className="flex min-w-max items-center gap-1.5">
        {STAGES.map((stage, i) => {
          const active = i === idx;
          const done = i < idx;
          return (
            <li key={stage.id} className="flex items-center gap-1.5">
              <Link href={stage.href} aria-current={active ? "step" : undefined}
                className={cn(
                  "inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 text-[12px] font-extrabold transition",
                  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-canari-blue/25",
                  active ? "bg-canari text-ink shadow-cta" : done ? "bg-canari-blue-soft text-canari-blue" : "bg-white text-muted ring-1 ring-line hover:text-canari-blue",
                )}>
                <span className={cn("grid h-4 w-4 place-items-center rounded-full text-[9px]", active ? "bg-ink text-canari" : done ? "bg-canari-blue text-white" : "bg-slate-100 text-slate-500")}>{done ? "✓" : i + 1}</span>
                {t(stage.key)}
              </Link>
              {i < STAGES.length - 1 && <span aria-hidden="true" className="h-px w-3 bg-line" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
