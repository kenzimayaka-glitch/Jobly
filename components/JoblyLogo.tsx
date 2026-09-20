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
      <div className="flex items-center">
        <span
          aria-hidden="true"
          className={`relative block shrink-0 overflow-hidden mix-blend-multiply ${hero ? "h-[48px] w-[34px]" : "h-[25px] w-[10px]"}`}
        >
          <img
            src="/jobly-logo-reference.jpg"
            alt=""
            className={`absolute left-0 top-0 max-w-none ${hero ? "h-[48px] w-[149px]" : "h-[25px] w-[78px]"} object-contain object-left`}
          />
        </span>

        <svg
          aria-hidden="true"
          viewBox="0 0 500 120"
          className={hero ? "h-[48px] w-[164px]" : "h-[25px] w-[86px]"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g
            fill="#0072CE"
            fontFamily="Poppins, sans-serif"
            fontWeight="800"
            fontSize="110"
          >
            <text x="0" y="95">o</text>
            <text x="94" y="95">b</text>
            <text x="260" y="115">y</text>
          </g>

          {/* L : pied jaune canari, courbé et volontairement organique */}
          <rect x="196" y="5" width="38" height="78" fill="#0072CE" />
          <path
            d="M 196 86
               C 213 88, 268 92, 323 84
               Q 333 82, 336 86
               Q 338 95, 333 102
               Q 323 108, 278 108
               Q 228 108, 196 102 Z"
            fill="#FFD700"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showTagline && (
        <span
          className={`mt-0.5 font-[var(--font-inter)] font-semibold tracking-[-0.015em] text-[#0072CE] ${hero ? "ml-[34px] text-[9px]" : "ml-[10px] text-[5px]"}`}
        >
          Your Career OS.
        </span>
      )}
    </div>
  );
});

export default JoblyLogo;
