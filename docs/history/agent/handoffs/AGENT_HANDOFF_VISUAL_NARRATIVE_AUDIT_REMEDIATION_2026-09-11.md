# LightBI Visual Narrative Audit + Semantic Remediation Handoff — 2026-09-11

Status: handoff / operational continuity, not canonical architecture
Date: 2026-09-11
Scope: DPR-10 Visual Narrative chart intelligence audit, semantic remediation, MB A/B, Single/Multi browser acceptance
Supersedes: none
Superseded by: none
Primary sources: [§23B.16 remediation plan](../plans/AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md), [Project Book](../../../project-book/LIGHTBI_PROJECT_BOOK.md), [Library Rules](../../../project-book/LIBRARY_RULES.md)
Companion session reconstruction: [AGENT_WALKTHROUGH_VISUAL_NARRATIVE_AUDIT_REMEDIATION_SESSION_2026-09-11.md](../walkthroughs/AGENT_WALKTHROUGH_VISUAL_NARRATIVE_AUDIT_REMEDIATION_SESSION_2026-09-11.md)

## 0. Stop-point instruction

The owner explicitly stopped the session and requested a handoff before any further mutation. Do not continue tests, code changes, commits or deployment until this handoff and the canonical rules have been read.

This handoff captures an **unfinished remediation worktree**. It must not be treated as released or owner-accepted truth. The currently public NEXT Web is still the previously rejected-by-owner Visual Narrative candidate `6ba98d9d...`; the remediation described below exists only in the dirty Product worktree and the private audit gateway on port 5293.

The project remains NEXT-only for this task. **Do not touch Production / 51xx.** Do not trigger Windows/native E3/E4 until the new Web remediation candidate is source-green, Multi-closeout is complete, and the owner has tested the new Web candidate.

## 1. Required read order for successor

1. `docs/project-book/LIBRARY_RULES.md`
2. `docs/project-book/LIGHTBI_PROJECT_BOOK.md`
3. `docs/history/agent/plans/AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md` — especially §23B.15 and §23B.16
4. this handoff
5. companion session walkthrough linked above
6. exact current Product diff/tests before mutation

Do not infer Product truth from the old live SHA alone; the current Product worktree intentionally contains the unfinished remediation.

## 2. Exact repository state at handoff

### Product repository

- Path: `/home/ubuntu/n8n2erpnext/LightBI-dpr0-contract-freeze`
- Branch: `codex/dpr0-contract-freeze`
- HEAD/base commit: `6ba98d9d39a95adc5f0ddd9a5aaa48c63cea2220`
- Base commit subject: `feat(dpr10): compose perspective-aware visual narratives`
- Worktree: **dirty by design**, remediation not committed
- Current diff at stop point: `25 files changed, 806 insertions(+), 119 deletions(-)`

Modified Product files at stop point:

- `apps/desktop/src/components/analysis/ChartPreviewRenderer.tsx`
- `apps/desktop/src/lib/decision-visualization-plan.ts`
- `apps/desktop/src/lib/domain-visual-playbooks.test.ts`
- `apps/desktop/src/lib/domain-visual-playbooks.ts`
- `apps/desktop/src/lib/investigation-visual-narrative.test.ts`
- `apps/desktop/src/lib/investigation-visualization-plan.test.ts`
- `apps/desktop/src/lib/investigation-visualization-plan.ts`
- `apps/desktop/src/lib/local-duckdb-executor.ts`
- `apps/desktop/src/lib/question-perspective-intelligence.test.ts`
- `apps/desktop/src/lib/question-perspective-intelligence.ts`
- `apps/desktop/src/lib/safe-sql-preview.test.ts`
- `apps/desktop/src/lib/safe-sql-preview.ts`
- `apps/desktop/src/lib/understanding-core/next-adapter.test.ts`
- `apps/desktop/src/lib/understanding-core/next-adapter.ts`
- `apps/desktop/src/lib/understanding-core/ontology.ts`
- `apps/desktop/src/lib/understanding-core/question-engine-primary.ts`
- `apps/desktop/src/lib/understanding-core/question-engine-secondary.ts`
- `apps/desktop/src/lib/understanding-core/question-engine-shared.ts`
- `apps/desktop/src/lib/understanding-core/signal-engine.ts`
- `apps/desktop/src/lib/understanding-core/understanding-core.test.ts`
- `apps/desktop/src/lib/visual-narrative-composition.test.ts`
- `apps/desktop/src/lib/visual-narrative-composition.ts`
- `apps/desktop/src/lib/visualization-ontology.ts`
- `apps/desktop/src/lib/visualization-planner.test.ts`
- `apps/desktop/src/lib/visualization-planner.ts`

