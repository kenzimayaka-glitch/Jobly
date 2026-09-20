"use client";

import JiaPresence from "./JiaPresence";

export default function JiaGlobal() {
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
