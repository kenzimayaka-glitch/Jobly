"use client";
import { useRouter } from "next/navigation";
import { CinematicRecruiter } from "@/components/JoblyCinematic";

export default function RecruiterDashboard(){
  const router = useRouter();
  return <div className="relative min-h-screen">
    <CinematicRecruiter/>
    <button onClick={()=>router.push("/recruiter/talents")} className="fixed right-4 top-4 z-[60] rounded-full border border-white/20 bg-[#2E3F4F]/90 px-4 py-2 text-[10px] font-black uppercase tracking-[1.2px] text-[#FFE135] shadow-lg backdrop-blur">
      Top 10 Talents →
    </button>
  </div>;
}
