"use client";
import { useRouter } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import BottomNav, { TALENT_NAV } from "../../../components/BottomNav";
import TalentBackground from "../../../components/TalentBackground";
import AccountSettings from "../../../components/AccountSettings";
export default function TalentSettings(){const router=useRouter();return <main className="talent-shell relative min-h-[100dvh] bg-[#F7FAFF] pb-28 text-navy"><TalentBackground/><div className="relative z-10"><PageHeader label="Paramètres" eyebrow="TALENT" initial="T" onBack={()=>router.push("/talent/profile")} theme="talent"/><div className="mx-auto max-w-2xl px-5 py-5"><AccountSettings ecosystem="TALENT" backHref="/talent/profile"/></div></div><BottomNav active="/dashboard" items={TALENT_NAV}/></main>}
