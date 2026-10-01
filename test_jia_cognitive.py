from pathlib import Path

REQUIRED = [
    "lib/jia/cognitive.ts",
    "lib/jia/policy.ts",
    "lib/jia/agent.ts",
    "app/api/jia/cognitive/route.ts",
    "app/api/jia/internet/route.ts",
    "docs/JIA-COGNITIVE-CORE.md",
]

def test_cognitive_core_contract():
    for path in REQUIRED:
        assert Path(path).exists(), path

def test_cognitive_pipeline_keywords():
    text = Path("lib/jia/cognitive.ts").read_text()
    for token in ["remember", "updateBelief", "createPrediction", "reflect", "upsertSelfState", "buildCareerTwin", "ingestExternalSignal"]:
        assert token in text

def test_policy_contract():
    text = Path("lib/jia/policy.ts").read_text()
    for token in ["OBSERVE", "READ", "ANALYZE", "PROPOSE", "PREPARE", "EXECUTE", "SENSITIVE_EXECUTE", "JIA_NEVER_EXECUTES_PAYMENTS"]:
        assert token in text
