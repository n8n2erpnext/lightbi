# Phase 3A.2 Acceptance Truth Governance

- Date: 2026-07-11
- Scope: Phase 3A.2 only
- Canonical future owner: `understanding-core`
- Corpus version: `1.2.0`
- Production semantic behavior changed: no
- Phase 3B started: no
- Machine audit: `docs/architecture/phase-3a2-acceptance-truth-audit.json`

## Executive Result

Phase 3A.2 reviewed the six unresolved required-candidate records and all 40 candidate records represented by the 22 incomplete Phase 3A.1 ambiguity contracts. The 46-record machine audit classifies each prior expectation against the physical header, representative values, physical type, sibling headers, and atomic registry meaning.

The pass corrects acceptance truth rather than production recognition. Candidate generation and candidate-quality statistics are byte-for-byte behaviorally unchanged. Invalid expectations are no longer counted as engine recall debt, while genuine missing candidates and taxonomy questions remain explicit.

## Method

The governing question was: is the signal genuinely plausible at candidate stage from the available physical and representative evidence? The audit did not ask which candidate should win or what output would make a test pass.

Each record receives exactly one governed disposition:

| Disposition | Records |
|---|---:|
| `retain_required_candidate` | 4 |
| `retain_contextual_candidate` | 5 |
| `remove_invalid_candidate` | 27 |
| `replace_with_atomic_signal` | 1 |
| `defer_taxonomy_question` | 1 |
| `unsupported_or_out_of_scope` | 8 |

## Required Gap Disposition

- `Mã phiếu xuất -> receipt`: removed from required mappings. Registry `receipt` is a payment receipt/reference, while the source contains an outbound issue-slip identifier. The column is explicitly unknown until an atomic outbound-document signal is governed.
- `campaign -> campaign_attempts`: replaced by atomic `campaign`. A generic campaign header names the campaign dimension; numeric shape alone does not turn it into an attempts measure.
- Two `Mã phiếu gửi -> shipment` records: retained. Identifiers and origin/destination/service siblings make shipment genuinely plausible. Recognition coverage remains deferred because the evidence is holdout-only.
- `Thời gian dự kiến đến -> eta`: retained from timestamp values and arrival-time siblings; recognition coverage remains deferred.
- `MSNV Quản lý -> employee_id`: retained from identifier values and manager-name siblings; recognition coverage remains deferred because the case is adversarial.

The resulting four required gaps are the two shipment records, ETA, and employee ID. They are engine/taxonomy coverage debt, not corrected-away truth.

## Mandatory Semantic Reviews

- Generic `Status`: retains generic `status` and, where delivery values/siblings exist, contextual `delivery_status`; it no longer requires `fulfillment_status` everywhere.
- `Khách hàng`: becomes required `customer`; procurement `buyer` and company `account` are removed.
- `Đơn vị tính`: remains required `uom`; unrelated property/room `unit` is removed.
- `CHARGE`: becomes required `fee`; `cost` and `revenue` are not inferred from numeric shape.
- Sports `Event`: becomes unknown/unsupported; `status`, `error_event`, and `audit_action` are removed.
- Opaque `y`: becomes unknown; neither `status` nor `conversion` is fabricated without a codebook.
- `campaign`: uses the campaign dimension; attempts remain a separate measure.
- `Mã phiếu xuất`: payment receipt semantics are rejected; outbound-document taxonomy is deferred.
- `Mã phiếu gửi`: shipment remains plausible and required.
- `MSNV Quản lý`: employee ID remains plausible and required.
- `job`: `job_title` remains contextually plausible; broad operational `role` is removed. An occupation-specific taxonomy remains debt.
- Generic `Date`: retains `time_period`; report/effective date meanings are removed without those qualifiers.
- Rank/score fields: ordinal `Xếp hạng` is unknown because no atomic rank signal exists. Average score retains rating/quality alternatives. Timing evaluation fields retain status/on-time alternatives and remove numeric quality/rating measures.
- `MET. ID`: becomes required `row_type` from `MOTO`, `PAY`, and `PAY+`; unrelated `document_type` is removed.

## Corpus Changes

- Manifest and all 30 sample entries advance from corpus `1.1.0` to `1.2.0`.
- Recognition expectations only were corrected.
- Verified metric answers and locked digest remain unchanged.
- Physical files, sheets, and SHA-256 source hashes remain unchanged.
- All 84 collision contracts remain unchanged.
- `DOMAIN_SUPPORT_MANIFEST` remains empty.
- No support claim or `mvp_proven` claim was added.

## Metrics

| Metric | Before | After |
|---|---:|---:|
| Required candidate count | 124 | 128 |
| Required candidates present | 118 | 124 |
| Required candidate gaps | 6 | 4 |
| Required candidate recall | 95.16% | 96.88% |
| Ambiguity contracts | 32 | 22 |
| Complete ambiguity contracts | 10 | 17 |
| Missing ambiguity candidates | 41 | 10 |
| Removed invalid ambiguity candidates | 0 | 27 |
| Unknown/no-candidate expectations | 1 | 5 |
| Deferred taxonomy records | 0 | 19 |

