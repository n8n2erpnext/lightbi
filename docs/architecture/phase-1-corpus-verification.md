# Phase 1 / 1B Acceptance Corpus Verification

- Date: 2026-07-10
- Corpus version: `1.1.0`
- Phase completed: Phase 1B — Acceptance Contract Corrective Pass
- Production detector behavior changed: no
- Phase 2 started: no

## Result

Phase 1B corrected the acceptance contract without changing production behavior. The corpus still contains 30 stable cases backed by 19 unique local source files and SHA-256 provenance. It now separates header-only ambiguity from contextual final resolution and adds machine-readable grain, profiling, representative-evidence, and multi-file relationship truth for later canonical-engine phases.

`understanding-core` remains the only future canonical runner. `DOMAIN_SUPPORT_MANIFEST` remains empty. No signal or domain is labeled `mvp_proven`.

## Corrected contradictions

### Tuning policy

The group policy already forbade tuning on adversarial and multi-file groups, but all ten sample provenance records incorrectly said `tuningUse: allowed`. Phase 1B changed those ten provenance records to `forbidden` and added a test that requires every sample to agree with its group policy.

| Group | Cases | Tuning use |
|---|---:|---|
| Golden | 8 | allowed |
| Holdout | 12 | forbidden |
| Adversarial | 5 | forbidden |
| Multi-file | 5 | forbidden |

### Mapping states

All `minimumState` fields were removed. Required mappings now declare explicit `allowedFinalStates` containing only `probable` and/or `confirmed`.

Seven physical-column overlaps previously required a probable mapping while also requiring a final ambiguous state:

1. `adv.world_bank_cross_domain`: `Date` -> `time_period`
2. `fin.accounting_may_2026`: `MarginPct` -> `margin_pct`
3. `fin.accounting_june_2026`: `MarginPct` -> `margin_pct`
4. `inv.plu_product_master`: `Đơn vị tính` -> `uom`
5. `inv.logistics_may_item_flow`: `Qty` -> `quantity`
6. `inv.logistics_june_item_flow`: `Qty` -> `quantity`
7. `rev.superstore_orders`: `Quantity` -> `quantity`

These are now ambiguous only under `evidenceScope: header_only`. Their `contextualResolution` names the resolved canonical signal and permits only `probable` or `confirmed` after value, physical-type, grain, and sibling-column evidence.

The audit also found physical columns present in both required and forbidden arrays. Those entries target different canonical signals and are intentional negative assertions, such as `OrderID -> order` being required while `OrderID -> quantity` is forbidden. Tests now reject the actual contradiction: the same normalized physical-column and canonical-signal pair appearing in both sets. No such pair remains. Forbidden signals are also prohibited from appearing among ambiguity candidates for the same physical column.

Two invalid multi-file ambiguity records were corrected after validation exposed that the named physical column did not exist:

- `multi.logistics_period_pair`: `Status` became the source column `DeliveryStatus`.
- `multi.accounting_period_pair`: nonexistent `Status` became the source column `MarginPct`.

### Alias collisions

All 84 normalized alias collision cases now have two explicit scopes:

- `headerOnly.expectedState: ambiguous`, with probable and confirmed forbidden from header evidence alone;
- `contextualResolution`, which may remain ambiguous or resolve to probable/confirmed when value, type, grain, sibling-column, score-margin, or user-mapping evidence supports it.

The corpus no longer requires permanent ambiguity after contextual evidence.

## Grain truth

All 30 cases retain their coarse grain and now include row entity, parent entity, candidate keys, parent keys, and repeated/additive measure expectations. These are acceptance truths only; Phase 1B does not implement a grain engine.

## Profiling truth

All 30 cases now include verified header positions and source row counts, selected physical-type and parse expectations, issue contracts for null/duplicate/mixed/technical conditions, and representative evidence requirements. Sources over 100 rows require head, middle, tail, and deterministic-random evidence. Phase 1B does not add or change a profiler or sampler.

## Relationship truth

All five multi-file cases now require expected and forbidden relationships with cardinality, operation, join/refusal reason, period alignment, and duplication risk. Monthly commerce bundles permit order-key joins only after validation; period pairs require append-only behavior and refuse monthly row joins. No join inference or execution behavior was added.

## Verified metrics

The 18 cases with verified metric answers are unchanged. The manifest stores a SHA-256 digest over samples sorted by stable ID and their `verifiedMetricAnswers` only:

```text
27f1bc7122a58ad2179442c7319326e522c1e5422c69e659b17bd595fd661866
```

Corpus validation recomputes this digest to prevent silent metric drift.

## Corpus coverage

| Category | Cases | Golden | Holdout | Adversarial | Multi-file |
|---|---:|---:|---:|---:|---:|
| Revenue and sales | 5 | 2 | 3 | 0 | 0 |
| Inventory | 5 | 2 | 3 | 0 | 0 |
| Operations and delivery | 5 | 2 | 3 | 0 | 0 |
| Finance and accounting | 5 | 2 | 3 | 0 | 0 |
| Adversarial and dirty | 5 | 0 | 0 | 5 | 0 |
| Multi-file | 5 | 0 | 0 | 0 | 5 |
| Total | 30 | 8 | 12 | 5 | 5 |

Domain validation retains 12 held-out cases out of 20 cases (60%).

## Missing samples

No required sample is missing in the current workspace. Corpus tests verify file existence and SHA-256 provenance. Source binaries under `sample data/` are not tracked by Git, so a clean CI/release environment must provision the approved corpus data. Missing required data fails explicitly.

## Tests run

### Corpus validation

```text
npm test -- --run src/lib/semantic-registry.test.ts src/lib/semantic-sampler.test.ts
2 files passed; 21 tests passed
```

### Required real samples

```text
npm test -- --run src/lib/understanding-next/real-sample.test.ts
1 file passed; 41 tests passed
```

### TypeScript

```text
npx tsc --noEmit
passed
```

### Diff check

```text
git diff --check
passed
```

## Files changed in Phase 1B

1. `sample-corpus/manifest.json`
2. `sample-corpus/ground-truth/revenue-sales.json`
3. `sample-corpus/ground-truth/inventory.json`
4. `sample-corpus/ground-truth/operations-delivery.json`
5. `sample-corpus/ground-truth/finance-accounting.json`
6. `sample-corpus/ground-truth/adversarial-dirty.json`
7. `sample-corpus/ground-truth/multi-file.json`
8. `apps/desktop/src/lib/semantic-registry.test.ts`
9. `apps/desktop/src/lib/semantic-sampler.test.ts`
10. `DOMAIN_SAMPLE_MATRIX.md`
11. `docs/architecture/phase-1-corpus-verification.md`

`understanding-next/real-sample.test.ts` remains unchanged in Phase 1B. No production detector, profiler, scorer, registry alias, runtime, Home, UI, AI briefing, playbook, DuckDB, execution behavior, or support-manifest entry changed.

## Limitations

- Phase 1B validates acceptance truth; it does not run all mapping expectations against a canonical detector.
- Profiling and representative evidence are expected outputs, not a Phase 2 implementation.
- Grain and relationship contracts are expected outputs, not a later engine implementation.
- Domain-pack and action fields remain expectations only and do not claim current product support.
- Required binary samples still need an approved provisioning mechanism for clean CI.

## Rollback

Restore corpus version `1.0.0`, the two corpus validation test files, `DOMAIN_SAMPLE_MATRIX.md`, and this report. No runtime rollback, data migration, alias rollback, or support-manifest migration is required.

## Stop condition

Phase 1B stops here. Do not implement canonical profiling, mapping, grain, relationship, runtime, or UI behavior and do not begin Phase 2.
