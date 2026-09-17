"use client";

import Image, { StaticImageData } from "next/image";
import { useRouter } from "next/navigation";

import talentImage from "../assets/ecosystem/talent-20.jpg";
import recruiterImage from "../assets/ecosystem/recruiter-40.jpg";
import partnerImage from "../assets/ecosystem/partner-22.jpg";
import bonsPlansImage from "../assets/ecosystem/bonsplans.jpg";

type EcosystemId = "talent" | "recruiter" | "partner" | "bonsplans";

type Eco = {
  id: EcosystemId;
  name: string;
  badge: string;
  tagline: string;
  href: string;
  image: StaticImageData;
  tone: "yellow" | "blue" | "green";
};

// Photos : assets/ecosystem/{talent-20,recruiter-40,partner-22}.jpg — visuels définitifs fournis par le client.
const ECOSYSTEMS: Eco[] = [
  { id: "talent", name: "Talent", badge: "TALENT", tagline: "Construisez votre avenir professionnel.", href: "/career-brain", image: talentImage, tone: "yellow" },
  { id: "recruiter", name: "Recruiter", badge: "RECRUITER", tagline: "Trouvez les talents qui feront la différence.", href: "/recruiter", image: recruiterImage, tone: "blue" },
  { id: "partner", name: "Partner", badge: "PARTNER", tagline: "Développez votre activité avec Jobly.", href: "/partner", image: partnerImage, tone: "green" },
];

const BON_PLAN: Eco = {
  id: "bonsplans",
  name: "Bon Plan",
  badge: "BON PLAN",
  tagline: "Des offres et avantages exclusifs JOBLY",
  href: "/bons-plans",
  image: bonsPlansImage,
  tone: "yellow",
};

function toneStyles(tone: Eco["tone"]) {
  return {
    yellow: {
      gradient: "linear-gradient(135deg,#FFE27A 0%,#FFC72C 55%,#F2A900 100%)",
      blobA: "#FFF3C4",
      blobB: "#E9A400",
      badgeText: "#7A5300",
      arrowText: "#B8860B",
      titleText: "#3E2900",
      taglineText: "rgba(62,41,0,0.78)",
      tint: "rgba(255,199,44,0.34)",
    },
    blue: {
      gradient: "linear-gradient(135deg,#6FA1FF 0%,#2E5C9E 55%,#173C74 100%)",
      blobA: "#BFD8FF",
      blobB: "#0F2E5C",
      badgeText: "#FFFFFF",
      arrowText: "#1D4ED8",
      titleText: "#FFFFFF",
      taglineText: "rgba(255,255,255,0.85)",
      tint: "rgba(29,78,216,0.34)",
    },
    green: {
      gradient: "linear-gradient(135deg,#6BE3A6 0%,#12B76A 55%,#087F4E 100%)",
      blobA: "#C8FBE3",
      blobB: "#065F3D",
      badgeText: "#FFFFFF",
      arrowText: "#0F9D58",
      titleText: "#FFFFFF",
      taglineText: "rgba(255,255,255,0.85)",
      tint: "rgba(16,185,129,0.34)",
    },
  }[tone];
}

