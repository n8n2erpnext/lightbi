# Phase 5M1 Commerce Domain And Metric Foundation

## Executive decision

Phase 5M1 introduces one narrow, conditional `commerce_distribution_mvp` pack and six governed metric definitions. The pack consumes frozen canonical physical, semantic, grain, relationship, and readiness artifacts. It does not change those artifacts, authorize execution, produce metric results, or change user-facing behavior.

The foundation is suitable as input to Phase 5M2 question/action generation with documented debt. It is not a production-support or runtime-cutover claim.

## Objective and scope

Implemented:

- deterministic domain concept activation;
- versioned governed metric contracts and policy;
- metric-specific preflight with blockers, limitations, and remediation;
- synthetic, golden, holdout, adversarial, and multi-file governance;
- machine-readable ownership, activation, metric, corpus, isolation, and migration audits.

Explicitly excluded:

- Home, Investigation, chart, BA, AI, and DuckDB integration;
- question/action generation;
- SQL planning or metric execution;
- production flags, persistence, telemetry, or prospective capture;
- additional domain packs and Phase 6 cutover.

## Current domain ownership

`understanding-core/domain-support-manifest.ts` remains the canonical owner. The frozen `DOMAIN_SUPPORT_MANIFEST` remains empty because readiness policy v2 and Phase 1 support truth depend on that compatibility contract. A versioned `GOVERNED_DOMAIN_SUPPORT_MANIFEST_V1` in the same owner contains the new conditional pack. New Phase 5M1 code consumes only this governed declaration.

Legacy `domain-knowledge-catalog.ts`, `domain-ba-playbooks.ts`, and `understanding-next/semantic-domain-affinity.ts` remain unchanged. They are not canonical support truth and are not rewired in this phase.

## Pack identity

- Pack: `commerce_distribution_mvp`
- Version: `1.0.0`
- Status: `conditional`
- Production active: `false`
- Manifest policy hash: `7b18e323865c6058a780d5ef31527878a60c004a116ba600c95ec6a705b8f37c`

Concept declarations:

- Active declaration: product/item grouping, still subject to metric preflight.
- Conditional: commercial transaction, order line, revenue amount, quantity flow, inventory snapshot, and delivery event.
- Detect-only: cost amount, currency, and unit of measure.
- No unsupported concept or domain is promoted to production support.

## Activation rules

Activation requires full-file physical evidence, probable or confirmed canonical mappings, compatible source-local grain, role evidence, temporal evidence where relevant, and canonical readiness. Alias/header matches, numeric parsing, filenames, sample IDs, exact row counts, and expected answers cannot activate the pack.

A single revenue-like field does not activate full commerce support. Inventory snapshots are not movement. High-impact unresolved grain remains conditional or blocked. Cross-source metrics require governed relationship compatibility. Ambiguous currency or units block the affected metric. Generic physical profiling remains available when the pack is unsupported.

## Metric contract and catalog

Policy version `lightbi.governed-metric-policy.v1` has SHA-256 identity `79b00e4aa7e97311da56db1f19a996c52c8034dc52da21b0dc6981dfd1282702`.

The catalog contains:

| Metric | Operator | Additivity | Time behavior |
| --- | --- | --- | --- |
| `sales_revenue` | sum | additive | transaction flow |
| `quantity_sold` | sum | additive | transaction flow |
| `transaction_count` | governed identity count | descriptive count only | transaction flow |
| `inventory_on_hand` | sum at one as-of basis | semi-additive | point-in-time snapshot |
| `delivery_count` | governed identity count | descriptive count only | transaction flow |
| `gross_profit` | governed revenue minus governed cost | additive | period flow |

Every definition specifies semantic requirements, grain, dimensions, time behavior, duplicate and repeated-parent handling, snapshot behavior, null behavior, units, currency, relationships, readiness, prohibited states, output type, limitations, provenance, and an explicit `executionAuthorization:false`.

## Preflight model

Each metric independently returns `ready`, `conditionally_ready`, `blocked`, `unknown`, `unsupported`, or `not_applicable`. It reports semantic, grain, operator, time, unit, currency, duplicate, relationship, and readiness decisions without reducing them to a score.

The boundary is preserved:

- physical operator support is not metric readiness;
- metric readiness is not runtime action authorization;
- runtime authorization is not execution;
- execution is not decision-use authorization.

All Phase 5M1 artifacts set runtime action creation/authorization, metric execution, decision use, and production wiring to false. No result value is emitted. Canonical `safeToAggregate:false` is never modified.

## Additivity and time rules

- Snapshot balances may aggregate over compatible items or locations at one as-of basis, never across time.
- Unit prices are not revenue.
- Percentages, averages, and rates are not additive amounts.
- Balances are not automatically period flows.
- Repeated document totals across line rows block summation.
- Entity counts require a governed identity; no implicit `COUNT(DISTINCT)` is allowed.
- Missing risk evidence is not proof of additivity.
- Gross profit requires compatible revenue, cost, grain, time, and currency; cross-source derivation remains blocked without governed relationships.

## Corpus evidence

