# CPR-7 Broad Runtime Acceptance — 2026-09-12

## Verdict

**CPR-7 PASS for the required broad runtime matrices at Product SHA `38680c7b8601481124b1f6c085fe9f4f39bb4a0e`.**

This acceptance is strictly the **Chart Presentation Plane Remediation**. Understanding/Data semantics, governed metric truth, joins, formulas, evidence authority and source boundaries were not changed. Production/51xx and Native E3/E4 were not touched.

One coverage note remains explicit: the natural browser corpora exercised rendered layout counts **1 and 3**, but no natural runtime case produced layout 5. CPR-4 still has a source-driven 5-visual actuation gate, but that module-level proof is **not counted as substitute browser evidence** here.

## Product changes closed by CPR-7

Three runtime debts found by broad acceptance were fixed before the final matrix:

1. **Presentation-domain routing:** when the selected perspective is an official presentation domain, it now drives presentation policy even if the semantic primary domain differs. This closed the Finance Profit + Margin combo routing failure without changing semantic truth.
2. **Duplicate output suppression:** same-intent single-series visuals may be suppressed as duplicate only when their dimension-member sets align, their presentation metric names are clear aliases and their numeric series are equal. This closed the duplicate Revenue trend case while avoiding name-only semantic guesses.
3. **Compound-primary anti-padding:** a primary visual already carrying multiple governed measures is not inflated to 3/5 visuals by generic MB role diversity alone; additional standalone visuals require real official-domain role support. This closed the Carrier Cost padding case.

All three changes remain Presentation-only.

## Runtime evidence used

### Canonical Single

Fresh inventory on current UI exposed exactly **126 executable actions** across the canonical Accounting, Logistics and Sales files. Final browser sweep:

- 126/126 status `ok`
- 0 failures
- 0 execution timeouts
- 0 no-visual cases
- 0 page errors
- 0 horizontal-overflow verdicts

Raw final result: `/tmp/lightbi-chart-audit-20260910/cpr7-canonical-current-final/results.json`.

The earlier false no-visual result was a stale harness assumption: current Product can render a direct chart without `visual-narrative-canvas`. Exact-SHA rerun proved all 8 direct fallback cases are **one real bar chart**.

### Canonical planned → achieved composition

Treating a direct fallback chart as an effective single visual:

| Planned | Achieved | Cases |
| ---: | ---: | ---: |
| 1 | 1 | 42 |
| 3 | 1 | 54 |
| 3 | 3 | 30 |
| 5 | 5 | 0 |

Rendered result distribution is therefore **96 single-visual cases + 30 three-visual cases = 126**.

The 54 `3 → 1` cases all carry explicit degradation metadata rather than silently collapsing. Another 30 cases keep three visuals but may record degraded target-role fidelity when legal substitute companions were used.

### Canonical chart-family distribution

Across 186 rendered charts:

- `evidence_table`: 52
- `trend_line`: 32
- `ranking_bar`: 26
- `composition_donut`: 24
- `category_compare`: 22
- `grouped_compare`: 12
- direct fallback `bar`: 8
- `concentration_pareto`: 6
- `distribution_histogram`: 4

Renderer-family distribution:

- table: 52
- line: 29
- bar: 28 including the 8 direct fallback bars
- row: 24
- donut: 24
- grouped_bar: 10
- combo_bar_line: 9
- pareto: 6
- histogram: 4

No canonical Single composition unit required a first-class compound recipe; combo actuation was exercised in the controlled synthetic set instead.

### Controlled synthetic oracle set

Final result: **13 executable PASS + S08 intentional coverage/safety gap; 0 harness fail, 0 incomplete**.

Important runtime closures:

- S02 Revenue Trend: duplicate support removed; rendered story = one governed trend.
- S06 Carrier Cost: no generic domain padding; rendered story = one grouped compound answer carrying cost + volume measures.
- S09B Performance: first-class `combo_bar_line` materialized.
- S10 Finance: first-class Profit + Margin `combo_bar_line` materialized even though semantic primary domain remained Revenue and selected presentation perspective was Finance.

