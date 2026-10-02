import crypto from "node:crypto";

type Db = ReturnType<typeof import("./server-auth").adminClient>;

type EventLike = { id:string; title:string; description:string; domain:string; city?:string|null; country?:string|null };

const normalize=(v:unknown)=>String(v??"").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");

const domainMap:Record<string,string[]>={
  EMPLOYMENT_RECRUITMENT:["emploi","recrutement","rh","career","business"],
  EDUCATION_CAMPUS:["education","formation","universite","campus"],
  MOBILITY:["mobilite","transport","logement","international"],
  ENTREPRENEURSHIP:["entrepreneuriat","startup","business","finance"],
  SCHOLARSHIP:["education","bourse","formation"],
  YOUTH_PROGRAMS:["jeunesse","youth","education"],
  INSTITUTIONAL:["institution","ong","public"],
};

export async function discoverEventPartners(db:Db,event:EventLike,actorUserId:string){
  const {data:partners}=await db.from("Partner").select("userId,partnerType,locationText,locationLat,locationLng").eq("kycStatus","APPROVED").limit(500);
  const {data:recruiters}=await db.from("RecruiterProfile").select("userId,companyName,sector,location,verified").eq("verified",true).limit(500);
  const keys=domainMap[event.domain]??[];
  const text=normalize([event.title,event.description,event.domain].join(" "));
  const candidates=[
    ...(partners??[]).map((p:any)=>({userId:p.userId,source:"PARTNER",match:keys.some(k=>normalize(p.locationText).includes(normalize(k)))||!p.locationText})),
    ...(recruiters??[]).map((r:any)=>({userId:r.userId,source:"RECRUITER",match:keys.some(k=>text.includes(normalize(k))||normalize(r.sector).includes(normalize(k)))||!r.sector})),
  ].filter(x=>x.userId&&x.userId!==actorUserId&&x.match).slice(0,100);
  const unique=[...new Map(candidates.map(x=>[x.userId,x])).values()];
  if(unique.length){
    await db.from("Notification").insert(unique.map(x=>({
      id:crypto.randomUUID(),userId:x.userId,type:"JOBLY_EVENT_PARTNER_OPPORTUNITY",
      title:"Opportunité de partenariat événementiel",
      body:event.title,
      link:"/events/"+event.id,entityId:event.id,actionType:"EVENT_PARTNERSHIP",
      actionPayload:{eventId:event.id,source:x.source},locale:"fr",
      channels:{push:false,email:false,inApp:true},createdAt:new Date().toISOString(),
    })));
  }
  return {candidatePartners:unique.length};
}
