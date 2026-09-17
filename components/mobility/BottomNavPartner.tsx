"use client";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Files, Wallet, BarChart3, Users, Home, Route, CheckCircle } from "lucide-react";

type PartnerType = "FINANCE"|"HOUSING"|"TRANSPORT";
export function BottomNavPartner({active,type}:{active:string,type:PartnerType}){
 const router=useRouter();
 const configs={
  FINANCE:[{id:"dashboard",label:"Dashboard",icon:LayoutDashboard,href:"/bons-plans/mobility/partner/dashboard"},{id:"dossiers",label:"Dossiers",icon:Files,href:"/bons-plans/mobility/partner/dossiers"},{id:"financements",label:"Financements",icon:Wallet,href:"/bons-plans/mobility/partner/financements"},{id:"rapports",label:"Rapports",icon:BarChart3,href:"/bons-plans/mobility/partner/rapports"}],
  HOUSING:[{id:"dashboard",label:"Dashboard",icon:LayoutDashboard,href:"/bons-plans/mobility/partner/dashboard"},{id:"demandes",label:"Demandes",icon:Users,href:"/bons-plans/mobility/partner/demandes"},{id:"logements",label:"Mes Logements",icon:Home,href:"/bons-plans/mobility/partner/logements"},{id:"rapports",label:"Rapports",icon:BarChart3,href:"/bons-plans/mobility/partner/rapports"}],
  TRANSPORT:[{id:"dashboard",label:"Dashboard",icon:LayoutDashboard,href:"/bons-plans/mobility/partner/dashboard"},{id:"trajets",label:"Trajets",icon:Route,href:"/bons-plans/mobility/partner/trajets"},{id:"validations",label:"Validations",icon:CheckCircle,href:"/bons-plans/mobility/partner/validations"},{id:"rapports",label:"Rapports",icon:BarChart3,href:"/bons-plans/mobility/partner/rapports"}],
 }[type];
 return <nav className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-2xl rounded-t-[20px] border border-slate-100 bg-white/95 p-2 shadow-lg backdrop-blur"><div className="grid grid-cols-4 gap-1">{configs.map(({id,label,icon:Icon,href})=><button key={id} onClick={()=>router.push(href)} className={`relative flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-extrabold ${active===id?"bg-[#0A3D9C] text-white":"text-slate-500"}`}><Icon className="h-5 w-5"/><span>{label}</span>{active===id&&<span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#FFC700]"/>}</button>)}</div></nav>;
}
