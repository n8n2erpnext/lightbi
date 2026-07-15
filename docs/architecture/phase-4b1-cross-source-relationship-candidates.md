# Phase 4B1 Cross-Source Relationship Candidates

## Objective and scope

Phase 4B1 adds deterministic, versioned, domain-neutral relationship candidates and evidence inside a caller-declared source bundle. It emits alternatives only. It does not resolve a relationship, select a key, approve cardinality, authorize an operation, calculate cross-source metrics, or wire runtime behavior.

## Contracts and policy

- Artifact: `lightbi.relationship-candidate-artifact.v1`
- Policy: `lightbi.relationship-candidate-policy.v1`
- Policy SHA-256: `6a615bac8756de8e2a3213a041943845726e71f2c8963956bdfe56bd074d5359`
- Maximum composite width: 3
- Maximum cross-source combinations per pair: 64
- Maximum privacy-safe witness hashes per key pair: 5

Phase 2 physical artifacts, semantic policy v2, grain candidate policy v2, and grain resolution policy v1 remain unchanged.

## Bundle boundary

The API requires `lightbi.source-bundle-input.v1` with at least two unique source members. Only members declared by the caller are compared. Member identity/hash/version mismatches and duplicate membership fail closed. Canonical source order and pair IDs are independent of caller member order. No global source discovery exists.

## Relationship and operation separation

Relationship classes and operation alternatives are separate contracts. Identity equivalence may expose join/reconcile candidates; schema continuation may expose append/compare candidates; unrelated evidence exposes no-supported/unresolved operations. Every candidate has `selected: false`. An operation candidate is not permission or safety.

## Endpoint and key-pair model

Universal endpoints retain physical index/type, semantic resolution and traces, source-local grain axes, identity state, key provenance, null/uniqueness facts, limitations, and debt. Candidate pools use governed row identity, parent identity, or semantic identifier roles. Technical columns and measure/time/free-text overlap cannot create key candidates by overlap alone.

Single and composite pairs are matched by compatible semantic primitives or limited unresolved physical identity evidence. Composite component order is canonical and bounded. Duplicate derivations of the same endpoint column set are removed before pairing; upstream evidence remains available.

## Full-file overlap and privacy

Overlap evidence is computed from aligned full-file rows. It records distinct/matched/unmatched/null/duplicate counts, directional overlap, matched rows, maximum frequency, fanout, and coverage. Canonical artifacts never retain unbounded raw identifier values. Witnesses are at most five deterministic 16-character SHA-256 prefixes.

## Cardinality and duplication risk

Cardinality remains an alternatives list: one-to-one, one-to-many, many-to-one, many-to-many, partial reference, or unknown. Duplicate keys, null loss, unmatched references, many-to-many fanout, schema drift, mixed grain, and unknown risk remain explicit. `safetyInferred` is always false.

## Schema continuation

Schema compatibility is independent of column order. The artifact records exact and semantic rename-compatible columns, missing/additional columns, type/semantic/grain/measure conflicts, and structural limitations. Schema continuation needs broad physical/semantic/grain compatibility and cannot approve append safety.

## Temporal and grain evidence

Temporal ranges come only from full-file physical date profiles, never filenames. Alternatives include overlap/event-window, sequential/disjoint, snapshot sequence, unresolved, or no temporal basis. Grain signatures are compared axis by axis; one compatible axis cannot prove another.

## Evidence independence

Ten evidence families are governed without weighted scoring. Semantic, physical, key, overlap, cardinality, grain, schema, temporal, structural, and duplication evidence stay separate. Correlated evidence references remain visible; repeated witnesses and candidate counts are not additional support.

## Corpus governance and diagnostics

The separate expectation layer evaluates only the five caller-declared multi-file bundles in corpus 1.2.0. All are validation-only and tuned zero production rules.

- Bundles: 5
- Source occurrences: 12
- Pair occurrences: 9
- Relationship candidates: 4 unrelated, 4 identity-equivalence, 3 schema-continuation
- Key-pair alternatives: 10, including 2 composites
- Cardinality alternatives: 6 many-to-many, 2 one-to-one, 2 partial-reference
- Operation alternatives: 4 no-supported, 5 unresolved, 3 join, 3 reconcile, 3 append, 4 compare
- Dominant risks: schema drift, duplicate keys, many-to-many fanout, unmatched references

One validation-only governance gap remains: the logistics adjacent-period pair retains a join candidate because canonical temporal facts are insufficient to prove the period-partition refusal. It was not used to tune policy, and no join is selected or approved. This is documented evidence debt for Phase 4B2 or upstream temporal coverage.

These are relationship-candidate diagnostics, not relationship accuracy metrics.

## Synthetic coverage

The targeted suite governs all 35 required probes, including schema continuation, overlap windows, fact/dimension and parent/detail alternatives, one-to-one/composite/mapping/aggregate/snapshot cases, fanout/null/low-overlap and false-key negatives, schema/grain/measure conflicts, bundle boundary, ordering, duplication, bounded search, and privacy-safe output.

## Multi-domain extension boundary

Future domain packs may contribute relation templates, specialized identity roles, constraints, prohibitions, and their own corpus. They may not approve relationships/cardinality/keys, weaken risks/privacy, execute operations, use filenames/samples, or modify another domain. No SDK behavior is implemented.

## Limitations

- Candidate generation does not establish real-world correctness or operation safety.
- Unresolved semantic identity may yield only limited candidates.
- Temporal refusal can remain unresolved when canonical date semantics are absent.
- Full-file overlap can be expensive on very large bundles; search remains bounded per pair.
- Source IDs are retained as declared identities, while raw key values are not retained.

## Production isolation

`finalRelationshipResolution.executed`, `joinSafety.executed`, and `productionWiring.executed` are false. No join, append, union, comparison, reconciliation, metric, domain, question, BA, UI, AI, runtime, or DuckDB behavior changed. `DOMAIN_SUPPORT_MANIFEST` remains empty.

## Tests

- Phase 4B1 synthetic and corpus: 2 files, 9 tests passed; the suite governs 35 named probes and all 5 bundles/9 pairs.
- Phase 4A1 through Phase 4A2B: 8 files, 47 tests passed.
- Phase 3 and Phase 2 selected regressions: 11 files, 58 tests passed.
- Phase 1/1B and legacy detector selection: 8 files, 117 tests passed.
- `npx tsc --noEmit`: passed.
- `git diff --check`: passed before the final suite.
- Full desktop suite, run exactly once at the end: 113 files passed, 4 baseline files failed; 935 tests passed and the same 9 documented baseline tests failed.
- Baseline failures: 3 BA comparison timeouts, 1 guided-investigation assertion, 3 numeric-health assertions, and 2 virtual-dataset-planner assertions.
- Phase 4B1-owned failures: 0.

## Rollback

Remove the three `relationship-candidate-*` modules/tests, their exports and ownership rows, the relationship expectation layer, two machine audits, and this report. No runtime or data rollback is required because the layer is unwired and performs no operation.

## Stop condition

Phase 4B1 stops after candidate/evidence generation and verification. Final relationship resolution, join safety, operation approval, domain activation, SDK implementation, metrics, questions, actions, BA output, runtime wiring, AI/UI/DuckDB behavior, and Phase 4B2 have not begun.
