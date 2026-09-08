# Agent Handoff — LightBI UI/UX Refactor, DPR-0 through active DPR-4 — 2026-09-08

Status: **ACTIVE HANDOFF — DPR-0..DPR-3 CLOSED; DPR-4 SELECTED-SUBJECT INVESTIGATION IN PROGRESS**
Authority: operational continuity / historical provenance; canonical decisions remain in the active DPR plan and Project Book.
Owner intent: resume immediately without archaeology, preserve exact NEXT/runtime/authority invariants, and continue the Decision Presentation + UI/UX Refactor in phase order.

## 1. Mandatory read order for the next session

Read these before changing code or docs:

1. [`LIBRARY_RULES.md`](../../../project-book/LIBRARY_RULES.md) — documentation governance.
2. [`LIGHTBI_PROJECT_BOOK.md`](../../../project-book/LIGHTBI_PROJECT_BOOK.md), especially §§129–134 — durable DPR current truth.
3. [`AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md`](../plans/AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md) — active implementation plan; DPR-4 is active.
4. [`CURRENT_CHECKPOINT.json`](../../../../.lightbi/CURRENT_CHECKPOINT.json) — immediate execution position.
5. [`LIGHTBI_WORKLOG.md`](../../../project-book/LIGHTBI_WORKLOG.md), entries from 2026-09-07/08 covering Books study, logo, DPR-0..DPR-3.
6. [`EXTERNAL_SOURCE_REGISTER.md`](../../../project-book/EXTERNAL_SOURCE_REGISTER.md) — Frappe Books/Figma source provenance.
7. [`ui-baseline.md`](../../../design/ui-baseline.md) only as an older design baseline to reconcile; the active DPR plan has higher current relevance for this workstream.

Do not treat this handoff as stronger authority than those sources. If prose here conflicts with exact Product source, current plan, or Project Book, verify machine truth and update canonical owners rather than rewriting history.

## 2. Exact current machine truth at handoff

### Product source/worktree

- Repo/worktree: `/home/ubuntu/n8n2erpnext/LightBI-dpr0-contract-freeze`
- Branch: `codex/dpr0-contract-freeze`
- Last committed/pushed Product HEAD: `804fb2feec8528dc061ce299486ff653d02a92db`
- `804fb2f` is DPR-3 Analysis Narrative Planner closure.
- **IMPORTANT: the Product worktree is currently DIRTY with intentional DPR-4 WIP. Do not reset, clean, checkout over, or discard it.**

Current DPR-4 WIP files:

- modified: `apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.tsx`
- untracked: `apps/desktop/src/components/investigation/SelectedSubjectInvestigationBoard.tsx`
- untracked: `apps/desktop/src/components/investigation/SelectedSubjectInvestigationBoard.test.tsx`
- untracked: `apps/desktop/src/lib/selected-subject-investigation.ts`
- untracked: `apps/desktop/src/lib/selected-subject-investigation.test.ts`

Focused verification run immediately before this handoff:

- `selected-subject-investigation.test.ts`: 3/3 PASS
- `SelectedSubjectInvestigationBoard.test.tsx`: 1/1 PASS
- total current DPR-4 WIP focused proof: **4/4 PASS, 2/2 files**
- No DPR-4 TypeScript/full integration/release-authoritative acceptance has yet been recorded. Do not commit DPR-4 merely from the 4/4 focused result.

### Documentation source

- Docs repo: `/home/ubuntu/n8n2erpnext/LightBI-bada-docs-20260903`
- Branch: `docs/ba-da-mode-future-20260903`
- Current docs HEAD before creation of this handoff: `637ef3bea60f515bbc9a1091d1804aece68ba914`
- `a21b8b44203f6c71c08b15186985e17229b842f3` closed DPR-3 in plan/Project Book/Worklog/catalog.
- `637ef3b...` advanced the machine checkpoint to DPR-4.

### NEXT runtime — use 52xx only

The owner explicitly corrected a prior mistake: NEXT acceptance/testing must use the **52xx namespace**, not 51xx.

