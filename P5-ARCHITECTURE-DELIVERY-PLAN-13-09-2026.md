# JOBLY — P5 AI Career Agent Architecture & Delivery Plan — 13/09/2026

## Architecture principle

P5 is a thin intelligence layer above the deterministic Jobly foundation already delivered in P3.2/P4.

`User context → deterministic Career OS / Opportunity Intelligence → cache → quota check → AI operation → validated output → audit/usage`

## Shared AI gateway

Introduce one server-side `AI Gateway` abstraction rather than four independent provider integrations.

Responsibilities:
- authenticate the Jobly user;
- resolve plan/entitlements;
- enforce monthly credit quota;
- select operation/model policy;
- cap context and output size;
- execute provider call;
- validate structured output;
- persist usage/audit metadata;
- return deterministic fallback on safe failures.

The gateway must never trust a client-provided plan, price or credit balance.

## P5.1 Interview AI

Input: Career Brain + Career OS context + explicit user answers.

Output:
- structured interview questions;
- answer analysis;
- identified gaps/strengths;
- next actions.

Guardrail: no diagnosis or unsupported claim about the user.

## P5.2 Learning Intelligence

Input: Career Gap + Roadmap + target role/opportunity.

Output:
- prioritized learning objectives;
- short learning sequence;
- evidence/checkpoints;
- estimated effort.

Deterministic skill-gap mapping remains the first layer.

## P5.3 Application Copilot

Input: CV/profile + selected opportunity + application context.

Output:
- tailored CV suggestions;
- cover-letter draft;
- answer suggestions for application questions;
- missing-evidence warnings.

Hard rule: **AI may prepare; the user submits.**

## P5.4 Career Companion

Input: current Career OS state + recent opportunities/applications + user request.

Output:
- concise contextual guidance;
- next-best-action explanation;
- progress summary;
- reminders/suggestions.

Keep responses bounded and credit-efficient.

## Shared data model — planned

A future migration should add server-authoritative AI usage records, for example:

- userId
- plan snapshot
- operation
- credits consumed
- provider/model
- request hash
- latency
- success/failure
- createdAt

Do not add this migration until the gateway contract and benchmark are reviewed.

## Delivery sequence

### P5.0 — completed in this checkpoint
- Free-First cost model.
- Credit budget guardrails.
- Shared architecture.
- Delivery boundaries.

### P5.1
- AI Gateway contract + deterministic fallback.
- Usage accounting migration.
- Provider adapter in non-production mode.

### P5.2
- Interview AI.

### P5.3
- Learning Intelligence.

### P5.4
- Application Copilot.

### P5.5
- Career Companion.

### P5.6
- Evaluation, quota abuse tests, prompt/context tests, E2E and cost benchmark.

## Exit criteria before production AI

- Provider benchmark completed.
- Cost per operation measured.
- Quotas enforced server-side.
- Usage auditable.
- Deterministic fallbacks tested.
- No secret in client bundle.
- PII minimization reviewed.
- E2E validated on Free/Start/Premium/Pro.