Do not reset these files. They contain the audit-driven remediation described below.

### Docs repository

- Path: `/home/ubuntu/n8n2erpnext/LightBI-bada-docs-20260903`
- Branch: `docs/ba-da-mode-future-20260903`
- HEAD at stop: `b03912ffe7f71d3be609eee1e506c4273b3f5f7b`
- Before writing this handoff, the only dirty canonical source was:
  - `docs/history/agent/plans/AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md`
- That file contains uncommitted **§23B.16 Visual Narrative semantic remediation** and must not be discarded.

### Runtime identities at stop

- Core/API 5272: PID `3376963`, bind `100.94.184.141:5272`
- Public NEXT Gateway 5273: PID `2436036`, bind `100.94.184.141:5273`
- Control Plane 5274: PID `1116289`, bind `0.0.0.0:5274`
- Private audit Gateway 5293: PID `216483`, bind `127.0.0.1:5293`
- Public NEXT Web still serves Product `6ba98d9d...`; remediation has **not** been rotated to 5273.
- Production / 51xx: untouched.
- SSD at stop: `/dev/sda1` 121 GB total, ~99 GB used, ~22 GB free, 83% used. Be conservative with screenshots/build caches.

The private 5293 gateway points directly at the current Product `apps/desktop/dist` and is the only browser target that contains the unfinished remediation.

## 3. Why this work exists — owner acceptance failure

The original Visual Narrative refactor improved layout mechanics but did not satisfy the owner. The owner tested multiple Single perspectives and showed that the chart system still behaved mechanically:

- multiple charts could answer nearly the same analytical job;
- supporting charts could be merely “same domain” instead of actually explaining the selected question;
- `1/3/5` risked becoming a chart-count attractor rather than layout normalization;
- high-cardinality rankings could become vertical-bar clutter or disappear;
- time series could use inappropriate transaction-level grain;
- semantic questions such as inventory value risk could be rendered using the wrong business quantity;
- MB/domain knowledge was not reliably improving the final visual story.

The owner then explicitly rejected further screenshot-based guesswork and required a broad Playwright audit across the repository sample corpus plus controlled synthetic datasets with known expected chart stories. The owner additionally required a measured evaluation of **Micro Brain impact and accuracy**.

This requirement is the central authority for the current remediation. Do not return to visual tuning by intuition.

## 4. Audit methodology — must preserve

The session established a reproducible audit approach that is more important than any one chart choice.

### 4.1 Canonical Single corpus

Tracked canonical source corpus:

`/home/ubuntu/n8n2erpnext/LightBI-dpr0-contract-freeze/sample-corpus/anchors/1.3.0`

Files:

- `Sales_ERP_May_2026.xlsx`
- `Sales_ERP_June_2026.xlsx`
- `Accounting_ERP_May_2026.csv`
- `Accounting_ERP_June_2026.csv`
- `Logistics_ERP_May_2026.csv`
- `Logistics_ERP_June_2026.csv`

Baseline inventory originally found `28 perspectives / 124 visible questions/actions`.

After the remediation changed question routing/dedupe, a fresh inventory found **126 executable questions**. The current full candidate sweep completed **126/126** with `0 browser failures` and `0 execution timeouts`; four execution-complete cases had no chart, later classified below.

Canonical audit artifacts:

- baseline-ish run: `/tmp/lightbi-chart-audit-20260910/canonical-final/results.json`
- remediation current run: `/tmp/lightbi-chart-audit-20260910/canonical-r9d-current2/results.json`
- current screenshots: `/tmp/lightbi-chart-audit-20260910/canonical-r9d-current2/`
- fresh inventory: `/tmp/lightbi-chart-audit-20260910/inventory-r9d-canonical.json`

