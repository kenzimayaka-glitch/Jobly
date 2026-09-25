"use client";

import { useEffect, useState } from "react";
import { removeBackground as imglyRemoveBackground } from "@imgly/background-removal";

type TalentHeroProps = {
  photoUrl?: string | null;
  firstName?: string;
};

export default function TalentHero({ photoUrl, firstName = "" }: TalentHeroProps) {
  const [cutoutUrl, setCutoutUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function removeBackground() {
      if (!photoUrl) {
        setCutoutUrl(null);
        return;
      }

      try {
        // Download the source first so IMG.LY receives the actual image bytes.
        // This avoids failures when the profile photo is hosted on a different
        // origin and the browser blocks direct cross-origin image access.
        const response = await fetch(photoUrl, { credentials: "omit", cache: "no-store" });
        if (!response.ok) throw new Error("Photo inaccessible.");
        const sourceBlob = await response.blob();

        const blob = await imglyRemoveBackground(sourceBlob, {
          model: "isnet",
          output: {
            format: "image/png",
            quality: 1,
            type: "foreground",
          },
        });

        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setCutoutUrl(objectUrl);
      } catch (error) {
        console.error("Jobly hero background removal failed:", error);
        if (!cancelled) setCutoutUrl(null);
      }
    }

    void removeBackground();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoUrl]);

  // Do not replace the cutout with the original image once processing has
  // started: the Hero must display the transparent foreground, not the source
  // photo with its background.
  const heroPhotoUrl = cutoutUrl || null;

  return (
    <section className="relative w-full overflow-visible rounded-[32px] bg-[#FFFDFA]">
      <div className="pointer-events-none absolute top-[-20px] right-[10%] h-64 w-64 rounded-full bg-[#FFDE59]/60 blur-[40px]" />
      <div className="pointer-events-none absolute bottom-[20%] right-[5%] h-80 w-80 rounded-full bg-[#C7E0FF]/60 blur-[50px]" />
      <div className="relative min-h-[390px] overflow-hidden rounded-[32px]">
        <div className="pointer-events-none absolute right-4 top-20 z-20 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-[#0A1931] shadow-[0_10px_30px_rgba(10,25,49,.12)]">Ton avenir commence ici</div>
        <div className="pointer-events-none absolute bottom-24 right-4 z-20 grid h-11 w-11 place-items-center rounded-full bg-white text-[#0057B8] shadow-[0_10px_24px_rgba(10,25,49,.12)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 18V9M10 18V5M16 18v-7M22 18H2" /><path d="m3 7 5-3 5 2 7-4" /></svg>
        </div>
        <div className="relative z-20 flex min-h-[390px] items-center px-5 pb-20 pt-8 sm:px-8">
          <div className="max-w-[60%]">
            <p className="text-[18px] font-black text-[#0A1931] sm:text-[22px]">Bonjour{firstName ? ` ${firstName}` : ""} 👋</p>
            <h1 className="mt-2 max-w-[560px] font-heading text-[28px] font-bold leading-[1.08] tracking-[-.035em] text-[#0A1931] sm:text-[34px]">Votre carrière mérite un vrai copilote.</h1>
            <p className="mt-3 max-w-[500px] text-[12px] leading-5 text-[#667085] sm:text-[14px] sm:leading-6">Je cherche, j’analyse, je prépare et je vous accompagne vers les meilleures opportunités.</p>
          </div>
        </div>
        {heroPhotoUrl && <img src={heroPhotoUrl} alt={`Portrait de ${firstName || "vous"}`} className="pointer-events-none absolute bottom-0 right-0 z-10 h-[115%] w-auto max-w-[68%] object-contain object-bottom" />}
        <div className="absolute bottom-4 left-4 right-4 z-30">
          <form action="/jobs" method="get" className="flex min-h-[56px] items-center gap-3 rounded-full bg-white px-4 shadow-[0_14px_34px_rgba(7,27,69,.14)]">
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#52627A]" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
            <input name="q" placeholder="Quel poste recherchez-vous ?" className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-[#7C8CA5]" aria-label="Rechercher une offre" />
            <button type="submit" aria-label="Filtrer" className="grid h-9 w-9 place-items-center rounded-full text-[#52627A] hover:bg-[#F4F6F8]"><svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg></button>
          </form>
        </div>
      </div>
    </section>
  );
}