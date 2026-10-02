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
  const width = hero ? 339 : 120;
  const height = hero ? 115 : 40;

  return (
    <div
      ref={ref}
      aria-label={showTagline ? "JobLy — Your Career OS." : "JobLy"}
      className={`inline-flex select-none items-center leading-none ${className}`}
    >
      <img
        src="/IMG-20260928-WA1495.jpg"
        alt={showTagline ? "JobLy — Your Career OS." : "JobLy"}
        width={width}
        height={height}
        className="block h-auto w-auto max-w-full object-contain"
      />
    </div>
  );
});

export default JoblyLogo;