- Core/API: `100.94.184.141:5272`, PID `3376963`
- Gateway/UI/Web Live Demo: `100.94.184.141:5273`, PID `4013056`
- Distribution/Control Plane: `5274`, PID `2346997`
- Public Web Live Demo: `https://lightbi-next.thaiduy.digital/app/`
- Active immutable UI root: `/home/ubuntu/services/lightbi-next-web/dpr3-804fb2f`
- Public build manifest reports exact Product source `804fb2feec8528dc061ce299486ff653d02a92db`.
- Core generation remains `g-2026-09-05-next-034`.

Protected Trust launchers/process ancestry remains unchanged:

- signer PID `12020`
- installation issuer PID `3817149`
- attestation PID `1505209`
- Ubuntu user systemd manager PID `943`

**Never kill/restart PID 943 merely to regain systemd control. Never restart Trust for UI/DPR acceptance.**

Production is untouched. MB learning scheduler remains paused. Root filesystem at last closure was about 69% used with ~38 GiB free.

## 3. UI/UX refactor direction established before DPR implementation

The refactor is not a cosmetic reskin. It changes presentation planning, information architecture, chart/dashboard decision logic, evidence visibility and shared UI behavior while preserving governed numeric/evidence authority.

The active plan’s core product feeling is:

> The deeper the backend becomes, the calmer the frontend becomes.

And the app-wide density rule is:

> More information must create more structure, not more cards.

See the active plan sections on the Product-wide Information Architecture + Density Contract and hard invariants.

### 3.1 Frappe Books as primary composition/interaction reference

Pinned external source studied read-only:

- `frappe/books` exact SHA `a79a1e3b03f424805ad094e2fd8731d04f84d36f`
- local reference clone: `/home/ubuntu/n8n2erpnext/_external-reference/frappe-books-a79a1e3`
- no Books Vue/Electron source was copied into LightBI.

Books-derived reference measurements recorded in the active DPR plan include:

- sidebar `14rem` (~224 px)
- app/page header 64 px
- Windows custom title bar 28 px
- Windows window-control hit region ~48×28 px
- row rhythm 32/40/48/56/64 px, with 48 px common for dense business rows
- Inter-based compact business typography, mostly 12–14 px
- restrained radii/shadows and neutral shell surfaces
- fast 100–150 ms interaction motion
- native/WebView scrolling retained; scrollbar visually themed rather than replaced by a JS scroll engine
- Quick Search / command-palette behavior (`Ctrl/Cmd+K`, keyboard-first navigation)
- whole-sidebar collapse/reveal rather than permanent icon-rail clutter
- chart hover grammar: cursor-follow compact tooltips, nearest-point line interaction, active donut center/sector behavior.

Books is the **primary product UI/UX composition and interaction reference**, not the complete chart vocabulary. Owner-supplied chart/dashboard references remain semantic acceptance sources for patterns Books does not contain. See [`EXTERNAL_SOURCE_REGISTER.md`](../../../project-book/EXTERNAL_SOURCE_REGISTER.md) and the DPR plan chart-pattern sections.

### 3.2 Canvas-first, card-by-exception

Do not reproduce the legacy `card everywhere` model under a cleaner skin.

Hierarchy priority is:

`typography -> whitespace -> alignment -> grouping -> divider -> subtle surface -> border -> card`

Cards are appropriate for genuinely bounded objects such as KPI/decision/warning objects; they are not the default wrapper for every section. Analytical density should come from alignment, typography, row rhythm, disclosures and semantic surfaces.

### 3.3 Product-wide information-density contract

Applies to **every mode/surface**, not only Deep BA/multi-file:

- one surface = one primary objective
- `summary -> detail -> evidence -> raw/technical`
- orientation/context must remain understandable while detail scrolls
- avoid more than about two full-weight analytical depth layers at once
- entering deeper analysis replaces/collapses prior layers rather than appending indefinitely
- raw evidence stays reachable but does not sit in the middle of the primary narrative
- Back/Close must restore the exact previous state
- responsive layout must reorder by priority, not simply stack every widget vertically
- density classes: `Calm`, `Working`, `Analytical`, `Evidence/Technical`
- default analytical viewport budget is approximately one main answer, 3–5 KPIs, one main chart, one attention/decision block, and at most one supporting table/list at full visual weight.

This contract is documented in the active DPR plan and Project Book §130.

