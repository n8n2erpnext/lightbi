# Phase 3A.1 Candidate Coverage Reconciliation

- Date: 2026-07-10
- Phase: 3A.1 only
- Canonical owner: `understanding-core`
- Production runtime wiring changed: no
- Contextual resolution or Phase 3B started: no
- Machine-readable audit: `docs/architecture/phase-3a1-candidate-gap-audit.json`

## Result

Phase 3A.1 audited all 13 required-candidate gaps and every missing candidate in the 22 incomplete contextual-ambiguity contracts. The machine-readable table contains 35 source-column records and 53 candidate-specific dispositions: 13 required candidates plus 40 missing ambiguity candidates from the Phase 3A baseline.

Seven required gaps were corrected by one deterministic containment fix and four concept-level registry corrections. Required-candidate coverage increased from 111/124 (89.52%) to 118/124 (95.16%). Six required candidates remain unresolved because they are validation-only evidence, require contextual interpretation, or expose a registry/acceptance taxonomy question.

No sample ID, file name, sheet name, source-system name, domain inference, expected answer, or final mapping state was added to production logic. `DOMAIN_SUPPORT_MANIFEST` remains empty.

## Engine Correction

`tokenContainmentMatch` previously discarded alias tokens shorter than three characters. For a two-word Vietnamese surface such as `tiền tệ`, only `tiền` remained, so a header such as `Tổng tiền` generated false candidates including currency, progress, and withdrawal. Similar partial matches inflated time, quantity, and identifier candidate sets.

Containment now requires every normalized surface token to occur in the header. This is deterministic, language-neutral, and independent of corpus identity. It does not stem, translate, score, rank, or resolve candidates.

## Registry Corrections

Only tuning-eligible golden evidence plus generally valid concept/language conventions were used to change canonical registry surfaces. The additions are confined to `headerAliases`; each signal's legacy `aliases` remain unchanged. This lets `understanding-core` recognize the physical headers while preserving the existing `SEMANTIC_TAXONOMY_V1` runtime behavior:

| Signal | Generic additions | Reason |
|---|---|---|
| `invoice_total` | total amount, gross amount, tổng tiền | Transaction total is an atomic monetary field. |
| `category` | product category/group, item group, nhóm sản phẩm | Product grouping is an atomic item-category field. |
| `delivery_date` | delivered at, delivery timestamp | Common timestamp headers for completed delivery time. |
| `vehicle` | license plate, registration number, biển số xe, biển kiểm soát | Vehicle registration identifies a vehicle dimension. |

Holdout and adversarial gaps such as `Mã phiếu gửi`, `MSNV`, `campaign`, `job`, and opaque `y` did not produce aliases or thresholds.

## Gap Disposition

### Corrected Required Candidates

- `Tổng tiền -> invoice_total`;
- `Nhóm sản phẩm -> category`;
- two `DeliveredAt -> delivery_date` expectations;
- three `Biển kiểm soát -> vehicle` expectations, with the production correction justified by the golden TTKT source and the holdout files used only for validation.

### Unresolved Required Candidates

- `Mã phiếu xuất -> receipt`: the source is an issue/POS document, while registry `receipt` means a payment receipt/reference. This requires atomic taxonomy or ground-truth review.
- two `Mã phiếu gửi -> shipment` expectations: plausible generic consignment semantics, but the evidence is holdout-only and was not used for tuning.
- `Thời gian dự kiến đến -> eta`: plausible alias omission, but the evidence is holdout-only.
- `MSNV Quản lý -> employee_id`: plausible multilingual employee-ID omission, but the evidence is adversarial-only.
- `campaign -> campaign_attempts`: numeric values are attempts in that source, but generic `campaign` alone denotes the campaign dimension; resolving this requires value/source context or truth review.

### Ambiguity Contracts

The 22 incomplete contracts remain incomplete. Ten of 32 total ambiguity contracts are complete before and after reconciliation. The detailed missing-candidate count changes from 40 to 41 because defective partial-token containment had falsely generated `kpi` for a score-average header; removing that false positive improves candidate precision even though naive ambiguity recall decreases by one.

High-impact truth-review findings include:

- generic `Status` should not header-force every domain-specific status;
- `Khách hàng` does not imply procurement `buyer` or company `account`;
- `Đơn vị tính` is UOM, while registry `unit` is a room/space/property identifier;
- `CHARGE` lexically supports fee, not automatically cost and revenue;
- sports `Event` is not automatically status, error event, and audit action;
- opaque `y` needs a source contract before it can mean conversion.

No acceptance truth was changed in Phase 3A.1. The audit marks entries where a later governed truth review is justified, rather than editing validation contracts to make the engine pass.

## Collision Safety

Normalized collision inventory was regenerated mechanically from the current registry:

| Surface | Before | After | Delta |
|---|---:|---:|---:|
| Aliases | 58 | 58 | 0 |
| Header aliases | 75 | 75 | 0 |
| Union ambiguity contracts | 84 | 84 | 0 |

No collision was introduced or removed. All 84 existing header-only collision guarantees still retain every candidate, forbid candidate selection, and leave contextual resolution unexecuted. Therefore no new collision contract or corpus-version change was required.

## Candidate Quality

Statistics count every physical source occurrence across the 30 governed cases. Reused sources in multi-file cases are counted per case. A broad set is reported at five or more candidates.

