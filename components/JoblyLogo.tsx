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
          className={`relative z-10 block shrink-0 overflow-hidden ${hero ? "h-[48px] w-[34px]" : "h-[25px] w-[10px]"}`}
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
          className={`relative z-0 -ml-[2px] ${hero ? "h-[48px] w-[146px]" : "h-[25px] w-[76px]"}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <g
            fill="#22448B"
            fontFamily="Poppins, sans-serif"
            fontWeight="800"
            fontSize="110"
          >
            <text x="0" y="95">o</text>
            <text x="60" y="95">b</text>
            <text x="176" y="115">y</text>
          </g>

          <rect x="123" y="5" width="38" height="78" fill="#22448B" />

          <path
            d="M123 86
               C133 88 147 90 158 88
               C163 87 166 89 167 92
               C168 96 165 99 161 101
               C153 104 136 103 123 99 Z"
            fill="#FFD400"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showTagline && (
        <span
          className={`mt-0.5 font-[var(--font-inter)] font-bold tracking-[-0.02em] text-[#22448B] ${hero ? "ml-[34px] text-[9px]" : "ml-[10px] text-[5px]"}`}
        >
          Your Career OS.
        </span>
      )}
    </div>
  );
});

export default JoblyLogo;
