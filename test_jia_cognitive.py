from pathlib import Path

REQUIRED = [
    "lib/jia/cognitive.ts",
    "lib/jiaMemory.ts",
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
    for token in ["remember", "updateBelief", "createPrediction", "reflect", "upsertSelfState", "buildCareerTwin", "ingestExternalSignal", "jia_memory_unified"]:
        assert token in text

def test_policy_contract():
    text = Path("lib/jia/policy.ts").read_text()
    for token in ["OBSERVE", "READ", "ANALYZE", "PROPOSE", "PREPARE", "EXECUTE", "SENSITIVE_EXECUTE", "JIA_NEVER_EXECUTES_PAYMENTS"]:
        assert token in text


if __name__ == "__main__":
    test_cognitive_core_contract()
    test_cognitive_pipeline_keywords()
    test_policy_contract()
    print("JIA cognitive core contract: PASS")


def test_canonical_memory_write_path():
    text = Path("lib/jiaMemory.ts").read_text()
    assert 'from "./jia/cognitive"' in text
    assert "await remember({" in text
    assert 'source:"JIA_EVENT_BUS"' in text
