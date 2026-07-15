# Phase 3B1.1 Context Discriminativeness And Policy Hash Hardening

- Date: 2026-07-11
- Scope: Phase 3B1.1 only
- Canonical owner: `understanding-core`
- Aggregation policy: `lightbi.contextual-evidence-policy.v2`
- SHA-256 policy hash: `5abf964930277f0005bb877a80106d404acc601400753d25c933cec59380aa7a`
- Resolution executed: false
- Machine audit: `docs/architecture/phase-3b1-1-context-evidence-flow-audit.json`

## Executive Result

The zero-support Phase 3B1 sibling result was not an aggregation flattening defect. Phase 3A creates candidate-specific `sibling_header_context` evidence only for same-semantic-family sibling headers and deliberately marks every record `neutral`. Phase 3B1 preserved that direction exactly. What was missing was a governed candidate-relative relation policy.

Phase 3B1.1 adds five generic relation classes and candidate-relative relation evidence without adding, removing, sorting, comparing, or finalizing candidates. Ordinary co-occurrence remains neutral. Context support is emitted only when both columns already have Phase 3A candidates and a declared atomic relation is mechanically satisfied.

## Evidence Flow

Phase 2 supplies full-file headers, types, parse/cardinality facts and structural limitations without semantic direction. Phase 3A uses those headers to create neutral sibling evidence with normalized header witnesses and `source_profile` provenance. Phase 3B1 maps it to the sibling family without changing direction. Phase 3B1.1 supplements that preserved evidence with separately versioned `ContextRelationEvidenceV1` records.

No information was lost in the previous aggregator. The machine audit records every stage, source, direction, witness/provenance boundary and limitation.

## Contracts And Generic Relations

New versioned contracts cover `SemanticContextRelationV1`, `ContextRelationTypeV1`, `ContextRelationEvidenceV1`, and `ContextRelationPolicyV1`.

Allowed relation classes:

- identifier and corresponding label/dimension within the same atomic semantic family;
- quantity and unit of measure;
- monetary amount and currency;
- status and timestamp only when candidate IDs share a meaningful atomic token;
- explicit origin and destination candidates.

Each relation declares directionality, support/conflict eligibility, required evidence, forbidden inference, explanation code and provenance limitations. One relation class contributes at most one independent sibling-family contribution per candidate. Repeated related siblings are deterministically bounded.

No conflict was emitted because no governed source supplied a declared generic incompatibility strong enough to justify candidate-relative sibling conflict. Missing siblings and absence of conflict remain non-evidence.

## Context Diagnostics

| Assessment | Phase 3B1 | Phase 3B1.1 |
|---|---:|---:|
| Supports | 0 | 374 |
| Conflicts | 0 | 0 |
| Mixed | 0 | 0 |
| Neutral | 769 | 505 |
| Unavailable | 454 | 344 |

- context-only support profiles: 0;
- context plus lexical support: 280;
- context plus physical support: 351;
- unresolved context conflicts: 0;
- duplicate relation evidence removed: 0;
- broad candidate occurrences: 18;
- candidate-absence debt: 14.

Relation distribution is 282 identifier-label, 73 quantity-UOM, 16 status-timestamp and three origin-destination records. Amount-currency remains zero because no profile pair met the declared relation. These counts describe evidence structure, not semantic accuracy.

The 18 broad occurrences remain 15 `UnitCost`, two `Sub-Category` and one `Country Name`. Their sibling profiles are visible but no candidate is selected.

## Mandatory Probes

The governed corpus runner covers generic Status, delivery Status/timestamps, Khách hàng, quantity/UOM, CHARGE, opaque y, campaign, sports Event, Xếp hạng, UnitCost, Sub-Category, Country Name, Mã phiếu xuất, Mã phiếu gửi with local routing/service siblings, ETA, MSNV Quản lý and all 84 alias collisions. Assertions concern evidence direction and preservation only.

Opaque or unsupported columns do not gain candidates. Candidate absence cannot produce context support. Validation-only corpus groups remain forbidden for tuning.

## Policy Hash Decision

The old `fnv1a32:721c8d58` identifier was suitable only as a non-security diagnostic fingerprint. Phase 3B1.1 explicitly retains FNV-1a as `aggregationPolicyFingerprint` and upgrades compatibility/integrity identity to SHA-256 over canonical policy plus relation-policy JSON.

The policy contract advances from v1 to v2. Tests prove SHA-256 stability across object-key order, change on semantic mutation, absence of timestamps/environment values, and deterministic output. Artifact compatibility is therefore not silently changed.

## Preservation Proof

- every Phase 3A candidate remains exactly once and in original order;
- no candidate was generated or removed;
- all 84 collision cases remain unresolved;
- candidate-absence debt remains 14;
- source/hash/profile/column/registry mismatches fail closed;
- `resolution.executed` remains false;
- no winner, rank, final mapping, aggregate confidence, probable, confirmed or rejected field exists;
- corpus 1.2.0, sources, hashes, verified metrics and `DOMAIN_SUPPORT_MANIFEST` are unchanged.

## Limitations

- Relation support establishes contextual compatibility, not correctness.
- Candidate metadata is still bounded by Phase 3A registry coverage.
- No defensible sibling conflict policy was activated from current evidence.
- Parent-reference relations remain unavailable without canonical parent/entity metadata.
- No fresh unseen holdout claim is made.

## Tests

Verification completed on 2026-07-11:

- targeted Phase 3B1/3B1.1: eight tests passed across two files;
- Phase 3A/A1/A2 regression: 37 tests passed across four files;
- Phase 2 profiler/sampler regression: 12 tests passed across two files;
- Phase 1/1B corpus validation and required sample/hash checks: 62 tests passed across three files;
- legacy business-detector regression: 24 tests passed;
- `npx tsc --noEmit`: passed;
- `git diff --check`: passed before the final desktop-suite run;
- full desktop suite, run exactly once at the end: 861 passed and nine failed across 103 files (99 passed, four failed).

The nine full-suite failures are the previously recorded baseline: three BA comparison timeouts, one guided-investigation failure, three numeric-health failures and two virtual-planner failures. No Phase 3B1.1 test failed and no new failure class appeared. Existing Investigation relative-URL warnings remain outside this phase.

Exact assertions cover candidate preservation, collision preservation, mandatory-column presence, relation direction, policy hash identity and fail-closed provenance. Diagnostic counts are corpus observations rather than accuracy claims.

## Rollback

Restore contextual evidence policy v1, remove relation contracts/evidence generation and SHA-256 compatibility identity, restore Phase 3B1 tests/report references, and delete the Phase 3B1.1 audit/report. No runtime, database, corpus or semantic-registry rollback is required.

## Stop Condition

Phase 3B1.1 stops after context discriminativeness and policy-hash verification. Do not implement semantic resolution, comparison, ranking, winner selection, final mappings, grain, relationships, domain activation, metrics, questions, actions, BA output, runtime wiring, AI/UI/DuckDB behavior or Phase 3B2.