The current `canonical-r9d-current2/results.json` has exactly `126` entries, all `status=ok`, `4 noVisual`, `0 timeout`.

### 4.2 Browser plan introspection

Do not infer chart types from screenshots alone. The session proved that Playwright can read the React Fiber/ECharts runtime and capture:

- `visualizationPlan.analyticalIntent`
- `patternId`
- `rendererFamily`
- suitability candidates and rejection reasons
- chart model x/y/series fields
- presentation row counts
- `VisualNarrativeCompositionPlan.units`
- `VisualNarrativeCompositionPlan.rejected`
- `reasonForInclusion`
- layout count/mode

This is the preferred audit source alongside screenshots.

### 4.3 Synthetic controlled oracle corpus

The session created 12 controlled synthetic datasets, approximately 6.7k total rows, covering 14 declared oracle cases. The key requirement was that expected business/visual behavior be declared **before** observing LightBI output.

Synthetic artifacts:

- oracle definitions: `/tmp/lightbi-chart-audit-20260910/synthetic-oracles.json`
- current full run: `/tmp/lightbi-chart-audit-20260910/synthetic-r9c-full/results.json`
- log: `/tmp/lightbi-chart-audit-20260910/synthetic-r9c-full.log`
- inventories: `/tmp/lightbi-chart-audit-20260910/synthetic-inventory-r9*.json`

Current synthetic result summary at the latest completed benchmark: `14` cases total, `13` normal executable cases plus one deliberate/safety coverage gap, `0 execution timeout`, `0 harness failure`. The session assessed **14/14 with no oracle violation** after remediation, with some outcomes “acceptable” rather than “ideal”; see below.

### 4.4 MB ON/OFF paired audit

The audit used the Product injection boundary:

- `buildDomainVisualProfile(..., { advisor })`
- actual advisor = MB ON
- empty/no-op advisor = deterministic/official-prior baseline

The baseline before remediation showed:

- pattern interventions: `3/11 = 27.3%`, with `0 improved / 3 neutral / 0 degraded`
- set-membership interventions: `1/5 = 20%`, and the only intervention was **degraded**
- the degraded case was Revenue Trend: MB replaced a more distinct item-value support with near-duplicate `Money over time` trend support.

After semantic admission was hardened, a later controlled A/B (`/tmp/lightbi-chart-audit-20260910/mb-ab-r9e.json`) showed no negative intervention. An even stricter temporary A/B test run at the stop point printed:

`MB_AB_R9E {"patternInterventions":0,"patternCases":11,"membershipInterventions":0,"membershipCases":4,"degraded":0}`

Interpretation: correctness is now protected, but MB influence on the controlled set is currently **too weak / not observable**. Do not “fix” this by weakening semantic admission. Future MB work should improve ranking only inside a truly complementary candidate set.

## 5. Baseline findings that drove remediation

The following were measured failures, not design speculation.

### 5.1 Semantic surrogate failure — Inventory Value Exposure

Controlled synthetic fixture had Inventory, Unit Price, Stock Age, Warehouse but no governed Inventory Value.

Old behavior:

- question: inventory value exposure
- intent: `risk_concentration`
- chart: Pareto
- x: Warehouse
- y: **Unit Price**

This was a P0 correctness failure. A visually appropriate Pareto chart was answering the wrong business quantity.

### 5.2 Duplicate supporting story — Revenue Trend

Controlled 31-day Revenue fixture showed:

- hero: Revenue trend
- support: `Money over time` over the same Revenue/date semantics
- another support: activity by item

MB ON previously made this worse by preferring the duplicate trend.

### 5.3 High cardinality

30 salespeople and 100 customers demonstrated that renderer limits could cause a useful ranking answer to disappear or degrade to a table. The system required deterministic Top-N/presentation shaping while preserving the full governed result.

### 5.4 Part-to-whole

Payment Method Mix and Delivery Completion Mix were often rendered as generic comparison/ranking instead of composition despite mutually exclusive categories and a valid scoped whole.