### 3.4 Desktop and Web Live Demo parity

`/app` is **not a simplified marketing demo**. It is a near-1:1 fast product-validation environment intended to exercise the same React/state/planner/token/i18n/chart/evidence behavior before a Windows build is necessary.

- marketing/public `/` may differ
- Product Live Demo is `/app`
- Desktop/Tauri and Web `/app` must share the same presentation implementation wherever capability exists
- genuine native-only behavior uses explicit adapters or truthful unavailable states
- no separate `DemoHome`, `DemoWorkspace`, or divergent demo product architecture.

Acceptance order for shared UI work should generally be:

`source/focused tests -> Web Live Demo /app on NEXT 5273 -> Desktop shared surface -> packaged/native only when native behavior requires it`.

## 4. Brand/logo authority established during the refactor

Owner selected Figma `LightBI Logo Concept`, node `19:5`, third concept `optimized li` as the official primary mark.

Canonical SVG SHA-256:

`9486181bb525d1d4a704addaebfc2f1caa5abbd9d1240bad252b85a3f58e0d7b`

Source geometry/colors:

- 700×700
- black background
- primary mark yellow `#FFC20A`

Product primary-logo commit: `fde259a5441b36825f211914cbd0c82fc595f27f`
Control Plane/Distribution brand commit: `b6bc2735bcf99218443ae5c427701e5b1a7c938f`

Rule: **SVG is the master geometry; PNG/ICO/BMP are derived assets.** Do not hand-edit raster variants into different logo geometries.

The Figma MCP Starter quota blocked only later canvas rename/export-setting mutation; exact node/source geometry and owner approval are not ambiguous.

## 5. Micro Brain authority in this refactor

Owner explicitly admitted MB into DPR-2..DPR-7 because question relevance, narrative order, chart selection and dashboard composition need reusable domain/presentation knowledge. However MB remains a bounded advisor.

Authority order from the active plan:

`user-selected domain/perspective -> governed schema + metrics -> canonical semantics -> domain rules -> MB presentation advice -> deterministic planner -> UI/rendering`

MB MAY advise:

- question/perspective relevance and ordinal priorities
- domain-context questions requiring more evidence
- narrative-role priority and abstention/unknown hints
- later chart/domain candidates and dashboard story-role priors
- anti-pattern/prohibition/evidence-requirement recall.

MB MUST NOT:

- create or authorize a metric/formula/join/relationship
- strengthen evidence/decision authority
- turn retrieval similarity into semantic confidence
- create causal truth
- directly choose/persist renderer `ChartType`
- bypass deterministic Narrative/Visualization/Dashboard gates.

Every MB candidate must be rejectable. Planners may preserve or reduce authority, never strengthen it.

Presentation advisory foundation source: Product `4be593ae57b4b1385a833675dd4ea2349900d378` (88 presentation cards; isolated presentation dense space). See Project Book DPR/MB entries and the active plan MB authority section.

## 6. DPR phase history completed so far

### DPR-0 — CLOSED

Purpose: contract freeze, workflow convergence, design foundation and corrected baseline before broad migration.

Key Product commits:

- `85734e4...` — React shared boundary + monotonic i18n debt guard + durable presentation-debt fixtures
- `ca454ecab5aa029fb504388374837695e1e2cd11` — LightBI-owned design-token foundation
- `ce5c961...` — multi-file terminal workflow convergence
- `14c2d99801cde82716f58127bd006e150118e8c5` — corrected NEXT visual-baseline source/evidence

Critical workflow correction:

`decision_workspace -> evidence_drill -> deep_perspective | deep_selected`

Full-scope Deep BA and selected-data analysis are mutually exclusive at full visual weight. Back restores exact evidence state. This fixed the giant append-everything multi-file page before visual baseline freeze.

Corrected baseline acceptance:

- Playwright `2/2 PASS`
- nine tracked-corpus captures
- all full-page reference captures 1440×900
- Web Live Demo and Desktop share the same Product implementation.

See Project Book §§129–131 and DPR-0 sections of the active plan.

### DPR-1 — CLOSED

Product: `d027bb34e403968a60f6f3b053e3cfaf9ad42025`

Introduced presentation provenance vocabulary:

