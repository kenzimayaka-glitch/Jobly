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
The route /api/jia/internet returns JIA_EXTERNAL_SIGNAL. The autonomous Brain remains the decision layer; Internet Brain is perception, not a second brain.
## Configuration
JIA_INTERNET_ENABLED, JIA_INTERNET_MODE, JIA_INTERNET_MAX_QUERIES, JIA_INTERNET_MAX_SOURCES, JIA_INTERNET_MAX_DEPTH, JIA_INTERNET_TIMEOUT_MS, JIA_INTERNET_CACHE_TTL_MS, JIA_INTERNET_MIN_CONFIDENCE, JIA_INTERNET_MEMORY_THRESHOLD, JIA_INTERNET_PROACTIVITY_THRESHOLD.
Default search adapter: DuckDuckGo non-JavaScript HTML search. If unavailable, the system records the failure instead of simulating a result.
## Limitation
Deterministic extraction and corroboration are conservative heuristics, not semantic certainty. Structured search providers can be added later behind SearchAdapter.