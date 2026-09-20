"use client";

import { forwardRef } from "react";

type JoblyLogoProps = {
  size?: "hero" | "header";
  className?: string;
  showTagline?: boolean;
};

const JoblyLogo = forwardRef<HTMLDivElement, JoblyLogoProps>(function JoblyLogo(
  { size = "hero", className = "", showTagline = true },
  ref,
) {
  const hero = size === "hero";

  return (
    <div
      ref={ref}
      aria-label="JobLy — Your Career OS."
      className={`inline-flex select-none flex-col items-start leading-none ${className}`}
    >
      <div className="flex items-end">
        {/* J original : on conserve strictement le J du fichier de référence */}
        <span
          aria-hidden="true"
          className={`relative block shrink-0 overflow-hidden ${hero ? "h-[48px] w-[38px]" : "h-[25px] w-[11px]"}`}
        >
          <img
            src="/jobly-logo-reference.jpg"
            alt=""
            className={`absolute left-0 top-0 max-w-none ${hero ? "h-[48px] w-[149px]" : "h-[25px] w-[78px]"}`}
          />
        </span>

        {/* obLy : bloc compact, sans espace artificiel entre les lettres */}
        <svg
          aria-hidden="true"
          viewBox="0 0 270 120"
          className={hero ? "h-[48px] w-[152px]" : "h-[25px] w-[79px]"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g
            fill="#22448B"
            fontFamily="Poppins, sans-serif"
            fontWeight="800"
            fontSize="110"
          >
            <text x="0" y="95">o</text>
            <text x="63" y="95">b</text>
            <text x="185" y="115">y</text>
          </g>

          {/* L : corps bleu, seul le pied est jaune canari */}
          <rect x="128" y="5" width="38" height="78" fill="#22448B" />
          <path
            d="M128 86
               C139 88 153 90 165 88
               C170 87 173 89 174 92
               C175 96 172 99 168 101
               C160 104 141 103 128 99 Z"
            fill="#FFD400"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showTagline && (
        <span
          className={`mt-0.5 font-[var(--font-inter)] font-bold tracking-[-0.015em] text-[#22448B] ${hero ? "ml-[38px] text-[9px]" : "ml-[11px] text-[5px]"}`}
        >
          Your Career OS.
        </span>
      )}
    </div>
  );
});

export default JoblyLogo;
