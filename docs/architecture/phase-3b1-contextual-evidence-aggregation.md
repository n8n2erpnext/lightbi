# Phase 3B1 Contextual Evidence Aggregation

- Date: 2026-07-11
- Scope: Phase 3B1 only
- Canonical owner: `understanding-core`
- Policy: `lightbi.contextual-evidence-policy.v1`
- Deterministic policy hash: `fnv1a32:721c8d58`
- Production/runtime wiring changed: no
- Resolution executed: false

## Objective And Scope

Phase 3B1 converts each existing Phase 3A candidate's raw evidence into a deterministic family-level evidence profile. It preserves all candidates, conflicts, observation states, source provenance, limitations, and candidate-absence debt. It does not select, rank, reject, confirm, or finalize a candidate and does not emit an aggregate semantic confidence score.

## Contracts

The phase adds `ContextualEvidenceArtifactV1`, `CandidateEvidenceProfileV1`, `EvidenceFamilyAssessmentV1`, `EvidenceProvenanceSummaryV1`, `EvidenceConflictSummaryV1`, `AggregationPolicyV1`, and `AggregationLimitationV1`.

Every artifact records source identity/hash, physical and candidate artifact versions, registry version, aggregation policy version/hash, complete column/profile coverage, explicit candidate-absence debt, limitations, and `resolution.executed: false`.

## Evidence Families

- `lexical_identity`: canonical ID, labels, aliases, header aliases, containment, and explicit collisions.
- `physical_compatibility`: physical-type compatibility/conflict and numeric/date/string shape.
- `value_semantics`: representative value aliases and patterns, always retaining representative-only limitations.
- `cardinality_role`: identifier, categorical, and status shape directly supplied by physical facts.
- `sibling_context`: local sibling-header evidence only, with no domain/grain inference.
- `structural_integrity`: technical, parse, mixed-type, unsupported, and structural evidence/limitations.

Family assessments are limited to `supports`, `conflicts`, `mixed`, `neutral`, and `unavailable`. Magnitude is bounded within one family and never summed across families.

## Independence And Deduplication

The versioned policy requires canonical-content deduplication excluding unstable evidence IDs. Repeated witnesses from one rule contribute once; exact and containment lexical matches remain one independent lexical family; repeated value matches do not create new independent families; representative evidence never becomes full-file truth; missing evidence is unavailable rather than conflict; absence of conflict is not support. Candidate order is inherited unchanged from Phase 3A.

An injected duplicate evidence record was removed without changing canonical artifact output. Shuffling evidence order also produced byte-identical canonical JSON. Policy mutation changes the policy hash.

## Preservation And Collision Proof

Across all 30 governed cases, Phase 3B1 emitted exactly one aggregation observation per Phase 3A physical observation and exactly one profile per existing candidate. All 84 header-only collision contracts retained every Phase 3A candidate, explicit lexical collision evidence, and `resolution.executed: false`. No candidate was manufactured or discarded.

Source ID, source hash, profile version, column count, column index, and physical name mismatches fail closed with explicit artifact-mismatch errors.

## Corpus Diagnostics

These are evidence-profile diagnostics, not semantic accuracy:

- physical-column observations: 752;
- candidate profiles: 1,223;
- zero/one/multi-candidate columns: 106 / 242 / 404;
- profiles with one support family: 85;
- profiles with two or more support families: 1,138;
- profiles with unresolved conflict: 179;
- profiles relying only on representative evidence: 0;
- broad candidate occurrences: 18;
- candidate-absence debt: 14, comprising four valid required gaps and ten missing ambiguity candidates;
- artifact mismatch failures in governed corpus: 0;
- duplicate evidence records removed in determinism probe: 1.

| Family | Supports | Conflicts | Mixed | Neutral | Unavailable |
|---|---:|---:|---:|---:|---:|
| lexical identity | 954 | 0 | 0 | 237 | 32 |
| physical compatibility | 1,078 | 133 | 12 | 0 | 0 |
| value semantics | 352 | 0 | 0 | 0 | 871 |
| cardinality role | 194 | 0 | 0 | 574 | 455 |
| sibling context | 0 | 0 | 0 | 769 | 454 |
| structural integrity | 0 | 41 | 0 | 0 | 1,182 |

The 18 broad occurrences remain the Phase 3A.1 set: 15 `UnitCost`, two `Sub-Category`, and one `Country Name`. Their candidates are all retained and exposed by family; Phase 3B1 does not compare or choose among them.

## Mandatory Probes

Governed corpus and collision tests cover generic Status, Khách hàng, Đơn vị tính, CHARGE, opaque y, campaign, sports Event, Xếp hạng, timing evaluation, UnitCost, Sub-Category, Country Name, Mã phiếu xuất, Mã phiếu gửi, ETA, and MSNV Quản lý. Probes assert evidence/profile preservation only.

## Candidate-Absence Debt

No absent candidate is manufactured. The artifact accepts explicit source-local debt metadata, and the corpus runner proves the final Phase 3A.2 baseline of four required gaps plus ten contextual gaps. Debt is metadata for later governance, not negative evidence.

## Limitations

- Family assessments describe evidence availability and direction, not semantic correctness.
- Sibling evidence is neutral local context in this phase.
- Representative value evidence is never promoted to full-file semantic truth.
- Candidate absence remains unresolved.
- No fresh holdout support claim is made.

## Production Wiring

No runtime consumer is wired to Phase 3B1. Registry, Phase 3A candidate generation, corpus 1.2.0, physical files/hashes, verified metrics, domain manifest, legacy/Next, UI, AI, DuckDB, and BA behavior are unchanged.

## Tests

### Phase 3B1

```text
npx vitest run src/lib/understanding-core/contextual-evidence.test.ts src/lib/understanding-core/contextual-evidence.corpus.test.ts --reporter=dot --maxWorkers=1
2 files passed; 7 tests passed
```

### Phase 3A / 3A.1 / 3A.2

```text
4 files passed; 37 tests passed
```

### Phase 2

```text
2 files passed; 12 tests passed
```

### Phase 1 / 1B and required samples/hashes

```text
3 files passed; 62 tests passed
```

### Legacy detector and static checks

```text
legacy business-signal detector: 24 tests passed
npx tsc --noEmit: passed
git diff --check: passed
```

### Full desktop suite

Run exactly once at the end on the final state:

```text
npx vitest run --reporter=dot
99 files passed; 4 files failed
860 tests passed; 9 tests failed
```

The nine failures exactly match the documented out-of-scope baseline: three BA comparison timeouts, one guided-investigation question-suggestion failure, three numeric-health failures, and two virtual-dataset planner failures. No failure is owned by Phase 3B1. Existing Investigation relative session-API URL warnings remain non-failing test-environment noise.

## Files Changed

1. `contextual-evidence-contracts.ts`
2. `contextual-evidence-policy.ts`
3. `contextual-evidence-aggregator.ts`
4. `contextual-evidence.test.ts`
5. `contextual-evidence.corpus.test.ts`
6. `understanding-core/index.ts`
7. `understanding-core/OWNERSHIP.md`
8. `docs/architecture/phase-3b1-contextual-evidence-aggregation.md`

## Rollback

Delete the three contextual-evidence implementation files and two tests, remove their exports and ownership rows, and delete this report. No runtime, database, registry, corpus, or support-manifest rollback is required.

## Stop Condition

Phase 3B1 stops after deterministic evidence aggregation and verification. Do not implement selection, ranking, final mapping, confirmed/probable/ambiguous/unknown/rejected states, grain, relationships, domain activation, questions, actions, metrics, BA output, runtime wiring, AI/UI/DuckDB behavior, or Phase 3B2.