### 5.5 Paired/compound measures

Controlled cases proved missing recognition for:

- Actual + Target
- Delivery Volume + Fee/Cost at Carrier grain
- Profit + Margin
- Revenue + Cost + Profit + Margin story opportunities

### 5.6 Temporal grain

The execution layer hard-coded date trends to daily formatting regardless of full-file span. The requirement is adaptive grain based on full-file span and source grain, not preview rows.

### 5.7 Question reachability / routing

Synthetic two-period Revenue and Actual-vs-Target proved that correct chart logic is irrelevant if the appropriate business question never reaches the selected perspective or if title/action dedupe binds the wrong action.

### 5.8 Diversity-by-dimension is not complementarity

The canonical sweep exposed sets such as:

- Product × `record_count`
- Brand × `record_count`
- Category × `record_count`

all using the same analytical intent. These are not three different analytical stories merely because the dimension changes.

## 6. Canonical remediation plan already written — §23B.16

The docs plan currently contains VN-R1 through VN-R10. Treat that section as the execution owner for this unfinished batch.

Pipeline contract introduced by the plan:

`selected question -> governed semantic answer binding -> result-shape transformation -> deterministic visual eligibility -> question-conditioned complementarity / duplicate-information gate -> MB/domain advisory rerank -> combine/complement/reject -> 1/3/5 layout normalization -> renderer`

Key invariant: **1/3/5 is layout normalization only, never a membership target.** One correct chart is preferable to filling the canvas.

## 7. Implemented remediation in the dirty Product worktree

The sections below describe the code that exists now but is not committed/released.

### VN-R1 — Business semantic answer binding

Implemented fixes include:

- canonical `Inventory` now maps to `inventory.on_hand`, not `inventory.age_bucket`
- `Aging Bucket` remains the aging semantic
- inventory value exposure no longer falls back to arbitrary generic money
- Unit Price cannot substitute for inventory-value/exposure authority
- missing inventory-value authority becomes non-executable/limitation instead of surrogate chart
- regression added for Inventory + Stock Age + Aging Bucket
- regression added proving Unit Price cannot authorize inventory-value exposure

Early targeted gate: `25/25 PASS`.

### VN-R2 — Question-conditioned complementarity

Composer admission was changed from broad domain affinity to answer-conditioned complementarity.

Key rules now include:

- domain affinity alone is insufficient
- same metric + same dimension + same analytical intent is duplicate information
- later tightened to **same metric + same analytical intent is duplicate information even when the dimension changes**, unless a legal semantic compound relationship or genuinely different analytical job exists
- duplicate detection runs primary-vs-support and support-vs-support
- every admitted unit carries a machine-readable `reasonForInclusion`

This directly targets Product/Brand/Category `record_count` filler sets.

### VN-R3 — MB after semantic admission

MB/domain advice no longer establishes membership or complementarity.

Order now is deterministic semantic/evidence admission first, advisory rerank later. A candidate with huge advisory score cannot survive if semantically unrelated or duplicate.

R2/R3 targeted gate reached `18/18 PASS + typecheck + diff-check` earlier; later duplicate-set tests reached `19/19 PASS`.

### VN-R4 — High-cardinality presentation shaping

Added presentation-only `top_n` shaping:

- full governed result remains intact
- presentation rows are deterministically sorted/bounded
- metadata records source category count, limit, omitted count, sort metric/direction, reason
- renderer displays disclosure such as `Showing top 15 of 30 categories`
- drill-through indexes the shown presentation row correctly

30-salesperson controlled fixture changed from no useful visual to bounded horizontal ranking.

### VN-R5 — Part-to-whole

Added strong intent cues for mix/share/split/proportion/part-to-whole. Generic `breakdown` was deliberately removed because it was too broad.

Donut/composition eligibility requires valid finite non-negative parts and a positive scoped whole. Invalid shape falls back safely.

Targeted gate reached `26/26 PASS + typecheck/diff-check`.

### VN-R6 — Paired/compound measures

Implemented:

