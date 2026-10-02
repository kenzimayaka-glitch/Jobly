import type { SVGProps } from "react";

type PremiumDiamondProps = SVGProps<SVGSVGElement> & {
  tone?: "blue" | "red";
};

export function PremiumDiamond({ tone = "blue", className, ...props }: PremiumDiamondProps) {
  const id = tone === "red" ? "jobly-premium-diamond-red" : "jobly-premium-diamond-blue";
  const gradient = tone === "red" ? ["#FF3B30", "#FF0F0F", "#B40000"] : ["#55C7FF", "#1677FF", "#063BBA"];
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className ?? "h-3.5 w-3.5 shrink-0"}
      {...props}
    >
      <defs>
        <linearGradient id={id} x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={gradient[0]} />
          <stop offset="0.48" stopColor={gradient[1]} />
          <stop offset="1" stopColor={gradient[2]} />
        </linearGradient>
        <linearGradient id={id + "-shine"} x1="7" y1="5" x2="17" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".95" />
          <stop offset=".28" stopColor="#FFFFFF" stopOpacity=".2" />
          <stop offset=".55" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id={id + "-glow"} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="1.15" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <g filter={`url(#${id}-glow)`}>
        <path d="M3.5 7.3 6.9 4h10.2l3.4 3.3-8.5 12.1L3.5 7.3Z" fill={`url(#${id})`} stroke="rgba(255,255,255,.72)" strokeWidth=".7" />
        <path d="m3.8 7.3 4.3.1 3.9 12 4-12 4.2-.1" fill="none" stroke="rgba(255,255,255,.7)" strokeWidth=".7" />
        <path d="M6.9 4 8.1 7.4h7.8L17.1 4" fill="none" stroke="rgba(255,255,255,.72)" strokeWidth=".7" />
        <path d="M4.2 7.2 8 7.4 12 19.1 15.9 7.4l3.9-.2" fill={`url(#${id}-shine)`} opacity=".8" />
      </g>
    </svg>
  );
}
