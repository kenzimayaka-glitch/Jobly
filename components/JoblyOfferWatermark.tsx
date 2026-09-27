import Image from "next/image";

type JoblyOfferWatermarkProps = {
  className?: string;
};

export default function JoblyOfferWatermark({ className = "" }: JoblyOfferWatermarkProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden select-none ${className}`}
    >
      <div className="relative h-[min(58vw,520px)] w-[min(58vw,520px)] min-h-[260px] min-w-[260px] opacity-[0.055] blur-[1.5px] sm:h-[460px] sm:w-[460px]">
        <Image
          src="/favicon.ico"
          alt=""
          fill
          sizes="520px"
          className="object-contain grayscale"
        />
      </div>
    </div>
  );
}