- distinct semantic identities `indicator.actual` and `indicator.target`
- constant Target values are allowed as valid benchmark evidence without weakening generic constant-field quality rules
- question `actual_vs_target`
- target visualization path `target_attainment -> target_combo -> combo_bar_line`
- Actual + Target companion measures for performance-by-team/business-group
- Delivery workload + Delivery Fee/Cost legal recipe at common Carrier/Route/resource grain
- Finance Profit + Margin companion story; Profit SUM, Margin AVG
- Finance time dimension uses trend where appropriate
- context questions are penalized so they do not become hero before direct answer

A major bug found and fixed here: question dedupe previously used only `actionKind + first metric + dimensions`, causing a card titled Actual-vs-Target to navigate to the Indicator-only action. Semantic dedupe now includes all base measures + derived measures + dimensions + action kind.

S09A browser proof after fix:

- action `universal:action_actual_vs_target`
- Actual + Target series
- intent `target_attainment`
- pattern `target_combo`
- renderer `combo_bar_line`

S09B browser proof at Team/business group grain also retained both Actual and Target and resolved to target-aware combo.

R6 source tests reached `52/52 PASS` before later aggregates.

### VN-R7 — Adaptive temporal grain

Runtime boundary found in `safe-sql-preview.ts`; old code hard-coded date trends to daily formatting.

Implemented full-file SQL policy approximately:

- <=2 days with real time-of-day -> hour
- <=45 days -> day
- <=180 days -> week
- <=730 days -> month
- longer -> quarter

Period-like source dimensions such as Month / Reporting Period preserve source grain. Exactly two aggregate periods are treated as comparison, not trend.

Internal grain marker is stripped from business result and retained only as provenance/warning context.

R7 aggregate reached `6 files / 90 tests PASS + typecheck + diff-check` at the source gate. Runtime proof is through browser candidate, not Node DuckDB tests, because DuckDB-WASM requires Worker unavailable in the Vitest Node environment.

### VN-R8 — Domain semantic recipes

Implemented/strengthened legal recipes for:

- Actual <-> Target
- Profit <-> Margin
- Revenue <-> Cost
- Delivery Volume/workload <-> Fee/Cost
- Inventory on-hand <-> Aging Bucket/context

Inventory Aging was specifically fixed from hard-coded `record_count` to **SUM on-hand by Aging Bucket** when governed on-hand exists. Only when no quantity exists may it fall back to clearly worded record coverage.

R8 reached `7 files / 86 tests PASS + typecheck + diff-check` at an earlier checkpoint.

### Late semantic fixes discovered by the canonical sweep

These are important and are already in the dirty Product worktree.

#### `money.fee` false positive

A broad pattern matching `delivery` caused `Delivery ID` / `Delivery Status` to be recognized as a money fee. The rule was tightened to true fee/charge/cost phrases such as Delivery Fee / Shipping Cost / Freight Charge.

Carrier workload now uses governed `record_count` as source-record workload when distinct shipment identity is not proven. Wording must not pretend this is distinct deliveries.

#### `sales` -> `Salesperson` false positive

Registry-backed header matching converted alias `sales` into substring regex, so `Salesperson` could become `money.revenue`.

The guard was changed so token alias `sales` matches a real sales token rather than the prefix of `Salesperson`. This applies regardless of which canonical registry signal contributed the alias, because both `sales` and `revenue` definitions contributed `sales` to the merged `money.revenue` rule.

Regression proves `Salesperson` cannot become `money.revenue`.

#### Generic Value questions choosing Unit Price

After fixing the `Salesperson` false positive, browser still showed `Value by actor` using `UnitPrice`, because generic value questions selected the first generic money signal.

The generic `Money/Value by time/location/item/actor/customer` family was changed to a business-value priority:

`Revenue -> Receivable -> generic money fallback`

Browser proof on Accounting sample now shows:

- `Value by actor`
- x = `Salesperson`
- y = `NetRevenue`
- raw governed result columns `SALESPERSON | NETREVENUE`

No Salesperson×Salesperson and no UnitPrice surrogate.

The latest local regression for this specific fix is `31/31 PASS` in `understanding-core.test.ts`.

