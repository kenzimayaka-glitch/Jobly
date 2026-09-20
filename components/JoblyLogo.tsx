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
          className={`font-[var(--font-inter)] font-black tracking-[-0.075em] text-deep-blue ${hero ? "ml-0 text-[36px]" : "ml-0 text-[17px]"}`}
        >
          ObLy
        </span>
      </div>
      {showTagline && (
        <span
          className={`mt-0.5 font-[var(--font-inter)] font-semibold tracking-[-0.015em] text-deep-blue/75 ${hero ? "ml-[34px] text-[9px]" : "ml-[10px] text-[5px]"}`}
        >
          Your Career OS
        </span>
      )}
    </div>
  );
});

export default JoblyLogo;