export default function EcosystemSelector({ showBonPlan = false }: { showBonPlan?: boolean }) {
  const router = useRouter();
  const items = showBonPlan ? [...ECOSYSTEMS, BON_PLAN] : ECOSYSTEMS;

  function select(eco: Eco) {
    if (eco.id !== "bonsplans") {
      try { window.localStorage.setItem("jobly:last-ecosystem", eco.id); } catch {}
    }
    router.push(eco.href);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3" role="list" aria-label="Choisissez votre espace">
        {items.map((eco, index) => {
          const s = toneStyles(eco.tone);
          return (
            <button
              key={eco.id}
              type="button"
              role="listitem"
              onClick={() => select(eco)}
              style={{ animationDelay: `${index * 110}ms`, background: s.gradient }}
              className="eco-card group relative flex w-full aspect-[1.12/1] min-h-0 flex-col overflow-hidden rounded-[28px] text-left shadow-[0_16px_38px_rgba(20,38,78,0.16)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_46px_rgba(20,38,78,0.22)] active:scale-[0.985]"
            >
              {/* Fond animé façon "fumée" : plusieurs masses floues qui dérivent lentement */}
              <span aria-hidden="true" className="absolute inset-0 overflow-hidden">
                <span
                  className="eco-blob eco-blob-1 absolute -left-10 -top-14 h-40 w-40 rounded-full blur-2xl"
                  style={{ background: s.blobA, opacity: 0.35 }}
                />
                <span
                  className="eco-blob eco-blob-2 absolute -right-8 top-1/3 h-36 w-36 rounded-full blur-2xl"
                  style={{ background: s.blobB, opacity: 0.28 }}
                />
                <span
                  className="eco-blob eco-blob-3 absolute bottom-[-40px] left-1/4 h-32 w-32 rounded-full blur-2xl"
                  style={{ background: s.blobA, opacity: 0.22 }}
                />
              </span>

              {/* Photo pleine hauteur, ancrée à droite, fondue vers le dégradé de la carte sur son bord gauche */}
              <span
                className="eco-photo absolute right-0 top-0 h-full w-[46%] overflow-hidden"
                style={{
                  WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 22%)",
                  maskImage: "linear-gradient(to right, transparent 0%, black 22%)",
                }}
              >
                <Image
                  src={eco.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 46vw, 320px"
                  quality={95}
                  className="object-cover object-center"
                />
              </span>

              {/* Badge */}
              <span
                className="relative z-10 m-2.5 mb-auto h-fit rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] shadow-sm backdrop-blur"
                style={{ background: "rgba(255,255,255,0.28)", color: s.badgeText, border: "1px solid rgba(255,255,255,0.35)" }}
              >
                {eco.badge}
              </span>

              {/* Titre + tagline */}
              <span className="relative z-10 mt-auto flex max-w-[64%] flex-col gap-1 p-2.5 pt-0">
                <span className="font-heading text-[17px] font-extrabold leading-none tracking-[-0.02em]" style={{ color: s.titleText }}>
                  {eco.name}
                </span>
                <span className="text-[10px] leading-[1.3]" style={{ color: s.taglineText }}>
                  {eco.tagline}
                </span>
              </span>

              {/* Bouton flèche */}
              <span
                className="absolute bottom-2.5 right-2.5 z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-lg font-bold shadow-[0_7px_16px_rgba(20,38,78,0.25)] transition-transform duration-300 group-hover:translate-x-0.5"
                style={{ color: s.arrowText }}
                aria-hidden="true"
              >
                →
              </span>
            </button>
          );
        })}
      </div>



      <style jsx>{`
        .eco-card { animation: eco-card-in 620ms cubic-bezier(.16,1,.3,1) both; }
        @keyframes eco-card-in { from { opacity: 0; transform: translateY(18px) scale(.985); filter: blur(4px); } to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } }

        .eco-blob-1 { animation: eco-drift-1 13s ease-in-out infinite alternate; }
        .eco-blob-2 { animation: eco-drift-2 16s ease-in-out infinite alternate; }
        .eco-blob-3 { animation: eco-drift-3 11s ease-in-out infinite alternate; }

        @keyframes eco-drift-1 {
          0% { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(18px, 14px) scale(1.12); }
        }
        @keyframes eco-drift-2 {
          0% { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(-16px, 20px) scale(1.08); }
        }
        @keyframes eco-drift-3 {
          0% { transform: translate(0px, 0px) scale(1); }
          100% { transform: translate(14px, -16px) scale(1.15); }
        }

        @media (prefers-reduced-motion: reduce) {
          .eco-card, .eco-blob-1, .eco-blob-2, .eco-blob-3 { animation: none; }
        }
      `}</style>
    </div>
  );
}
