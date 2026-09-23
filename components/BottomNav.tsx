"use client";

import { useRouter } from "next/navigation";
import { useI18n, type DictKey } from "@/lib/i18n";

export type NavItem = {
  icon: string;
  /** Libellé français par défaut (repli). */
  label: string;
  /** Clé i18n : le libellé affiché suit la langue choisie. */
  labelKey?: DictKey;
  href: string;
};

// ─── Preset nav configs ───────────────────────────────────────────────────────

export const TALENT_NAV: NavItem[] = [
  { icon: "home", label: "Accueil", labelKey: "nav.home", href: "/dashboard" },
  { icon: "briefcase", label: "Offres", labelKey: "nav.offers", href: "/jobs" },
  { icon: "check", label: "Candidatures", labelKey: "nav.applications", href: "/candidatures" },
  { icon: "sparkle", label: "Career AI", labelKey: "nav.careerAi", href: "/career-brain" },
  { icon: "orbit", label: "Écosystèmes", labelKey: "nav.ecosystems", href: "/ecosystem?mode=switcher" },
];

export const RECRUITER_NAV: NavItem[] = [
  { icon: "home", label: "Accueil", labelKey: "nav.home", href: "/recruiter" },
  { icon: "briefcase", label: "Offres", labelKey: "nav.offers", href: "/recruiter/jobs" },
  { icon: "people", label: "Candidatures", labelKey: "nav.applications", href: "/recruiter/candidatures" },
  { icon: "ats", label: "ATS", labelKey: "nav.ats", href: "/recruiter/ats" },
  { icon: "user", label: "Profil", labelKey: "nav.profile", href: "/recruiter/profile" },
  { icon: "orbit", label: "Écosystèmes", labelKey: "nav.ecosystems", href: "/ecosystem?mode=switcher" },
];

export const PARTNER_NAV: NavItem[] = [
  { icon: "chart", label: "Dashboard", labelKey: "nav.dashboard", href: "/partner" },
  { icon: "user", label: "Profil", labelKey: "nav.profile", href: "/partner/profile" },
  { icon: "card", label: "Paiement", labelKey: "nav.payment", href: "/partner/payment" },
  { icon: "link", label: "Parrainage", labelKey: "nav.referral", href: "/partner/referral" },
  { icon: "orbit", label: "Écosystèmes", labelKey: "nav.ecosystems", href: "/ecosystem?mode=switcher" },
];

// ─── SVG icons ───────────────────────────────────────────────────────────────

function NavIcon({ id, className }: { id: string; className?: string }) {
  const base = { viewBox: "0 0 24 24", className, fill: "none", stroke: "currentColor", strokeWidth: "1.9", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

  switch (id) {
    case "home":
      return (
        <svg {...base}>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9" />
        </svg>
      );
    case "briefcase":
      return (
        <svg {...base}>
          <rect x="3" y="8" width="18" height="12" rx="2" />
          <path d="M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
        </svg>
      );
    case "check":
      return (
        <svg {...base}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="m8.5 12.5 2.5 2.5 5-5" />
        </svg>
      );
    case "sparkle":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2Z" />
        </svg>
      );
    case "people":
      return (
        <svg {...base}>
          <circle cx="9" cy="7" r="3" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <circle cx="17" cy="7" r="2.5" />
          <path d="M21 20c0-2.8-2-5-4.5-5.5" />
        </svg>
      );
    case "ats":
      return (
        <svg {...base}>
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <path d="M17.5 14v7M14 17.5h7" />
        </svg>
      );
    case "user":
      return (
        <svg {...base}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" />
        </svg>
      );
    case "chart":
      return (
        <svg {...base}>
          <path d="M3 20h18" />
          <rect x="5" y="12" width="3" height="8" rx="1" />
          <rect x="10.5" y="7" width="3" height="13" rx="1" />
          <rect x="16" y="4" width="3" height="16" rx="1" />
        </svg>
      );
    case "card":
      return (
        <svg {...base}>
          <rect x="2" y="6" width="20" height="13" rx="2" />
          <path d="M2 10h20" />
          <path d="M6 15h3" />
        </svg>
      );
    case "link":
      return (
        <svg {...base}>
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      );
    default: // orbit
      return (
        <svg {...base}>
          <circle cx="12" cy="12" r="2.2" />
          <ellipse cx="12" cy="12" rx="9" ry="4" />
          <ellipse cx="12" cy="12" rx="4" ry="9" />
        </svg>
      );
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BottomNav({ active, items }: { active: string; items?: NavItem[] }) {
  const router = useRouter();
  const { t } = useI18n();
  const navItems = items ?? TALENT_NAV;
  // `active` peut contenir une query (?mode=…) : on compare au chemin seul.
  const activePath = active.split("?")[0];
  // Un seul onglet actif : le plus spécifique (ex. /recruiter/jobs l’emporte sur /recruiter).
  const scores = navItems.map((i) => {
    const h = i.href.split("?")[0];
    return activePath === h || activePath.startsWith(h + "/") ? h.length : -1;
  });
  const best = Math.max(...scores);

  return (
    <nav aria-label={t("nav.aria")} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur-xl shadow-[0_-8px_30px_rgba(10,25,49,.06)]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className={`mx-auto flex items-center justify-between gap-0.5 px-2 py-2 ${navItems.length >= 6 ? "max-w-lg" : navItems.length === 5 ? "max-w-md" : "max-w-sm"}`}>
        {navItems.map(({ icon, label, labelKey, href }, index) => {
          const hrefPath = href.split("?")[0];
          const isActive = best >= 0 && scores[index] === best;
          const text = labelKey ? t(labelKey) : label;
          return (
            <button
              key={href + label}
              type="button"
              onClick={() => { if (hrefPath !== activePath) router.replace(href); }}
              aria-current={isActive ? "page" : undefined}
              className={`jobly-focus flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-bold transition-all active:scale-95 ${
                isActive
                  ? "bg-canari text-ink shadow-[0_8px_18px_rgba(246,207,0,.25)] ring-1 ring-black/5"
                  : "text-muted hover:text-canari-blue"
              }`}
            >
              <NavIcon id={icon} className="h-[20px] w-[20px]" />
              <span className="max-w-full truncate text-center leading-[1.1]">{text}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
