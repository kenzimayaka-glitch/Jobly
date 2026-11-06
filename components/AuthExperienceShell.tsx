"use client";

import Image from "next/image";
import type { ReactNode } from "react";

type AuthExperienceShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  headerAction?: ReactNode;
  step?: 1 | 2 | 3;
  stepLabel?: string;
  language?: "fr" | "en";
};

export default function AuthExperienceShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  headerAction,
  step,
  stepLabel,
  language = "fr",
}: AuthExperienceShellProps) {
  const copy = language === "fr"
    ? {
        kicker: "JOBLY · YOUR CAREER OS",
        sideTitle: "Ton prochain chapitre professionnel commence ici.",
        sideDescription: "Les opportunités, tes candidatures et ton évolution réunies dans une même expérience.",
        points: [
          ["01", "Explore les opportunités", "Découvre des pistes qui correspondent à ton profil."],
          ["02", "Construis ton parcours", "Garde tes démarches et tes objectifs au même endroit."],
          ["03", "Avance avec confiance", "Retrouve ton espace sur tes appareils."],
        ],
        step: "Étape",
        footer: "Un compte, un parcours. Reprends là où tu t’es arrêté.",
      }
    : {
        kicker: "JOBLY · YOUR CAREER OS",
        sideTitle: "Your next professional chapter starts here.",
        sideDescription: "Opportunities, applications and career growth brought together in one experience.",
        points: [
          ["01", "Explore opportunities", "Discover paths that fit your profile."],
          ["02", "Build your journey", "Keep your applications and goals in one place."],
          ["03", "Move forward with confidence", "Access your space across your devices."],
        ],
        step: "Step",
        footer: "One account, one journey. Pick up where you left off.",
      };

  return (
    <section className="relative isolate flex min-h-[100dvh] w-full items-stretch justify-center overflow-hidden bg-[#F1F5FA] text-[#0A1931] dark:bg-[#08172B] sm:items-center sm:px-5 sm:py-5">
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full bg-[#FFD60A]/15 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#2F6BCE]/12 blur-3xl" />

      <div className="relative mx-auto grid min-h-[100dvh] w-full max-w-[1280px] overflow-hidden bg-white shadow-[0_28px_90px_rgba(10,25,49,0.14)] dark:bg-[#101F35] sm:min-h-[min(820px,calc(100dvh-40px))] sm:rounded-[32px] sm:border sm:border-white/80 lg:grid-cols-[minmax(0,1fr)_minmax(460px,560px)]">
        <aside className="relative hidden flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_18%_16%,rgba(255,214,10,0.2),transparent_34%),linear-gradient(145deg,#09182E_0%,#12396E_58%,#174A87_100%)] p-10 text-white lg:flex xl:p-14">
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -right-20 h-80 w-80 rounded-full border border-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-8 right-8 h-44 w-44 rounded-full border border-white/10" />
          <div className="relative z-10">
            <div className="inline-flex rounded-2xl bg-white px-4 py-2.5 shadow-lg shadow-black/10">
              <Image src="/jobly-logo-official-transparent.png" alt="JOBLY" width={400} height={120} priority className="h-auto w-[150px] object-contain" />
            </div>
            <p className="mt-10 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#FFD60A]">{copy.kicker}</p>
            <h2 className="mt-4 max-w-[520px] text-[clamp(2.25rem,4vw,3.6rem)] font-extrabold leading-[1.02] tracking-[-0.045em]">{copy.sideTitle}</h2>
            <p className="mt-5 max-w-[420px] text-[15px] leading-7 text-blue-100/80">{copy.sideDescription}</p>
          </div>

          <div className="relative z-10 mt-10 grid gap-3">
            {copy.points.map(([number, heading, detail]) => (
              <div key={number} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur-sm">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFD60A] text-sm font-black text-[#0A1931]">{number}</span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-white">{heading}</p>
                  <p className="mt-1 text-xs leading-5 text-blue-100/70">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="relative z-10 mt-8 text-[11px] font-semibold tracking-[0.08em] text-blue-100/55">JOBLY · AFRICA · CAREER · OPPORTUNITY</p>
        </aside>

        <div className="relative flex min-w-0 flex-col justify-center px-5 py-7 dark:bg-[#101F35] sm:px-9 sm:py-10 lg:px-11">
          <div className="mx-auto flex w-full max-w-[448px] flex-col">
            <div className="mb-7 flex items-center justify-between gap-3 lg:hidden">
              <div className="rounded-xl bg-[#F7F9FC] px-3 py-2 dark:bg-white">
                <Image src="/jobly-logo-official-transparent.png" alt="JOBLY — Your Career OS" width={400} height={120} className="h-auto w-[118px] object-contain sm:w-[132px]" priority />
              </div>
              {headerAction}
            </div>
            {headerAction && <div className="mb-5 hidden justify-end lg:flex">{headerAction}</div>}

            <div className="mb-7">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#2457A7] dark:text-[#91B7FF]">{eyebrow}</p>
                {step && (
                  <span className="rounded-full bg-[#F1F5FA] px-3 py-1 text-[10px] font-bold text-[#627086] dark:bg-white/10 dark:text-blue-100">
                    {copy.step} {step}/3 · {stepLabel}
                  </span>
                )}
              </div>
              <h1 className="text-[clamp(1.8rem,4vw,2.25rem)] font-extrabold leading-[1.06] tracking-[-0.04em] text-[#0A1931] dark:text-white">{title}</h1>
              <p className="mt-3 max-w-[420px] text-[13px] leading-6 text-[#6E7A8C] dark:text-slate-300 sm:text-sm">{description}</p>
              {step && (
                <div className="mt-5 grid grid-cols-3 gap-2" aria-label={`${copy.step} ${step} ${language === "fr" ? "sur" : "of"} 3`}>
                  {[1, 2, 3].map((item) => (
                    <span key={item} className={`h-1 rounded-full ${item <= step ? "bg-[#FFD60A]" : "bg-[#E7ECF3] dark:bg-white/10"}`} />
                  ))}
                </div>
              )}
            </div>

            {children}

            {footer && <div className="mt-6 border-t border-[#EDF1F6] pt-5 dark:border-white/10">{footer}</div>}
            <p className="mt-7 text-center text-[10px] font-medium tracking-[0.02em] text-[#9AA4B2] dark:text-slate-500">{copy.footer}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