`OBSERVED | CALCULATED | SEMANTICALLY_RESOLVED | DOMAIN_CONTEXT | INFERRED | HYPOTHESIS`

Plus:

- `evidenceRefs[]`
- `knowledgeRefs[]`
- derivation
- limitations
- causal status
- decision-use restrictions
- downstream non-escalation guard
- shared collapsed-by-default `EvidenceInspector` beside Deep BA findings.

Invariant: presentation/MB cannot upgrade evidence-bound or hypothesis-only content into governed/causal authority.

Verification recorded:

- focused 25/25 PASS
- release-authoritative PASS
- governed 11 files / 42 tests PASS
- NEXT provenance smoke 1/1 PASS in 8.8s.

See Project Book §132 and DPR-1 in the active plan.

### DPR-2 — CLOSED

Product: `a876fb998b980f1eef0c5834822f622a80435b44`

Introduced deterministic open-world Question/Perspective Intelligence above governed question/action generation.

Key behavior:

- Domain and Perspective are separate inputs
- Universal + governed/canonical presentation candidates are semantically deduplicated into one lane
- answerability: `executable_now | descriptive_only | needs_more_evidence | unsupported`
- MB/domain may create open-world questions only as review-only `needs_more_evidence`, `actionAuthority=none`
- advisory review candidates have no execution button
- retrieval scores/internal semantic keys do not leak into the public planner contract
- neutral question wording avoids default best/worst/leader/laggard judgment.

Verification recorded:

- focused 56/56 PASS
- TypeScript PASS
- release-authoritative PASS
- governed 42/42 PASS
- runtime browser 1/1 PASS on 5273 `/app`.

See Project Book §133 and DPR-2 in the active plan.

### DPR-3 — CLOSED

Product: `804fb2feec8528dc061ce299486ff653d02a92db`

Introduced deterministic `lightbi.analysis-narrative-plan.v1` over existing governed outputs. It is a **projection/reordering layer**, not a numeric recomputation engine.

Narrative roles:

- `primary_answer`
- `key_driver`
- `risk_exception`
- `hypothesis`
- `supporting_observation`
- `unknown`
- `next_action`
- `supporting_evidence`

Key implementation:

- `apps/desktop/src/lib/analysis-narrative-plan.ts`
- `apps/desktop/src/components/investigation/AnalysisNarrativeBoard.tsx`
- single-source + selected-row/Step2 source overview paths use the same narrative grammar
- multi-source comparison uses an adapter into the same non-escalating policy
- duplicate `executive_answer`/same-finding narrative weight removed
- supporting-analysis relevance gate hides unavailable/irrelevant decomposition
- neutralized `TOP`, `leader`, `Growth #`, `Profit #` language without changing rankings/numbers
- new Narrative Board was flattened to typography/dividers/left rules rather than adding nested cards.

MB role in DPR-3 is bounded ordinal narrative advice only. `primary_answer` stays first; MB cannot mutate finding/evidence identity or confidence/authority.

Verification recorded:

- DPR-3 focused aggregate: **56/56 PASS across 10 files**
- `tsc -b + Vite production build` PASS; 3807 modules transformed
- Product commit pushed with LOCAL=REMOTE exact SHA
- immutable NEXT UI root `/home/ubuntu/services/lightbi-next-web/dpr3-804fb2f`
- only gateway 5273 rotated; Core 5272, CP 5274 and Trust PIDs stayed unchanged
- live `/app` built-in governed sales demo reached `/app/investigation -> Analyze deeper`
- live browser rendered `Analysis Narrative -> Main Answer -> Main observed contributors -> Risks & exceptions -> ...` with no page error.

Known unrelated live warning: public NEXT account-session request still raises a pre-existing CORS warning against the Production Distribution origin; this was outside the DPR-3 diff and did not block governed demo acceptance.

See Project Book §134 and DPR-3 closure evidence in the active plan.

## 7. DPR-4 — ACTIVE: exact current intent

Canonical plan requirements under “DPR-4 — BA Step 2 investigation model”:

