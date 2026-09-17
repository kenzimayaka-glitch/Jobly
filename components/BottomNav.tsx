"use client";

import { useRouter } from "next/navigation";

export type NavItem = {
  icon: string;
  label: string;
  href: string;
};

// ─── Preset nav configs ───────────────────────────────────────────────────────

export const TALENT_NAV: NavItem[] = [
  { icon: "home", label: "Accueil", href: "/dashboard" },
  { icon: "briefcase", label: "Offres", href: "/jobs" },
  { icon: "check", label: "Candidatures", href: "/candidatures" },
  { icon: "sparkle", label: "Career AI", href: "/career-brain" },
  { icon: "orbit", label: "Écosystèmes", href: "/ecosystem?mode=switcher" },
];

export const RECRUITER_NAV: NavItem[] = [
  { icon: "home", label: "Accueil", href: "/recruiter" },
  { icon: "briefcase", label: "Offres", href: "/recruiter/jobs" },
  { icon: "people", label: "Candidatures", href: "/recruiter/candidatures" },
  { icon: "ats", label: "ATS", href: "/recruiter/ats" },
  { icon: "user", label: "Profil", href: "/recruiter/profile" },
  { icon: "orbit", label: "Écosystèmes", href: "/ecosystem?mode=switcher" },
];

export const PARTNER_NAV: NavItem[] = [
  { icon: "chart", label: "Dashboard", href: "/partner" },
  { icon: "user", label: "Profil", href: "/partner/profile" },
  { icon: "card", label: "Paiement", href: "/partner/payment" },
  { icon: "link", label: "Parrainage", href: "/partner/referral" },
  { icon: "orbit", label: "Écosystèmes", href: "/ecosystem?mode=switcher" },
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
  const navItems = items ?? TALENT_NAV;

  return (
    <nav aria-label="Navigation principale" className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/95 pb-safe backdrop-blur">
      <div className={`mx-auto flex items-center justify-between gap-0.5 px-2 py-2 ${navItems.length === 5 ? "max-w-md" : "max-w-sm"}`}>
        {navItems.map(({ icon, label, href }) => {
          const isActive = active === href || active.startsWith(href + "/");
          return (
            <button
              key={label}
              type="button"
              onClick={() => { if (href !== active) router.replace(href); }}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-bold transition-colors ${
                isActive
                  ? "bg-jobly-blue text-white shadow-[0_8px_18px_rgba(46,92,158,0.3)]"
                  : "text-jobly-gray hover:text-navy"
              }`}
            >
              <NavIcon id={icon} className="h-[19px] w-[19px]" />
              <span className="text-center leading-[1.1]">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
