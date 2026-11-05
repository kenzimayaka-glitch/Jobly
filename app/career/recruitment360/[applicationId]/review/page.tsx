"use client";

import {useCallback,useEffect,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import AppShell from "@/components/ui/AppShell";
import {Button,Card} from "@/components/ui";
import {getSupabaseClient} from "@/lib/supabase";

type Review={id:string;processRating:number;experienceRating:number;joblyRating:number;recommendation:boolean|null;comment:string|null;status:string};
const RATING_LABELS=["","Très insuffisant","Insuffisant","Moyen","Bon","Excellent"];

export default function CandidateRecruitmentReviewPage(){
 const {applicationId}=useParams<{applicationId:string}>();
 const router=useRouter();
 const [recruitmentId,setRecruitmentId]=useState("");
 const [review,setReview]=useState<Review|null>(null);
 const [processRating,setProcessRating]=useState(0);
 const [experienceRating,setExperienceRating]=useState(0);
 const [joblyRating,setJoblyRating]=useState(0);
 const [recommendation,setRecommendation]=useState("");
 const [comment,setComment]=useState("");
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [success,setSuccess]=useState(false);

 const token=useCallback(async()=>{
  const {data:{session}}=await getSupabaseClient().auth.getSession();
  if(!session){router.replace("/");throw new Error("Session requise.");}
  return session.access_token;
 },[router]);

 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const accessToken=await token();
   const workspaceResponse=await fetch("/api/recruitment360/decisions?applicationId="+encodeURIComponent(applicationId),{headers:{Authorization:"Bearer "+accessToken},cache:"no-store"});
   const workspacePayload=await workspaceResponse.json();
   if(!workspaceResponse.ok)throw new Error(workspacePayload.message||"Dossier indisponible.");
   const workspace=workspacePayload.workspace;
   if(!workspace?.recruitment?.id)throw new Error("RECRUITMENT_NOT_FOUND");
   const status=String(workspace.application?.recruitment360Status||"").toUpperCase();
   if(!["REJECTED","WITHDRAWN","HIRED","OFFER_DECLINED"].includes(status))throw new Error("Votre avis sera disponible à la clôture de votre candidature.");
   setRecruitmentId(workspace.recruitment.id);
   const query=new URLSearchParams({recruitmentId:workspace.recruitment.id,applicationId});
   const response=await fetch("/api/recruitment360/reports?"+query.toString(),{headers:{Authorization:"Bearer "+accessToken},cache:"no-store"});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.message||"Avis indisponible.");
   const previous=(payload.reviews??[]).find((item:Review)=>item.status!=="REJECTED")??null;
   setReview(previous);
   if(previous){
    setProcessRating(previous.processRating);setExperienceRating(previous.experienceRating);setJoblyRating(previous.joblyRating);
    setRecommendation(previous.recommendation==null?"":String(previous.recommendation));
    setComment(previous.comment||"");
   }
  }catch(cause){setError(cause instanceof Error?cause.message:"Chargement impossible.");}
  finally{setLoading(false);}
 },[applicationId,token]);

 useEffect(()=>{void load();},[load]);

 async function submit(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError("");setSuccess(false);
  try{
   if(!recruitmentId)throw new Error("RECRUITMENT_NOT_FOUND");
   if(!processRating||!experienceRating||!joblyRating)throw new Error("Veuillez noter les trois critères.");
   const accessToken=await token();
   const response=await fetch("/api/recruitment360/reports",{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"},body:JSON.stringify({
    action:"review",applicationId,processRating,experienceRating,joblyRating,
    recommendation:recommendation===""?null:recommendation==="true",comment
   })});
   const payload=await response.json();
   if(!response.ok)throw new Error(payload.message||"Envoi impossible.");
   setReview(payload.review);setSuccess(true);
  }catch(cause){setError(cause instanceof Error?cause.message:"Envoi impossible.");}
  finally{setBusy(false);}
 }

 const rating=(label:string,value:number,set:(n:number)=>void)=> <fieldset className="grid gap-2"><legend className="text-sm font-semibold">{label}</legend><div className="flex flex-wrap gap-2">{[1,2,3,4,5].map(n=><button key={n} type="button" aria-pressed={value===n} onClick={()=>set(n)} className={"min-h-10 min-w-10 rounded-full border px-3 text-sm font-bold "+(value===n?"border-blue-700 bg-blue-700 text-white":"border-slate-300")}>{n}</button>)}</div><p className="text-xs text-slate-500">{RATING_LABELS[value]||"Sélectionnez une note"}</p></fieldset>;

 return <AppShell role="talent" active="/career" title="Mon retour d’expérience" eyebrow="RECRUTEMENT 360°" initial="J" width="lg">
  <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-700">Après le recrutement</p><h1 className="text-2xl font-black">Votre avis compte</h1><p className="mt-1 text-sm text-slate-600">Votre retour aide à améliorer le processus de recrutement.</p></div><Button href={"/career/recruitment360/"+applicationId} variant="ghost">Mon dossier</Button></div>
  {error&&<p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {success&&<p role="status" className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">Votre avis a bien été enregistré. Merci.</p>}
  {loading?<Card>Chargement…</Card>:!error?<Card>
   {review&&<p className="mb-4 text-xs text-slate-500">Avis précédent : {review.status}. Vous pouvez le mettre à jour tant que la modération n'est pas terminée.</p>}
   <form onSubmit={submit} className="grid gap-5">
    {rating("Comment évaluez-vous le processus de recrutement ?",processRating,setProcessRating)}
    {rating("Comment évaluez-vous votre expérience avec le recruteur ?",experienceRating,setExperienceRating)}
    {rating("Comment évaluez-vous l’accompagnement Jobly ?",joblyRating,setJoblyRating)}
    <label className="grid gap-1 text-sm font-semibold">Recommanderiez-vous ce processus à un autre candidat ?
     <select value={recommendation} onChange={e=>setRecommendation(e.target.value)} className="rounded-xl border p-3 font-normal"><option value="">Sans réponse</option><option value="true">Oui</option><option value="false">Non</option></select>
    </label>
    <label className="grid gap-1 text-sm font-semibold">Votre commentaire (facultatif)<textarea maxLength={2000} value={comment} onChange={e=>setComment(e.target.value)} className="min-h-28 rounded-xl border p-3 font-normal" placeholder="Partagez votre expérience…"/></label>
    <Button type="submit" disabled={busy||review?.status==="PUBLISHED"} loading={busy}>Enregistrer mon avis</Button>
   </form>
  </Card>:null}
 </AppShell>;
}
