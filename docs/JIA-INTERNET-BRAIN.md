# J’IA Internet Brain
## Mission
External perception layer for J’IA. It performs real web search and source retrieval; it never fabricates web results.
## Pipeline
INTENTION → SEARCH → DISCOVER → FETCH → EXTRACT → NORMALIZE → SOURCE QUALITY → CROSS-CHECK → FACTS → FRESHNESS → CHANGE DETECTION → CONTEXT → CONFIDENCE → MEMORY DECISION → J’IA BRAIN.
## Modes
OFF disables it. READ searches and reads. ANALYZE adds verification/context analysis. PROACTIVE permits anticipatory external signals.
Network failure is represented by internetAvailable=false and never becomes a fabricated fact.
## Source intelligence
Every source receives type, authority, reliability, relevance and confidence. Corroboration can raise confidence; contradictions remain CONTESTED.
## Security
External content is data, never instructions. Fetching is HTTPS-only, private/local targets are blocked, redirects are bounded, response size is limited, and remote scripts are never executed.
## Cache
Search, source and observation caches are in-process TTL caches. They are optimization, not durable memory.
## Jobly context
Signals are classified against Talent, Recruiter, Partner, Mobility, Jobs, Companies, Career, AI, Payments, Security, Legal, Product, Business and Operations.
## Integration
The route `/api/jia/internet` exposes a `JIA_EXTERNAL_SIGNAL` for an authenticated explicit query. The conversational Brain (`/api/jia/brain`) and the unified cognitive-cycle route (`/api/jia/cycle`) also invoke Internet Brain for an explicit/current-information request or a caller-supplied `internetQuery`. Routine Jobly opportunity search and private CV, account, subscription or payment data are not sent to web search by this intent gate. The unified cycle ingests external evidence only when sources or facts were actually retrieved, includes a verification recommendation in next-best actions, and returns source/freshness/confidence metadata with limitations. An unavailable network is recorded as an offline failure, never as evidence. Internet Brain remains the perception layer; J’IA's cognitive/runtime layer remains the decision layer.
## Configuration
JIA_INTERNET_ENABLED, JIA_INTERNET_MODE, JIA_INTERNET_MAX_QUERIES, JIA_INTERNET_MAX_SOURCES, JIA_INTERNET_MAX_DEPTH, JIA_INTERNET_TIMEOUT_MS, JIA_INTERNET_CACHE_TTL_MS, JIA_INTERNET_MIN_CONFIDENCE, JIA_INTERNET_MEMORY_THRESHOLD, JIA_INTERNET_PROACTIVITY_THRESHOLD.
Default search adapter: DuckDuckGo non-JavaScript HTML search. If unavailable, the system records the failure instead of simulating a result.
## Limitation
Deterministic extraction and corroboration are conservative heuristics, not semantic certainty. Structured search providers can be added later behind SearchAdapter.