# J'IA Cognitive Core — V2 foundation

This branch unifies J'IA's durable cognitive state around one server-side persistence layer.

## Runtime loop

PERCEPTION → CONTEXT → MEMORY → BELIEF → REASONING → PREDICTION → ANTICIPATION → GOAL → PLAN → POLICY → ACTION → VERIFY → OUTCOME → REFLECTION → LEARNING → WORLD UPDATE.

## Persistent state

- `jia_memory`: working/episodic/semantic/procedural/long-term/user/world/Jobly/reflective memory.
- `jia_beliefs`: confidence, evidence and counter-evidence.
- `jia_predictions`: probability, horizon, outcome and calibration error.
- `jia_reflections`: expectation/result/error/learning/next strategy.
- `jia_world_entities` / `jia_world_relations`: evolving world model primitives.
- `jia_action_runs`: goal → plan → permission → precondition → action → result → verification → outcome.
- `jia_self_state`: functional software self-model.

## Career Twin

`buildCareerTwin()` derives a durable career model from Jobly Profile, Skill, Experience and Education data:

CURRENT STATE → TARGET STATE → GAP → OPTIONS → NEXT STEP.

## Security

All cognitive persistence is server-side through the service client. The new tables have RLS enabled and no Data API access for anon/authenticated roles. Sensitive execution remains behind policy controls; J'IA never executes payments.

## Internet Brain integration

External signals are now persisted through the same cognitive core instead of being treated as a second brain. Internet evidence can update memory and beliefs, while retaining evidence status and confidence.

## Remaining validation

The branch must still pass GitHub CI, application typecheck/build, hard-mode suites and real browser E2E before it can be considered green. No merge to `main` or Vercel deployment is implied.
