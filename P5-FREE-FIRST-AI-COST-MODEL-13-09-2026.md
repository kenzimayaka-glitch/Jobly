# JOBLY — P5 Free-First AI Cost Model — 13/09/2026

## 1. Objective

P5 introduces four AI surfaces without turning AI into an uncontrolled variable cost:

1. Interview AI
2. Learning Intelligence
3. Application Copilot
4. Career Companion

The economic rule is **Free-First**: deterministic computation, cache and existing Jobly data are preferred before an AI call.

## 2. Locked monthly credit envelope

| Plan | Monthly AI credits | Maximum internal AI budget* |
|---|---:|---:|
| Free | 5 | 5 XAF |
| Start | 30 | 30 XAF |
| Premium | 120 | 120 XAF |
| Pro | 300 | 300 XAF |

\* Internal ceiling: **1 XAF maximum variable AI spend per consumed credit**. This is a Jobly budget guardrail, not a claim about any external provider's tariff.

This keeps the maximum AI budget below the existing economic target of 25% of net revenue under the validated paid-plan prices, before other variable costs are considered.

## 3. Credit consumption

| Operation | Credits | Principle |
|---|---:|---|
| Interview AI | 3 | Only after deterministic profile/context extraction |
| Learning Intelligence | 2 | Prefer existing gap/roadmap data first |
| Application Copilot | 2 | Draft/analysis only; never auto-submit |
| Career Companion | 1 | Short contextual assistance |

The UI must display the estimated credit consumption before an expensive operation whenever practical.

## 4. Free-First execution policy

1. Load user/profile/opportunity/application data.
2. Reuse deterministic Career OS and Opportunity Intelligence outputs.
3. Check cache.
4. If the requested answer can be produced deterministically, do not call AI.
5. Check remaining monthly credits.
6. If insufficient credits, return a useful deterministic fallback and explain the quota.
7. Call AI only when it adds material value.
8. Record usage, operation, latency and outcome.
9. Never silently exceed a monthly quota.

## 5. Cost control requirements

- No unlimited AI endpoint.
- No client-controlled credit decrement.
- Credit accounting must be server-authoritative.
- Idempotency required for retryable AI operations.
- Cache repeated prompts/context where safe.
- Bound prompt/context size.
- Prefer small/fast models for classification, extraction and rewriting.
- Escalate to a stronger model only when the task requires it.
- Do not send unnecessary PII to an AI provider.
- Provider/model configuration must remain server-side.

## 6. P5 success metrics

- AI variable spend per active paid user stays within the internal credit ceiling.
- AI usage is measurable by plan and operation.
- Deterministic fallback remains useful when credits are exhausted.
- No automatic job application submission.
- No feature unlock based only on a client-side value.

## 7. What is deliberately not fixed yet

The model/vendor, exact token limits, prompt templates and production provider prices are **not locked by this document**. They should be selected after a controlled benchmark using representative Jobly workloads.
