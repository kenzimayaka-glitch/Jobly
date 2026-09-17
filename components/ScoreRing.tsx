export default function ScoreRing({ score, value, size = "md", label }: { score?: number; value?: number; size?: "sm" | "md" | "lg" | number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, score ?? value ?? 85));
  const deg = (clamped / 100) * 360;

  const sizeConfig = {
    sm: { width: 80, fontSize: 18, padding: 4, subSize: 9 },
    md: { width: 120, fontSize: 28, padding: 6, subSize: 11 },
    lg: { width: 160, fontSize: 36, padding: 8, subSize: 13 },
  };

  const config = typeof size === "number"
    ? { width: size, fontSize: Math.max(14, Math.round(size * 0.30)), padding: Math.max(3, Math.round(size * 0.08)), subSize: Math.max(8, Math.round(size * 0.10)) }
    : sizeConfig[size];

  // Color based on score
  const getColor = () => {
    if (clamped >= 80) return { start: "#2E7BEA", mid: "#2E5C9E", end: "#FFC72C" };
    if (clamped >= 60) return { start: "#FFC72C", mid: "#FFC72C", end: "#2E7BEA" };
    return { start: "#2E5C9E", mid: "#2E5C9E", end: "#94A3B8" };
  };

  const colors = getColor();

  return (
    <div className="relative shrink-0" style={{ width: config.width, height: config.width }}>
      <div
        className="h-full w-full rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
        style={{
          background: `conic-gradient(${colors.start} 0deg, ${colors.mid} ${deg * 0.55}deg, ${colors.end} ${deg}deg, #E2E8F0 ${deg}deg 360deg)`,
        }}
      />
      <div 
        className="absolute flex flex-col items-center justify-center rounded-full bg-white"
        style={{
          inset: config.padding,
        }}
      >
        <span className="font-heading font-extrabold text-navy" style={{ fontSize: config.fontSize }}>
          {clamped}%
        </span>
        {label && <span className="font-semibold text-jobly-gray" style={{ fontSize: config.subSize }}>
          {label}
        </span>}
      </div>
    </div>
  );
}
