export type EventBypassDecision = {
  blocked: boolean;
  confidence: number;
  reasons: string[];
  severity: "NONE" | "WARNING" | "HIGH";
};

const normalize=(v:string)=>v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const rendezvous=/\b(rendez[- ]?vous|rdv|rencontre|rejoignez[- ]?nous|venez|retrouvez[- ]?nous|presence|stand|salon|forum|conference|job ?dating|job ?fair|afterwork|atelier|webinaire|masterclass)\b/i;
const dateTime=/\b(?:0?[1-9]|[12]\d|3[01])(?:[\/.-](?:0?[1-9]|1[0-2]))?(?:[\/.-]\d{2,4})?\b|\b(?:\d{1,2}h(?:\d{2})?|\d{1,2}:\d{2})\b/i;
const contact=/\b(?:whatsapp|telegram|signal|t[ée]l(?:ephone)?|appelez|contactez|\+?\d[\d .()-]{7,})\b/i;
const bypass=/\b(?:inscription|inscrivez|inscris|participer|participation|candidature|recrutement|paiement|frais|billet|ticket)\b/i;

export function inspectCommunityMessage(content:string):EventBypassDecision{
  const text=String(content||"").trim();
  if(!text)return {blocked:false,confidence:0,reasons:[],severity:"NONE"};
  const n=normalize(text), reasons:string[]=[];
  if(rendezvous.test(n))reasons.push("rendez_vous");
  if(dateTime.test(n))reasons.push("date_ou_heure");
  if(contact.test(n))reasons.push("coordonnees_externes");
  if(bypass.test(n))reasons.push("organisation_ou_inscription");
  const score=Math.min(1,reasons.reduce((s,r)=>s+(r==="rendez_vous"?0.4:r==="coordonnees_externes"?0.25:0.2),0));
  const blocked=score>=0.6;
  return {blocked,confidence:score,reasons,severity:score>=0.8?"HIGH":score>=0.6?"WARNING":"NONE"};
}

export function repeatedViolationAction(removedPosts:number){
  if(removedPosts>=2)return "BAN";
  if(removedPosts===1)return "WARNING";
  return "NONE";
}
