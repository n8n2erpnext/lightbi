# Phase 4C1 Canonical Readiness And Trust Foundation

Date: 2026-07-13

## Objective And Scope

Phase 4C1 introduces a deterministic, capability-specific readiness artifact in `understanding-core`. It translates frozen physical, semantic, grain, and relationship artifacts into conservative shadow judgments. It does not select keys, approve safety, aggregate measures, activate domains, generate BA content, or wire runtime/UI/AI/DuckDB.

## Existing Ownership Inventory

The machine inventory is `phase-4c1-readiness-ownership-audit.json`. Existing runtime-active concepts are spread across decision trust, business confidence, decision readiness, dataset health, numeric health, AI briefing, Home, and Investigation. Several mix physical, semantic, decision, and execution concerns into numeric scores. They remain untouched and authoritative only for legacy runtime behavior until a later migration.

## Contracts And Policy

- Artifact: `lightbi.understanding-readiness-shadow.v1`
- Policy: `lightbi.readiness-policy.v2` (advanced by Phase 4C2 scope correction)
- Policy SHA-256: `5a6ab0d071cd6de3daeb29ff47e0cee364e17dd983476c740be3fc33a658139f`
- Capability count: 34
- Trust dimensions: 12

The artifact records source/bundle identity, hashes, upstream versions and policy hashes, full capability coverage, evidence, blockers, limitations, debt, remediation, dependency graph, trust dimensions, and a non-authoritative presentation projection.

## Capability Model

Each physical, semantic, source-local, aggregation, relationship, planning, execution, domain, generic-analysis, BA-question, and narrative capability resolves independently to `ready`, `conditionally_ready`, `blocked`, `unknown`, `unsupported`, or `not_applicable`.

There is no global ready flag. A physically clean source can remain semantically conditional; a candidate-scoped cardinality observation can be ready while join execution is critically blocked; generic analysis can be conditional while domain activation is unsupported.

## Dependency Graph

The machine audit is `phase-4c1-capability-dependency-audit.json`. Edges distinguish mandatory prerequisites, optional corroboration, correlated evidence, blockers, limitations, and unrelated capabilities. Downstream capabilities cannot outrun mandatory prerequisites. Physical quality cannot hide semantic ambiguity, relationship evidence cannot raise grain certainty, cardinality cannot approve join execution, and domain absence cannot block generic profiling.

## Trust Dimensions

Canonical trust remains separated into physical completeness, structural quality, semantic coverage, semantic certainty, grain coverage, relationship coverage, temporal coverage, aggregation safety, execution safety, domain support, provenance quality, and unresolved debt severity.

Only transparent measured ratios are emitted, such as known semantic columns divided by physical columns or governed pairs divided by declared pairs. Ratios are not called accuracy and are never averaged into a canonical truth score.

## Presentation Projection

The provisional projection is `presentationOnly: true`, `decisionAuthority: false`, and `productionWiring.executed: false`. It exposes measurable ratios and critical blocked capabilities but deliberately sets `summaryPercentage: null`. A future UI summary cannot override canonical states or conceal blocked aggregation/join execution.

## Blockers And Remediation

Blockers use informational, caution, material, and critical severity relative to each capability. Critical blockers include unavailable full-file truth, unsafe aggregation, unselected join key, and absent operation safety. They cannot be canceled by unrelated evidence.

Remediation is structured, deterministic, and non-mutating: confirm meaning/grain/key, provide period semantics or domain pack, resolve duplicates, repair mixed types, remove repeated totals, provide a relationship contract, or choose a safe aggregation rule. No free-form AI advice is generated.

## Debt Propagation

Semantic ambiguity affects semantic/grouping capabilities; grain debt affects identity/grain/aggregation; relationship and temporal debt affect relationship/planning; empty domain support affects domain capabilities. Unrelated debt does not globally block physical or generic capabilities.

## Corpus Diagnostics

The complete audit is `phase-4c1-readiness-corpus-audit.json`; separate expectations are in `sample-corpus/readiness-shadow-expectations.v1.json`.

- 37 source occurrences evaluated.
- 5 multi-file bundles and 9 source pairs evaluated.
- 34 capabilities emitted for every artifact.
- 37 sources remain numeric-aggregation blocked because every measure remains `safeToAggregate: false`.
- 9 pairs remain join-execution blocked.
- 36 sources are conditionally ready for generic analysis; one structurally critical source is blocked.
- 37 sources have domain analysis unavailable because the support manifest remains empty.
- Blockers observed: 47 critical, 111 material, 4 caution, 37 informational.

These are governed readiness diagnostics, not real-world accuracy metrics. Holdout, adversarial, and multi-file cases remain evaluation-only.

## Multi-Domain Boundary

Future packs may add domain capability definitions, metric dependencies, constraints, blockers, remediation, and expectations. They cannot override universal readiness, weaken blockers, approve operations, invent evidence, bypass privacy, inject sample/filename rules, or modify another domain. No SDK behavior is implemented.

## Production Isolation

- Frozen Phase 2, Phase 3, Phase 4A, and Phase 4B policies unchanged.
- All source signatures, five bundles, nine pairs, upstream debt, and risks remain available.
- No key, relationship, cardinality, operation, metric, or domain knowledge is manufactured.
- Every measure remains `safeToAggregate: false`.
- Join safety, operation approval/execution, and production wiring remain false.
- `DOMAIN_SUPPORT_MANIFEST` remains empty.

## Limitations

Readiness is shadow-only. It does not replace current runtime scores, approve aggregation, establish business cardinality, resolve temporal partition debt, activate domains, or provide user-facing BA output.

## Tests

The synthetic suite governs 30 probes covering capability independence, dirty/unknown evidence, aggregation and snapshot risk, candidate-scoped cardinality, operation refusal, empty domain support, remediation, projection restrictions, determinism, policy hashing, privacy, and fail-closed guards. The corpus suite records all source/bundle capability states and trust dimensions.

Verification results:

- Phase 4C1 synthetic and corpus: 2 files, 6 tests passed.
- Phase 4C1 through Phase 1/1B and legacy detector regression matrix: 35 files, 252 tests passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed.
- Full desktop suite, run exactly once at the end: 123 files; 956 tests passed and the same 9 documented baseline tests failed.

The baseline remains three BA-comparison timeouts, one guided-investigation assertion, three numeric-health expectations, and two virtual-dataset-planner expectations. No Phase 4C1-owned test failed.

## Rollback

Remove `readiness-contracts.ts`, `readiness-policy.ts`, `readiness-engine.ts`, their tests/exports, readiness expectations, and the three Phase 4C1 audits/report. No runtime migration is needed because production wiring is absent.

## Stop Condition

Phase 4C1 stops at capability-level readiness evidence in canonical shadow mode. Final join-safety approval, execution, domain/SDK activation, metrics, questions, actions, BA/narrative generation, runtime, AI/UI/DuckDB, and Phase 5 have not begun.
