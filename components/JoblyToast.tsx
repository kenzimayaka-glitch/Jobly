"use client";
export default function JoblyToast({ title, message, actionLabel, onAction, onClose }: { title:string; message:string; actionLabel?:string; onAction?:()=>void; onClose?:()=>void }) {
  return <div role="status" aria-live="polite" className="fixed inset-x-4 top-4 z-[100] mx-auto max-w-md rounded-2xl border border-[#DCE5F1] bg-white p-4 shadow-[0_18px_55px_rgba(7,27,69,.18)]">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#FFF7C7] text-xl" aria-hidden>🎁</span>
      <div className="min-w-0 flex-1"><p className="text-sm font-black text-[#17212B]">{title}</p><p className="mt-1 text-xs leading-5 text-[#5D6C83]">{message}</p>
        {actionLabel && onAction && <button type="button" onClick={onAction} className="mt-3 rounded-full bg-[#0057B8] px-4 py-2 text-xs font-black text-white">{actionLabel}</button>}
      </div>
      {onClose && <button type="button" onClick={onClose} aria-label="Fermer" className="grid h-7 w-7 place-items-center rounded-full text-[#64748B] hover:bg-[#F1F5F9]">×</button>}
    </div>
  </div>;
}