Synthetic pre-execution targets: 8 target-1, 5 target-3, 1 intentional coverage gap. The five target-3 cases degraded to one rendered story unit with explicit `planned_companion_not_materialized` / `insufficient_legal_companions` reasons when the requested companion roles could not legally survive materialization/composition.

Raw final result: `/tmp/lightbi-chart-audit-20260912/synthetic-cpr7/results.json`.

### Six official presentation domains

Final browser matrix: **6/6 PASS, 0 page errors**.

- Revenue: 3 visuals — ranking + composition companions
- Finance: 1 trend
- Inventory: 1 ranking
- Operations: 1 grouped compound visual after anti-padding remediation
- Customer: 1 ranking
- Performance: 1 target/comparison visual

Raw final result: `/tmp/lightbi-chart-audit-20260912/six-domain-browser-final.json`.

### Multi R10

Final runtime matrix: **34/34 PASS** across seven declared file combinations.

- decision workspace: 27
- Data Trust surface: 7
- page errors: 0
- overflow: 0
- duplicate follow-up labels: 0
- duplicate follow-up answers: 0

Combination coverage: `all6` 7, `sales_accounting_4` 6, `accounting_logistics_4` 6, `sales_logistics_4` 5, `accounting_pair` 4, `sales_pair` 3, `logistics_pair` 3.

Raw final result: `/tmp/lightbi-chart-audit-20260912/multi-r10-cpr7/results.json`.

## Rejection and hard-veto evidence

### Story-composer rejection reasons — canonical

- `duplicate_information`: 14
- `not_complementary`: 13
- `story_target_degraded`: 3
- `evidence_required`: 2
- `story_target_exceeded`: 2

Synthetic composer rejection reasons additionally exercised `not_complementary`, `story_target_exceeded`, `duplicate_information` and `evidence_required`.

### Visualization-pattern hard-veto reasons

Across the runtime visualization candidate traces, the actual deterministic rejection taxonomy was:

- `REQUIRED_EVIDENCE_ROLES_MISSING`
- `INTENT_NOT_SUPPORTED`
- `CARDINALITY_CATEGORIES_EXCEEDED`
- `CARDINALITY_POINTS_EXCEEDED`
- `CARDINALITY_SERIES_EXCEEDED`
- `renderer_surface_unavailable`

This remains the deterministic veto layer. MB/domain policy may rank legal alternatives but does not bypass these vetoes.

## Semantic freeze and MB actuation

Final focused gate on the same Product state:

- C0 semantic/data freeze: 18/18 PASS
- CPR-3 MB presentation actuation: 3/3 PASS
- combined focused gate: 21/21 PASS

The same governed truth remains unchanged while controlled MB presentation advice can change legal presentation choices.

## C9 browser interaction evidence

The durable browser flow remains green in history at `acbe152391c33057bf7e7c7bab38caa173af0cdb` and is ancestor of the CPR-7 SHA:

`upload → perspective → Investigation → real chart mark → matched source rows → Investigate selected evidence → deep-analysis-shell → filtered-deep-analysis-scope → selected-subject-investigation`.

This proves chart interaction to selected-evidence BA Step 2 on the current presentation architecture.

## Authoritative release gate

`pnpm test:release-1.0` on the CPR-7 byte-state passed with:

- desktop build: 3836 modules
- CPR-2 request actuation: 24/24
- CPR-3 MB voting: 3/3
- CPR-4 story composition: 24/24
- CPR-5 combo planning: 6/6
- CPR-6 palette/drill: 32/32
- DPR-10 cross-domain presentation: 59/59
- governed product regression: 11 files / 50 tests
- final marker: `release_1_0_suite=passed`

## CPR-7 closeout

CPR-7 is source-closed at Product SHA `38680c7b8601481124b1f6c085fe9f4f39bb4a0e`.

Next phase is **CPR-8 exact immutable NEXT owner UAT**: build that exact committed SHA, deploy only through immutable NEXT Gateway 5273 rotation, rerun representative browser acceptance against the public NEXT candidate, then hand that exact candidate to the owner. Native E3/E4 remains blocked until explicit owner acceptance. Production/51xx remains untouched.
