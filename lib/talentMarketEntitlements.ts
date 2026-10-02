import type { PlanCode } from "./billingCatalog";

export type TalentMarketScope = "LOCAL" | "COUNTRIES" | "AFRICA";
export type TalentMarketAction = "DISCOVER" | "PREPARE_MULTI_COUNTRY" | "ACTIVE_MULTI_COUNTRY_WATCH" | "AFRICA_WATCH" | "ADVANCED_OPTIMIZATION" | "AUTOMATE_WATCH";

export type TalentMarketDecision = { allowed:boolean; plan:PlanCode; action:TalentMarketAction; scope:TalentMarketScope; reason?:string };

const PLAN_RANK: Record<PlanCode, number> = { FREE:0, START:1, PREMIUM:2, PRO:3 };

export function normalizeTalentMarketScope(value: unknown): TalentMarketScope {
  return value === "AFRICA" || value === "COUNTRIES" ? value : "LOCAL";
}
export function normalizeTargetCountryCodes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").map(item => item.trim().toUpperCase()).filter(item => /^[A-Z]{2}$/.test(item)))];
}
export function evaluateTalentMarketAction(input:{plan:PlanCode;action:TalentMarketAction;scope?:TalentMarketScope;targetCountryCodes?:string[]}):TalentMarketDecision {
  const {plan,action}=input, scope=normalizeTalentMarketScope(input.scope), countries=normalizeTargetCountryCodes(input.targetCountryCodes), rank=PLAN_RANK[plan]??0;
  const deny=(reason:string)=>({allowed:false,plan,action,scope,reason}), allow=()=>({allowed:true,plan,action,scope});
  if(action==="DISCOVER") return allow();
  if(action==="PREPARE_MULTI_COUNTRY") return scope==="COUNTRIES"&&countries.length>=2 ? (rank>=1?allow():deny("La préparation d’une recherche multi-pays est disponible à partir de START.")) : deny("Sélectionnez au moins deux pays pour préparer une recherche multi-pays.");
  if(action==="ACTIVE_MULTI_COUNTRY_WATCH") return scope==="COUNTRIES"&&countries.length>=2 ? (rank>=2?allow():deny("START permet de préparer une recherche multi-pays, mais pas d’activer sa veille. La veille multi-pays est disponible à partir de PREMIUM.")) : deny("Une veille multi-pays nécessite au moins deux pays cibles.");
  if(action==="AFRICA_WATCH") return plan==="PRO"?allow():deny("La veille panafricaine est réservée à PRO. Les offres africaines restent consultables.");
  if(action==="ADVANCED_OPTIMIZATION") return rank>=2?allow():deny("L’optimisation avancée de la recherche est disponible à partir de PREMIUM.");
  if(action==="AUTOMATE_WATCH") return plan==="PRO"?allow():deny("L’automatisation avancée des veilles est réservée à PRO.");
  return deny("Cette action n’est pas incluse dans votre formule.");
}