| Metric | Before | After |
|---|---:|---:|
| Physical columns | 752 | 752 |
| Zero candidates | 87 | 106 |
| One candidate | 181 | 242 |
| Multiple candidates | 484 | 404 |
| Average candidates/column | 2.0386 | 1.6263 |
| Median candidates/column | 2 | 2 |
| Maximum candidates/column | 7 | 5 |
| Broad columns | 38 | 18 |

The increase in zero-candidate columns is not hidden: it results primarily from removing candidates that existed only because one common token matched. Phase 3 acceptance explicitly prefers visible unknowns over wrong confident semantics.

Candidate evidence source distribution:

| Evidence source | Before | After |
|---|---:|---:|
| Canonical ID | 208 | 208 |
| Label | 0 | 0 |
| Alias exact | 353 | 353 |
| Header alias exact | 437 | 451 |
| Value alias | 75 | 75 |
| Value pattern | 289 | 289 |
| Token containment | 890 | 561 |

The 18 remaining broad occurrences are concentrated in three physical headers:

- `UnitCost`: 15 case occurrences, candidates `cost`, `spend`, `total_cost`, `unit`, `uom`;
- `Sub-Category`: two occurrences, candidates `account`, `asset`, `bin_location`, `category`, `change_order`;
- `Country Name`: one occurrence, candidates `bin_location`, `change_order`, `country`, `kpi`, `work_order`.

These remain visible candidate-quality debt. Phase 3A.1 does not use grain/domain/context to remove them.

## Files Changed

1. `apps/desktop/src/lib/semantic-registry.ts`
2. `apps/desktop/src/lib/semantic-registry.test.ts`
3. `apps/desktop/src/lib/understanding-core/semantic-candidate-engine.ts`
4. `apps/desktop/src/lib/understanding-core/semantic-candidate.test.ts`
5. `apps/desktop/src/lib/understanding-core/semantic-candidate.corpus.test.ts`
6. `docs/architecture/phase-3a1-candidate-gap-audit.json`
7. `docs/architecture/phase-3a1-candidate-coverage-reconciliation.md`

No ground-truth metric, corpus recognition expectation, legacy/Next detector, legacy alias set, runtime, UI, AI, playbook, DuckDB, execution, or domain-support file changed. The machine audit therefore records `productionBehaviorMustChange: false` for all seven corrected occurrences: they are canonical candidate-contract corrections, not runtime wiring changes.

## Limitations

- Candidate recall is measured against acceptance candidates, some of which the audit identifies as taxonomy or truth-review concerns.
- Value-pattern over-generation remains, especially where registry patterns are broad and a representative sample contains one matching value.
- Candidate quality statistics count repeated source use per governed case; they are not a unique-column catalog.
- No contextual evidence is used to select, reject, rank, or finalize a candidate.
- No registry support status or product support claim changes.

## Verification

### Phase 3A / 3A.1 candidate and registry tests

```text
npx vitest run src/lib/understanding-core/semantic-candidate.test.ts src/lib/understanding-core/semantic-candidate.corpus.test.ts src/lib/semantic-registry.test.ts --reporter=dot --maxWorkers=1
3 files passed; 32 tests passed
```

### Legacy runtime regression check

```text
npx vitest run src/lib/business-signal-detector.test.ts --reporter=dot --maxWorkers=1
1 file passed; 24 tests passed
```

This focused check was run after moving the four registry corrections from shared `aliases` to canonical `headerAliases`. It confirms the one Phase 3A.1 regression discovered by the full-suite run no longer affects the legacy business detector.

### Phase 2 profiler and sampler

```text
npx vitest run src/lib/understanding-core/profiler.test.ts src/lib/understanding-core/profiler.corpus.test.ts --reporter=dot --maxWorkers=1
2 files passed; 12 tests passed
```

### Phase 1 / 1B corpus validation and required hashes

```text
npx vitest run src/lib/semantic-registry.test.ts src/lib/semantic-sampler.test.ts --reporter=dot --maxWorkers=1
2 files passed; 21 tests passed
```

### Required real samples

```text
npx vitest run src/lib/understanding-next/real-sample.test.ts --reporter=dot --maxWorkers=1
1 file passed; 41 tests passed
```

### Static checks

```text
npx tsc --noEmit
passed

git diff --check
passed
```

### Full desktop suite

The required full desktop suite was run exactly once:

```text
npm test -- --run --reporter=dot
95 files passed; 5 files failed
847 tests passed; 10 tests failed
```

Nine failures match the pre-existing Phase 2 baseline: three BA comparison timeouts, one guided-investigation failure, three numeric-health failures, and two virtual-dataset planner failures. The tenth failure exposed a Phase 3A.1 legacy category-detection regression. That regression was corrected afterward by keeping the new surfaces in `headerAliases` only, and the focused 24-test legacy detector suite above passes. The full suite was intentionally not run a second time because this phase permits one full-suite run only.

## Rollback

Restore the five modified registry/candidate source-test files and delete the Phase 3A.1 JSON/Markdown reports. No runtime, database, final-mapping, corpus-metric, or support-manifest rollback is required.

## Stop Condition

Phase 3A.1 stops after candidate coverage reconciliation and verification. Do not implement contextual scoring, winner selection, probable/confirmed/rejected/final ambiguity, grain, relationships, domain activation, questions, actions, metrics, BA output, runtime wiring, or Phase 3B in this change set.