## 8. Latest browser audit facts at stop

### Synthetic benchmark

Latest full controlled run: `/tmp/lightbi-chart-audit-20260910/synthetic-r9c-full/results.json`

- 14 declared target cases
- 13 normal executable outcomes
- one deliberate/safety coverage gap/abstention
- zero harness failure
- zero timeout
- session assessment: **14/14 with no oracle violation**

Representative outcomes:

- category Revenue ranking -> `ranking_bar`
- Revenue trend -> one trend hero, duplicate trend support rejected
- 30 salespeople -> bounded ranking rather than losing visual
- Delivery completion mix -> `composition_donut`
- Carrier Fee + workload -> same-grain comparison
- Inventory Aging -> governed Inventory quantity by Aging Bucket
- Inventory Value Exposure without authority -> non-executable / no UnitPrice surrogate
- Actual + Target -> `target_combo`
- Team Actual + Target -> `target_combo`
- exactly two periods -> `period_comparison`, not line trend

Some outcomes were considered acceptable rather than ideal, especially Payment composition style, Carrier presentation style, Finance compound storytelling and 100-customer presentation. These are optimization targets only after correctness closeout.

### Canonical 126-case candidate sweep

`/tmp/lightbi-chart-audit-20260910/canonical-r9d-current2/results.json`

- 126 / 126 executed
- 126 `status=ok`
- 0 timeout
- 4 `noVisual`

The four no-visual cases were classified:

1. two Logistics “How many governed deliveries are present?” cases — valid single-number/KPI answers; no chart is correct
2. two Accounting `Value by actor` cases — real semantic defect; fixed afterward as described above

The full 126-case matrix has **not yet been rerun after the very latest `sales`/business-value fixes and tightened dimension-swap duplicate admission**. Successor should run targeted proofs first, then decide whether a full fresh sweep is necessary before final release suite.

### Browser proof of duplicate-set collapse after latest composer gate

Accounting Inventory on the private candidate showed:

- primary Product × `record_count`
- `layoutCount=1`
- Brand/Category same-metric/same-intent supports no longer admitted

This is the intended fix for the owner complaint that multiple charts could differ only by dimension while answering the same job.

## 9. MB status at handoff

The pre-remediation audit proved MB could be actively harmful at set membership.

After remediation, the latest strict temporary A/B test printed:

- pattern interventions: 0 / 11
- membership interventions: 0 / 4
- degraded: 0

Interpretation:

- P0 correctness goal achieved: MB can no longer rescue a duplicate/unrelated support through semantic admission.
- Open product-quality issue: MB influence is now too weak to observe on the controlled cases.
- Do **not** relax admission to increase MB intervention.
- Future work after correctness release should improve MB ranking among already-valid alternatives and expand controlled cases where multiple truly complementary options exist.

Durable audit file from the prior A/B pass: `/tmp/lightbi-chart-audit-20260910/mb-ab-r9e.json`.

The temporary strict Vitest file used for the final zero-degradation check was removed after execution; it is not present in `git status`.

## 10. Multi-file R10 status — IMPORTANT STOP POINT

Fresh Multi inventory on the latest private candidate completed successfully. There are still **34 executable perspectives across 7 combinations**:

1. Sales pair — 3
2. Accounting pair — 4
3. Logistics pair — 3
4. Sales + Accounting four-file — 6
5. Sales + Logistics four-file — 5
6. Accounting + Logistics four-file — 6
7. Full six-file — 7 executable; `Order Journey` remains correctly non-executable

Fresh inventory artifact:

`/tmp/lightbi-chart-audit-20260910/multi-inventory-r9e.json`

A Multi execution matrix was started before this stop request, but **it is not valid evidence of Product failure**. Existing file:

`/tmp/lightbi-chart-audit-20260910/multi-r10-matrix/results.json`

contains 16 rows with only 3 `ok` and 13 `fail`, but most failures are harness/page lifecycle failures after one `data_trust` perspective did not reach `collection-decision-workspace`; subsequent entries show `Target page, context or browser has been closed`. Do not count these as Product failures.

Observed examples:

