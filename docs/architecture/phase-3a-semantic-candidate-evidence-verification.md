# Phase 3A Semantic Candidate and Evidence Verification

- Date: 2026-07-10
- Phase: 3A only
- Canonical owner: `understanding-core`
- Production runtime wiring changed: no
- Contextual resolution or Phase 3B started: no

## Result

Phase 3A adds a versioned, deterministic semantic candidate and evidence foundation to `understanding-core`. It consumes the unchanged Phase 2 physical artifact and unchanged semantic registry, preserves every registry-supported candidate and conflict, and emits exactly one observation for every physical column.

The implementation does not select a winning candidate, emit a final mapping state, infer grain or relationships, activate domains, generate questions/actions/metrics, or change BA/runtime/UI/AI/DuckDB behavior. `understanding-next`, legacy detectors, semantic aliases, acceptance ground truth, and `DOMAIN_SUPPORT_MANIFEST` remain unchanged. No signal or domain is claimed as `mvp_proven`.

## Contracts Added

`semantic-candidate-contracts.ts` defines:

- `SemanticCandidateV1` and `CandidateSetV1`;
- `EvidenceV1` with evidence type, source, physical column, candidate, direction, bounded deterministic strength, explanation code, witnesses, and limitations;
- `ConflictEvidenceV1`, which preserves rather than discards contradictory evidence;
- `ColumnObservationV1` with the only Phase 3A states: `candidates_present`, `no_candidate`, `technical_candidate`, and `unsupported_input`;
- `CandidateArtifactV1` with source/hash provenance, registry version, complete column coverage, and explicit limitations;
- an explicit contextual-resolution contract marked `executed: false`.

No candidate contract contains `confirmed`, `probable`, a final ambiguity result, aggregate candidate score, or final mapping state.

## Candidate Generation

The generator uses only:

- canonical IDs, labels, aliases, header aliases, value aliases, and value patterns from `SEMANTIC_SIGNAL_REGISTRY_V1`;
- Phase 2 physical types and safe numeric/date/string summaries;
- representative value witnesses with preserved source-row indices;
- uniqueness, categorical, technical-column, parse-failure, mixed-type, structural, and sibling-header evidence.

Unicode/case/separator normalization is deterministic. Exact canonical matches remain distinguishable from exact alias and token-containment evidence. Header evidence always carries the limitation that it cannot establish a final mapping. Value evidence remains explicitly representative rather than full-file semantic truth.

The generator never uses a file name, corpus sample ID, domain pack, or expected answer as a production rule.

## Collision Verification

All 84 registry alias-collision cases pass as header-only candidate tests:

- every listed registry candidate remains present;
- no candidate is selected or discarded;
- every colliding candidate receives collision evidence;
- contextual resolution is available as a future contract but is not executed;
- no `probable` or `confirmed` output is emitted.

## Corpus Results

The 30-case corpus runner passed its Phase 3A contract checks across all groups. Holdout, adversarial, and multi-file cases remained validation-only and were not used to add rules or tune thresholds.

| Corpus group | Cases contract-passed | Cases runner-failed | Required candidates present | Required candidate gaps | Tuning use |
|---|---:|---:|---:|---:|---|
| Golden | 8 | 0 | 36 | 6 | guidance allowed |
| Holdout | 12 | 0 | 53 | 5 | validation only |
| Adversarial | 5 | 0 | 7 | 2 | validation only |
| Multi-file | 5 | 0 | 15 | 0 | validation only |
| Total | 30 | 0 | 111 | 13 | governed by provenance |

Candidate-stage gaps are intentionally reported rather than repaired with sample-specific rules:

- `Mã phiếu xuất -> receipt` and `Tổng tiền -> invoice_total`;
- `Nhóm sản phẩm -> category`;
- two `DeliveredAt -> delivery_date` cases;
- three `Biển kiểm soát -> vehicle` cases;
- two `Mã phiếu gửi -> shipment` cases;
- `Thời gian dự kiến đến -> eta`;
- `MSNV Quản lý -> employee_id`;
- `campaign -> campaign_attempts`.

These are recognition coverage gaps, not final-mapping failures. Resolving them would require registry work or contextual reasoning outside Phase 3A.

## Ambiguity And Forbidden-Mapping Boundary

