import {observeInternet} from "@/lib/jia/internet";
import {ingestExternalSignal} from "@/lib/jia/cognitive";

export type JiaWatchTarget={key:string;query:string;domain:string;intervalMs?:number};

export async function watchExternal(userId:string,target:JiaWatchTarget){
  const signal=await observeInternet(target.query,{mode:"PROACTIVE",maxQueries:2,maxSources:8});
  await ingestExternalSignal(userId,{
    query:target.query,
    facts:signal.observation.facts,
    confidence:signal.observation.confidence,
    status:signal.observation.status,
    supportingSources:signal.observation.supportingSources,
    contradictingSources:signal.observation.contradictingSources,
    context:{...signal.observation.context,watchKey:target.key,domain:target.domain},
  });
  return signal;
}

export function defaultWatchTargets():JiaWatchTarget[]{
  return [
    {key:"jobs-cameroon",query:"nouvelles offres emploi Cameroun recrutement",domain:"Jobs"},
    {key:"skills-africa",query:"compétences recherchées emploi Afrique 2026",domain:"Career"},
    {key:"recruitment-market",query:"recrutement entreprises Cameroun marché emploi 2026",domain:"Business"},
    {key:"mobility",query:"mobilité professionnelle Afrique opportunités emploi 2026",domain:"Mobility"},
  ];
}
