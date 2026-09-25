"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";

type TalentHeroProps = {
  photoUrl?: string | null;
  firstName?: string;
};

export default function TalentHero({ photoUrl, firstName = "" }: TalentHeroProps) {
  const [photoErrored, setPhotoErrored] = useState(false);
  const heroPhotoUrl = photoUrl && !photoErrored ? photoUrl : null;

  return (
    <section className="relative w-full overflow-visible rounded-[32px] bg-[#FFFDFA]">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-visible">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-[#FFDE59]/35 blur-3xl" />
        <div className="absolute right-[18%] top-8 h-44 w-44 rounded-full bg-[#FFD58A]/30 blur-3xl" />
        <div className="absolute right-[2%] top-[35%] h-72 w-72 rounded-full bg-[#C7E0FF]/45 blur-3xl" />
        <div className="absolute right-[30%] bottom-[-5%] h-52 w-52 rounded-full bg-[#8FC8FF]/25 blur-3xl" />
        <div className="absolute left-[35%] bottom-0 h-36 w-36 rounded-full bg-[#FFE77A]/20 blur-3xl" />
      </div>

      <div className="relative min-h-[370px] overflow-visible rounded-[32px] px-5 pb-5 pt-6 sm:min-h-[400px] sm:px-8 sm:pt-7">
        <div className="relative z-20 max-w-[58%] sm:max-w-[56%]">
          <p className="text-[18px] font-black text-[#0A1931] sm:text-[22px]">
            Bonjour{firstName ? ` ${firstName}` : ""} 👋
          </p>
          <h1 className="mt-1 max-w-[560px] font-heading text-[28px] font-extrabold leading-[1.06] tracking-[-.035em] text-[#0A1931] sm:text-[36px]">
            Votre carrière mérite un vrai copilote.
          </h1>
          <p className="mt-3 max-w-[500px] text-[12px] leading-5 text-[#667085] sm:text-[14px] sm:leading-6">
            Je cherche, j’analyse, je prépare et je vous accompagne vers les meilleures opportunités.
          </p>
        </div>

        <div className="absolute bottom-[62px] right-[-4px] z-10 h-[270px] w-[45%] min-w-[170px] max-w-[310px] sm:bottom-[68px] sm:right-3 sm:h-[300px] sm:w-[42%]">
          <div aria-hidden className="absolute -inset-10">
            <div className="absolute left-0 top-5 h-36 w-36 rounded-full bg-[#FFD84D]/35 blur-3xl" />
            <div className="absolute right-0 top-10 h-44 w-44 rounded-full bg-[#9CCFFF]/40 blur-3xl" />
            <div className="absolute bottom-0 left-[25%] h-40 w-40 rounded-full bg-[#FFE3A8]/25 blur-3xl" />
          </div>

          {heroPhotoUrl && (
            <div className="absolute inset-0 overflow-hidden rounded-[30px] [mask-image:linear-gradient(to_bottom,transparent_0%,black_8%,black_88%,transparent_100%)]">
              <img
                src={heroPhotoUrl}
                alt={`Portrait de ${firstName || "vous"}`}
                className="h-full w-full object-cover object-top"
                onError={() => setPhotoErrored(true)}
                loading="eager"
              />
            </div>
          )}

          <div className="absolute -right-3 -top-3 z-30 rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[11px] font-bold text-[#0A1931] shadow-[0_10px_28px_rgba(10,25,49,.12)] sm:-right-7 sm:-top-2 sm:px-4 sm:py-3 sm:text-xs">
            <span>Ton avenir commence ici ↗</span>
            <span aria-hidden className="absolute -bottom-2 left-5 h-3 w-3 rotate-45 rounded-[2px] bg-white" />
          </div>

          <div className="absolute right-1 top-[66px] z-30 flex h-9 w-9 animate-[bounce_3s_ease-in-out_infinite] items-center justify-center rounded-full bg-white shadow-[0_8px_20px_rgba(10,25,49,.12)] sm:right-3 sm:top-[72px]">
            <TrendingUp className="h-5 w-5 text-emerald-600" strokeWidth={2.5} />
          </div>
        </div>

        <div className="absolute bottom-4 left-5 right-5 z-30 sm:left-8 sm:right-8">
          <form action="/jobs" method="get" className="flex min-h-[54px] items-center gap-3 rounded-2xl border border-slate-100/80 bg-white/95 px-4 shadow-[0_12px_30px_rgba(7,27,69,.11)] backdrop-blur-sm sm:min-h-[56px] sm:rounded-full">
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-[#2E7BD8]" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input name="q" placeholder="Quel poste recherchez-vous ?" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#0A1931] outline-none placeholder:text-[#7C8CA5]" aria-label="Rechercher une offre" />
            <button type="submit" aria-label="Filtrer" className="grid h-9 w-9 place-items-center rounded-full text-[#52627A] transition-colors hover:bg-[#F4F6F8]">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
