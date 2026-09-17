export default function DecorativeBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Halos flous de fond */}
      <div className="absolute -right-16 top-[8%] h-56 w-56 rounded-full bg-blue-300/30 blur-3xl" />
      <div className="absolute -left-20 top-[38%] h-48 w-48 rounded-full bg-amber-200/35 blur-3xl" />
      <div className="absolute -bottom-16 right-[-10%] h-52 w-52 rounded-full bg-violet-300/30 blur-3xl" />
      <div className="absolute left-[-12%] bottom-[12%] h-40 w-40 rounded-full bg-blue-200/30 blur-3xl" />

      {/* Icônes 3D en accent, ancrées aux bords et partiellement coupées, comme dans les maquettes */}
      <div className="absolute -left-3 top-[14%] h-14 w-14 -rotate-6 rounded-2xl bg-gradient-to-br from-jobly-blue to-jobly-blue-dark opacity-90 shadow-[0_10px_22px_rgba(37,99,235,0.35)] sm:h-16 sm:w-16">
        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-7 w-7 text-white" fill="currentColor" aria-hidden="true">
          <path d="M9 3a1 1 0 0 0-1 1v1H5a2 2 0 0 0-2 2v3h18V7a2 2 0 0 0-2-2h-3V4a1 1 0 0 0-1-1H9Zm1 2h4v0H10ZM3 11v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7H3Z" />
        </svg>
      </div>

      <div className="absolute -right-3 top-[24%] h-11 w-11 rotate-12 rounded-xl bg-gradient-to-br from-emerald-400 to-jobly-green-dark opacity-90 shadow-[0_8px_18px_rgba(16,185,129,0.35)] sm:h-12 sm:w-12">
        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 17 17 7M17 7H9M17 7v8" />
        </svg>
      </div>

      <div className="absolute -right-2 top-[42%] h-12 w-12 -rotate-6 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 opacity-90 shadow-[0_8px_18px_rgba(139,92,246,0.35)] sm:h-14 sm:w-14">
        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-6 w-6 text-white" fill="currentColor" aria-hidden="true">
          <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9L12 2Zm7 10 .9 2.4L22 15.3l-2.1.9L19 18.6l-.9-2.4L16 15.3l2.1-.9L19 12ZM5 14l.7 1.9L7.6 16.6l-1.9.7L5 19.2l-.7-1.9L2.4 16.6l1.9-.7L5 14Z" />
        </svg>
      </div>

      <div className="absolute -right-3 bottom-[26%] h-14 w-14 rotate-6 rounded-full border-4 border-jobly-blue/40 bg-white opacity-90 shadow-[0_8px_18px_rgba(37,99,235,0.2)] sm:h-16 sm:w-16">
        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-6 w-6 text-jobly-blue" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="12" cy="12" r="0.8" fill="currentColor" />
        </svg>
      </div>

      <div className="absolute -left-4 bottom-[10%] h-16 w-12 rotate-[10deg] rounded-lg bg-gradient-to-br from-navy to-jobly-blue-dark opacity-90 shadow-[0_10px_22px_rgba(10,42,94,0.35)] sm:h-[72px] sm:w-14">
        <span className="absolute left-1.5 top-1.5 rounded bg-white/90 px-1 text-[8px] font-black text-navy sm:text-[9px]">Job</span>
        <div className="absolute inset-x-1.5 bottom-2 space-y-1">
          <span className="block h-[3px] rounded-full bg-white/60" />
          <span className="block h-[3px] w-2/3 rounded-full bg-white/60" />
        </div>
      </div>

      <div className="absolute -left-2 top-[62%] h-10 w-10 rotate-[8deg] rounded-full bg-gradient-to-br from-amber-300 to-jobly-yellow opacity-90 shadow-[0_8px_16px_rgba(251,191,36,0.35)]">
        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto h-5 w-5 text-white" fill="currentColor" aria-hidden="true">
          <path d="M12 2l2.7 6.9L22 9.9l-5.5 4.8L18 22l-6-3.9L6 22l1.5-7.3L2 9.9l7.3-1L12 2Z" />
        </svg>
      </div>
    </div>
  );
}
