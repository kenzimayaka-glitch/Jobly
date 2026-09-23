"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, IconButton } from "../ui";
import { useI18n } from "@/lib/i18n";

export type ReelCandidate = {
  id: string;
  userId?: string;
  candidateName?: string;
  jobTitle?: string | null;
  profilePhotoUrl?: string | null;
  pitchVideoUrl?: string | null;
};

/**
 * Découverte des candidats par leur pitch vidéo (5–8 s). Remplace l’ancien « Match Lab » :
 * plus de score fictif ni de « Like » sans effet — chaque bouton mène à une vraie fiche.
 */
export default function PitchReel({ candidates }: { candidates: ReelCandidate[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const withPitch = candidates.filter((c) => c.pitchVideoUrl);

  if (!withPitch.length) return <EmptyState title={t("rdash.pitch.none")} />;

  const current = withPitch[Math.min(index, withPitch.length - 1)];
  const name = current.candidateName || t("common.candidate");

  function openProfile() {
    try { sessionStorage.setItem("jobly:selected-talent", JSON.stringify(current)); } catch {}
    router.push(`/talent/profile?candidate=${encodeURIComponent(current.userId || current.id)}`);
  }

  return (
    <Card padded={false} className="overflow-hidden">
      <div className="relative bg-ink">
        <video key={current.id} className="mx-auto aspect-[9/12] max-h-[52dvh] w-full object-cover" src={current.pitchVideoUrl ?? undefined}
          poster={current.profilePhotoUrl ?? undefined} controls muted loop playsInline preload="metadata" aria-label={name} />
      </div>
      <div className="flex items-center gap-3 p-4">
        <IconButton label={t("common.previous")} onClick={() => setIndex((i) => (i - 1 + withPitch.length) % withPitch.length)} disabled={withPitch.length < 2}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
        </IconButton>
        <div className="min-w-0 flex-1 text-center">
          <div className="truncate text-[15px] font-black text-ink">{name}</div>
          <div className="truncate text-xs text-muted">{current.jobTitle ?? ""}</div>
          <div className="mt-0.5 text-[11px] font-bold text-canari-blue">{t("rdash.pitch.of", { i: Math.min(index, withPitch.length - 1) + 1, n: withPitch.length })}</div>
        </div>
        <IconButton label={t("common.next")} onClick={() => setIndex((i) => (i + 1) % withPitch.length)} disabled={withPitch.length < 2}>
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </IconButton>
      </div>
      <div className="border-t border-line p-4"><Button full onClick={openProfile}>{t("rdash.pitch.profile")}</Button></div>
    </Card>
  );
}