- `sales_pair / sales_performance` -> ok
- `sales_pair / period_comparison` -> ok
- `sales_pair / data_trust` initially timed out waiting for `collection-decision-workspace`
- then the shared page/context closed and polluted following Accounting rows
- resume attempts repeated the same harness failure pattern

**Exact next major task is to repair/rewrite the Multi harness so each perspective is isolated or recovers cleanly, then execute all 34 perspectives.**

Multi acceptance must validate:

- primary visual/pattern/period mode
- no fake trend for exactly two periods
- all three BA follow-up questions are distinct and evidence-backed
- supporting metrics do not become duplicate analytical stories
- source separation remains strict; no raw joins across unrelated files
- generated Dashboard packing does not create orphan whitespace
- no horizontal overflow/pageerror
- `data_trust` may need a different expected surface from analytical perspectives; do not hard-code `collection-decision-workspace` for every perspective unless source contract proves that is correct

Useful old six-file UAT source:

`/tmp/dpr10_multifile_f5fd917_live.spec.ts`

Useful current component source:

`apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.tsx`

## 11. Latest verification checkpoints

Do not overstate these; they were run at different remediation points.

Verified during the session:

- R1 targeted: 25/25 PASS
- R2/R3: 18/18 PASS + typecheck/diff-check
- duplicate-set composer gate: 19/19 PASS + typecheck/diff-check
- R5: 26/26 PASS + typecheck/diff-check
- R6: 52/52 PASS after type fixes
- R7 aggregate: 6 files / 90 tests PASS
- R8 aggregate: 7 files / 86 tests PASS
- broad remediation aggregate at one point: 11 files / 110 tests PASS
- late registry/business-value regression: 31/31 PASS
- late Understanding/visualization aggregate before the final business-value patch: 5 files / 73 tests PASS
- production Vite build on the dirty candidate: 3832 modules PASS

Because additional semantic fixes were made after some of these checks, **the current exact dirty worktree still needs one final aggregate + full `test:release-1.0` before commit.** Do not reuse an earlier full-suite result from `6ba98d9d` as evidence for the dirty remediation.

## 12. Exact next action for successor

Do these in order.

### Step A — verify stop state before mutation

- confirm Product HEAD is still `6ba98d9d...`
- confirm the same 25 modified Product files exist; investigate any extra change before proceeding
- confirm public 5273 still serves `6ba98d9d...`
- confirm private 5293 is the remediation candidate
- read §23B.16 and this handoff

### Step B — close Multi R10 correctly

- regenerate fresh Multi inventory if necessary
- fix the Multi harness lifecycle/surface assumptions
- isolate each perspective or fully recover after each test
- special-case only based on Product contract, not on expected outcome guesses
- run all 34 executable perspectives
- record main pattern, period mode, follow-up answer text/role, supporting metrics, source-separation, overflow/pageerror
- screenshot browser output only if useful; do not use image generation

### Step C — investigate any genuine Multi failures

Use the same semantic/complementarity grammar as Single. Do not create a second Multi intelligence system.

### Step D — final source verification

Run targeted tests for the latest semantic fixes, then a broad remediation aggregate, then:

`pnpm --dir apps/desktop test:release-1.0`

(or equivalent exact project command from package.json; verify before executing).

Require production build PASS, governed regression PASS and `release_1_0_suite=passed`.

### Step E — review diff before commit

- `git diff --check`
- scan for accidental hard-coding of synthetic sample names/values
- confirm no 51xx / private NetBird leakage into public bundle changes
- inspect `Investigation`/composition/Understanding diffs for reviewability
- ensure temporary audit tests/harness files remain outside Product tracked tree

### Step F — documentation closeout

Update canonical §23B.16 with measured R1–R10 closure evidence.

Then update normal durable owners only after source/browser gates are truly closed:

- `docs/project-book/LIGHTBI_PROJECT_BOOK.md`
- `docs/project-book/LIGHTBI_WORKLOG.md`
- `docs/project-book/LIGHTBI_CODE_MAP.md`
- `.lightbi/CURRENT_CHECKPOINT.json`
- source catalog/checksums for changed catalog-scope sources

