import type {SupabaseClient} from "@supabase/supabase-js";
export async function buildPartnerIntelligence(sb:SupabaseClient,userId:string){
 const {data,error}=await sb.from("Partner").select("id,partnerType,kycStatus,createdAt,locationConsent,agreementId,kycCompletedAt").eq("userId",userId).maybeSingle();
 if(error)throw new Error(error.message);
 if(!data)return{generatedAt:new Date().toISOString(),status:"NO_PARTNER_PROFILE",metrics:{referrals:0},opportunities:[{id:"partner-onboarding",title:"Finaliser le profil Partner",reason:"Aucun profil Partner actif n'a été trouvé pour ce compte."}],limitations:["Profil Partner absent."]};
 const {data:events,error:eventsError}=await sb.from("JiaEvent").select("eventType,occurredAt").eq("userId",userId).order("occurredAt",{ascending:false}).limit(100);
 if(eventsError)throw new Error(eventsError.message);
 const referrals=(events||[]).filter((e:any)=>String(e.eventType).includes("REFERR")).length;
 const opportunities:any[]=[];
 if(String(data.kycStatus).toUpperCase()!=="VERIFIED")opportunities.push({id:"partner-kyc",title:"Vérifier le statut KYC",reason:"Le statut KYC actuel n'est pas VERIFIED."});
 if(data.agreementId===null)opportunities.push({id:"partner-agreement",title:"Vérifier l'accord Partner",reason:"Aucun agreementId n'est associé à ce profil."});
 if(!data.locationConsent)opportunities.push({id:"partner-location",title:"Vérifier le consentement de localisation",reason:"La localisation n'est pas explicitement consentie."});
 return{generatedAt:new Date().toISOString(),status:"CONNECTED",profile:{partnerType:data.partnerType,kycStatus:data.kycStatus,agreementId:data.agreementId,locationConsent:data.locationConsent,kycCompletedAt:data.kycCompletedAt},metrics:{referrals},opportunities,limitations:[]};
}