- selected-data Step 2 must be a dedicated reversible analysis surface, mutually exclusive with full-scope Deep BA at full weight
- replace “Deep BA on selected rows” semantics with **selected-subject investigation** semantics
- add benchmark/context decomposition and concise next-action structure
- synthesize multi-source evidence into one answer where appropriate, while preserving source attribution/separation
- preserve all prior DPR-0 state grammar, DPR-1 provenance/non-escalation, DPR-2 authority boundaries and DPR-3 answer-first narrative policy.

The current WIP directly implements this direction; **do not restart DPR-4 from scratch**.

### 7.1 Current DPR-4 WIP contract

New `apps/desktop/src/lib/selected-subject-investigation.ts` defines:

`lightbi.selected-subject-investigation.v1`

Important public policy fields already present:

- `answerFirst: true`
- `selectedScopeOnly: true`
- `preserveSourceSeparation: true`
- `crossSourceJoinAllowed: false`
- `governedSummaryUnchanged: true`
- `benchmarkIsContextNotAuthority: true`
- `mbMayStrengthenAuthority: false`

The plan builds per-source summaries from existing `SingleSourceBAOverview` + DPR-3 `AnalysisNarrativePlan`; it does not recompute governed summary metrics or join raw sources.

Current structures include:

- selected subject scope: dimension/label/metric/period/focus
- per-source selected/matched/reference row counts and bounded ratios
- attributed per-source primary answer/key drivers
- context decomposition from existing Deep BA decomposition objects
- existing available period/peer/baseline/target comparisons only
- deduplicated next actions, unknowns and follow-up questions with source attribution
- top selected-scope primary answer chosen by deterministic existing narrative relevance score; this is presentation selection, not authority elevation.

Parallel multi-source presentation is explicit `sourceMode='parallel_sources'`; raw source facts remain separate and `crossSourceJoinAllowed=false`.

### 7.2 Current DPR-4 WIP renderer

New `SelectedSubjectInvestigationBoard.tsx` is intentionally canvas-first and currently renders:

- Selected-subject investigation orientation/header
- one attributed Main answer
- Benchmark & context table; row coverage is explicitly context, not metric/comparison authority
- Parallel source evidence synthesis while keeping source/finding attribution
- concise “What can be checked next?” actions/questions
- “What is still unknown?”
- source-separation policy disclosure
- per-source DPR-3 detailed Narrative Board under collapsed disclosures.

The current renderer avoids rendering one full `SingleSourceBAOverviewCard` per source at full weight.

### 7.3 Current integration WIP in `PerspectiveCollectionResultCard.tsx`

The modified component currently:

- replaces `SingleSourceBAOverviewCard` import in selected-scope multi-file rendering with `SelectedSubjectInvestigationBoard`
- builds `selectedSubjectInvestigationPlan` from existing `subsetOverviews`
- changes Evidence Drill copy from “Step 2 · Selected-data scope” toward “Selected evidence scope”
- changes CTA from “Deep BA analysis · Step 2” to “Investigate selected evidence”
- changes selected surface heading to “Selected-subject investigation”
- changes preview copy to say the investigation uses selected evidence rather than calling it Deep BA
- renders one `SelectedSubjectInvestigationBoard` rather than multiple full overview cards.

Existing state name `deep_selected` is still used internally. Renaming the internal enum is optional and should not be done merely for cosmetic purity if it causes unnecessary state/test churn; user-facing semantics are the important DPR-4 contract.

## 8. Exact next actions for the next session

Do these in order; do not skip straight to DPR-5 or DPR-8.

### Gate A — protect and understand current WIP

1. `cd /home/ubuntu/n8n2erpnext/LightBI-dpr0-contract-freeze`
2. verify HEAD remains `804fb2f...`
3. inspect `git status --short`
4. **do not reset/clean the five DPR-4 WIP paths**
5. read the four new/modified DPR-4 implementation paths and existing tests before editing.

### Gate B — finish DPR-4 contract parity across single-file and multi-file

The WIP currently targets the multi-file `PerspectiveCollectionResultCard` selected-scope path. Audit the single-file `InvestigationDeepAnalysis` + `FilteredDeepAnalysisScope` path next.

Current single-file debt still visible in source:

- user-facing “Deep BA analysis · Step 2”
- “Step 2 · Selected-data scope”
- “The existing deep-analysis framework is now applied only to the rows selected...”
- scope label `Step 2 · selected rows`
- selected scope is still presented through full `InvestigationDeepAnalysis` rather than the dedicated selected-subject semantics.

