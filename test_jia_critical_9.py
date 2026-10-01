from pathlib import Path

ROOT = Path(__file__).resolve().parent

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

# One executable contract for the nine remaining critical workstreams.
# This gate deliberately checks the complete chain as a single unit: a green
# architecture check is not a production claim; runtime/E2E evidence is still required.

GATES = {
    "01_canonical_memory": {
        "files": {
            "lib/jiaContext.ts": ["jia_memory_unified", 'from("jia_memory_unified")'],
            "lib/jia/cognitive.ts": ["jia_memory_unified", "remember(", "recordPredictionOutcome"],
            "lib/jiaMemory.ts": ['from "./jia/cognitive"', "await remember({"],
            "supabase/migrations/20261001010000_jia_memory_unified_view.sql": ["security_invoker = true", "jia_memory_unified"],
        }
    },
    "02_agent_runtime": {
        "files": {
            "lib/jia/agent.ts": ["planJiaAction", "verifyJiaAction", "checkJiaToolAccess"],
            "lib/jia/policy.ts": ["JIA_NEVER_EXECUTES_PAYMENTS", "EXPLICIT_CONSENT_REQUIRED"],
            "app/api/jia/action/route.ts": ["runJiaSafeAction", "isFinancialRequest", "confirmed"],
        }
    },
    "03_internet_brain": {
        "files": {
            "lib/jia/internet/index.ts": ["search(", "fetchSource", "verifyEvidence", "freshnessPolicy", "detectChanges", "memoryDecision"],
            "app/api/jia/internet/route.ts": ["observeInternet", "ingestExternalSignal"],
            "test_internet_brain.py": ["contradict", "fresh", "confidence"],
        }
    },
    "04_contradiction_reasoning": {
        "files": {
            "lib/jia/cognitive.ts": ["CONTRADICTED_BY", "updateBelief", "status"],
            "lib/jia/internet/verify.ts": ["contradictingSources", "CONTESTED"],
            "lib/jia/brain.ts": ["confidence", "sources"],
        }
    },
    "05_proactivity_learning": {
        "files": {
            "app/api/jia/proactive/route.ts": ["buildNextBestActions", "APPLICATION_STALLED", "CAREER_GAP"],
            "lib/jia/autonomy.ts": ["OBSERVE", "EVALUATE", "DECIDE", "ACT", "COOLDOWN_MS"],
            "lib/jia/intelligence.ts": ["buildLearningObservation", "LEARNING"],
        }
    },
    "06_transversality": {
        "files": {
            "lib/jia/runtime.ts": ["TALENT", "RECRUITER", "PARTNER", "MOBILITY", "COMMUNITY", "BUSINESS", "ADMIN"],
            "lib/jia/transversal.ts": ["CEO", "BUSINESS", "GROWTH", "COMMERCIAL", "FINANCE", "MARKET", "OPERATIONS", "CUSTOMER", "CAREER"],
            "lib/jia/recruiterIntelligence.ts": ["buildRecruiterIntelligence"],
            "lib/jia/partnerIntelligence.ts": ["buildPartnerIntelligence"],
            "lib/jia/mobilityIntelligence.ts": ["buildMobilityIntelligence"],
        }
    },
    "07_physical_presence": {
        "files": {
            "components/JiaPresence.tsx": ["JIA3D", "/api/jia/cycle", "jobly:jia-cognitive-cycle", "jobly:jia-external-signal"],
            "components/JIA/JIA3D.tsx": ["jia-officielle.glb", "speaking", "morph", "gltf"],
            "components/JIA/movements.ts": ["breath", "gesture"],
            "components/JIA/gestureMap.ts": ["gesture"],
        }
    },
    "08_e2e_cognitive_loop": {
        "files": {
            "lib/jia/runtime.ts": ["PERCEIVE", "UNDERSTAND", "MEMORY", "BELIEF", "WORLD_MODEL", "REASON", "PREDICT", "ANTICIPATE", "GOAL", "PLAN", "POLICY", "PROPOSE", "ACT", "VERIFY", "EVALUATE", "REFLECT", "LEARN"],
            "app/api/jia/cycle/route.ts": ["runUnifiedCognitiveCycle", "privacyAcceptedAt"],
            "app/api/jia/brain/route.ts": ["runUnifiedCognitiveCycle", "runJiaBrain"],
            "lib/jia/eventBus.ts": ["publishTraceEvent", "correlationId"],
        }
    },
    "09_production_observability_lock": {
        "files": {
            ".github/workflows/jia-master-gate.yml": ["Architecture contradiction gate", "Cognitive core contract", "Internet Brain invariants", "Offline autonomy hard mode", "Critical nine-workstream gate"],
            ".github/workflows/vercel-production.yml": ["main"],
        }
    },
}

for gate, spec in GATES.items():
    for path, needles in spec["files"].items():
        text = read(path)
        for needle in needles:
            assert needle in text, f"{gate}: {path} missing {needle!r}"

# The cognitive sequence must remain ordered.
runtime = read("lib/jia/runtime.ts")
order = ["PERCEIVE","UNDERSTAND","MEMORY","BELIEF","WORLD_MODEL","REASON","PREDICT","ANTICIPATE","GOAL","PLAN","POLICY","PROPOSE","ACT","VERIFY","EVALUATE","REFLECT","LEARN"]
positions = [runtime.index(item) for item in order]
assert positions == sorted(positions), f"cognitive order broken: {positions}"

# Memory must have one canonical context read and one cognitive write path.
ctx = read("lib/jiaContext.ts")
assert 'from("JiaMemory")' not in ctx
assert 'from("jia_memory")' not in ctx
assert 'from("jia_memory_unified")' in ctx

# Payments remain outside J'IA's execution authority.
policy = read("lib/jia/policy.ts")
assert "JIA_NEVER_EXECUTES_PAYMENTS" in policy
assert "isPayment" in policy

print("J'IA CRITICAL 9-WORKSTREAM CONTRACT: PASS")
print("Architecture coverage is present across all nine workstreams.")
print("This test does NOT claim P3/P4/E2E/production validation; those require execution evidence.")

# CI execution checkpoint: run on PR synchronization.
