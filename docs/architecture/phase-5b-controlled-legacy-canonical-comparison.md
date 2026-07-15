# Phase 5B Controlled Legacy And Canonical Comparison

Date: 2026-07-13

## Executive Decision

Phase 5B adds an observational, test-only comparison boundary. Legacy production behavior remains authoritative and canonical envelopes remain shadow-only. The framework records raw observations, governed mappings, agreements, divergences, safety conflicts and migration debt without choosing a winner.

## Contracts And Policy

- Artifact: `lightbi.legacy-canonical-comparison.v1`
- Policy: `lightbi.legacy-canonical-comparison-policy.v1`
- SHA-256: `6d1e75c5e51059e1217a1d1ce7ef7819c5775f07e489c27cc0db2a7e180c044a`
- Production barrel export: absent

The artifact preserves the raw legacy observation and exact Phase 5A capability, trust, restriction and authority views. It carries deterministic identity, source hashes, policy identities, divergence taxonomy, severity, limitations, debt and explicit non-authority flags.

## Legacy Inventory And Mapping

The ownership audit covers numeric health, dataset health, decision readiness, business confidence and virtual dataset planning. Business confidence is marked environment-sensitive because its output identity uses `Date.now()`.

Five explicit mappings cover aggregation safety, physical health, decision readiness, operation planning and domain metric availability. Numeric legacy scores are partial or structurally incomparable; no score threshold creates a canonical state. Missing fields do not imply denial or support.

## Safety And Authority

Rule-based critical conflicts include legacy aggregation permission against canonical blocking, planning permission against operation restrictions, and domain metric availability against unsupported domain activation. High scores over conditional or blocked canonical capabilities are material, not numerically scored.

Read, decision, planning, approval, execution and narrative authority remain separate. Every comparison keeps `legacyAuthorityChanged: false`, `canonicalAuthorityChanged: false`, operation approval false and production wiring false.

## Deterministic Harness

`observeNumericHealthForTest` calls the actual legacy numeric-health function. Other observations require caller-supplied legacy outputs and preserve them exactly. Unavailable or environment-sensitive observations remain explicit; timeout or missing input never becomes agreement.

## Governed Replay

Phase 5A provides 51 valid canonical subjects: 37 source, five bundle and nine pair. No matching caller-supplied legacy contract input is stored with those corpus artifacts, so corpus legacy observations are honestly reported unavailable rather than mocked. Synthetic governed fixtures prove direct safety comparison and scalar incomparability.

These diagnostics are migration evidence, not accuracy metrics.

## Executable Debt And Gates

The executable debt audit classifies Phase 4C2 invariants as executable now, equivalently covered, machine-audit-only, or blocking Phase 5C. Current gates:

- `projectionMigrationEligible`: true only for lossless non-authoritative display fields
- `shadowComparisonCoverageComplete`: false
- `criticalSafetyDivergencesResolved`: false
- `legacyAuthorityContractDocumented`: true
- `canonicalAuthorityMigrationEligible`: false

## Multi-Domain Boundary

Future domain packs may supply additional explicit mappings for their own legacy outputs. They cannot change universal mappings, weaken restrictions, approve operations, invent canonical evidence, bypass privacy, alter authority automatically or modify another domain.

## Production Isolation

No Home, Investigation, UI, AI, BA, playbook, planner, execution, DuckDB, persistence, database, telemetry, feature flag or legacy implementation changed. Comparison modules are not barrel-exported and have zero production importers.

## Limitations

- Governed corpus lacks paired legacy input contracts, so corpus-level agreement/divergence counts remain unavailable.
- Several Phase 4C2 classes remain machine-audit-only and block Phase 5C.
- Existing legacy numeric-health and planner baseline failures are preserved.
- Comparison mappings cover only audited legacy contracts, not every user-facing field.

## Verification

Completed verification:

- Targeted comparison, migration-gate, Phase 5A and readiness tests: 17/17 passed.
- Post-isolation targeted corpus/comparison replay: 8/8 passed.
- Canonical/upstream/legacy regression matrix: one expected guided-investigation baseline failure plus one Phase 5A scanner mismatch; the scanner mismatch was corrected by explicitly classifying Phase 5B modules as test/development-only consumers and reverified.
- `npx tsc --noEmit`: passed.
- Seven Phase 5B audit JSON files parse successfully.
- Import isolation: zero production consumers; no barrel export.
- Full desktop suite, run exactly once at the end: 975 passed and nine known baseline failures across 129 files and 984 tests.

The nine unchanged failures are three BA comparison timeouts, one guided-investigation assertion, three numeric-health expectations and two virtual-dataset planner expectations. Phase 5B introduced zero final-suite failures.

## Rollback

Remove the four `legacy-*comparison*` implementation files, two tests, seven Phase 5B audits, this report and the Phase 5B ownership paragraph. No runtime rollback is required because production behavior is untouched.

## Stop Condition

Phase 5B stops here. Authority migration, production projection, operation approval, metrics, domains, SDK, questions, actions, BA narratives, AI/UI/DuckDB integration and Phase 5C are not started.

shadow_comparison_complete_with_documented_debt
