/**
 * J'IA Cognitive Core
 * Unified durable memory, beliefs, predictions, reflections, self-model and
 * world/career context. Server-only: persistence uses the privileged server client.
 */

import { adminClient } from "@/lib/server-auth";

export type CognitiveMemoryType =
  | "WORKING" | "EPISODIC" | "SEMANTIC" | "PROCEDURAL" | "LONG_TERM"
  | "EVENT" | "USER" | "WORLD" | "JOBLY" | "REFLECTIVE";

export type EvidenceStatus = "CONFIRMED" | "LIKELY" | "CONTESTED" | "UNKNOWN";

const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));

export async function remember(args: {
  userId: string; type: CognitiveMemoryType; content: Record<string, unknown>;
  source?: string; confidence?: number; importance?: number; relevance?: number;
  contradictionKey?: string; expiresAt?: string | null; futureUtility?: number;
}) {
  const sb = adminClient();
  const now = new Date().toISOString();
  if (args.contradictionKey) {
    const { data: existing } = await sb.from("jia_memory").select("id,content,recurrence_count")
      .eq("user_id", args.userId).eq("contradiction_key", args.contradictionKey)
      .order("last_seen_at", { ascending: false }).limit(1).maybeSingle();
    if (existing) {
      const { data, error } = await sb.from("jia_memory").update({
        content: args.content, source: args.source ?? null,
        confidence: clamp(args.confidence ?? .5), importance: clamp(args.importance ?? .5),
        relevance: clamp(args.relevance ?? .5), last_seen_at: now,
        recurrence_count: Number(existing.recurrence_count ?? 1) + 1,
        expires_at: args.expiresAt ?? null, future_utility: clamp(args.futureUtility ?? .5), updated_at: now,
      }).eq("id", existing.id).select("*").single();
      if (error) throw new Error(error.message);
      return data;
    }
  }
  const { data, error } = await sb.from("jia_memory").insert({
    user_id: args.userId, memory_type: args.type, content: args.content,
    source: args.source ?? null, confidence: clamp(args.confidence ?? .5),
    importance: clamp(args.importance ?? .5), relevance: clamp(args.relevance ?? .5),
    contradiction_key: args.contradictionKey ?? null, expires_at: args.expiresAt ?? null,
    future_utility: clamp(args.futureUtility ?? .5), first_seen_at: now, last_seen_at: now,
  }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateBelief(args: {
  userId: string; key: string; belief: string; confidence: number; status: EvidenceStatus;
  evidence?: string[]; counterEvidence?: string[];
}) {
  const sb = adminClient();
  const payload = {
    user_id: args.userId, belief_key: args.key, belief: args.belief,
    confidence: clamp(args.confidence), status: args.status,
    evidence: args.evidence ?? [], counter_evidence: args.counterEvidence ?? [],
    last_evaluated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  };
  const { data, error } = await sb.from("jia_beliefs").upsert(payload, { onConflict: "user_id,belief_key" }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function createPrediction(args: {
  userId: string; prediction: string; probability: number; horizon?: string;
  context?: Record<string, unknown>; expectedAt?: string | null;
}) {
  const sb = adminClient();
  const { data, error } = await sb.from("jia_predictions").insert({
    user_id: args.userId, prediction: args.prediction, prediction_type: "PREDICTION",
    probability: clamp(args.probability), horizon: args.horizon ?? null,
    context: args.context ?? {}, expected_at: args.expectedAt ?? null,
  }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function reflect(args: {
  userId: string; triggerType: string; expectation: Record<string, unknown>;
  result: Record<string, unknown>; error: Record<string, unknown>;
  learning: Record<string, unknown>; nextStrategy: Record<string, unknown>;
}) {
  const sb = adminClient();
  const { data, error } = await sb.from("jia_reflections").insert({
    user_id: args.userId, trigger_type: args.triggerType, expectation: args.expectation,
    result: args.result, error: args.error, learning: args.learning, next_strategy: args.nextStrategy,
  }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function upsertSelfState(userId: string, state: Record<string, unknown>) {
  const sb = adminClient();
  const { data, error } = await sb.from("jia_self_state").upsert({
    user_id: userId, state, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getCognitiveSnapshot(userId: string) {
  const sb = adminClient();
  const [memory, beliefs, predictions, reflections, self] = await Promise.all([
    sb.from("jia_memory").select("*").eq("user_id", userId).order("last_seen_at", { ascending: false }).limit(30),
    sb.from("jia_beliefs").select("*").eq("user_id", userId).order("updated_at", { ascending: false }).limit(30),
    sb.from("jia_predictions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
    sb.from("jia_reflections").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
    sb.from("jia_self_state").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  for (const item of [memory, beliefs, predictions, reflections, self]) if (item.error) throw new Error(item.error.message);
  return { memory: memory.data ?? [], beliefs: beliefs.data ?? [], predictions: predictions.data ?? [], reflections: reflections.data ?? [], self: self.data ?? null };
}

export async function buildCareerTwin(userId: string) {
  const sb = adminClient();
  const [profile, skills, experiences, education] = await Promise.all([
    sb.from("Profile").select("*").eq("userId", userId).maybeSingle(),
    sb.from("Skill").select("*").eq("userId", userId),
    sb.from("Experience").select("*").eq("userId", userId).order("startDate", { ascending: false }),
    sb.from("Education").select("*").eq("userId", userId).order("endDate", { ascending: false }),
  ]);
  for (const item of [profile, skills, experiences, education]) if (item.error) throw new Error(item.error.message);
  const p = profile.data ?? {};
  const skillRows = skills.data ?? [];
  const experienceRows = experiences.data ?? [];
  const educationRows = education.data ?? [];
  const twin = {
    identity: { firstName: p.firstName ?? null, lastName: p.lastName ?? null, headline: p.headline ?? null, location: p.location ?? null, country: p.country ?? null },
    currentState: {
      summary: p.summary ?? null, skills: skillRows, experience: experienceRows, education: educationRows,
      readinessSignals: { profileCompleteness: [p.firstName,p.lastName,p.headline,p.summary].filter(Boolean).length / 4 },
    },
    targetState: { roles: p.targetRoles ?? [], sectors: p.preferredSectors ?? [], cities: p.targetCities ?? [], contracts: p.contractPreferences ?? [], remote: p.remotePreference ?? null },
    gap: {
      missingProfileSignals: [p.headline,p.summary].filter(v => !v).map(() => "profile_detail"),
      targetRoles: p.targetRoles ?? [], targetSectors: p.preferredSectors ?? [],
    },
    nextSteps: ["Consolider les compétences les plus proches des rôles cibles", "Comparer les offres récentes aux objectifs", "Mettre à jour le profil lorsque de nouvelles preuves apparaissent"],
  };
  await remember({
    userId, type: "USER", content: { kind: "CAREER_TWIN", twin }, source: "Jobly.Profile+Skill+Experience+Education",
    confidence: .9, importance: .9, relevance: 1, contradictionKey: "career-twin",
  });
  return twin;
}

export async function ingestExternalSignal(userId: string, observation: {
  query: string; facts?: string[]; confidence: number; status: EvidenceStatus;
  supportingSources?: string[]; contradictingSources?: string[]; context?: Record<string, unknown>;
}) {
  const status = observation.status;
  const fact = observation.facts?.[0];
  const memory = await remember({
    userId, type: status === "CONTESTED" ? "EVENT" : "WORLD",
    content: { query: observation.query, facts: observation.facts ?? [], context: observation.context ?? {}, status },
    source: "JIA_EXTERNAL_SIGNAL", confidence: observation.confidence, relevance: Number(observation.context?.relevance ?? .5),
    importance: Number(observation.context?.impact ?? .5), contradictionKey: "external:" + observation.query.trim().toLowerCase(),
    futureUtility: .7,
  });
  if (fact) await updateBelief({
    userId, key: "external:" + observation.query.trim().toLowerCase(), belief: fact,
    confidence: observation.confidence, status,
    evidence: observation.supportingSources ?? [], counterEvidence: observation.contradictingSources ?? [],
  });
  await upsertSelfState(userId, {
    lastExternalSignalAt: new Date().toISOString(), lastExternalQuery: observation.query,
    internetAvailable: true, lastExternalConfidence: observation.confidence,
  });
  return memory;
}

export async function recordPredictionOutcome(args:{userId:string;predictionId:string;outcome:Record<string,unknown>;probability:number;observed:boolean}){
  const error=Math.abs(clamp(args.probability)-(args.observed?1:0));
  const sb=adminClient();
  const {data,error:dbError}=await sb.from("jia_predictions").update({
    outcome:args.outcome,outcome_at:new Date().toISOString(),calibration_error:error,updated_at:new Date().toISOString(),
  }).eq("id",args.predictionId).eq("user_id",args.userId).select("*").single();
  if(dbError) throw new Error(dbError.message);
  await reflect({userId:args.userId,triggerType:"PREDICTION_OUTCOME",
    expectation:{predictionId:args.predictionId,probability:args.probability},
    result:args.outcome,error:{calibrationError:error,observed:args.observed},
    learning:{calibratedProbability:args.observed ? Math.min(1,args.probability+.05) : Math.max(0,args.probability-.05)},
    nextStrategy:{reviewCalibration:true}});
  return data;
}

export async function upsertWorldEntity(args:{userId:string;type:string;key:string;attributes:Record<string,unknown>;confidence:number;sources?:string[]}){
  const sb=adminClient();
  const {data,error}=await sb.from("jia_world_entities").upsert({
    user_id:args.userId,entity_type:args.type,canonical_key:args.key,attributes:args.attributes,
    confidence:clamp(args.confidence),source_refs:args.sources??[],last_seen_at:new Date().toISOString(),updated_at:new Date().toISOString(),
  },{onConflict:"user_id,entity_type,canonical_key"}).select("*").single();
  if(error) throw new Error(error.message); return data;
}

export async function relateWorldEntities(args:{userId:string;fromId:string;relation:string;toId:string;confidence:number;sources?:string[]}){
  const sb=adminClient();
  const {data,error}=await sb.from("jia_world_relations").upsert({
    user_id:args.userId,from_entity_id:args.fromId,relation_type:args.relation,to_entity_id:args.toId,
    confidence:clamp(args.confidence),source_refs:args.sources??[],
  },{onConflict:"user_id,from_entity_id,relation_type,to_entity_id"}).select("*").single();
  if(error) throw new Error(error.message); return data;
}