The runner evaluates all 30 acceptance cases and preserves corpus version `1.2.0` plus verified metric digest `27f1bc7122a58ad2179442c7319326e522c1e5422c69e659b17bd595fd661866`.

- Synthetic fixtures: contract validation and tuning allowed.
- Golden source-local: tuning allowed.
- Holdout source-local: evaluation only.
- Adversarial source-local: evaluation only.
- Multi-file: evaluation only; relationship-dependent metrics fail closed.

Verified metric values were not changed and are never returned by preflight. Expectations separately record applicability, allowed and forbidden states, blockers, grain, currency/unit handling, value provenance, and tuning provenance.

## Positive and negative cases

Ten positive probes cover revenue, sold quantity, governed transaction count, point-in-time inventory, governed delivery count, conditional gross profit, generic profiling without activation, partial conditional activation, definition availability with execution isolated, and independent metrics over one canonical artifact.

Thirty negative probes cover semantic misuse, rates/prices/balances, snapshot-flow confusion, repeated totals, ambiguous grain, unknown roles, incompatible currency/UOM, missing keys/time/cost/relationships, numeric-only evidence, evaluation-only tuning attempts, sample-specific activation, mutation/weakening attempts, global additivity attempts, execution authorization attempts, invalid artifacts, and hash mismatch.

Determinism tests cover metric and concept order, duplicate evidence/blockers, monotonic fail-closed behavior, unrelated debt isolation, canonical SHA-256, policy mutation, source/hash mismatch, and privacy-safe output.

## Remaining blockers

- The pack is intentionally conditional and not production-active.
- Frozen semantic collisions such as generic quantity families require canonical confirmation; Phase 5M1 does not alter aliases or resolution policy.
- Cross-source revenue/cost derivation remains blocked until a governed relationship is available and compatible.
- Missing currency or UOM keeps affected metrics conditional; incompatible or ambiguous bases block them.
- Runtime plan binding, SQL preview identity, execution safety, decision use, and production consumer migration remain unproved.
- The frozen Phase 0 manifest and readiness v2 compatibility projection remain unsupported until a later governed migration.

## Production isolation and preservation

No production importer or new barrel export exists. `understanding-core/index.ts` remains unchanged. Home, Investigation, chart, BA, AI, DuckDB, runtime plans, SQL, persistence, telemetry, and capture code are unchanged. Phase 5A through 5B6B policy identities and all frozen semantic, grain, relationship, readiness, and aggregation artifacts remain governed by their existing preservation tests. `summaryPercentage` remains null and production wiring remains false.

## Tests

Completed before final desktop verification:

- Phase 5M1 domain, metric preflight, determinism, privacy, and governance tests;
- all 30 acceptance corpus cases;
- complete `understanding-core` matrix, including Phase 4C and Phase 5A through 5B6B gates;
- repository TypeScript gate with zero diagnostics.

Final checks also include JSON parsing, import isolation, controlled-clock leakage coverage, `git diff --check`, and one full desktop suite run on the final source/test/policy state.

Final verification result:

- Phase 5M1 targeted tests: passed.
- Complete `understanding-core` matrix: passed.
- TypeScript `npx tsc --noEmit -p tsconfig.app.json`: passed with zero diagnostics.
- Eight Phase 5M1 JSON audits: parsed successfully.
- `git diff --check`: passed.
- Full desktop suite, run exactly once: 140 test files passed and 4 files contained the governed baseline failures; 1048 tests passed and the same 9 exact Phase 5B6B allowlisted tests failed. There were zero unexpected failures.
- Existing Investigation test stderr about a relative session API URL remains non-failing legacy test-environment output and was not changed in this phase.

## Rollback

Remove only the four Phase 5M1 canonical modules, three Phase 5M1 test modules, eight Phase 5M1 JSON audits, this report, and the governed manifest addition below the frozen `DOMAIN_SUPPORT_MANIFEST`. No legacy or frozen canonical policy rollback is required because none was modified.

## Recommended Phase 5M2 file list

Create only after Phase 5M1 is accepted:

- `apps/desktop/src/lib/understanding-core/governed-question-action-contracts.ts`
- `apps/desktop/src/lib/understanding-core/commerce-distribution-question-policy.ts`
- `apps/desktop/src/lib/understanding-core/governed-question-action-generator.ts`
- `apps/desktop/src/lib/understanding-core/governed-question-action-generator.test.ts`
- `apps/desktop/src/lib/understanding-core/governed-question-action-generator.corpus.test.ts`
- `apps/desktop/src/lib/understanding-core/phase-5m2-governance.test.ts`
- `docs/architecture/phase-5m2-question-action-policy-audit.json`
- `docs/architecture/phase-5m2-question-action-corpus-audit.json`
- `docs/architecture/phase-5m2-import-isolation-audit.json`
- `docs/architecture/phase-5m2-migration-gate-audit.json`
- `docs/architecture/phase-5m2-commerce-question-action-generation.md`

## Stop condition

Phase 5M1 stops here. Phase 5M2 question/action generation, production runtime wiring, UI integration, DuckDB execution, additional domains, prospective capture, and Phase 6 are not started.

commerce_metric_foundation_ready_with_documented_debt