Desired convergence:

- both single-file and multi-file selected-row analysis use the **same selected-subject investigation grammar/contract** where data shapes permit
- do not force a cross-source shape into single-file; use an adapter if necessary
- keep the existing reversible state grammar and Back behavior
- do not allow full-scope Deep BA and selected-subject investigation simultaneously at full weight.

### Gate C — validate authority/count semantics in the current WIP

Before finalizing `buildSelectedSubjectInvestigationPlan`, explicitly review these points:

- `selectedRowCount`, `matchedRowCount`, `referenceRowCount` must describe exactly the scope they claim; do not silently set matched=selected when filters/truncation give different counts
- propagate `isTruncated`/representative-sample state correctly from single-file drill-through and multi-file evidence paths
- benchmark row ratios are contextual only; never use them as KPI authority
- preserve per-source attribution for every finding/action/question
- no cross-source raw JOIN or same-label entity assumption
- Focus exact-match rules remain fail-closed; a source with no exact Focus evidence must not be synthesized as if identity were known
- governed summary rows remain unchanged by selected-scope investigation
- MB remains bounded/non-escalating through the reused DPR-3 narrative planner.

### Gate D — tests before commit

The two new focused test files already PASS 4/4. Extend verification to include at least:

- existing `PerspectiveCollectionResultCard.test.tsx`
- existing `InvestigationDeepAnalysis.test.tsx`
- drill-through selected-row tests
- Focus selected-scope/authority tests (`deep-ba-investigation.mb.test.ts`, `mb6-investigation-wiring.test.ts`, relevant Focus tests)
- i18n language coverage/registry after replacing visible “Deep BA Step 2” wording
- DPR-3 narrative tests to prove reuse did not regress answer-first behavior
- TypeScript (`tsc -b`)
- release-authoritative suite after focused gates are green.

Do not weaken the monotonic i18n debt guard. Add new user-facing copy to the catalog/patterns rather than allowlisting it.

### Gate E — UI/UX review against the active plan

Before accepting DPR-4 source, check that the selected-subject screen follows:

- canvas-first/card-by-exception
- one primary answer at full weight
- benchmark/context as secondary, explicitly non-authoritative
- parallel source evidence attributed, not merged into an untraceable “single truth”
- concise next actions and unknowns
- per-source details collapsed by default
- no return of giant-scroll append-everything behavior
- information density solved by hierarchy/disclosure, not another stack of cards.

### Gate F — commit, NEXT 5273 successor, live acceptance

Only after source gates pass:

1. review `git diff --check`
2. confirm i18n semantic delta has no unrelated existing-message churn
3. stage exact DPR-4 files only
4. commit/push Product and verify LOCAL=REMOTE exact SHA
5. build exact SHA
6. create a new immutable web root under `/home/ubuntu/services/lightbi-next-web/` with a `lightbi.next-ui-build.v1` manifest
7. add a new final-precedence gateway EnvironmentFile drop-in that changes only `LIGHTBI_INTERNAL_WEB_ROOT`
8. restart **only** `lightbi-next-gateway.service`
9. prove 5272 PID, 5274 PID, Trust `12020/3817149/1505209` and PID 943 did not rotate
10. run browser acceptance through **NEXT 5273 `/app`**, not a 51xx local harness
11. test both single-file selected rows and multi-file selected evidence if practical with tracked/synthetic reproducible data
12. only then close DPR-4 in plan/Project Book/Worklog and advance checkpoint to DPR-5.

## 9. Phase order after DPR-4 — do not jump ahead

Per the active plan:

- **DPR-4 ACTIVE** — selected-subject investigation model
- DPR-5 — Visualization ontology + Chart Pattern Library + Domain Visual Profiles
- DPR-6 — governed Visualization Planner + renderer/type preservation; this phase owns the remaining Dashboard chart-type-collapse debt
- DPR-7 — Dashboard Composition Planner / semantic story roles / information budget
- DPR-8 — broad canvas-first surface refactor + shared UI system
- DPR-9 — Report Page Model + true export pagination
- DPR-10 — cross-domain/environment parity/release acceptance.

