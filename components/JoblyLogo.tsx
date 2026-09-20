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
      aria-label="JobLy — Your Career OS"
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

        <span
          className={`font-[var(--font-inter)] font-black tracking-[-0.075em] text-deep-blue ${hero ? "text-[36px]" : "text-[17px]"}`}
        >
          O<span>b</span><span className="relative inline-block">L<span
            aria-hidden="true"
            className={`pointer-events-none absolute left-[7%] ${hero ? "bottom-[-1px] h-[5px] w-[88%]" : "bottom-[-1px] h-[3px] w-[88%]"}`}
          >
            <svg viewBox="0 0 48 8" preserveAspectRatio="none" className="h-full w-full overflow-visible">
              <path
                d="M1 3.7 C10 2.2 18 6.6 28 4.5 C35 3.0 40 5.9 47 2.5"
                fill="none"
                stroke="#FFDE00"
                strokeWidth={hero ? "3.8" : "3"}
                strokeLinecap="round"
              />
            </svg>
          </span></span><span>y</span>
        </span>
      </div>

      {showTagline && (
        <span
          className={`mt-0.5 font-[var(--font-inter)] font-semibold tracking-[-0.015em] text-deep-blue ${hero ? "ml-[34px] text-[9px]" : "ml-[10px] text-[5px]"}`}
        >
          Your Career OS.
        </span>
      )}
    </div>
  );
});

export default JoblyLogo;