These numbers must not be described as engine improvement. Engine output did not change. The delta combines acceptance-truth correction, four new atomic required mappings, and explicit unknown/taxonomy debt.

Candidate quality remains the Phase 3A.1 baseline: 752 physical-column occurrences, 106 with zero candidates, 242 with one, 404 with multiple, average 1.6263, median 2, maximum 5, and 18 broad occurrences.

## Taxonomy Debt

Seven distinct debt families remain machine-readable in the audit:

- outbound issue/document identifier;
- shipment header coverage;
- ETA multilingual/header coverage;
- employee-ID multilingual/header coverage;
- campaign dimension versus attempts measure;
- occupation versus job-title semantics;
- score/rank and timing-status contextual resolution.

`Xếp hạng` currently receives unrelated value-pattern candidates from the unchanged engine even though the corrected corpus marks it unknown. This is a newly explicit production-engine defect. Per Phase 3A.2 boundaries it is recorded and not fixed here.

## Holdout Integrity

Holdout, adversarial, and multi-file headers were inspected during Phase 3A, Phase 3A.1, and this governance pass. They are no longer pristine unseen evaluation evidence. They remain tuning-forbidden, but cannot independently support promotion to `mvp_proven`.

The roadmap now requires newly provisioned, genuinely unseen holdout sources before any MVP recognition claim can be promoted. No synthetic replacement holdouts were created in this phase.

## Unchanged Production Behavior

`semantic-registry.ts` and `semantic-candidate-engine.ts` were not edited. Governance tests lock their Phase 3A.1 SHA-256 digests. No alias, tokenization, threshold, value pattern, source rule, scoring, ranking, winner selection, final state, grain, relationship, domain, question, action, metric, BA, runtime, AI, UI, or DuckDB behavior changed.

## Limitations

- Four valid required candidates remain unrecognized.
- Ten valid ambiguity candidates remain absent from current engine output.
- Some corrected unknown fields still receive false value-pattern candidates; these are deferred production defects.
- Existing inspected holdouts cannot provide fresh generalization evidence.
- Candidate-stage truth does not authorize final mappings or product support.

## Tests

### Phase 3A / 3A.1 / 3A.2

```text
npx vitest run src/lib/understanding-core/semantic-candidate.governance.test.ts src/lib/understanding-core/semantic-candidate.corpus.test.ts src/lib/understanding-core/semantic-candidate.test.ts src/lib/semantic-registry.test.ts --reporter=dot --maxWorkers=1
4 files passed; 37 tests passed
```

### Phase 2 profiler and sampler

```text
npx vitest run src/lib/understanding-core/profiler.test.ts src/lib/understanding-core/profiler.corpus.test.ts --reporter=dot --maxWorkers=1
2 files passed; 12 tests passed
```

### Phase 1 / 1B corpus, collision, sample, and hash verification

```text
npx vitest run src/lib/semantic-registry.test.ts src/lib/semantic-sampler.test.ts src/lib/understanding-next/real-sample.test.ts --reporter=dot --maxWorkers=1
3 files passed; 62 tests passed
```

### Legacy detector

```text
npx vitest run src/lib/business-signal-detector.test.ts --reporter=dot --maxWorkers=1
1 file passed; 24 tests passed
```

### Static verification

```text
npx tsc --noEmit
passed

git diff --check
passed
```

### Full desktop suite

The final full desktop suite was run exactly once on the completed repository state:

```text
npx vitest run --reporter=dot
97 files passed; 4 files failed
853 tests passed; 9 tests failed
```

The nine failures exactly match the documented out-of-scope baseline: three BA comparison timeouts, one guided-investigation question-suggestion failure, three numeric-health failures, and two virtual-dataset planner failures. There are zero new Phase 3A.2 failures. The Phase 3A.1 category regression did not reappear. Existing Investigation relative session-API URL warnings remain present in the test environment but do not fail those tests.

## Files Changed

1. `sample-corpus/manifest.json`
2. all six `sample-corpus/ground-truth/*.json` recognition contracts and corpus metadata
3. `apps/desktop/src/lib/understanding-core/semantic-candidate.corpus.test.ts`
4. `apps/desktop/src/lib/understanding-core/semantic-candidate.governance.test.ts`
5. `docs/architecture/phase-3a2-acceptance-truth-audit.json`
6. `docs/architecture/phase-3a2-acceptance-truth-governance.md`

## Rollback

Restore corpus version `1.1.0`, the six ground-truth files, manifest, and the Phase 3A corpus-test assertion; delete the Phase 3A.2 governance test, JSON audit, and this report. No production semantic, runtime, database, or support-manifest rollback is required.

## Stop Condition

Phase 3A.2 stops after acceptance-truth governance and final baseline verification. Do not begin contextual scoring/resolution, final mapping, grain, relationships, domain activation, questions, actions, metrics, BA output, runtime wiring, or Phase 3B.
