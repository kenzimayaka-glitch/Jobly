from pathlib import Path
ROOT=Path(__file__).resolve().parent
checks={
"lib/jia/policy.ts":["INSUFFICIENT_PERMISSION_LEVEL","JIA_NEVER_EXECUTES_PAYMENTS","rank[input.level]<rank[required]"],
"lib/jia/eventBus.ts":["publishJiaEvent","JiaEvent","correlationId"],
"lib/jia/toolRegistry.ts":["JiaToolDefinition","payment","checkJiaToolAccess"],
"lib/jia/selfModel.ts":["buildJiaSelfModel","memoryHealth","predictionHealth"],
"lib/jia/transversal.ts":["JIA_INTELLIGENCE_LAYERS","CEO","BUSINESS","GROWTH","COMMERCIAL","FINANCE","MARKET","OPERATIONS","CUSTOMER","CAREER"],
"lib/jia/runtime.ts":["JIA_COGNITIVE_CYCLE","PERCEIVE","WORLD_MODEL","PREDICT","POLICY","ACT","VERIFY","REFLECT","LEARN"],
"app/api/jia/cycle/route.ts":["runUnifiedCognitiveCycle","privacyAcceptedAt","ADMIN"],
"app/api/admin/jia/intelligence/route.ts":["buildAdminTransversalIntelligence","ADMIN"],
"lib/jia/agent.ts":["runJiaSafeAction","verifyJiaAction"],
"lib/jia/cognitive.ts":["upsertWorldEntity","REFLECTIVE","recordPredictionOutcome"],
"lib/jiaContext.ts":["jia_memory_unified","memoryResult"],
"supabase/migrations/20261001010000_jia_memory_unified_view.sql":["jia_memory_unified","security_invoker = true","revoke all"],
"lib/jia/brain.ts":["observeInternet","webSignal"],
"components/JiaPresence.tsx":["/api/jia/cycle","jobly:jia-cognitive-cycle"],
"lib/jia/recruiterIntelligence.ts":["buildRecruiterIntelligence","staleApplications","averageAts"],
"lib/jia/partnerIntelligence.ts":["buildPartnerIntelligence","kycStatus","locationConsent"],
"lib/jia/mobilityIntelligence.ts":["buildMobilityIntelligence","mobilityFit","costTotal"],
"app/api/jia/intelligence/route.ts":["buildUserTransversalIntelligence","buildAdminTransversalIntelligence","ADMIN"],
"app/api/recruiter/jia/intelligence/route.ts":["buildRecruiterIntelligence","RECRUITER"],
"app/api/partner/jia/intelligence/route.ts":["buildPartnerIntelligence","PARTNER"],
"app/api/mobility/jia/intelligence/route.ts":["buildMobilityIntelligence"],
}
for rel,needles in checks.items():
 text=(ROOT/rel).read_text(encoding="utf-8")
 for needle in needles: assert needle in text,f"{rel}: missing {needle!r}"
policy=(ROOT/"lib/jia/policy.ts").read_text(encoding="utf-8").replace(" ","")
assert "rank[input.level]>=rank[input.level]" not in policy
runtime=(ROOT/"lib/jia/runtime.ts").read_text(encoding="utf-8")
order=["PERCEIVE","UNDERSTAND","MEMORY","BELIEF","WORLD_MODEL","REASON","PREDICT","ANTICIPATE","GOAL","PLAN","POLICY","PROPOSE","ACT","VERIFY","EVALUATE","REFLECT","LEARN"]
pos=[runtime.index(x) for x in order]
assert pos==sorted(pos),f"cycle order broken: {pos}"
trans=(ROOT/"lib/jia/transversal.ts").read_text(encoding="utf-8")
layers={x for x in ["CEO","BUSINESS","GROWTH","COMMERCIAL","FINANCE","MARKET","OPERATIONS","CUSTOMER","CAREER"] if f'layer("{x}"' in trans}
assert len(layers)==9,f"missing intelligence layers: {sorted(set(checks["lib/jia/transversal.ts"]) - layers)}"
print("JIA architecture 10/10 gate: PASS")


brain=(ROOT/"lib/jia/brain.ts").read_text(encoding="utf-8")
assert "html.duckduckgo.com" not in brain, "Brain still contains duplicate direct Web search"
assert "runUnifiedCognitiveCycle" in (ROOT/"app/api/admin/jia/chat/route.ts").read_text(encoding="utf-8")
assert "publishTraceEvent" in (ROOT/"app/api/admin/jia/chat/route.ts").read_text(encoding="utf-8")
ctx=(ROOT/"lib/jiaContext.ts").read_text(encoding="utf-8")
assert "from(\"jia_memory_unified\")" in ctx, "JiaContext does not use the canonical unified memory view"
assert "from(\"JiaMemory\")" not in ctx and "from(\"jia_memory\")" not in ctx, "JiaContext still has competing direct memory reads"
tool=(ROOT/"lib/jia/toolRegistry.ts").read_text(encoding="utf-8")
assert "tool.requiresConsent" in tool and "EXPLICIT_CONSENT_REQUIRED" in tool
presence=(ROOT/"components/JiaPresence.tsx").read_text(encoding="utf-8")
assert "/api/jia/cycle" in presence, "UI does not call unified cognitive cycle"
