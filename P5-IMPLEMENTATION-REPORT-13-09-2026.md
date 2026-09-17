# JOBLY — P5 AI Career Agent Implementation Report — 13/09/2026

## Delivered
- P5.1 shared server-side AI Gateway.
- Server-authoritative plan/quota resolution.
- Monthly credit accounting in `AiUsage`.
- SHA-256 request hashing and `AuditLog` entries.
- Deterministic fallback provider (`DETERMINISTIC/fallback-v1`) as the only execution mode in this checkpoint.
- P5.2 Interview AI surface.
- P5.3 Learning Intelligence surface.
- P5.4 Application Copilot surface.
- P5.5 Career Companion surface.
- P5.6 validation boundary documented.
- P5.6 DB quota validation completed: FREE quota cap, rejection after exhaustion, and no extra `AiUsage` row.

## Economic controls
- Free 5 / Start 30 / Premium 120 / Pro 300 credits per month.
- Operation costs: Interview 3, Learning 2, Application Copilot 2, Career Companion 1.
- Hard server-side quota.
- No automatic application submission.
- No provider production secret in client code.

## Validation
- Bracket/brace/parenthesis balance: PASS for source files.
- Archive integrity: PASS after packaging.
- Full TypeScript build: NOT CERTIFIED because project npm dependencies are not installed in this environment. `typecheck.log` records the diagnostic boundary.
- Real database migration: NOT CERTIFIED; requires target DB credentials/environment.
- External AI provider benchmark: NOT CERTIFIED; intentionally not activated.

## P5.6 DB validation update — 13/09/2026

The Supabase test suite confirms:

- FREE quota: 5 credits maximum;
- TEST 7: final 4 credits consumed successfully (`used_credits=5`, `remaining_credits=0`);
- TEST 8: next request rejected (`allowed=false`, `usage_id=null`);
- no additional `AiUsage` reservation after quota exhaustion;
- idempotency and the database uniqueness constraint remain confirmed.

This validates the quota boundary in the test database. It does not yet certify production readiness.

## Next status step

Run the real concurrency test against `reserve_ai_credit(...)`, then complete `npm install`, `npm run typecheck`, `npm run build`, the four AI E2E flows, and provider/cost benchmarking. Only after these gates should a real AI provider be activated.

## Mise à jour — 13/09/2026

### TEST 9 — concurrence et idempotence

Le TEST 9 a été exécuté avec succès sur l’environnement de test. Les appels identiques ne créent pas de double réservation et les réservations concurrentes ne dépassent pas le quota FREE de 5 crédits.

**État : validé fonctionnellement.**

### État P5.6

Le moteur de quota démontre désormais :

1. La correspondance Auth → User.
2. La cohérence User → Subscription.
3. La réservation atomique d’un crédit.
4. L’idempotence par `requestHash`.
5. La protection DB par contrainte UNIQUE.
6. Le blocage après épuisement du quota.
7. Le respect du quota sous concurrence simulée.

Les étapes restantes concernent l’intégration applicative, les tests automatisés, le build et la validation finale avant passage à Career Brain.


## Mise à jour — 13 septembre 2026

### Résultats confirmés
- TEST 7 — quota maximum FREE : `allowed = true`, `used_credits = 5`, `remaining_credits = 0`.
- TEST 8 — crédit suivant : `allowed = false`, `used_credits = 5`, `remaining_credits = 0`, `usage_id = null`.
- TEST 9 — concurrence simulée : résultats confirmés par le propriétaire du projet ; quota respecté et aucune double réservation observée.

### Clarification du contrôle Typecheck / Build
Le typecheck et le build ne sont pas des requêtes SQL. Ils doivent être vérifiés depuis Vercel ou le terminal du projet :
- `npm run typecheck`
- `npm run build`

À ce stade, leur réussite n'est pas déclarée tant que les logs Vercel n'ont pas été fournis ou exécutés avec succès.