The corpus contains 32 contextual ambiguity contracts. Ten currently have every expected candidate available from registry/evidence generation; 22 expose at least one contextual candidate gap. Those gaps remain visible for Phase 3B and are not manufactured from corpus truth.

One forbidden final mapping, `Số lượng -> stock_qty` in an operations case, legitimately appears as a Phase 3A candidate because the unchanged registry declares that header as a `stock_qty` alias and inventory corpus cases require the same candidate. Phase 3A retains it with registry evidence. Rejecting it requires domain/grain/context resolution and is therefore explicitly deferred.

All expected unknown business columns remain `no_candidate`. Technical columns are separated into `technical_candidate` observations and are not silently promoted to business semantics.

## Files Changed In Phase 3A

1. `apps/desktop/src/lib/understanding-core/semantic-candidate-contracts.ts`
2. `apps/desktop/src/lib/understanding-core/semantic-candidate-engine.ts`
3. `apps/desktop/src/lib/understanding-core/semantic-candidate.test.ts`
4. `apps/desktop/src/lib/understanding-core/semantic-candidate.corpus.test.ts`
5. `apps/desktop/src/lib/understanding-core/index.ts`
6. `apps/desktop/src/lib/understanding-core/OWNERSHIP.md`
7. `docs/architecture/phase-3a-semantic-candidate-evidence-verification.md`

No production consumer is wired to these exports in Phase 3A.

## Limitations

- Candidate completeness is bounded by the unchanged semantic registry and available representative evidence.
- Value patterns can support candidate generation but cannot establish full-column semantic truth.
- Token containment is lexical only; it does not perform translation, stemming, embeddings, ontology expansion, or business-context resolution.
- Conflicting physical types and structural issues are preserved but do not eliminate candidates.
- Generic headers may remain under-complete or over-complete until contextual resolution exists.
- Candidate artifacts are per source. Multi-source semantic reconciliation belongs to later phases.

## Verification

### Phase 3A Candidate And Corpus Tests

```text
npx vitest run src/lib/understanding-core/semantic-candidate.test.ts src/lib/understanding-core/semantic-candidate.corpus.test.ts --reporter=dot --maxWorkers=1
2 files passed; 11 tests passed
```

The corpus portion takes approximately 41 seconds because it reads and physically profiles the governed source files before generating candidates. The 84 synthetic header-collision cases complete in under one second.

### Phase 2 Profiler And Sampler Regression

```text
npx vitest run src/lib/understanding-core/profiler.test.ts src/lib/understanding-core/profiler.corpus.test.ts --reporter=dot --maxWorkers=1
2 files passed; 12 tests passed
```

### Phase 1 / 1B Corpus Validation

```text
npx vitest run src/lib/semantic-registry.test.ts src/lib/semantic-sampler.test.ts --reporter=dot --maxWorkers=1
2 files passed; 21 tests passed
```

### Required Sample Presence And Hash Verification

```text
npx vitest run src/lib/understanding-next/real-sample.test.ts --reporter=dot --maxWorkers=1
1 file passed; 41 tests passed
```

This run verifies legacy gaps only; `understanding-next` behavior was not changed.

### TypeScript And Diff

```text
npx tsc --noEmit --pretty false
passed

git diff --check
passed
```

### Full Desktop Suite, Final Run Only

```text
npx vitest run --reporter=dot
96 files passed; 4 files failed
844 tests passed; 9 tests failed
```

All 11 Phase 3A tests pass. The nine full-suite failures exactly match the previously recorded out-of-scope baseline:

- three numeric-health expectation failures;
- one guided-investigation question-suggestion failure;
- two virtual-dataset planner status failures;
- three BA comparison tests timing out at five seconds.

Investigation tests continue to log existing relative session-API URL warnings under Vitest but pass. No failure or warning above is introduced by or owned by Phase 3A.

## Rollback

Delete the two Phase 3A implementation/contract files, two Phase 3A test files, and this report; restore `understanding-core/index.ts` and `OWNERSHIP.md`. No runtime, database, alias, ground-truth, or support-manifest rollback is required.

## Stop Condition

Phase 3A stops after candidate/evidence generation and verification. Do not implement contextual resolution, final semantic mapping, grain, relationships, domain activation, questions, actions, metrics, BA narrative, runtime wiring, or Phase 3B in this change set.