### Step G — commit Product and Docs separately

Do not mix Product code and Docs changes.

### Step H — immutable NEXT deployment

Build exact Product commit and create immutable root. Rotate **only Gateway 5273**. Preserve Core 5272, CP 5274 and Trust identities. Production / 51xx remains untouched.

### Step I — final live browser acceptance + owner Web UAT

Re-run representative Single, synthetic safety, Multi pair/full-six and Dashboard layout on exact live SHA. Then hand the public NEXT URL to the owner for visual testing. Do not trigger Windows/native until owner accepts Web.

## 13. Do-not-do list

- Do not create AI-generated images. Owner repeatedly asked to stop image generation.
- Do not infer chart correctness from screenshots alone when runtime plan/Fiber evidence is available.
- Do not make 1/3/5 a chart-count target.
- Do not admit supports merely because they share a domain.
- Do not treat different dimensions as different analytical stories by default.
- Do not use Unit Price, record count or other surrogate as a business value/exposure metric without semantic authority.
- Do not weaken semantic admission to make MB appear more influential.
- Do not join raw rows across unrelated Multi sources.
- Do not touch 51xx / Production.
- Do not discard the dirty Product worktree or uncommitted §23B.16 docs plan.
- Do not call the current remediation released until it is committed, built immutably, live-tested and owner-reviewed.

## 14. Architectural direction for future domain expansion

The owner asked whether these changes must be redone when new domains are added. The intended answer is no: the remediation is deliberately converting chart intelligence into reusable core grammar.

Reusable core:

- semantic answer binding
- abstention / no surrogate rule
- complementarity and duplicate-information gate
- MB-after-admission
- 1/3/5 layout normalization
- cardinality shaping
- temporal grain shaping
- part-to-whole logic
- compound-measure recognition
- renderer suitability
- evidence/governance

New domain support should primarily add a **Domain Pack**:

`Vocabulary + Semantic Recipes + Presentation Priors + MB Cards + Oracle Tests`

Only genuinely new analytical primitives (for example survival curve, market candlestick, advanced SPC, fraud network graph) should require core ontology/renderer expansion. Do not build separate planners per domain.

## 15. Audit artifact map

Main directory:

`/tmp/lightbi-chart-audit-20260910`

High-value files:

- `synthetic-oracles.json` — declared synthetic expectations
- `synthetic-r9c-full/results.json` — latest full synthetic controlled execution
- `canonical-r9d-current2/results.json` — current 126-case canonical execution
- `inventory-r9d-canonical.json` — fresh canonical inventory
- `mb-ab-r9e.json` — paired MB audit artifact
- `multi-inventory-r9e.json` — fresh 34-perspective Multi inventory
- `multi-r10-matrix/results.json` — incomplete/invalid matrix due harness lifecycle failure; use only as debugging evidence
- `probe_actor_diag.js`, `probe_actor_runtime.js`, `probe_r9e_actor_dup.js` — useful late semantic diagnostics
- `probe_s09_scoped.js`, `probe_s09b_exact.js` — Actual/Target navigation/binding probes
- `echarts_probe.js`, `fiber_probe.js` — runtime chart/Fiber extraction proof-of-concept

Screenshots under the audit directory are real Playwright browser captures, not generated images.

## 16. Final handoff summary

The core lesson of this session is that LightBI's chart-quality problem was not primarily the 30-chart library or ECharts renderer. The decisive failures occurred earlier:

1. business semantic binding;
2. question reachability/action identity;
3. result shaping such as cardinality/time grain;
4. question-conditioned complementarity;
5. advisory MB ranking occurring before marginal-information validation.

The dirty remediation worktree has materially corrected those layers. Controlled synthetic oracles no longer show semantic-surrogate violations, canonical browser testing found and repaired additional registry/value-selection bugs, and MB can no longer introduce the earlier duplicate-support regression.

The work is **not finished**. The remaining release-critical task is Multi R10 systematic execution with a correct harness, followed by a fresh exact-worktree release-authoritative suite, documentation closeout, separate commits, immutable NEXT deployment and owner Web UAT.
