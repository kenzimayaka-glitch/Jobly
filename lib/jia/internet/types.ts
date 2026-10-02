export type InternetMode = "OFF" | "READ" | "ANALYZE" | "PROACTIVE";
export type SourceType = "OFFICIAL" | "GOVERNMENT" | "COMPANY" | "UNIVERSITY" | "INTERNATIONAL_ORGANIZATION" | "NEWS" | "DATABASE" | "COMMUNITY" | "SOCIAL" | "UNKNOWN";
export type EvidenceStatus = "CONFIRMED" | "LIKELY" | "CONTESTED" | "UNKNOWN";
export type FreshnessStatus = "fresh" | "recent" | "aging" | "stale" | "expired" | "unknown";
export type MemoryDecision = "IGNORE" | "CACHE" | "TEMPORARY_MEMORY" | "LONG_TERM_MEMORY" | "BELIEF" | "IMPORTANT_EVENT";

export interface JiaInternetConfig {
  enabled: boolean; mode: InternetMode; maxQueries: number; maxSources: number; maxDepth: number;
  timeoutMs: number; cacheTtlMs: number; minConfidence: number; memoryThreshold: number; proactivityThreshold: number;
}
export interface SearchResult { title: string; url: string; snippet: string; domain: string; sourceType: SourceType; }
export interface SourceEvidence {
  url: string; domain: string; title: string; publisher?: string; retrievedAt: string; publishedAt?: string;
  sourceType: SourceType; authority: number; freshness: FreshnessStatus; relevance: number; reliability: number;
  confidence: number; content: string; contentHash: string;
}
export interface ExternalObservation {
  query: string; sourcesFound: number; sourcesUsed: SourceEvidence[]; facts: string[]; supportingSources: string[];
  contradictingSources: string[]; status: EvidenceStatus; confidence: number; freshness: FreshnessStatus;
  changes: Array<{url:string; type:"NEW"|"MODIFIED"|"DISAPPEARED"|"STALE"}>;
  context: {domains:string[]; relevance:number; impact:number; urgency:number};
  memoryDecision: MemoryDecision; internetAvailable: boolean; limitations: string[];
}
export interface BrainSignal {
  type: "JIA_EXTERNAL_SIGNAL"; observation: ExternalObservation;
  beliefCandidate?: {belief:string; confidence:number; status:EvidenceStatus; evidence:string[]}; proposal?: string;
}
export interface SearchAdapter { search(query:string, limit:number, signal?:AbortSignal): Promise<SearchResult[]>; }