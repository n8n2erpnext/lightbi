# Phase 5A Canonical Runtime Adapter

Date: 2026-07-13

## Executive Decision

Phase 5A creates a deterministic, runtime-neutral projection boundary over frozen canonical artifacts. It does not migrate authority. Existing Home, Investigation, BA, AI, planning, execution, persistence, and UI behavior remains unchanged.

## Contracts And Policy

- Envelope: `lightbi.canonical-runtime-envelope.v1`
- Adapter policy: `lightbi.canonical-runtime-adapter-policy.v1`
- Policy SHA-256: `be4d0ac3d02305c13948cb6b7c8ecb0c087c6a2ea259e064411b9ff85ca2129b`
- Entry point: `buildCanonicalRuntimeEnvelopeForTest`
- Barrel export: intentionally absent

The envelope preserves canonical capability states, evidence, blockers, limitations, debt, remediation, trust dimensions, upstream versions and hashes. It exposes source, source-pair, and bundle views without collapsing state into a boolean or percentage.

## Runtime Ownership

The complete consumer inventory is in `phase-5a-runtime-consumer-ownership-audit.json`. Production remains owned by legacy dataset health, decision readiness, business confidence, AI briefing, BA, planner, and execution modules. Every record is retained unchanged in Phase 5A.

## Authority And Restrictions

Every valid envelope declares canonical shadow authority with no runtime read, decision, planning, approval, execution, or narrative authority. It always carries `SHADOW_ONLY`, operation prohibitions, aggregation prohibition, domain prohibitions, and legacy override prohibition. Restriction absence is never permission.

## Fail-Closed Assembly

The adapter validates source identity/hash, artifact versions, semantic/grain/relationship/readiness policy hashes, bundle membership, pair membership, capability/trust coverage, privacy, and all non-execution flags. Invalid input returns a separate adapter-integrity error and no envelope. There is no partial or legacy fallback.

Integrity states distinguish incomplete input, version/hash/scope/preservation mismatch, unsupported contract, privacy violation, and invalid canonical artifact from ordinary readiness states.

## Projection Preservation

Blockers are deduplicated by capability/code while preserving maximum severity. Evidence, limitations, debt, and remediation are deterministically deduplicated without changing meaning. Not-applicable, unsupported, unknown, blocked, and conditional states remain distinct. The projection audit reports zero loss across capabilities, trust dimensions, blockers, and remediation.

All 12 trust dimensions are copied without recomputation or averaging. Zero-denominator null remains null and `summaryPercentage` remains null.

## Corpus Replay

The governed replay produced 51 valid non-authoritative envelopes: 37 source, five bundle, and nine pair. Projection loss, artifact mismatch, and privacy violation counts are zero. Full distributions are recorded in `phase-5a-runtime-envelope-corpus-audit.json` and are conformance diagnostics, not accuracy or production-readiness metrics.

## Import Isolation

Only adapter tests import the test-only builder. No production consumer imports the adapter, contracts, or projection. The module is not exported from `understanding-core/index.ts`, performs no discovery, persistence, telemetry, network access, environment reads, or filesystem access.

## Counterfactual Debt Gate

The 42 Phase 4C2 mutation classes are classified in `phase-5a-readiness-validation-debt-gate.json`. Coverage is sufficient for controlled shadow comparison but explicitly incomplete for authority migration. Machine-readable cases are not mislabeled as executable tests.

## Multi-Domain Boundary

A future domain pack may add labels and expose domain-specific capability/blocker/remediation views beside the universal envelope. It may not modify universal readiness, weaken restrictions, select keys, approve operations, invent metrics, bypass privacy/provenance, or write another domain projection. No SDK or domain projection is implemented here.

## Limitations

- Pair envelopes project the applicable cross-source readiness subset from the declared bundle artifact; they do not create independent pair authority.
- Runtime trust dependencies are preserved as canonical presentation associations; they are not causal authority.
- Dedicated executable fixtures remain incomplete for some Phase 4C2 mutation classes.
- Domain support remains empty and aggregation safety remains unapproved.

## Production Isolation

No runtime, Home, Investigation, UI, AI, BA, playbook, DuckDB, database, feature flag, persistence, or legacy trust/readiness module changed. No key was selected, no metric was calculated, no operation was approved or executed, and no domain was activated. All production wiring flags remain false.

## Verification

Completed verification:

- Phase 5A targeted adapter and corpus replay: seven tests passed across two files.
- Canonical/upstream/legacy regression matrix: 275 passed and one known guided-investigation baseline failure across 42 files.
- `npx tsc --noEmit`: passed.
- Five Phase 5A audit JSON files parsed successfully; the debt gate contains all 42 Phase 4C2 mutation classes.
- Import isolation: zero production consumers; adapter is absent from the barrel export.
- `git diff --check`: passed.
- Full desktop suite, run exactly once at the end: 968 passed and nine known baseline failures across 127 files and 977 tests.

The nine unchanged failures are three BA comparison timeouts, one guided-investigation assertion, three numeric-health expectations, and two virtual-dataset planner expectations. Phase 5A introduced zero new failures.

## Rollback

Remove the three `canonical-runtime-*` implementation files, their two tests, the five Phase 5A JSON audits, this report, and the Phase 5A ownership paragraph. No runtime rollback is needed because no production consumer is wired.

## Stop Condition

Phase 5A stops here. Phase 5B comparison, Phase 5C authority migration, runtime wiring, join or aggregation safety, metric execution, domain SDK, questions, actions, BA narratives, AI/UI/DuckDB behavior are not started.

adapter_ready_for_controlled_shadow_comparison_with_documented_debt
