"use client";

import { useRouter } from "next/navigation";
import { Lock, ArrowRight } from "lucide-react";
import AppShell from "@/components/ui/AppShell";
import { Card, Button, PageIntro } from "@/components/ui";

export default function TopTalentPage() {
  const router = useRouter();
  return (
    <AppShell role="recruiter" active="/recruiter/talents" title="Talent Intelligence" eyebrow="RECRUTEUR" backHref="/recruiter" width="lg">
      <PageIntro title="Talent Intelligence" subtitle="Les talents sont classés pour chaque offre, selon leur score de matching réel." />
      <Card className="mt-6 p-6 sm:p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#174EA6]"><Lock size={25} /></div>
        <h2 className="mt-4 text-xl font-black text-ink">Choisissez d'abord une offre</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          Jobly ne présente pas un annuaire global de profils. Ouvrez une offre précise pour calculer les correspondances, retenir les cinq meilleurs talents dont le score atteint au moins 90 % et appliquer les droits d'accès de votre abonnement.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-600">Seuil ≥ 90 %</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-600">Top 5 par offre</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[10px] font-black text-slate-600">Profils premium</span>
        </div>
        <Button className="mt-6" onClick={() => router.push("/recruiter/jobs")}>Ouvrir mes offres <ArrowRight size={16} /></Button>
      </Card>
    </AppShell>
  );
}
