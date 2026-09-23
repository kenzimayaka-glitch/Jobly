"use client";

import { usePathname, useRouter } from "next/navigation";
import JoblyLogo from "./JoblyLogo";
import { useI18n } from "@/lib/i18n";

type Role = "talent" | "recruiter" | "partner";

const HOME: Record<Role, string> = { talent: "/dashboard", recruiter: "/recruiter", partner: "/partner" };
const PROFILE: Record<Role, string> = { talent: "/talent/profile", recruiter: "/recruiter/profile", partner: "/partner/profile" };

/** Déduit l’écosystème : prop explicite > thème > libellé d’eyebrow (FR/EN) > URL courante. */
function resolveRole(role: Role | undefined, theme: string, eyebrow: string | undefined, pathname: string): Role {
  if (role) return role;
  if (theme === "talent") return "talent";
  if (/^(recruiter|recruteur)$/i.test((eyebrow ?? "").trim())) return "recruiter";
  if (/^(partner|partenaire)$/i.test((eyebrow ?? "").trim())) return "partner";
  if (pathname.startsWith("/recruiter")) return "recruiter";
  if (pathname.startsWith("/partner")) return "partner";
  return "talent";
}

export default function PageHeader({
  label,
  eyebrow,
  initial = "•",
  avatarUrl,
  onBack,
  theme = "default",
  role,
}: {
  label: string;
  eyebrow?: string;
  initial?: string;
  avatarUrl?: string;
  onBack?: () => void;
  theme?: "default" | "talent";
  role?: Role;
}) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { t } = useI18n();
  const eco = resolveRole(role, theme, eyebrow, pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_6px_24px_rgba(10,25,49,.04)] backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : router.push(HOME[eco]))}
          aria-label={t("header.backHome")}
          className="jobly-focus flex min-h-[44px] items-center gap-2 rounded-xl"
        >
          <JoblyLogo size="header" showTagline />
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => router.push("/notifications")}
            aria-label={t("header.notifications")}
            className="jobly-focus relative flex h-11 w-11 items-center justify-center rounded-full bg-canari-blue-soft text-canari-blue transition active:scale-95"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          <button type="button" onClick={() => router.push(PROFILE[eco])} aria-label={t("header.openProfile")} className="jobly-focus rounded-full">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt={t("header.profilePhoto")} className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-[0_4px_12px_rgba(11,31,75,0.12)]" />
            ) : (
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-canari text-sm font-black text-ink shadow-[0_4px_12px_rgba(11,31,75,0.12)]">
                {initial}
              </span>
            )}
          </button>
        </div>
      </div>

      {(eyebrow || label) && (
        <div className="mx-auto mt-2 max-w-5xl">
          {eyebrow && <div className="text-[11px] font-black uppercase tracking-wider text-canari-blue">{eyebrow}</div>}
          {label && <div className="text-[13px] font-semibold text-muted">{label}</div>}
        </div>
      )}
    </header>
  );
}