DPR-5/DPR-6 are where MB’s chart/domain knowledge becomes an explicit advisory input. Deterministic visualization suitability remains final authority. **Do not let current direct renderer type mappings become the final planner architecture merely because they already exist.**

## 10. Known debts / traps that must not derail DPR-4

### 10.1 Full `npm test` historical/audit failures

During DPR-3, running the entire legacy suite in a dirty worktree exposed historical/audit tests that depend on missing `docs/architecture` artifacts, sample-data paths, clean-tree snapshots or stale source literals. Machine comparison against baseline `a876fb9` showed representative failing source files were byte-unchanged and required files were already absent at the baseline.

Do not “fix” unrelated historical audit debt inside DPR-4 merely to make an indiscriminate full-suite run green. Use the release-authoritative suite plus scoped current tests, while classifying any additional failure with baseline proof before dismissing it.

Also note clean-tree audit tests may intentionally fail while the DPR worktree is dirty. Re-run relevant clean-tree/governance probes after commit if required.

### 10.2 Account-session CORS warning on public NEXT

Browser acceptance during DPR-3 showed a pre-existing account-session CORS warning calling the Production Distribution origin from `lightbi-next.thaiduy.digital`. It did not cause a page error or block the governed demo Deep BA path. It is outside DPR-4 unless current code changes that routing.

Do not silently “fix” it by bypassing account/auth/trust boundaries as part of UI work.

### 10.3 NEXT port namespace

A prior session accidentally tried 5172/5175/5176 local harnesses. Owner explicitly rejected this. Those temporary processes were stopped.

**DPR/NEXT acceptance must use 5272/5273/5274.** Existing unrelated 51xx processes must not be killed just because they exist.

### 10.4 Trust and stale NEXT047

NEXT047 is stale and predates later security/worker/privacy/DPR changes. Installation-issuer mismatch for that stale candidate is intentionally deferred until a real official successor packaging cycle.

Do not restart Trust to make an old candidate pass.

## 11. Deployment pattern proven safe for DPR UI-only successors

The current gateway service uses:

- unit: `~/.config/systemd/user/lightbi-next-gateway.service`
- executable overlay: `/home/ubuntu/services/lightbi-next-runtime/gateway-overlay-68e5bc1/run-internal-gateway.mjs`
- static web root selected by `LIGHTBI_INTERNAL_WEB_ROOT`

DPR-0, DPR-1, DPR-2 and DPR-3 were deployed as immutable UI roots with successive late-precedence EnvironmentFile drop-ins. UI-only DPR deploys did **not** change the `current` Core symlink or rebuild/restart Core.

Safe pattern:

- copy exact built `apps/desktop/dist` into a new immutable root
- add build manifest with source SHA/scope/core generation
- set dirs 0555 / static files 0444 after staging
- env file mode 0600, containing only the web-root path for this UI overlay
- drop-in references that env file
- `systemctl --user daemon-reload`
- restart only gateway
- verify effective process environment path and build manifest
- verify protected PID invariants.

Do not expose unrelated env values or secrets in logs/handoffs.

## 12. Documentation closure procedure when DPR-4 finishes

Follow [`LIBRARY_RULES.md`](../../../project-book/LIBRARY_RULES.md):

- update the **existing** active DPR plan; do not create a parallel “final/latest” plan
- append current truth to Project Book; do not rewrite old DPR history
- add a durable Worklog entry only for material closure/current understanding
- if the indexed active plan or this handoff changes, refresh `SOURCE_CATALOG.md` + `source_catalog.json`
- checkpoint `.lightbi/CURRENT_CHECKPOINT.json` is overwrite-only and excluded from catalog
- run `git diff --check`
- commit/push canonical docs separately from Product code
- checkpoint can be a separate small commit after closure, following the established DPR pattern.

## 13. Source bookmarks / exact implementation bookmarks

Canonical documentation:

- [`DPR active plan`](../plans/AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md)
- [`Project Book`](../../../project-book/LIGHTBI_PROJECT_BOOK.md) — §§129–134
- [`Worklog`](../../../project-book/LIGHTBI_WORKLOG.md)
- [`Library Rules`](../../../project-book/LIBRARY_RULES.md)
- [`External Source Register`](../../../project-book/EXTERNAL_SOURCE_REGISTER.md)
- [`Source Catalog`](../../../project-book/SOURCE_CATALOG.md)
- [`Current Checkpoint`](../../../../.lightbi/CURRENT_CHECKPOINT.json)

