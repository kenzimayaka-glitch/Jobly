"use client";

import Image from "next/image";
import { forwardRef } from "react";

type JoblyLogoProps = {
  size?: "hero" | "header";
  className?: string;
  showTagline?: boolean;
};

const JoblyLogo = forwardRef<HTMLDivElement, JoblyLogoProps>(function JoblyLogo(
  { size = "hero", className = "" },
  ref,
) {
  const hero = size === "hero";
  const width = hero ? 340 : 140;
  const height = hero ? 102 : 42;

  return (
    <div
      ref={ref}
      aria-label="JOBLY — Your Career OS"
      className={`inline-flex select-none items-center leading-none ${className}`}
    >
      <Image
        src="/jobly-logo-official-transparent.png"
        alt="JOBLY — Your Career OS"
        width={width}
        height={height}
        sizes={hero ? "(max-width: 640px) 80vw, 340px" : "140px"}
        className="block h-auto w-auto max-w-full object-contain"
      />
    </div>
  );
});

export default JoblyLogo;
