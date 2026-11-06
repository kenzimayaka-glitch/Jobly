"use client";

type JiaPresenceMarkProps = {
  size?: "sm" | "md" | "lg";
  listening?: boolean;
  speaking?: boolean;
};

/**
 * Signature visuelle transitoire de J’IA.
 * Aucun visage, mannequin, GLB ou moteur 3D : seule la présence conversationnelle est représentée.
 */
export default function JiaPresenceMark({
  size = "md",
  listening = false,
  speaking = false,
}: JiaPresenceMarkProps) {
  const active = listening || speaking;
  const dimensions = size === "lg"
    ? "h-[82px] w-[82px] sm:h-[104px] sm:w-[104px]"
    : size === "sm"
      ? "h-8 w-8"
      : "h-12 w-12";

  return (
    <span
      aria-hidden="true"
      data-jia-presence-mark
      data-jia-activity={listening ? "listening" : speaking ? "speaking" : "available"}
      className={`relative inline-grid shrink-0 place-items-center ${dimensions}`}
    >
      <span className={`absolute inset-0 rounded-full border border-[#1264EB]/25 ${active ? "motion-safe:animate-ping" : ""}`} />
      <span className="absolute inset-[8%] rounded-full border border-[#FFD21A]/75 shadow-[0_0_22px_rgba(255,210,26,.28)]" />
      <span className="absolute inset-[17%] rounded-full bg-[radial-gradient(circle_at_34%_28%,#4E91FF_0%,#1559B8_44%,#071D43_100%)] shadow-[0_9px_24px_rgba(10,55,120,.32)]" />
      <span className="absolute inset-[29%] rounded-full border border-white/20 bg-white/[.06]" />
      <svg viewBox="0 0 48 48" className="relative h-[54%] w-[54%] overflow-visible" fill="none">
        <path
          d="M7 24h5l3.2-7.2L21 32l5.2-16 5.1 14 4-6H41"
          stroke="#FFD21A"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={active ? "motion-safe:animate-pulse" : ""}
        />
      </svg>
      <span className="absolute bottom-[10%] right-[10%] h-[17%] w-[17%] rounded-full border-2 border-[#09234A] bg-[#FFD21A] shadow-sm" />
    </span>
  );
}
