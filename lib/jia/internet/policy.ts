import type { JiaInternetConfig, InternetMode } from "./types";

const n = (v:string|undefined, fallback:number, min:number, max:number) => {
  const x=Number(v); return Number.isFinite(x) ? Math.min(max,Math.max(min,x)) : fallback;
};
export function getJiaInternetConfig(): JiaInternetConfig {
  const raw=(process.env.JIA_INTERNET_MODE||"READ").toUpperCase() as InternetMode;
  const mode:InternetMode=["OFF","READ","ANALYZE","PROACTIVE"].includes(raw)?raw:"READ";
  return {
    enabled:process.env.JIA_INTERNET_ENABLED!=="false" && mode!=="OFF", mode,
    maxQueries:n(process.env.JIA_INTERNET_MAX_QUERIES,3,1,8),
    maxSources:n(process.env.JIA_INTERNET_MAX_SOURCES,8,1,20),
    maxDepth:n(process.env.JIA_INTERNET_MAX_DEPTH,2,1,3),
    timeoutMs:n(process.env.JIA_INTERNET_TIMEOUT_MS,8000,1500,15000),
    cacheTtlMs:n(process.env.JIA_INTERNET_CACHE_TTL_MS,300000,10000,3600000),
    minConfidence:n(process.env.JIA_INTERNET_MIN_CONFIDENCE,.62,0,1),
    memoryThreshold:n(process.env.JIA_INTERNET_MEMORY_THRESHOLD,.72,0,1),
    proactivityThreshold:n(process.env.JIA_INTERNET_PROACTIVITY_THRESHOLD,.76,0,1)
  };
}
export function canInternetRead(c=getJiaInternetConfig()){ return c.enabled && c.mode!=="OFF"; }