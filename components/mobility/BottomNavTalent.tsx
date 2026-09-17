"use client";
import { useRouter } from "next/navigation";
import { Calculator, FileEdit, Route, QrCode } from "lucide-react";

export function BottomNavTalent({ active }: { active: "estimateur" | "demande" | "suivi" | "pass" }) {
  const router = useRouter();
  const tabs = [
    { id: "estimateur" as const, label: "Estimateur", icon: Calculator, href: "/bons-plans/mobility" },
    { id: "demande" as const, label: "Ma Demande", icon: FileEdit, href: "/bons-plans/mobility/talent/request" },
    { id: "suivi" as const, label: "Suivi", icon: Route, href: "/bons-plans/mobility/talent/status" },
    { id: "pass" as const, label: "Mon Pass", icon: QrCode, href: "/bons-plans/mobility/talent/pass" },
  ];
  return <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-[20px] border border-slate-100 bg-white/95 p-2 shadow-lg backdrop-blur" aria-label="Mobility Talent">
    <div className="grid grid-cols-4 gap-1">{tabs.map(({id,label,icon:Icon,href}) => <button key={id} onClick={()=>router.push(href)} className={`relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-extrabold ${active===id?"bg-[#0A3D9C] text-white":"text-slate-500"}`}><Icon className="h-5 w-5"/><span>{label}</span>{active===id&&<span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#FFC700]"/>}</button>)}</div>
  </nav>;
}
