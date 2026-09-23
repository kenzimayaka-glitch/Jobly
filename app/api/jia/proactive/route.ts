import {NextRequest,NextResponse} from "next/server";
import {adminClient,ensureUser,getAuthUser} from "@/lib/server-auth";
import {buildNextBestActions,type Signal} from "@/lib/jia/intelligence";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:NextRequest){
  try{
    const auth=await getAuthUser(req); if(!auth)return NextResponse.json({message:"Session requise."},{status:401});
    const sb=adminClient(); const user=await ensureUser(sb,auth); const userId=String(user.id);
    const pref=await sb.from("jia_preferences").select("access_enabled,proactive_recommendations,notification_mode").eq("user_id",userId).eq("ecosystem","TALENT").maybeSingle();
    if(pref.error)throw new Error(pref.error.message);
    if(pref.data?.access_enabled===false || pref.data?.proactive_recommendations===false) return NextResponse.json({ok:true,disabled:true,signals:[],recommendations:[],persisted:0});
    const [apps,assessment,events]=await Promise.all([
      sb.from("Application").select("id,status,createdAt,updatedAt,interviewAt,jobId,recruiterJobId").eq("userId",userId).order("updatedAt",{ascending:false}).limit(40),
      sb.from("CareerAssessment").select("id,readiness,gaps,nextBestAction,computedAt").eq("userId",userId).order("computedAt",{ascending:false}).limit(1).maybeSingle(),
      sb.from("JiaEvent").select("id,eventType,path,metadata,createdAt").eq("userId",userId).order("createdAt",{ascending:false}).limit(30),
    ]);
    if(apps.error)throw new Error(apps.error.message); if(assessment.error)throw new Error(assessment.error.message); if(events.error)throw new Error(events.error.message);
    const signals:Signal[]=[];
    const recentEvents = events.data || [];
    const lastEvent = recentEvents[0];
    if (lastEvent?.eventType === "SEARCH" && recentEvents.filter((event) => event.eventType === "SEARCH").length >= 3) {
      signals.push({ id: "search-pattern", type: "SEARCH_PATTERN", title: "Recherche à transformer en plan", detail: "Tu explores plusieurs pistes. J’IA peut comparer les options et construire une prochaine étape de carrière.", confidence: "MEDIUM", occurredAt: lastEvent.createdAt });
    }
    if (lastEvent?.eventType === "LEARNING_ACTIVITY") {
      signals.push({ id: String(lastEvent.id), type: "LEARNING_CONTINUITY", title: "Continuer ton apprentissage", detail: "Une activité d’apprentissage récente peut être prolongée par un objectif concret ou une compétence à démontrer.", confidence: "MEDIUM", occurredAt: lastEvent.createdAt });
    }
    const lastProfileUpdate = recentEvents.find((event) => event.eventType === "PROFILE_UPDATE");
    if (lastProfileUpdate && Date.now() - new Date(lastProfileUpdate.createdAt).getTime() < 14 * 86400000) {
      signals.push({ id: String(lastProfileUpdate.id), type: "PROFILE_TO_OPPORTUNITY", title: "Relier ton profil aux opportunités", detail: "Ton profil vient d’évoluer. J’IA peut recalculer les opportunités et les compétences à mettre en avant.", confidence: "HIGH", occurredAt: lastProfileUpdate.createdAt });
    }
    for(const a of apps.data||[]){
      const ageDays=(Date.now()-new Date(a.updatedAt||a.createdAt).getTime())/86400000;
      if(a.status==="INTERVIEW")signals.push({id:a.id,type:"APPLICATION_INTERVIEW",title:"Entretien à préparer",detail:"Une candidature est actuellement au stade entretien.",confidence:"HIGH",occurredAt:a.interviewAt||a.updatedAt});
      else if(["SUBMITTED","ACKNOWLEDGED"].includes(String(a.status))&&ageDays>=7)signals.push({id:a.id,type:"APPLICATION_STALLED",title:"Candidature sans évolution récente",detail:`Cette candidature n’a pas évolué depuis environ ${Math.floor(ageDays)} jours. Un suivi peut être pertinent.`,confidence:"HIGH",occurredAt:a.updatedAt});
    }
    const gaps=Array.isArray((assessment.data as any)?.gaps)?(assessment.data as any).gaps:[];
    gaps.slice(0,3).forEach((g:any,i:number)=>signals.push({id:`gap-${i}`,type:"CAREER_GAP",title:"Gap de carrière",detail:String(typeof g==="string"?g:g?.title||g?.name||"Compétence à renforcer"),confidence:"MEDIUM"}));
    const recommendations=buildNextBestActions(signals);
    const persist=req.nextUrl.searchParams.get("persist")==="true";
    let persisted=0;
    if(persist&&recommendations.length){
      for(const r of recommendations.filter(x=>x.priority==="HIGH")){
        const since=new Date(Date.now()-7*86400000).toISOString();
        const existing=await sb.from("Notification").select("id",{count:"exact",head:true}).eq("userId",userId).eq("type",`JIA_${r.actionType}`).eq("entityId",r.entityId||null).gte("createdAt",since);
        if(existing.error)continue;
        if((existing.count||0)===0){
          const ins=await sb.from("Notification").insert({userId,type:`JIA_${r.actionType}`,title:r.title,body:r.reason,link:r.entityType==="APPLICATION"?"/applications":"/career",entityId:r.entityId||null});
          if(!ins.error)persisted++;
        }
      }
    }
    return NextResponse.json({ok:true,generatedAt:new Date().toISOString(),signals,recommendations,readiness:assessment.data?.readiness??null,nextBestAction:assessment.data?.nextBestAction??null,persisted,deliveryMode:pref.data?.notification_mode||"text"});
  }catch(e){return NextResponse.json({message:e instanceof Error?e.message:"J’IA proactif indisponible."},{status:500});}
}
