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
        {/* Le J vient exclusivement du logo original. Le crop coupe tout le OBLY d'origine. */}
        <span
          aria-hidden="true"
          className={`relative z-10 block shrink-0 overflow-hidden ${hero ? "h-[48px] w-[28px]" : "h-[25px] w-[9px]"}`}
        >
          <img
            src="/jobly-logo-reference.jpg"
            alt=""
            className={`absolute left-0 top-0 max-w-none ${hero ? "h-[48px] w-[149px]" : "h-[25px] w-[78px]"}`}
          />
        </span>

        {/* obLy est un seul bloc typographique, immédiatement contre le J. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 250 120"
          className={`relative z-0 -ml-[1px] ${hero ? "h-[48px] w-[146px]" : "h-[25px] w-[76px]"}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g
            fill="#22448B"
            fontFamily="Poppins, sans-serif"
            fontWeight="800"
            fontSize="110"
          >
            <text x="0" y="95">o</text>
            <text x="58" y="95">b</text>
            <text x="174" y="115">y</text>
          </g>

          <rect x="121" y="5" width="38" height="78" fill="#22448B" />

          <path
            d="M121 86
               C131 88 145 90 156 88
               C161 87 164 89 165 92
               C166 96 163 99 159 101
               C151 104 134 103 121 99 Z"
            fill="#FFD400"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showTagline && (
        <span
          className={`mt-0.5 font-[var(--font-inter)] font-bold tracking-[-0.02em] text-[#22448B] ${hero ? "ml-[28px] text-[9px]" : "ml-[9px] text-[5px]"}`}
        >
          Your Career OS.
        </span>
      )}
    </div>
  );
});

export default JoblyLogo;
