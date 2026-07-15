# Phase 4A2A Compositional Grain Shadow Resolution

## Objective and scope

Phase 4A2A adds deterministic source-local grain resolution in canonical shadow/test mode. It consumes unchanged Phase 2 physical facts, frozen Phase 3 semantic resolution, and the Phase 4A1.1 grain candidate artifact. It does not alter runtime behavior or produce relationships, joins, domains, metrics, questions, actions, or BA output.

## Axis orthogonality audit

The Phase 4A1.1 candidate taxonomy mixes orthogonal characteristics. `entity_record`, `document_record`, `line_record`, `mapping_record`, `aggregate_record`, and `mixed_structure` primarily describe structural form. `event_record`, `snapshot_record`, and `interval_record` primarily describe temporal mode. `unknown` is a fallback. Therefore line plus event, entity plus snapshot, and aggregate plus reporting period are valid compositions rather than winner-takes-all competitions. The full compatibility matrix is in `phase-4a2a-grain-axis-taxonomy-audit.json`.

## Contracts and policy

- Artifact: `lightbi.grain-resolution-shadow.v1`
- Policy: `lightbi.grain-resolution-policy.v1`
- Canonical policy SHA-256: `219e8b7e78261bcbc9ff4714cf93ec62f709c54670ad7e8bf8a3edbfef01d3ef`
- Upstream grain policy: `lightbi.grain-candidate-policy.v2`, unchanged
- Frozen semantic policy: `lightbi.semantic-resolution-policy.v2`, unchanged

Each structural, identity, parent, temporal, and aggregation axis has its own `confirmed`, `probable`, `ambiguous`, `unknown`, or `unsupported_input` state. Each axis records governing rules, support and conflict references, evidence provenance, evidence independence, semantic dependencies, candidate debt, limitations, and unresolved alternatives.

## Rule lattice and evidence independence

Resolution uses explicit rules and no weighted score. Candidate count, absence of conflict, and duplicate evidence do not raise certainty. Evidence with the same physical family, columns, and provenance is marked correlated. Same-axis dominance is partial only; the resolver never ranks structural and temporal candidates against one another. Source identity, source hash, candidate artifact version/hash, and semantic policy version/hash fail closed.

## Identity, parent, and temporal resolution

Confirmed identity requires exact mechanically clean and resolved-semantic evidence. Unresolved physical identity is capped at probable and cannot establish a business role. Incomparable keys remain ambiguous. Parent resolution requires repetition plus a more granular identity and child variation. Event requires resolved event-time behavior; snapshot requires identity-period behavior; interval requires start/end evidence; unresolved physical dates remain unresolved.

## Aggregation and measure safety

The resolver records atomic-looking rows, repeated-parent values, pre-aggregated rows, snapshot values, mixed aggregation, or unresolved aggregation. Every measure observation remains `safeToAggregate: false`. Rates, prices, balances, percentages, averages, and unresolved numerics are not promoted to additive metrics.

## Candidate and debt preservation

All input candidates receive a trace in original order. Supporting/conflicting evidence, semantic dependencies, all 14 upstream candidate-debt records, and structural limitations remain visible. No semantic candidate or grain candidate is created or removed. Canonical signature evidence lists are order-normalized, while candidate trace order proves input preservation.

## Shadow expectation governance

`sample-corpus/grain-resolution-shadow-expectations.v1.json` is separate from recognition truth, Phase 3 expectations, and Phase 4A1 candidate expectations. It governs all 30 cases per axis and permits conservative unknown/ambiguous outcomes. Only golden cases are tuning-eligible. Holdout, adversarial, and multi-file cases are validation-only and cannot support `mvp_proven`.

## Synthetic probes

The targeted suite covers all 25 required conditions: unique entity; unresolved physical identity; document rows; parent/composite line; event; snapshot; interval; reporting aggregate; mapping; mixed structure; no key; technical index; monetary uniqueness; timestamp uniqueness; sparse mixed code; ambiguous semantics; competing keys; repeated parent total; non-additive rates; related debt; unrelated debt; duplicate evidence; candidate shuffle; row shuffle; and structural-temporal composition.

## Corpus diagnostics

The audit evaluated 30 governed cases and 37 physical source occurrences covering 199,694 full-file rows, 752 semantic resolutions, 1,223 upstream semantic traces, and 14 unique debt records.

| Axis | Confirmed | Probable | Ambiguous | Unknown |
|---|---:|---:|---:|---:|
| Structural form | 0 | 12 | 1 | 24 |
| Identity basis | 0 | 9 | 0 | 28 |
| Parent basis | 0 | 8 | 0 | 29 |
| Temporal mode | 0 | 12 | 0 | 25 |
| Aggregation form | 0 | 9 | 0 | 28 |

There are 21 fully unresolved, 8 partially resolved, and 8 resolved-with-limitations signatures. Eight sources expose both structural and temporal information compositionally. Distribution is 8 golden, 12 holdout, 5 adversarial, and 12 multi-file source occurrences. These are shadow diagnostics, not a claim of real-world grain accuracy.

## Multi-domain extension boundary

A future domain pack may specialize a universal signature such as line plus event, entity plus snapshot, or document plus interval. It may add domain meaning, but cannot replace the core signature, set confirmation directly, weaken evidence, override uncertainty, inject filename/sample rules, or modify another domain. No SDK behavior is implemented here.

## Limitations

- The resolver is deliberately conservative; no corpus axis reached confirmed under current independent evidence.
- Corpus grain truth is audited but non-infallible and is not consumed by production rules.
- Relationship form, cross-source reconciliation, join safety, domain activation, and metric additivity remain unresolved.
- Unsupported-input state exists in the contract, but Phase 4A1.1 accepted sources generally retain unknown with explicit limitations.
- Full-file processing of all 37 occurrences takes about 51 seconds in the current environment.

## Production isolation

`productionWiring.executed` and `crossSourceRelationships.executed` remain false for every artifact. `DOMAIN_SUPPORT_MANIFEST` remains empty. No Home, Investigation, runtime, AI, UI, playbook, execution, or DuckDB module changed.

## Verification

- Phase 4A2A synthetic and corpus: 2 files, 15 tests passed.
- Phase 4A1/4A1.1: 4 files, 30 tests passed.
- Phase 3B2/B1/A selected regressions: 9 files, 46 tests passed.
- Phase 2 profiler/sampler: 2 files, 12 tests passed.
- Phase 1/1B and legacy selection: 8 files, 117 tests passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed before the final suite.
- Full desktop suite, run exactly once at the end: 109 files passed, 4 baseline files failed; 924 tests passed and the same 9 documented baseline tests failed.
- Baseline failures: 3 BA comparison timeouts, 1 guided investigation assertion, 3 numeric health assertions, and 2 virtual dataset planner assertions.
- Phase 4A2A-owned failures: 0.

## Rollback

Remove the three `grain-resolution-*` modules and tests, remove their exports and ownership rows, and remove the Phase 4A2A expectation/audit/report files. No production migration or data rollback is required because no consumer is wired.

## Stop condition

Phase 4A2A stops after compositional source-local shadow resolution and verification. Phase 4A2B, cross-source relationships, join safety, domains, SDK implementation, metrics, questions, actions, BA output, runtime wiring, AI/UI/DuckDB behavior, and Phase 4B have not begun.
