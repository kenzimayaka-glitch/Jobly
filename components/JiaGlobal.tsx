"use client";

import { usePathname } from "next/navigation";
import JiaPresence from "./JiaPresence";

// Production global mount — single J’IA instance.
export default function JiaGlobal() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999] overflow-visible"
      style={{ isolation: "isolate" }}
      aria-label="J’IA — couche globale Jobly"
    >
      <JiaPresence />
    </div>
  );
}
