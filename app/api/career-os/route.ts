import { NextRequest, NextResponse } from "next/server";
import { adminClient, ensureUser, getAuthUser } from "../../../lib/server-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req); if (!auth) return NextResponse.json({message:"Session requise."},{status:401});
    const sb = adminClient(); const user = await ensureUser(sb, auth);
    const [p,e,s,j] = await Promise.all([
      sb.from("Profile").select("headline,summary,location,targetRoles,targetCities,contractPreferences,remotePreference,preferredSectors").eq("userId",user.id).maybeSingle(),
      sb.from("Experience").select("title,company,startDate,endDate").eq("userId",user.id),
      sb.from("Skill").select("name,level").eq("userId",user.id),
      sb.from("Job").select("id,title,location,contractType,remoteMode,minExperienceYears,isActive").eq("isActive",true).limit(1000)
    ]);
    for (const r of [p,e,s,j]) if (r.error) throw new Error(r.error.message);
    type Profile = { targetRoles?: string[]; targetCities?: string[]; location?: string; summary?: string };
    const profile = (p.data as Profile) || {}; const ex=e.data||[]; const skills=s.data||[]; const jobs=j.data||[];
    const years=ex.length?Math.max(0,Math.floor((Date.now()-Math.min(...ex.map((x:any)=>new Date(x.startDate).getTime())))/(365.25*86400000))):0;
    const goals=(profile.targetRoles||[]).map((x:string)=>x.trim()).filter(Boolean);
    const targetCity=(profile.targetCities||[])[0]||profile.location||"";
    const gaps:string[]=[]; if(!goals.length) gaps.push("Définir au moins un métier cible"); if(!targetCity) gaps.push("Définir une ville cible"); if(!skills.length) gaps.push("Ajouter des compétences"); if(!ex.length) gaps.push("Ajouter une expérience");
    const readiness=Math.max(0,100-gaps.length*20);
    const nextAction=gaps[0]||(!profile.summary?"Compléter le résumé professionnel":"Consulter les offres recommandées");
    const roadmap=[
      {step:1,title:"Clarifier la cible",done:goals.length>0,action:"Définir métier(s) et ville(s) cible"},
      {step:2,title:"Renforcer le profil",done:skills.length>0&&ex.length>0,action:"Ajouter compétences et expériences"},
      {step:3,title:"Explorer les opportunités",done:jobs.length>0,action:"Consulter les offres correspondantes"},
      {step:4,title:"Passer à l'action",done:false,action:"Postuler et suivre les candidatures"}
    ];
    return NextResponse.json({goals,targetCity,yearsExperience:years,gap:gaps,readiness,nextBestAction:nextAction,roadmap,profileCompleteness:{skills:skills.length,experiences:ex.length}});
  } catch(e){return NextResponse.json({message:e instanceof Error?e.message:"Career OS indisponible."},{status:500});}
}
