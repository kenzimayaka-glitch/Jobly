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
          </g>

          {/* L allégé : fût plus fin, pied jaune conservé. */}
          <rect x="124" y="5" width="28" height="78" fill="#22448B" />

          <path
            d="M124 86
               C133 88 143 89 152 87
               C156 87 159 89 160 92
               C161 96 158 99 154 101
               C147 103 134 102 124 99 Z"
            fill="#FFD400"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Y redessiné explicitement pour une lecture nette à petite taille. */}
          <path
            d="M174 8
               L188 8
               L201 43
               L214 8
               L228 8
               L208 59
               L208 112
               L194 112
               L194 59 Z"
            fill="#22448B"
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
