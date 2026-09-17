"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNavTalent } from "../../../../components/mobility/BottomNavTalent";
import TalentBackground from "../../../../components/TalentBackground";

export default function TalentMobilityLayout({ children }: { children: ReactNode }) {
  const p = usePathname();
  const active = p.includes("/status") ? "suivi" : p.includes("/pass") ? "pass" : p.includes("/request") ? "demande" : "estimateur";
  return (
    <main className="talent-shell relative min-h-[100dvh] bg-white text-navy">
      <TalentBackground />
      <div className="relative z-10 min-h-[100dvh] pb-24">{children}</div>
      <BottomNavTalent active={active} />
    </main>
  );
}
