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
  const logoSize = hero ? "h-[64px] w-[64px]" : "h-[38px] w-[38px]";

  return (
    <div
      ref={ref}
      aria-label="JobLy — Your Career OS."
      className={`inline-flex select-none flex-col items-start leading-none ${className}`}
    >
      <div className={`relative shrink-0 overflow-hidden rounded-xl ${logoSize}`}>
        <img
          src="/IMG-20260928-WA1495.jpg"
          alt="JobLy"
          width={hero ? 64 : 38}
          height={hero ? 64 : 38}
          className="h-full w-full object-contain"
          style={{ mixBlendMode: "multiply" }}
        />
      </div>

      {showTagline && (
        <span
          className={`mt-1 font-[var(--font-inter)] font-bold tracking-[-0.02em] text-[#22448B] ${hero ? "ml-1 text-[9px]" : "ml-1 text-[5px]"}`}
        >
          Your Career OS.
        </span>
      )}
    </div>
  );
});

export default JoblyLogo;
