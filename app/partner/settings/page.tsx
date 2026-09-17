"use client";
import { useRouter } from "next/navigation";
import PageHeader from "../../../components/PageHeader";
import BottomNav,{PARTNER_NAV} from "../../../components/BottomNav";
import AccountSettings from "../../../components/AccountSettings";
export default function PartnerSettings(){const router=useRouter();return <main className="relative min-h-[100dvh] bg-white pb-28 text-navy"><div className="relative z-10"><PageHeader label="Paramètres" eyebrow="PARTNER" initial="P" onBack={()=>router.push("/partner/profile")}/><div className="mx-auto max-w-3xl px-5 py-6"><AccountSettings ecosystem="PARTNER" backHref="/partner/profile" accent="yellow"/></div></div><BottomNav active="/partner/profile" items={PARTNER_NAV}/></main>}
