import {observeInternet} from "@/lib/jia/internet";
import {ingestExternalSignal} from "@/lib/jia/cognitive";
import {publishTraceEvent} from "@/lib/jia/eventBus";
import {adminClient} from "@/lib/server-auth";

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
  await publishTraceEvent(adminClient(), {
    userId, type: "JIA_EXTERNAL_WATCH", ecosystem: target.domain, source: "JIA_WATCHER",
    payload: { watchKey: target.key, query: target.query, status: signal.observation.status, confidence: signal.observation.confidence },
  }, {
    stage: signal.observation.status === "CONTESTED" ? "HYPOTHESIS" : "INSIGHT",
    title: "Signal externe surveillé",
    content: signal.observation.facts?.[0] || "Aucun fait exploitable.",
    confidence: signal.observation.confidence >= .78 ? "HIGH" : signal.observation.confidence >= .58 ? "MEDIUM" : "LOW",
    evidence: signal.observation.sourcesUsed.map((s) => ({ url: s.url, title: s.title, authority: s.authority, confidence: s.confidence })),
    metadata: { watchKey: target.key, memoryDecision: signal.observation.memoryDecision, changes: signal.observation.changes },
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
