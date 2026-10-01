import type {ExternalObservation} from "./types";
const DOMAINS=["Talent","Recruiter","Partner","Mobility","Jobs","Companies","Career","AI","Payments","Security","Legal","Product","Business","Operations"];
const terms:Record<string,RegExp>={Talent:/candidate|talent|job seeker|candidat|emploi/i,Recruiter:/recruiter|recruteur|hiring|recrutement/i,Partner:/partner|partenaire|ngo|ong/i,Mobility:/mobility|mobilité|relocation|transport/i,Jobs:/job|jobs|emploi|vacancy|poste|recrut/i,Companies:/company|entreprise|employer|employeur/i,Career:/career|carrière|skill|compétence|formation/i,AI:/artificial intelligence|\bai\b|intelligence artificielle|machine learning/i,Payments:/payment|paiement|money|finance|fintech/i,Security:/security|sécurité|privacy|cyber/i,Legal:/law|legal|regulation|réglement|loi|décret/i,Product:/platform|product|feature|fonctionnalité|application/i,Business:/market|business|partnership|marché/i,Operations:/operation|process|workflow/i};
export function contextualize(query:string,o:ExternalObservation):ExternalObservation{
  const text=[query,...o.facts].join(" ");const domains=DOMAINS.filter(d=>terms[d].test(text));
  const relevance=Math.min(1,Math.max(o.confidence,domains.length?.65:.35));
  const impact=domains.some(d=>["Legal","Security","Jobs","Recruiter"].includes(d))?.8:domains.length?.58:.32;
  const urgency=domains.some(d=>["Legal","Security"].includes(d))?.78:domains.includes("Jobs")?.64:.35;
  return{...o,context:{domains,relevance,impact,urgency}};
}