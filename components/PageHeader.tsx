"use client";

import { useRouter } from "next/navigation";
import JoblyLogo from "./JoblyLogo";

export default function PageHeader({
  label,
  eyebrow,
  initial = "•",
  avatarUrl,
  onBack,
  theme = "default",
}: {
  label: string;
  eyebrow?: string;
  initial?: string;
  avatarUrl?: string;
  onBack?: () => void;
  theme?: "default" | "talent";
}) {
  const router = useRouter();

  function goProfile() {
    const profileHref = theme === "talent"
      ? "/talent/profile"
      : eyebrow === "RECRUITER"
        ? "/recruiter/profile"
        : eyebrow === "PARTNER"
          ? "/partner/profile"
          : "/dashboard";
    router.push(profileHref);
  }

  return (
    <header className="relative z-20 border-b border-slate-100 bg-white/95 px-5 pb-3 pt-4 backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : router.push("/dashboard"))}
          aria-label="Retour à l'accueil JOBLY"
          className="flex items-center gap-2"
        >
          <JoblyLogo size="header" showTagline />
        </button>

        <div className="flex items-center gap-2.5">
          {/* Notification bell — corrigé le 13/09/2026 (audit) : n'avait aucune action */}
          <button
            type="button"
            onClick={() => router.push("/notifications")}
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          {/* Avatar — real photo if available, otherwise initial */}
          <button type="button" onClick={goProfile} aria-label="Ouvrir mon profil" className="rounded-full focus:outline-none focus:ring-2 focus:ring-[#1457D9] focus:ring-offset-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Photo de profil" className="h-10 w-10 rounded-full border-2 border-white object-cover shadow-[0_4px_12px_rgba(11,31,75,0.12)]" />
            ) : (
              <span className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-sm font-black text-jobly-blue shadow-[0_4px_12px_rgba(11,31,75,0.12)] ${theme === "talent" ? "bg-gradient-to-br from-blue-100 to-yellow-100" : "bg-gradient-to-br from-blue-100 to-violet-100"}`}>
                {initial}
              </span>
            )}
          </button>
        </div>
      </div>

      {(eyebrow || label) && (
        <div className="mx-auto mt-2 max-w-5xl">
          {eyebrow && <div className="text-[11px] font-black uppercase tracking-wider text-jobly-blue">{eyebrow}</div>}
          <div className="text-xs text-slate-500">{label}</div>
        </div>
      )}
    </header>
  );
}