Product source paths at handoff:

- `apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.tsx`
- `apps/desktop/src/components/investigation/InvestigationDeepAnalysis.tsx`
- `apps/desktop/src/components/investigation/InvestigationDrillThroughPanel.tsx`
- `apps/desktop/src/components/investigation/SingleSourceBAOverviewCard.tsx`
- `apps/desktop/src/components/investigation/AnalysisNarrativeBoard.tsx`
- `apps/desktop/src/components/investigation/SelectedSubjectInvestigationBoard.tsx` **WIP/untracked**
- `apps/desktop/src/lib/analysis-narrative-plan.ts`
- `apps/desktop/src/lib/selected-subject-investigation.ts` **WIP/untracked**
- `apps/desktop/src/lib/single-source-ba-overview.ts`
- `apps/desktop/src/lib/deep-ba-investigation.ts`
- `apps/desktop/src/lib/understanding-core/ba-analysis-authority-context.ts`

Key tests:

- `apps/desktop/src/lib/analysis-narrative-plan.test.ts`
- `apps/desktop/src/lib/selected-subject-investigation.test.ts` **WIP/untracked; 3/3 PASS at handoff**
- `apps/desktop/src/components/investigation/SelectedSubjectInvestigationBoard.test.tsx` **WIP/untracked; 1/1 PASS at handoff**
- `apps/desktop/src/components/analysis/PerspectiveCollectionResultCard.test.tsx`
- `apps/desktop/src/components/investigation/InvestigationDeepAnalysis.test.tsx`
- `apps/desktop/src/lib/deep-ba-investigation.mb.test.ts`
- `apps/desktop/src/lib/mb6-investigation-wiring.test.ts`

## 14. Resume checklist — shortest safe path

A successor session can resume with:

```text
1. Read Library Rules -> Project Book §§129–134 -> active DPR plan -> checkpoint -> this handoff.
2. Verify Product HEAD 804fb2f and inspect the five DPR-4 WIP paths; DO NOT reset them.
3. Re-run the 4 focused DPR-4 WIP tests if the worktree changed.
4. Audit single-file filteredScope/InvestigationDeepAnalysis and converge its user-facing Step2 semantics on selected-subject investigation.
5. Validate scope counts/truncation/source attribution/Focus fail-closed semantics.
6. Run focused integration + i18n + DPR-3 regression + TypeScript + release-authoritative suite.
7. Review canvas-first/information-density contract; no card soup or giant append.
8. Commit/push exact Product source only when green.
9. Deploy immutable UI-only successor to NEXT 5273; preserve 5272/5274/Trust PIDs.
10. Browser-accept single-file + multi-file selected-subject investigation on /app.
11. Close DPR-4 in canonical docs/catalog/checkpoint, then begin DPR-5 — not DPR-8.
```

## 15. Things the next session must NOT do

- do not reset/clean the current DPR-4 WIP
- do not use 51xx for NEXT acceptance
- do not restart PID 943 or protected Trust for UI testing
- do not touch Production
- do not merge MB advisory relevance into governed metric/causal authority
- do not JOIN multi-source selected evidence merely because labels match
- do not let selected rows rewrite governed summary values
- do not fix unrelated audit/test archaeology inside DPR-4 without proving it is a current blocker
- do not start broad DPR-8 visual flattening before DPR-4→DPR-7 planner/ontology sequence finishes
- do not make card count or chart variety a success metric
- do not create new “latest/final” documentation when the active owner document already exists.

---

Handoff truth point: 2026-09-08 after DPR-3 live closure and during early DPR-4 implementation. Product committed baseline is `804fb2f...`, live NEXT UI is DPR-3 `dpr3-804fb2f`, and the five DPR-4 WIP paths listed above are intentionally uncommitted. The immediate job is to finish and prove DPR-4 selected-subject investigation on both shared single-file and multi-file paths without weakening evidence, authority, Focus or source-separation rules.
