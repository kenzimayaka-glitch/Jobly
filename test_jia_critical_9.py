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
    "07_conversational_presence": {
        "files": {
            "components/JiaPresence.tsx": ["JiaPresenceMark", "/api/jia/cycle", "jobly:jia-cognitive-cycle", "jobly:jia-external-signal"],
            "components/JiaPresenceMark.tsx": ["data-jia-presence-mark", "listening", "speaking"],
            "components/jia-avatar/JIA3D.tsx": ["jia-officielle.glb", "speaking", "morph", "gltf"],
            "components/jia-avatar/movements.ts": ["breath", "gesture"],
            "components/jia-avatar/gestureMap.ts": ["gesture"],
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

# P2 runtime, persistence and outcome-loop regression checks.
cycle_route = read("app/api/jia/cycle/route.ts")
consent_guard = cycle_route.index("privacyAcceptedAt")
cognitive_execution = cycle_route.index("const result=await runUnifiedCognitiveCycle(")
assert consent_guard < cognitive_execution, "J'IA cognitive writes must remain behind the privacy-consent gate"

career_journey = read("lib/careerJourney.ts")
assert "journeyUpdateError" in career_journey and "if (!persistedJourney)" in career_journey, "Career Journey reassessment must confirm its persisted state"

assessment_route = read("app/api/career-journey/assessments/route.ts")
assert "updateAssessmentError" in assessment_route, "Assessment result update errors must be surfaced"
assert "evidenceError" in assessment_route and "evidenceId" in assessment_route, "Assessment evidence persistence must be confirmed"
assert "rollbackAssessmentAttempt" in assessment_route and "lastAttemptError" in assessment_route, "Assessment partial writes and attempt-number reads must be handled"

health_route = read("app/api/jia/health/route.ts")
assert "runtimeEvidence" in health_route and "outcomeLoopObserved" in health_route, "J'IA health must report observed persistence evidence"
assert "verifiedActionRuns" in health_route and "predictionOutcomes" in health_route, "J'IA health must distinguish proposals from verified outcomes"
assert '.not("outcome", "is", null)' in health_route, "Outcome count must be based on non-null persisted outcomes"
assert 'head: true' in health_route and '.limit(1000)' not in health_route, "Health counts must be exact and untruncated"
assert "proposedActionRuns" in health_route and "failedActionRuns" in health_route, "Health must report proposal and failure states separately"
assert "verifiedOutcomeRuns" in health_route and '.eq("outcome->>isOutcome", "true")' in health_route, "Verified navigation alone must not count as a business outcome"
assert "outcomes: true" not in health_route, "J'IA health must not claim outcomes without persisted evidence"

agent_route = read("lib/jia/agent.ts")
assert "hasObservedOutcome" in agent_route and "externalSideEffect" in agent_route, "J'IA must distinguish a safe navigation from a measurable outcome"
assert 'outcome:{navigation:next,externalSideEffect:false}' in agent_route.replace(" ", ""), "Safe navigation must not be stored as a business outcome"

mission_update = career_journey[career_journey.index("export async function updateMission"):career_journey.index("export async function validateMissionOwnership")]
assert "missionUpdateError" in mission_update and "if (missionUpdateError || !missionUpdate)" in mission_update, "Mission transitions must persist their audit journal"
assert '.eq("status", mission.status)' in mission_update and "rollback" in mission_update, "Mission transitions must guard concurrency and compensate an audit failure"

journey_route = read("app/api/career-journey/route.ts")
assert "evidenceResult.error" in journey_route and "portfolioResult.error" in journey_route, "Journey GET must surface proof/portfolio read failures"

reassess_route = read("app/api/career-journey/reassess/route.ts")
assert '.eq("status", "VERIFIED")' in reassess_route, "Reassessment must query verified actions directly, not sample recent proposals"
assert "verifiedActionType" in reassess_route and "review.data" in reassess_route, "Reassessment must return the verified action and persisted review"
assert '.eq("outcome->>isOutcome", "true")' in reassess_route, "Career reassessment must exclude navigation-only verification"
assert "persistedJourney?.latestReadiness === after" in reassess_route, "Readiness confirmation must compare against the selected persisted row"

print("J'IA CRITICAL 9-WORKSTREAM CONTRACT: PASS")
print("Architecture coverage is present across all nine workstreams.")
print("This test does NOT claim P3/P4/E2E/production validation; those require execution evidence.")

# CI execution checkpoint: run on PR synchronization.
