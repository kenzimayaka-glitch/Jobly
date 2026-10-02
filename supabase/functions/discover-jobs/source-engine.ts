import { getActiveSources, getRegistryStats, type SourceDefinition } from "./source-registry.ts";

export type SourceRunPlan = SourceDefinition & {
  selectedBecause: "active" | "country";
};

export function buildSourceRunPlan(countryCode = "CM"): SourceRunPlan[] {
  return getActiveSources(countryCode).map((source)=>({
    ...source,
    selectedBecause: source.countries.includes(countryCode) ? "country" : "active",
  }));
}

export function validateSourceDefinition(source: SourceDefinition): string[] {
  const errors: string[] = [];
  if (!source.key) errors.push("missing_key");
  if (!source.name) errors.push("missing_name");
  if (!source.countries.length) errors.push("missing_country");
  if (source.enabled && source.status==="active" && !source.url) errors.push("active_source_missing_url");
  if (source.captureMode==="api" && !source.structuredAdapter) errors.push("api_source_missing_adapter");
  return errors;
}

export function auditRegistry() {
  const invalid = [];
  for (const source of getActiveSources()) {
    const errors = validateSourceDefinition(source);
    if (errors.length) invalid.push({source:source.key,errors});
  }
  return { ...getRegistryStats(), invalid };
}

export function sourceHealthClass(input:{
  httpStatus?:number;
  discovered:number;
  extracted:number;
  eligible:number;
  error?:string|null;
}):"healthy"|"degraded"|"failed" {
  if (input.error || (input.httpStatus && input.httpStatus >= 400)) return "failed";
  if (input.discovered===0) return "degraded";
  const extractionRate=input.extracted/input.discovered;
  const eligibilityRate=input.eligible/Math.max(input.extracted,1);
  if (extractionRate < 0.5 || eligibilityRate < 0.3) return "degraded";
  return "healthy";
}
