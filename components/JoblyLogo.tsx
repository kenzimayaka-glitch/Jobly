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
          viewBox="0 0 280 120"
          className={hero ? "h-[48px] w-[164px]" : "h-[25px] w-[86px]"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g
            fill="#22448B"
            fontFamily="Poppins, sans-serif"
            fontWeight="800"
            fontSize="110"
          >
            <text x="0" y="95">o</text>
            <text x="67" y="95">b</text>
            <text x="188" y="115">y</text>
          </g>

          {/* L : corps bleu normal, pied jaune canari court et organique */}
          <rect x="133" y="5" width="38" height="78" fill="#22448B" />
          <path
            d="M 133 86
               C 143 88, 157 90, 169 88
               Q 174 87, 176 90
               Q 178 95, 174 99
               Q 168 103, 156 103
               Q 143 103, 133 100 Z"
            fill="#FFD400"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showTagline && (
        <span
          className={`mt-0.5 font-[var(--font-inter)] font-bold tracking-[-0.015em] text-[#22448B] ${hero ? "ml-[34px] text-[9px]" : "ml-[10px] text-[5px]"}`}
        >
          Your Career OS.
        </span>
      )}
    </div>
  );
});

export default JoblyLogo;
