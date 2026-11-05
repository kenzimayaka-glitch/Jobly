"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseClient } from "../../../../lib/supabase";
import { BottomNavPartner } from "../../../../components/mobility/BottomNavPartner";

type PartnerType = "FINANCE" | "HOUSING" | "TRANSPORT";

export default function PartnerMobilityLayout({ children }: { children: React.ReactNode }) {
  const [type, setType] = useState<PartnerType>("FINANCE");
  const [enabled, setEnabled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    (async () => {
      const session = await getSupabaseClient().auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/mobility/partner/me", { headers: { Authorization: `Bearer ${token}` } });
      if (!active || !response.ok) return;
      const payload = await response.json();
      const partnerType = payload.provider?.providerType;
      if (partnerType === "HOUSING" || partnerType === "TRANSPORT" || partnerType === "FINANCE") {
        setType(partnerType);
        setEnabled(true);
      }
    })().catch(() => undefined);
    return () => { active = false; };
  }, []);

  const activeTab = pathname.includes("/dossiers") ? "dossiers"
    : pathname.includes("/financements") ? "financements"
      : pathname.includes("/rapports") ? "rapports"
        : pathname.includes("/demandes") ? "demandes"
          : pathname.includes("/logements") ? "logements"
            : pathname.includes("/trajets") ? "trajets"
              : pathname.includes("/validations") ? "validations"
                : "dashboard";

  return (
    <>
      <div className="min-h-[100dvh] pb-24">{children}</div>
      {enabled && <BottomNavPartner active={activeTab} type={type} />}
    </>
  );
}
