# Agent Implementation Plan — Decision Presentation + UI/UX Refactor — 2026-09-04

Status: **DPR-0 ACTIVE — CONTRACT FREEZE + DESIGN FOUNDATION SOURCE-CLOSED; MULTI-FILE TERMINAL WORKFLOW CONVERGENCE PRECEDES VISUAL BASELINE FREEZE**
Date: 2026-09-04
Amended: 2026-09-05 — owner added design-system/i18n hardening and Frappe UI reference direction.
Amended: 2026-09-06 — owner elevated Frappe Books as a primary product-UX study source and added a canonical chart-pattern/visual-grammar library direction.
Amended: 2026-09-06 — owner explicitly admitted Micro Brain into DPR-2..DPR-7 as bounded presentation/domain/chart/narrative advice; deterministic planners remain final decision gates.
Amended: 2026-09-07 — DPR-0 re-pinned and cloned Frappe Books `a79a1e3...`; owner expanded the required Books study to exact visual-system measurements including proportions, spacing, typography, color, layout and desktop window chrome.
Amended: 2026-09-08 — DPR-0 contract-freeze chunk 1 source-closed at Product `85734e4...`: React-19 shared boundary, monotonic i18n debt guard, durable chart/question debt fixtures and release-suite enforcement.
Amended: 2026-09-08 — owner promoted Figma `LightBI Logo Concept` node `19:5` (`optimized li`) to the LightBI primary mark and required SVG-first derivation across Desktop/native/Distribution branding.
Amended: 2026-09-08 — owner elevated app-wide information architecture/density to a hard product contract, required multi-file terminal Deep BA/Step 2 workflow convergence before visual-baseline freeze, and made Web Live Demo `/app` a near-1:1 product-validation lane alongside Desktop.
Scope: Question/Perspective, narrative, visualization, Dashboard, evidence, export and product UI-surface refactor.
Authority: design/implementation plan; not runtime or metric authority.
Code-audit snapshot: current clean DPR-0 Product worktree is `codex/dpr0-contract-freeze` at `ca454ecab5aa029fb504388374837695e1e2cd11`, descendant of optimized-li brand source `fde259a5441b36825f211914cbd0c82fc595f27f`; Control Plane brand source remains `b6bc2735bcf99218443ae5c427701e5b1a7c938f`. Contract/dependency/design-token foundation is source-closed; broad surface migration remains pending behind multi-file terminal workflow convergence and a corrected cross-environment visual baseline.
Supersedes: none.

Repository target when implementation is authorized: public LightBI product successor.
Documentation owner: `docs/history/agent/plans/` under `LIBRARY_RULES.md`.

## 1. Purpose

This plan consolidates the owner review that began with the supplied chart/dashboard visual reference and continued through direct inspection of the current Question/Perspective, Decision Workspace, Dashboard, Deep BA, BA Step 2, evidence and export paths.

The problem is not merely visual styling. LightBI has become much stronger at understanding source data after Micro Brain, but several downstream layers still use older closed-world, append-everything and card-everywhere presentation logic.

The refactor therefore covers both **UI/UX** and the **planning/composition logic that decides what the UI should show, in what order, with what visual, and with what evidence provenance**.

Primary objective:

> Turn LightBI from an engine that emits many valid outputs into an analyst-guided workspace that understands the question, prioritizes the answer, chooses an appropriate visual, composes a coherent dashboard/report, and keeps evidence inspectable without drowning the primary narrative.

This plan does **not** authorize new metric truth, new domain support, causal claims, or runtime authority. Existing governed calculation/evidence boundaries remain authoritative.

## 2. Non-goals and scheduling boundary

- Do not rewrite trusted metric calculation merely to simplify presentation.
- Do not let Micro Brain authorize metrics, formulas, joins, runtime execution or decision use.
- Do not expand official domain support by UI wording alone.
- Do not treat retrieval similarity as semantic confidence.
- Do not start adding chart types before the planner can choose them safely.
- Do not silently replace the current Road-to-1.0 critical path; exact execution scheduling remains owner-gated.
## 3. Owner-supplied visual review that triggered this plan

The first reference image is a broad dashboard/chart vocabulary rather than a UI to copy 1:1. It demonstrates common analytical archetypes that LightBI should understand as semantic visual tools:

- grouped/clustered bar;
- KPI / scorecard;
- KPI + delta;
- sparkline;
- progress/target indicator;
- donut / part-to-whole;
- radar/profile;
- bar + line combination;
- line trend;
- area trend;
- horizontal/ranked bar;
- geographic/map view;
- summary metric tiles.

Owner direction: bring the useful chart families into the LightBI visual library, but first standardize **why a chart exists and when it is appropriate**. A larger renderer without better planning would only give LightBI more ways to choose the wrong chart.

Subsequent screenshots exposed a product-wide presentation issue:

- Home already uses many bordered cards for controls, source entry and empty states.
- Understanding nests cards inside a large card, then renders each perspective and question as another card.
- Decision Workspace puts charts before the BA answer and mixes audit/runtime details into the primary journey.
- Deep BA becomes an extremely long sequence of same-weight sections/cards instead of a board-ready analysis.

Owner-level UI direction from this review: **canvas-first, card-by-exception**.
## 4. Current-state code audit — Question and Perspective layer

Direct product-code inspection found that Micro Brain is already used during semantic candidate generation/resolution, but the question/perspective layer is not yet equally open-world.

Current canonical flow in `understanding-core/canonical-consumer-boundary.ts` is effectively:

`physical profile -> semantic candidates + selective MB -> semantic resolution -> grain -> readiness -> domain activation -> metric preflight -> domain inference -> governed question generation`.

Critical disconnect: `domainInference` is calculated, but it is not passed to `generateGovernedCommerceQuestionsAndActions(...)`. Therefore MB can recover/strengthen a semantic concept upstream and indirectly make an existing governed question executable, but it does not yet directly influence question discovery, domain wording, perspective relevance or recommendation priority.

The governed question policy in `understanding-core/commerce-distribution-question-policy.ts` is intentionally fixed and safety-oriented. It correctly binds questions to governed metrics, dimensions, time requirements, prohibited uses and runtime preflight. **This authority layer must be preserved.**

`projectCanonicalDomainPerspectives()` in `canonical-source-candidate-projection.ts` derives single-source perspectives from `listDomainCatalogs()` plus canonical/related signals. It does not consume `artifact.domainInference.primaryDomain` or its provenance.

`domain-knowledge-catalog.ts` currently defines the closed six-domain vocabulary:

`operations | revenue | inventory | customer | performance | finance`.

As a result, Understanding can now say `Healthcare` or another inferred domain from Micro Brain while the perspective chooser beneath it still lives in the six-domain world.

`UnderstandingNextCard.tsx` is MB-aware in the Understanding summary, but the perspective selector consumes canonical perspectives from the older projection. The current recommended perspective is essentially the first `governed_action_available` item after ordering, not the most relevant domain/question context.

The UI also renders two independent paths named roughly “Other questions this data can answer” (`universalActions` and `readyExecutableAnalyses`), producing duplicated question sections.

### Decision

Separate **Domain** from **Perspective**:

- Domain = the business world/context, e.g. Healthcare, Hospitality, Fresh/FMCG, Manufacturing, Logistics.
- Perspective = the analytical angle, e.g. Performance, Capacity, Risk, Flow, Contribution, Trend, Quality, Efficiency, Utilization, Exceptions.
## 5. Open-world Question / Perspective Intelligence

Add an intelligence layer above governed question/metric authority:

`Understanding + semantic resolution + MB domain context -> Question/Perspective Intelligence -> governed question/metric gate -> executable / descriptive / needs evidence / unsupported`.

Micro Brain may contribute domain patterns such as “waiting time and capacity matter in healthcare” or “expiry/replenishment matter in pharma”, but it must never create calculation authority.

Question candidates should carry explicit basis and answerability:

- `data_evidence` — suggested directly from source semantics that are currently available;
- `domain_context` — suggested because MB/domain knowledge says the question is relevant;
- `data_plus_domain` — source evidence and domain knowledge both support asking it;
- `executable_now` — governed metric/action passes;
- `descriptive_only` — safe descriptive evidence exists but governed calculation is unavailable;
- `needs_more_evidence` — useful domain question, but required source signals are missing;
- `unsupported` — product authority does not currently support the operation.

Example for Fresh/FMCG:

- “How does cancellation rate vary by store?” — data + domain context; executable only if governed metric inputs exist.
- “How has cancellation changed over time?” — data evidence; executable if time basis is valid.
- “How does cancellation vary with stock level?” — domain-informed exploratory relationship; no causal language.
- “Could expiry exposure explain cancellation?” — domain question; show missing expiry/batch evidence when unavailable.

Recommended-question ranking should consider current domain, selected perspective, focus, semantic relevance, evidence completeness and governed executability. It must not be “first ready item wins”.

Question wording should be neutral by default. Avoid importing evaluation such as `best`, `worst`, `leader`, `laggard`, `needs attention` unless metric desirability is explicitly known.
## 6. Claim provenance — distinguish data truth from Micro Brain knowledge

Every important analytical statement should be able to say where its meaning came from without cluttering the primary report.

Proposed claim-basis vocabulary:

- `OBSERVED` — directly present in governed source evidence;
- `CALCULATED` — derived by an authorized metric/formula path;
- `SEMANTICALLY_RESOLVED` — source evidence + semantic resolver established the business meaning;
- `DOMAIN_CONTEXT` — reusable domain knowledge supplied through Micro Brain;
- `INFERRED` — interpretation combining governed source evidence and domain knowledge;
- `HYPOTHESIS` — plausible question/explanation requiring more evidence.

A claim contract should retain `evidenceRefs[]`, `knowledgeRefs[]`, derivation, limitations, causal status and decision-use restrictions.

Example:

- “Cancellation rate moved from 4.2% to 2.8%.” -> `CALCULATED` from governed source evidence.
- “Lower cancellation is generally favorable in Fresh/FMCG.” -> `DOMAIN_CONTEXT` from MB/domain knowledge.
- “The movement may indicate lower waste exposure.” -> `INFERRED`, with missing spoilage/expiry evidence and `causalStatus=not_established`.

The primary UI should use compact provenance actions such as `Evidence`, `Domain context` or `Inference`. Clicking opens one shared Evidence Inspector instead of dumping audit detail inline.

Do not convert MB retrieval scores into confidence percentages. Retrieval similarity remains retrieval provenance only.

## 7. Visualization Intelligence — current defects

Current visual selection is mostly mechanical rather than analytical:

- runtime intent mapping reduces `group_by -> bar`, `trend -> line`, `distribution -> bar`, `relationship -> scatter`, `table -> table`;
- `decision-visualization-plan.ts` contains row-count-driven behavior that can select line simply because multiple rows exist;
- `chart-preview-model.ts` uses field-name/shape heuristics to find Y values;
- the core chart vocabulary is broader than the paths that actually preserve/render it.
Two type-loss defects are especially important:

- chart persistence maps line -> `Line`, table -> `Table`, and everything else -> `Bar`, so scatter can silently become Bar;
- Dashboard rendering maps Line -> line, Donut/Pie -> donut, and most remaining chart types -> bar, collapsing Row/Funnel/Bubble behavior.

The `/Charts` library currently exposes only a small template set: Trend over time, Compare groups, Share of total, KPI scorecard and Evidence table.

### Analytical intent taxonomy

Visualization choice should start from analytical intent, not renderer type:

`single_value | comparison | ranking | trend | change | composition | distribution | relationship | target_progress | variance | flow | funnel | profile | geography | detail_evidence`.

### Standard visual vocabulary

The initial standard library should cover approximately:

1. KPI Number
2. KPI + Delta
3. KPI Progress / Target
4. Vertical Bar
5. Horizontal Ranked Bar
6. Grouped Bar
7. Stacked Bar
8. Line
9. Area
10. Bar + Line Combo
11. Donut
12. Scatter / Bubble
13. Radar
14. Funnel
15. Geo / Map
16. Evidence Table

Sparkline is preferably a companion visual for KPI/card context rather than a mandatory standalone chart family.
### Suitability and negative rules

Every visual family needs both positive and negative use rules.

Examples:

- Donut: valid for genuine part-to-whole with low category cardinality; reject long category lists, unrelated categories, time series or incompatible negative values.
- Radar: valid for a small normalized/comparable profile; reject unrelated units and excessive axes.
- Map: require confirmed geography/coordinates; a field named “Area” must not become a map without geographic semantics.
- Combo: require an analytical relationship such as actual-vs-target or amount-vs-rate; do not combine arbitrary measures because two measures exist.
- Line: require ordered time/sequence semantics; multiple categorical rows alone are not a time series.

Proposed `VisualizationPlan` should carry visual intent, chart family, dimension/measure roles, X/Y/series/time/category fields, sort, top-N policy, normalization, stacking, reference/target lines, secondary axis, reason, fallback and governance/evidence references.

## 8. Domain Visual Profiles — use MB as a domain prior

Different domains have common visual and dashboard conventions. MB can provide those conventions as a prior after domain inference, while Visualization/Dashboard planners retain the final decision.

Examples:

- Hospitality: Occupancy, ADR, RevPAR, available rooms, booking pace; common patterns include KPI, occupancy trend, actual-vs-target, capacity/room-type breakdown.
- Pharma/warehouse: on-hand, available/reserved, batch/expiry exposure, stockout/reorder; common patterns include KPI, ranked bars, aging buckets, trend and exception tables.
- Healthcare: patient volume, bed occupancy, waiting time, length of stay, readmission, department load; common patterns include KPI, trend, department comparison, distributions and exceptions.
- Manufacturing: OEE, yield, scrap, downtime, production target and quality; common patterns include target-vs-actual, trend, defect/downtime contribution and machine/line comparison.
- Logistics: on-time/SLA, route, carrier, delivery duration, cost and exceptions; long labels often favor horizontal bars.
- Agriculture: yield, field/plot, season, irrigation/weather and geography; trend, seasonal comparison, relationship and map views are common when evidence allows.

MB must never directly say “draw Donut and therefore it is correct”. It supplies reusable domain context; the planner checks the actual question, cardinality, grain, units, semantics and governed authority.

## 8A. Owner decision — Micro Brain joins the refactor as a bounded semantic/presentation advisor

Owner decision on 2026-09-06: Micro Brain is an explicit participant in the Decision Presentation + UI/UX refactor because DPR-2 through DPR-7 change question ranking, BA narrative, chart planning and Dashboard composition deep enough that domain/chart knowledge should be reusable rather than re-hard-coded independently in each planner.

The approved role is **advisor, never final decision maker**. The refactor should consume MB through a bounded presentation-advice contract that can rank domain conventions, analytical intents, chart patterns, perspective priorities, dashboard roles, narrative order and missing-evidence/abstention signals. Deterministic planners remain responsible for validating the actual question, source identity, grain, units, time basis, cardinality, governed metric/evidence state and renderer prerequisites before any output is accepted.

The planned authority order is:

`user-selected domain/perspective -> governed schema + metrics -> canonical semantics -> domain rules -> MB presentation advice -> deterministic Narrative/Visualization/Dashboard planner -> UI heuristic/rendering`.

MB may therefore influence **what is worth considering and why**, but it may not strengthen authority. It must not invent metrics/numbers, authorize aggregations/formulas/joins, infer causality from correlation, override an explicit user domain/perspective, hide evidence gaps, or convert retrieval similarity into semantic confidence.

The presentation-advice lane should remain isolated from the accepted semantic-retrieval dense space. This allows chart/domain/dashboard knowledge to grow without rotating or diluting semantic concept recovery. The initial product implementation may use two locally bundled indexes/lobes behind one Micro Brain boundary: a semantic lobe for business meaning and a presentation lobe for chart/domain/narrative advice. This is an implementation shape, not a claim of biological cognition or autonomy.

The advisor contract should expose enough provenance for downstream planning, including the advisory card/concept identity, definition, advisory kind, candidate chart families/analytical intents/dashboard roles, evidence requirements, constraints/prohibitions and retrieval provenance. The UI should normally show the consequence of this reasoning, not raw retrieval scores or internal MB machinery.

This decision is especially relevant to DPR-2, DPR-3, DPR-5, DPR-6 and DPR-7. DPR-5 owns the canonical chart/domain knowledge contract; DPR-6 and DPR-7 remain the final deterministic chart/dashboard decision gates; DPR-3 may use MB only to prioritize/report domain context and must preserve observed/calculated/inferred/hypothesis provenance.

## 9. Dashboard Composition Intelligence — current defect and target

The owner observed dashboards that generated five Bar cards. Code inspection confirms that this is structurally possible and sometimes expected by the current implementation.

Current single-source dashboard composition takes up to three BA breakdowns and hard-codes each to `type: 'Bar'`. If the primary chart and a supporting analysis are also Bar, five Bar visuals can appear without any narrative diversity/relevance check.

Multi-source composition similarly adds a primary visual, KPI material and up to four breakdown charts, with breakdowns hard-coded to Bar.

`dashboard-evidence-dedup.ts` deduplicates dimension+measure identity, not analytical duplication, visual duplication or narrative duplication. `revenue by branch`, `revenue by product`, `revenue by customer` and `revenue by region` are technically distinct yet may form a repetitive dashboard.

Current layout is also mechanical: generic width/height classes and auto-flow produce widget placement rather than a designed story hierarchy.

### Decision

Add **Dashboard Composition Intelligence** above the renderer.

Dashboard planning should think in semantic roles rather than ChartType:

`hero_metric | context_metric | primary_answer | trend_context | ranked_driver | composition_context | target_progress | relationship_context | risk_exception | evidence_table`.

A dashboard plan should retain:

- decision perspective and audience;
- each card/section analytical question and role;
- linked VisualizationPlan;
- priority and evidence refs;
- width/height/placement group;
- story order;
- card/information budget;
- duplication/relevance policy;
- reason for inclusion.

Do not impose fake diversity such as “must contain Bar + Line + Donut”. Multiple bars are acceptable only when they answer materially different management questions.
A useful executive information budget is roughly one hero metric, a small support-KPI band, one primary visual, two or three supporting/driver/risk visuals and optionally evidence. This is a relevance budget, not a hard card quota.

Domain dashboard grammar should come from `generic dashboard grammar + domain visual profile + current question/perspective + actual evidence` rather than one universal template with different labels.

## 10. Management ranking language and metric desirability

The review first considered Top 5 + Bottom 5 because managers care both about the leading edge and the weak tail. The final owner decision is more precise: **remove evaluative Top/Bottom language as the semantic default and use neutral wording.**

Use descriptive extremes such as:

- five highest observed values;
- five lowest observed values;
- largest increase / largest decrease;
- largest positive / negative numeric delta;
- largest contribution to the observed movement.

Do not equate high/low numeric position with good/bad business performance.

Example: in Fresh/FMCG a lower cancellation/waste rate is generally favorable. In inventory, both very low and very high coverage can be risky. Hotel occupancy near 100% can signal demand strength but may also indicate constrained capacity.

Metric interpretation therefore needs desirability metadata where known:

`higher_is_better | lower_is_better | target_is_better | range_is_better | context_dependent | unknown`.

When desirability is unknown, LightBI must stay descriptive. `increase/decrease` is mathematical direction; `favorable/adverse` is business interpretation and requires evidence/domain knowledge.

Observed extremes also differ from contribution to the total. An entity with the lowest KPI but tiny population weight may matter less than a larger entity whose moderate underperformance drags the overall KPI. Preserve both concepts separately:

`position in observed distribution != contribution to aggregate impact`.
## 11. Analysis Narrative Intelligence — Deep BA must read like a board report

Current Deep BA has many independently rendered panels (`BusinessBrainBriefPanel`, Business Fusion readouts/overview, BA Decision Brief, single-source overview, diagnostics, breakdowns, findings, recommendations). Each can contain its own “Main Answer”, KPI, driver, risk, recommendation and evidence language.

The result can be factually valid while still having no clear editorial hierarchy: several answers, drivers and risk blocks appear at the same visual weight.

`SingleSourceBAOverviewCard` also places the investigation framework (“What happened? Where? Why? ...”) ahead of the executive result. That is useful methodology, but not the correct order for a report prepared for management or a board presentation.

### Target narrative hierarchy

1. **Executive Summary** — primary question, main conclusion, 2–4 key numbers, decision implication.
2. **What changed?** — primary movement/variance with one or two central visuals.
3. **What drives the result?** — principal components/contributors relevant to the selected perspective.
4. **Why?** — distinguish observed drivers from evidence-backed explanation, domain-informed interpretation and unproven hypotheses.
5. **What should be done?** — a small ordered set of actions linked back to findings/evidence.
6. **Risks / limitations** — concise limits in the main report; full audit detail remains inspectable.

Introduce an `AnalysisNarrativePlan` carrying the primary question, executive conclusion, major findings, supporting drivers, explanation/causal status, recommendations, risks, unknowns and evidence references.

The Narrative Planner does not invent new numbers. It acts as an editor over already governed analysis outputs: deciding what is headline, what is supporting, what is a hypothesis, what belongs in evidence, and what should be omitted from the primary story because it is repetitive or irrelevant.

### Supporting-analysis relevance gate

A screenshot exposed a concrete semantic/narrative defect: the primary question was sales revenue contribution by product category, while a supporting chart titled “Money over time” displayed `UnitPrice`, and another support chart displayed `record_count` by item.

`Unit price != revenue`. A technically executable neighboring analysis must not be relabeled as evidence for the selected question. Supporting analyses must pass a relevance/semantic-label gate and explain or complement the primary question.
## 12. BA Step 2 is a different analytical job, not Deep BA on fewer rows

Current Step 2 largely reuses `SingleSourceBAOverviewCard` after filtering the selected rows. The practical model is therefore `Deep BA(full rows)` versus `Deep BA(selected rows)`.

The owner direction is to give Step 2 a distinct purpose:

- Deep BA answers: **What does this whole decision angle mean?**
- BA Step 2 answers: **Why does this selected entity/finding/component look like this?**

Example: after selecting Da Nang revenue = 12M, Step 2 should investigate why that selected subject differs from peers/benchmark: volume, average order, product mix, returns, stock availability, period anomaly, etc. It should not repeat the full Deep BA report.

Proposed Step 2 narrative:

1. Selected subject and benchmark context.
2. Why it matters / magnitude of difference.
3. Components that explain the observed difference.
4. Unusual patterns.
5. Likely-but-unproven explanations, explicitly labeled.
6. Next action / evidence to inspect.
7. Evidence link.

Step 2 should normally be shorter than Deep BA.

For multi-source analysis, avoid rendering one independent BA report per source. Source families should contribute evidence to one synthesized answer unless the user explicitly requests source-by-source reports.

## 13. Evidence placement — preserve trust, remove visual overload

Evidence remains mandatory; only its placement changes.

Replace scattered inline technical blocks/details with one shared **Evidence Inspector / Drawer**. Any executive claim, finding, chart, driver or recommendation can open the drawer focused on its evidence reference.

The inspector should be able to show source identity, metric/formula, scope, rows, aggregation, semantic mapping, domain/MB knowledge basis, limitations, authority/restrictions and relevant runtime/query detail.
Primary Easy Mode/board-report UI should not lead with canonical state labels, metric preflight names, execution IDs, raw SQL or evidence-rank/debug scores. Those remain available through Evidence/Advanced surfaces.

## 14. Decision Workspace order must become answer-first

Current observed order is roughly:

`Question -> primary chart -> supporting charts -> governed result total -> governed context -> BA answer -> preview execution -> raw rows -> developer diagnostics`.

Target order:

`Question -> Answer / main finding -> key number -> primary visual -> What explains it? -> supporting evidence/visuals -> What next? -> Evidence & technical details`.

Specific display changes:

- Move the BA answer/main finding above supporting charts.
- Merge `Governed result total` into the headline/KPI context instead of a separate green card far below the charts.
- Hide Preview Execution, raw rows and developer diagnostics from the main business journey; keep them available in Evidence/Technical details.
- Do not show an executable support chart merely because it exists; it must be narratively relevant to the selected question.

## 15. PNG/PDF export must use a real page model

Current PNG export captures the whole report DOM into one very tall image.

Current PDF export captures the same giant image and slices/crops it across A4 pages. This produces physical pages but no semantic pagination: cards/charts can be cut in half and section boundaries are ignored.

Introduce a shared `AnalysisReportPlan` / Report Page Model used by screen, PNG and PDF renderers.

Proposed page sequence:

1. Executive Summary
2. Performance / answer overview
3. Drivers / components
4. Explanation / root-cause status
5. Recommendations & risks
6. Evidence appendix as needed
Sections need `keepTogether`, `pageBreakBefore`, `pageBreakAfter` or equivalent pagination intent. Charts/KPI bands should stay intact. Evidence tables may split with repeated headers.

PNG should export presentation/report pages (or a selected current section), not one infinite image. PDF should be a true multi-page analytical report.

## 16. Product-wide UI rule — canvas-first, card-by-exception

A Card is appropriate when it represents a genuinely bounded object with its own identity/action boundary, for example a dataset, saved report, saved analysis, connection, notification, metric result or actionable finding.

Do not use Card as the default solution for:

- a section;
- heading/description;
- empty state;
- toolbar or filter group;
- technical status summary;
- explanatory copy;
- group of buttons;
- layout spacing.

Preferred hierarchy mechanism:

`typography -> whitespace -> alignment -> grouping -> divider -> subtle surface -> border -> card`.

Card is near the end of the hierarchy toolkit, not the first step.

Default nested-card depth is **0**. A border must communicate a real boundary, not merely create spacing.

Suggested surface hierarchy:

- Level 0 — Canvas: primary neutral workspace.
- Level 1 — Section: heading + content + spacing/divider, normally no border.
- Level 2 — Interactive object: hover/selection surface when needed.
- Level 3 — Card: genuine bounded entity/result.
- Level 4 — Modal/Drawer/Overlay: focused task or deep evidence.

A practical Easy Mode surface budget is approximately two strong surfaces and three simultaneous bordered containers, with exceptions for data grids, true visual panels, drawers/modals and real entity collections.

## 16A. Product-wide Information Architecture + Density Contract

Books supplies a calm visual and interaction reference, but LightBI carries substantially denser BI/BA information. The product must therefore solve density with information architecture rather than by either hiding useful evidence or restoring a wall of cards. The controlling rule is:

> **More information must create more structure, not more cards.**

This contract applies to every LightBI product surface: Home/New Brief, Understanding/Analysis Context, single-file, multi-file, Focus, Decision Workspace, Deep BA, BA Step 2, Dashboard, Charts, Datasets, Advanced/SQL, evidence/raw-row views, Settings, Account, Admin and the Web Live Demo product surface.

Required hierarchy and disclosure rules:

- **One surface = one primary user objective.** A surface may contain supporting context, but it must not simultaneously behave as overview, deep report, selected-row investigation and raw-evidence browser.
- **Progressive disclosure is structural:** `summary -> detail -> evidence -> raw/technical rows`. Crossing into a deeper analytical level changes route/surface/state or opens a bounded inspector/drawer; it must not append an unlimited new report beneath the current report.
- Default information order is `Orientation -> Primary answer -> Main evidence -> Supporting context -> Deep analysis -> Raw/technical evidence`. Higher-value/decision-level content appears before implementation/diagnostic detail.
- At most **two analytical depth layers** should be materially visible in one viewport. Opening a third layer replaces, collapses or reduces the earlier layers to compact sticky context rather than rendering all three at full weight.
- **Card is not a density tool.** Tables, aligned rows, lists, dividers, typography, grouping and compact insets carry dense information. Cards remain for bounded KPIs, warnings, decision summaries, entities or genuinely independent results.
- Dense does not mean cramped. Use disciplined typography, alignment, grid and the 32/40/48px row rhythm before adding borders, shadows or extra surfaces.
- As a default analytical viewport budget, target approximately **one primary answer/headline, three-to-five key KPIs, one dominant chart, one attention/decision block and at most one supporting table/list visible at once**. Domain-specific exceptions are allowed only when deliberate and must preserve hierarchy; this is a composition budget, not a metric-authority limit.
- Raw evidence must remain close and reachable but normally lives in an Evidence Inspector, drawer, drill surface or dedicated evidence view. Do not dump large raw tables between narrative sections merely because the rows are available.
- **Context is sticky; detail scrolls.** Dataset/source, Perspective/question, Focus, period and selected scope remain visible or recoverable as compact orientation while the user drills deeper.
- Deep states are reversible. Back/Close returns to the exact prior analytical state without re-importing data or re-running the governed analysis solely to reconstruct UI state.
- Responsive density follows priority, not naive vertical stacking. Wide screens may use two or three coordinated regions; narrower screens must preserve the same priority order and progressively disclose lower-priority information rather than stacking every desktop panel end-to-end.

LightBI uses four density classes as composition guidance:

- **Calm** — Home/onboarding/Account/Settings: low density, generous whitespace, few simultaneous decisions.
- **Working** — Understanding, dataset review, perspective selection, Dashboard: medium density, compact rows and clear workspace tools.
- **Analytical** — Decision Workspace, charts, Deep BA: high density, answer-first hierarchy and progressive disclosure.
- **Evidence / Technical** — raw rows, SQL, schema, diagnostics: very high density, table/monospace/compact controls, with technical information visually subordinate to the product decision flow.

### Multi-file terminal analysis convergence is a prerequisite, not polish

Current multi-file source has logic/governance parity but not terminal workflow parity. `PerspectiveCollectionResultCard` can render the governed overview, chart drill/raw evidence, full-scope Deep BA and selected-data BA Step 2 into one growing scroll surface. Single-file already uses an explicit `deepAnalysisView = perspective | selected_data | null` model and a separate `InvestigationDeepAnalysis` surface.

Before visual-baseline freeze or broad DPR-8 styling, multi-file must converge on the same **state/surface grammar** while preserving all multi-source governance:

`decision_workspace -> evidence_drill -> deep_perspective | deep_selected`

- `decision_workspace`: Executive Overview, primary chart, main metrics, Key attention/questions and governance disclosure only.
- `evidence_drill`: selected period/metric/source scope plus bounded evidence preview and the Step 2 CTA.
- `deep_perspective`: full-scope/focus-scope Deep BA in its own surface with Back/Close to the Decision Workspace.
- `deep_selected`: BA Step 2 over exact selected evidence in its own surface with Back to the selected evidence state.
- `deep_perspective` and `deep_selected` are **mutually exclusive**; full Deep BA and Step 2 must never be rendered simultaneously at full weight on the same screen.
- Prefer a shared analysis navigation/state shell with single-file and multi-file adapters over duplicating two presentation stacks. Do not force incompatible data shapes into one component, and do not rewrite relationship/grain/period/currency/cardinality/Focus authority merely to achieve visual parity.

The attempted pre-convergence visual baseline is **not an acceptance baseline** and must not be committed as evidence of desired layout. Capture the canonical baseline only after this terminal workflow convergence.

## 17. Screen-specific flattening targets

### Home / New Brief

Keep the question prompt as a command surface and quick suggestions as small actions/pills. Replace source-entry and history card stacks with calm sections/rows/tiles. Empty history and retry state should not become card-inside-card-inside-card.

### Understanding / Analysis Context

Current `UnderstandingNextCard` is itself a strong card containing technical-evidence details, a gradient Understanding card, nested domain card, six large perspective cards, focus card, other-signal card, recommended-analysis card and multiple question-card grids.

Flatten to five primary blocks:

1. Understanding header — source meaning/grain/domain summary, `Canonical + MB` provenance and one Evidence action.
2. Perspective — compact tabs/chips/plain selectable list, not six giant cards.
3. Focus — inline optional control.
4. Recommended question — one primary CTA.
5. More questions — one deduplicated compact action list with `Show more`.

Canonical/metric readiness counts, detailed domain support, mappings and blockers belong behind Evidence/Advanced unless immediate user action is required.

Acceptance target: after Understanding completes, the primary Analyze CTA should be visible within one normal desktop viewport without requiring scroll.

### Decision Workspace

Use answer-first order from section 14. A primary visual can remain a bounded visualization surface; surrounding narrative should not each be wrapped in cards.

### Deep BA

Render like a management document: section numbering, typographic hierarchy, whitespace, primary visual rhythm, concise narrative. As analytical depth increases, chrome should decrease rather than multiply.

### BA Step 2

Render as a focused investigation of the selected subject/finding, not a second full report.

## 18. Design-baseline reconciliation

`docs/design/ui-baseline.md` remains an existing locked historical/current baseline and is **not modified by this planning-only task**. It contains useful “dense, calm, analytical” principles but its card/surface rules must be explicitly reconciled during the refactor kickoff before UI implementation begins.

## 18A. LightBI design-system foundation + Frappe UI reference

Owner direction on 2026-09-05: use [Frappe UI](https://github.com/frappe/frappe-ui) as a **design-system and interaction reference**, not as a direct runtime dependency or framework migration target.

Current product-code inspection at successor HEAD `6732108f288e` confirms LightBI Desktop is React 19 + Vite + Tauri with Tailwind, Lucide, Framer Motion, TanStack Table, ECharts and Monaco. Frappe UI is Vue-oriented. Therefore this plan explicitly rejects a Vue bridge or React-to-Vue migration merely to consume Frappe UI components.

Instead, use Frappe UI as a reference for:

- consistent primitive contracts and interaction states;
- restrained enterprise visual density;
- composable dialogs, drawers, popovers, dropdowns, forms, tabs, tables, empty states and toasts;
- semantic design tokens instead of per-feature ad-hoc styling;
- clear separation between reusable UI primitives and business-feature components.

The existing `packages/ui` workspace is the intended home for a real `@lightbi/ui` React design system. It is currently only a placeholder and must be promoted deliberately rather than allowing each feature folder to invent its own surface language.

Initial primitive target:

`Button | IconButton | Input | Select | Tabs | Dialog | Drawer | Popover | Dropdown | Tooltip | Badge | Toast | EmptyState | DataTable shell | Toolbar | Sidebar | Section | Surface | Inset | Divider | Disclosure | Metric/KPI primitive | EvidenceDisclosure | StatusIndicator`.

Do **not** introduce one universal `Card` primitive as the default layout abstraction. The canvas-first/card-by-exception rule remains controlling. Prefer `Surface`, `Section`, `Group`, `Inset`, `Divider` and `Disclosure`; reserve Card for genuinely bounded entities/results.

Before expanding `@lightbi/ui`, reconcile its React dependency/peer contract with Desktop. The code audit found Desktop on React `19.2.8` while `packages/ui` still declares React `18.3.1` / peer `^18.2.0`. DPR-0 must remove the duplicate-version ambiguity before shared hooks/components are introduced.

### Language architecture is part of the UI refactor

Owner rule is reaffirmed: **user-facing language must not be hard-coded into production feature/business code.**

The audit on 2026-09-05 found an existing i18n foundation (`i18n/language-registry.ts`, `UiTranslationBoundary.tsx`, `ui-language.ts` and coverage tests), but recent feature work has started placing Vietnamese/English presentation strings directly inside business and component code. This must be corrected during the refactor.

Required separation:

- semantic knowledge/aliases may contain multilingual terms because they are machine-understanding inputs;
- fixtures/tests/sample datasets may contain literal Vietnamese/English source text;
- canonical IDs, planner contracts and engine state remain language-neutral;
- **all user-facing labels, narrative templates, empty states, errors, actions and business prose must resolve through the language catalog/message contract**.

Add an i18n CI guard that scans production `.ts/.tsx` sources, with explicit allowlists for semantic knowledge, tests/fixtures and translation catalogs. The guard should fail new user-facing Vietnamese or English literals outside approved message/catalog locations, while avoiding false positives on source-column aliases and domain vocabulary.

The design-system API should also make the correct path easy: reusable components should accept message IDs/resolved strings consistently rather than encouraging embedded language literals.

## 18B. Frappe Books product-study source + canonical chart-pattern library

Owner direction on 2026-09-06: elevate [Frappe Books](https://github.com/frappe/books) from a screenshot/style reference into a **required product-source study** for the UI/UX refactor. Intake snapshot for provenance: `frappe/books` `master` at `a79a1e3b03f424805ad094e2fd8731d04f84d36f`. Frappe UI remains a companion design-system reference at intake `main` `ada484717135d9c50e272402012e718ef1dfc2d3`. Re-pin both at DPR-0 before implementation because upstream evolves.

The intent is not to copy Books pixel-for-pixel. Study how a real, shipping accounting desktop product makes a complex business domain feel calm, modern, direct and logically ordered. Frappe UI's own project history states that reusable components grew out of the Frappe Books design work; this makes Books useful as the product-level behavior reference and Frappe UI useful as the extracted primitive/design-language reference.

Required Books study dimensions before broad LightBI screen refactor:

- application shell, sidebar, page header and navigation density;
- typography/ink hierarchy, whitespace rhythm, thin dividers and restrained use of borders;
- when a bounded object earns a surface/card versus when content stays on the canvas;
- list, table, form, empty/loading/error and progressive-disclosure behavior;
- dashboard information hierarchy: dominant analytical canvas first, supporting metrics second, detail/evidence last;
- financial dashboard treatment of cashflow, paid/unpaid status, P&L, expense composition and other mixed chart/table material without turning the page into a widget wall;
- interaction placement: primary action, secondary actions, search, filters, period selectors and navigation affordances;
- responsive/window behavior and desktop-product ergonomics relevant to LightBI's Tauri shell;
- source-level component boundaries and state contracts, not screenshot imitation alone.

Books/Frappe principles to translate into LightBI rather than clone:

`flat canvas -> strong typography -> whitespace/alignment -> thin divider -> subtle surface -> bounded card only when necessary`.

Color remains semantic and restrained. Neutral/gray is the default UI language; accent colors must encode selection, state or analytical meaning rather than decorate every section. The refactor should prefer one dominant action/accent per local decision surface instead of a rainbow of equal-weight controls.

### Books visual-system measurements — DPR-0 source study

DPR-0 re-verified and cloned Frappe Books at exact `a79a1e3b03f424805ad094e2fd8731d04f84d36f`. The following are observed source measurements/reference behavior, not LightBI tokens to copy blindly.

- Base product frame: `1200x826` on Windows, with a `1200x800` content design basis. Sidebar is `14rem` (~224px); normal page header is `4rem` (64px). Row rhythm is 32 / 40 / 48 / 56 / 64px, with 48px as the common dense data/list row.
- Typography: Inter variable font. Tailwind scale is 11 / 12 / 13 / 14 / 18 / 20 / 24 / 28px; ordinary business copy is primarily 12–14px, section headings 13px semibold, page titles 18px semibold. Density comes from disciplined type hierarchy, not tiny unreadable text.
- Surface hierarchy: default canvas is white or near-white; sidebar uses `gray-25 #FBFBFB`; dividers commonly use `gray-100 #F3F3F3`; borders/shadows are restrained. Form/card-like bounded surfaces usually use 5–8px radii, with larger 12px radius reserved for stronger containers.
- Color grammar: neutral gray dominates shell/chrome. Primary ink begins from `#1E293B`; analytical accents use semantic families such as blue (`#33A1FF`) and pink (`#DF9EB8`) rather than decorating every section. Dark canvas uses `#171717/#212121/#1C1C1C` layers.
- Dashboard composition is flat: a dominant full-width cashflow visual, thin divider, two-column invoice status, divider, then two-column P&L and expense composition. Bounded chart surfaces do not imply every surrounding section needs a card.
- Controls are compact: standard background button height 32px; dashboard period selector is 12px text with 12px chevron and minimal vertical padding. Search/back/forward are grouped in the 64px page header rather than consuming a separate large toolbar.
- Windows chrome is a separate 28px custom title bar. The drag region owns the center; click targets are explicitly `no-drag`. Minimize/maximize/close controls use ~48x28px hit areas with 12–16px icons; neutral hover for minimize/maximize and red close hover. The centered window title is only 12px.
- macOS uses hidden native title-bar treatment with traffic lights positioned at `(16,16)`. The product therefore distinguishes OS window chrome from the 64px application page header instead of merging both roles into one oversized web-style bar.
- Animation is restrained: sidebar/quick-edit transitions are ~150ms ease-out. Scrolling, dividers and hover/selection states carry most navigation feedback.

Translation rule for LightBI: preserve these ratios and hierarchy principles where they improve desktop ergonomics, but implement them as React/Tauri design tokens/components. Do not import Vue/Electron code or assume Books' accounting-specific dimensions are universal. Window controls must use Tauri window authority and preserve platform accessibility/drag-region behavior.

Books is not a sufficient visualization vocabulary: its dedicated chart components are only Bar, Line and Donut. Owner chart references remain required acceptance sources for KPI bands, combo/dual-axis, stacked, ranked horizontal, radar/profile, target/progress, geo/map, scatter/bubble, funnel, heatmap/treemap and other patterns not implemented by Books.

### Books interaction-system measurements — DPR-0 source study

The Books reference is also an interaction-system source, not only a visual-layout source. DPR-0 source inspection records these behaviors as implementation references:

- Chart hover uses a cursor-anchored Popper tooltip with flip/prevent-overflow and ~15px offset. Tooltip visibility fades in/out at ~100ms; value surfaces remain compact instead of opening a card or persistent inspector.
- Bar hover binds directly to the hovered bar, brightens it slightly and shows category + formatted value with the series color as a thin accent edge.
- Line hover is proximity-based: mouse coordinates are transformed into SVG space, the nearest series point is selected, and the tooltip is suppressed beyond a distance threshold. The active point gains a brightened marker/drop-shadow so eye, cursor and value remain synchronized.
- Donut hover does not require a floating tooltip: the active sector thickens by 4 SVG units and the center label/value switch to the hovered sector; mouse-leave restores the total. This is a useful alternative for compact part-to-whole visuals.
- Scrolling remains native WebView scrolling. Books styles `::-webkit-scrollbar` at `0.6rem` (~9.6px), keeps the track nearly invisible except for a 1px divider, uses neutral thumbs with a darker hover state, and hides the scrollbar entirely only on selected calm canvases while preserving scroll behavior. LightBI should preserve native scroll physics/accessibility and theme it rather than introduce a custom JavaScript scroll engine.
- The shortcut system is context-aware. Newer/active contexts win; propagation is explicit. Ordinary key presses are ignored while the user is typing in inputs/contenteditable unless a modifier is present. Platform-primary modifier maps to Ctrl on Windows/Linux and Command on macOS.
- Global Books shortcuts include Ctrl/Cmd+K Quick Search, Shift+Backspace previous page, Shift+H sidebar toggle and F1 documentation. Entry/list/POS contexts add their own scoped shortcuts; a built-in Shortcuts surface documents them with platform-specific keycaps.
- Quick Search is a 600px command-palette style modal. Input is 20px, result rows use the 48px data-row rhythm, roughly six suggestions are visible before scrolling, and keyboard operation is first-class: arrows navigate, Enter selects, Esc closes. Search supports fuzzy/incremental narrowing, local recents (up to 10), type/group filters and priority ordering.
- Search results use restrained semantic group color only as metadata; the selected row is indicated primarily by neutral background plus a 4px leading border. Keyboard navigation scrolls only enough to keep the selected row visible (`scrollIntoView({block:'nearest'})`).
- Sidebar state is simple and global: full 14rem sidebar shown/hidden, not a permanently collapsed icon rail. Hide/show uses width + translate + opacity over ~150ms. Internal groups expand according to active route rather than becoming independently toggled accordions. When hidden, a small bottom-left reveal affordance appears on hover.
- Dropdowns/popovers use anchored Popper placement, click-outside close, arrow-key highlight, Enter selection and `scrollIntoView(nearest)`; modal close is registered as an active Escape shortcut. Motion stays in the 100–150ms range.

Translation rule for LightBI: adopt the interaction principles, not every Books shortcut or hidden-control decision. LightBI should preserve discoverability and accessibility, and its global search must be scoped to LightBI concepts/actions/data without leaking raw business data to network services. Tauri/native window and keyboard boundaries remain authoritative.

### Primary logo and brand-asset authority — DPR-0

Owner decision on 2026-09-08 promotes the third concept in Figma `LightBI Logo Concept` — node `19:5`, named `LightBI li mark` / `optimized li` — to the official LightBI primary mark. The owner-exported SVG is the canonical geometry source.

- Canonical SVG: `700x700`, rounded black canvas (`rx=18`) with two `#FFC20A` glyph paths forming the optimized `li`; SHA-256 `9486181bb525d1d4a704addaebfc2f1caa5abbd9d1240bad252b85a3f58e0d7b`; source size `505` bytes.
- Source hierarchy: Figma concept/node + owner-exported SVG -> repository SVG masters -> raster/native installer derivatives. PNG, ICO and BMP outputs are generated artifacts and must never become independent geometry/color authorities.
- Desktop canonical surface: `apps/desktop/public/branding/lightbi-icon.svg`; `apps/desktop/public/favicon.svg` must remain byte-identical. Native Tauri PNG/ICO and NSIS header/sidebar are derived from the same mark.
- Distribution canonical surface: `apps/distribution/public/logo.svg`; Account, Docs, Verify, marketing shell and Admin sidebar must consume that asset rather than maintain a hand-drawn or text-only substitute.
- Product source closure: branch `codex/dpr0-logo-primary-mark`, commit `fde259a5441b36825f211914cbd0c82fc595f27f`. Desktop production build, native icon validator and native capability validator PASS.
- Control Plane source closure: branch `codex/primary-logo-optimized-li`, commit `b6bc2735bcf99218443ae5c427701e5b1a7c938f`. Distribution build and focused server suite PASS `32/32`.
- Figma MCP Starter quota prevented the in-canvas rename/export-setting mutation after node verification. This is not a geometry ambiguity: the owner exported the exact SVG and explicitly selected node `19:5`. When MCP quota becomes available, Figma metadata may be updated without changing the approved geometry.
- Books/Frappe visual-system guidance may influence surrounding shell spacing, chrome and neutral surfaces, but it must not recolor, redraw or reinterpret the primary LightBI mark.

## 18C. Desktop ↔ Web Live Demo product-parity contract

The Web Live Demo is not a simplified marketing mock. The product surface at **`/app`** is a near-1:1 fast validation environment used to test LightBI behavior before paying the cost of a native build. The public marketing/root surface may remain separate; this contract applies to the actual LightBI product workspace.

Required architecture:

- Desktop/Tauri and Web Live Demo reuse the same React routes, business components, analysis state machines, planners, design tokens, i18n messages, chart/evidence behavior and responsive rules wherever the platform supports them.
- Do not maintain a "demo UI" and a "desktop UI" that can drift. Platform differences belong behind explicit capability adapters/boundaries, not duplicated presentation implementations.
- Governed metric/evidence semantics, question/perspective selection, Focus, multi-file governance, Deep BA, Step 2, Dashboard composition and chart planning must behave the same in both environments for the same tracked fixture and user path. The live demo may not bypass governance or fabricate capability merely to make a showcase look complete.
- Browser testing uses tracked/sanitized sample corpus files and deterministic fixtures; do not make acceptance depend on local-only ignored data.

Intentional platform divergence is limited to genuinely native authority, including Tauri window chrome, native filesystem/open/save dialogs and permissions, installation-bound Signed Transport/trust/capabilities, and other OS integrations that have no browser equivalent. The web lane must expose an honest browser-equivalent flow, clear disabled state or explicit capability boundary; it must never fake native success.

Every DPR phase that changes presentation or interaction must maintain an acceptance matrix:

`Web Live Demo /app PASS -> Desktop webview/source PASS -> packaged/native PASS when the phase touches native behavior`

The browser/live-demo lane is the default **fast product acceptance lane** for navigation, hierarchy, responsiveness, i18n, analysis state, chart behavior, evidence flow and visual composition. Native packaging/UAT remains required for native-only boundaries and final release acceptance, but ordinary UI/UX changes should not require rebuilding the desktop installer merely to discover presentation defects.

Visual regression and screenshots must identify their environment and should use equivalent viewport/data/state pairs across web and desktop when possible. A visual PASS in only one environment is insufficient when shared product surfaces are expected to be identical.

### Chart Pattern Library is a semantic grammar, not a gallery

The owner also supplied additional dashboard references that broaden the visual vocabulary. LightBI should learn from them as **question-to-visual patterns**, not attempt to maximize chart variety. The canonical planning chain becomes:

`data semantics -> analytical intent -> chart pattern -> layout/story role -> visual theme`.

Introduce a durable `ChartPatternDefinition` / equivalent contract above renderer-specific chart types. Each pattern should define at least:

- analytical intent and management question;
- required dimension/measure/time semantics;
- allowed cardinality and series count;
- unit/scale compatibility;
- positive suitability rules and explicit forbidden/negative rules;
- sorting, ranking/top-N and normalization behavior;
- axis, label, legend, tooltip and reference-line policy;
- semantic color mode: `categorical | sequential | diverging | status`;
- accessibility/contrast and dense-label fallback;
- evidence/drill-down behavior;
- fallback visual when prerequisites fail;
- optional domain prior, which may recommend but never authorize the visual.

Initial canonical pattern corpus should target roughly **20–30 high-quality patterns**, not dozens of renderer primitives. It should at minimum cover:

`KPI | KPI+delta/sparkline | target/progress | vertical comparison bar | horizontal ranked bar | grouped bar | stacked bar | 100% stacked composition | line trend | area trend | bar+line amount/rate or actual/target combo | donut low-cardinality part-to-whole | scatter/bubble relationship | histogram/distribution | heatmap/matrix | waterfall contribution | funnel | conditional radar/profile | conditional geo/map | evidence/detail table`.

Examples from the latest owner references become acceptance patterns:

- bookings by month + conversion rate -> amount/rate combo when both measures are semantically related;
- booking source ranking -> sorted horizontal bar;
- exhaustive low-cardinality channel share -> donut allowed, otherwise ranked bar;
- monthly channel mix -> stacked/100%-stacked pattern depending whether the question is volume or share;
- staff performance -> table/ranking when exact values and multiple columns matter more than another decorative chart.

Do not create fake visual diversity. If two materially different questions are both best answered by bars, two bars are acceptable. Conversely, a donut, radar or map is forbidden merely to make the dashboard look varied.

Frappe Books and Frappe UI are external references only. No Vue/Electron dependency, source-code copy, design-token copy or framework migration is authorized by this plan; LightBI must translate learned principles into its existing React/Tauri architecture and its own product identity.

## 19. Proposed implementation phases

### DPR-0 — Baseline audit and contract freeze

#### DPR-0 chunk 1 — source-closed contract freeze (2026-09-08)

- Product branch `codex/dpr0-contract-freeze` at `85734e4a262b93b6b0964b37cd0b03148320d115`, based on the approved optimized-li logo commit `fde259a...`.
- `@lightbi/ui` no longer ships a private React 18 runtime. React/ReactDOM are host peers `^19.2.0`; package dev dependencies align with Desktop `^19.2.8`. The lockfile drops the duplicate React 18/scheduler chain.
- i18n debt is frozen monotonically at the observed `fde259a` baseline: 7 mixed Vietnamese messages, 263 uncataloged English presentation strings and 1 uncataloged Vietnamese presentation string. Existing debt may shrink; any new debt fails the release-authoritative suite.
- Two known presentation defects are now durable debt fixtures, not accepted behavior: Dashboard renderer type collapse (`DPR-6`) and duplicate “Other questions this data can answer” lanes (`DPR-2`). Repairing either requires explicitly retiring/updating its fixture in the owning DPR phase.
- `scripts/run-release-1.0-suite.mjs` now runs the shared React boundary and presentation/i18n debt guards. Final authoritative run PASSed, including production build and governed regression `11 files / 41 tests`; focused DPR guards PASS `5/5`.
- No chart planner, question planner, metric/evidence authority or screen composition was changed by this chunk. DPR-0 remains ACTIVE; subsequent work owns the design foundation and workflow/visual baseline gates.

#### DPR-0 chunk 2 — LightBI design-token foundation source-closed (2026-09-08)

- Product `ca454ecab5aa029fb504388374837695e1e2cd11` on `codex/dpr0-contract-freeze` adds the LightBI-owned `--lb-*` semantic token layer and typed shared-token contract in `@lightbi/ui`; it does not copy Books/Frappe namespaces or migrate current screens wholesale.
- Reference/target tokens encode the studied desktop proportions and interaction rhythm: sidebar 224px, application header 64px, Windows chrome 28px, ~48x28px window-control hit area, 32px compact controls, 48px common data rows, 100/150ms motion, native-scrollbar theming around 10px, restrained surfaces/dividers/ink and semantic analytical/status colors.
- Existing screen geometry remains unchanged until DPR-8 migration; current 280px sidebar/older motion values are not silently treated as migrated merely because target tokens exist.
- Focused token/contract checks and TypeScript PASS; the release-authoritative suite remains PASS with governed regression `11 files / 41 tests` and production build.

#### Current DPR-0 execution order — corrected after multi-file IA review

1. Freeze numeric/evidence/runtime authority and presentation debt — **done**.
2. Establish shared React/design-token foundation — **done**.
3. Converge the multi-file terminal Decision Workspace / Deep BA / Step 2 state model with the single-file workflow, preserving multi-source governance — **NEXT and required before visual freeze**.
4. Capture corrected representative visual baselines for Home, Understanding, Decision Workspace, Dashboard, Deep BA and Step 2 in the Web Live Demo `/app`, with equivalent Desktop/source checks where applicable.
5. Only then begin broad canvas-first surface migration and later DPR phase work.

- Freeze current governed numeric/evidence parity fixtures before presentation refactor.
- Capture representative Home, Understanding, Decision Workspace, Dashboard, Deep BA and Step 2 acceptance screenshots.
- Inventory every chart-type conversion/loss and every duplicate question/presentation path.
- Reconcile `ui-baseline.md` with the owner-approved canvas-first/card-by-exception rules.
- Pin and study the current Frappe Books source, especially shell/navigation, Dashboard, lists/tables/forms and dense business workflows; record exact source bookmarks and translate principles rather than copying screenshots.
- Review current Frappe UI design/token/component/chart guidance alongside Books, noting upstream chart-v2/API movement so LightBI does not freeze against a stale external abstraction.
- Build the initial chart-pattern acceptance corpus from owner references before expanding renderer breadth.
- Audit `packages/ui` and establish `@lightbi/ui` as the shared React design-system boundary; use Frappe UI only as an external reference, not a dependency/framework target.
- Reconcile Desktop React 19 with the stale React 18 dependency/peer declarations in `packages/ui` before shared component work.
- Inventory hard-coded user-facing language separately from valid multilingual semantic aliases/test fixtures; freeze the i18n contract and define CI-guard allowlists.

### DPR-1 — Claim + Question Provenance foundation

- Add presentation-layer provenance for data evidence, MB/domain context and mixed inference.
- Add claim basis / causal status / limitations contract.
- Build one shared Evidence Inspector contract and navigation model.

### DPR-2 — Open-world Question / Perspective Intelligence

- Separate Domain from Perspective.
- Feed `domainInference`/MB context into question discovery/ranking/presentation without changing governed authority.
- Consume bounded MB presentation advice for domain/perspective relevance and abstention/missing-evidence signals; MB candidates may reorder what is considered but may not make an ungoverned question executable.
- Merge/deduplicate universal + governed question presentation.
- Add answerability states and neutral wording rules.

### DPR-3 — Analysis Narrative Planner + Deep BA hierarchy

- Enforce the shared analysis-surface state grammar so overview, full-scope Deep BA and selected-data investigation are distinct reversible states rather than appended reports.
- Build answer-first narrative plan over existing governed outputs.
- Allow MB presentation advice to contribute domain-context priorities, narrative-role candidates and explicit abstention/unknown signals, while observed/calculated/inferred/hypothesis provenance remains deterministic and inspectable.
- Remove repeated same-weight Main Answer / driver / risk blocks.
- Add supporting-analysis relevance gate.
- Preserve numeric/evidence parity.

### DPR-4 — BA Step 2 investigation model

- Make selected-data Step 2 a dedicated reversible analysis surface that is mutually exclusive with full-scope Deep BA at full visual weight.
- Replace “Deep BA on selected rows” presentation with selected-subject investigation semantics.
- Add benchmark/context decomposition and concise next-action structure.
- Synthesize multi-source evidence into one answer where appropriate.
### DPR-5 — Visualization ontology + Chart Pattern Library + Domain Visual Profiles

- Define analytical intents and visual suitability/negative rules.
- Define a canonical 20–30-pattern chart grammar from the supplied references; renderer chart types remain implementation details beneath the pattern contract.
- Treat the MB presentation lobe as a versioned advisory knowledge source for chart patterns, common-domain profiles, perspective priorities, dashboard narrative roles, anti-patterns and constitutional prohibitions; it is not the canonical renderer registry or metric authority.
- Add categorical/sequential/diverging/status color semantics, cardinality limits, label/axis/tooltip rules and graceful fallbacks to each pattern.
- Define initial standard visual vocabulary from the supplied reference set.
- Add domain visual profiles as MB/domain context, not execution authority.
- Add metric desirability vocabulary for interpretation where evidence permits.

### DPR-6 — Visualization Planner + renderer/type preservation

- Introduce governed `VisualizationPlan`.
- Resolve `analytical intent -> ChartPatternDefinition -> renderer family` explicitly instead of mapping intent directly to a renderer primitive.
- Accept MB chart/domain candidates as ranking priors only; deterministic suitability checks must be able to reject every MB suggestion and fall back to a safer visual/table or abstention.
- Fix chart type collapse during persistence/rendering.
- Make chart choice depend on intent, semantic roles, time ordering, cardinality, units and domain prior.
- Preserve pattern-level rules through persistence, dashboard composition, export and evidence drill-down.
- Expand chart renderer/library only after the planner contract is stable.

### DPR-7 — Dashboard Composition Planner

- Introduce semantic card/section roles and story order.
- Add narrative/visual duplication checks and information budget.
- Accept MB domain/perspective/dashboard-role advice as a prior for story composition, but require the Dashboard planner to prove each included section answers a distinct evidence-backed management question.
- Apply the Books-derived product lesson: one coherent analytical page, not a wall of equally weighted widgets; prefer whitespace/dividers and a dominant analytical canvas before additional bounded surfaces.
- Use Domain Dashboard Grammar plus current perspective/audience.
- Remove hard-coded Bar breakdown generation as the default.

### DPR-8 — Canvas-first surface refactor + shared UI system

- Apply the Product-wide Information Architecture + Density Contract and density classes before cosmetic flattening; cleaner visuals must not reduce useful analytical capacity or recreate information overload.
- Keep Desktop/Tauri and Web Live Demo `/app` on the same shared presentation implementation, with divergence only through explicit native capability adapters.
- Build/adopt the approved `@lightbi/ui` primitives and tokens before broad screen migration.
- Translate the Books/Frappe product language into LightBI: flat canvas, strong ink/type hierarchy, restrained semantic color, thin separators, logical action placement and dense-but-breathable business screens.
- Flatten Home, Understanding, Decision Workspace, Deep BA and Step 2 according to section 17.
- Replace duplicate technical details with the shared Evidence Inspector.
- Enforce card-by-exception and nested-card-depth rules.
- Remove hard-coded user-facing Vietnamese/English from migrated surfaces and route presentation text through the i18n catalog/message contract.
- Add the production-source i18n CI guard and regression fixtures so new hard-coded presentation language cannot silently return.
- Preserve accessibility, responsive behavior and existing owner-approved navigation shell.

### DPR-9 — Report Page Model + true export pagination

- Add shared screen/PNG/PDF page plan.
- Implement semantic page breaks and keep-together rules.
- Export PNG as bounded pages/sections and PDF as a true multi-page report.

### DPR-10 — Cross-domain acceptance and release regression

- Run equivalent tracked-corpus acceptance through Web Live Demo `/app` and Desktop/shared-source surfaces; record intentional native-only divergences explicitly before packaged/native UAT.
- Run semantic/numeric/evidence parity, question relevance, chart-pattern recommendation, dashboard composition, narrative and export acceptance.
- Add MB advisory regression proving deterministic rebuild, bounded local footprint, advisor provenance, domain/chart recall, abstention/prohibition recall, and the ability of deterministic planners to reject every MB candidate without changing governed numeric truth.
- Add visual-regression cases that verify calm hierarchy/card budgets and semantic color/label behavior without requiring pixel identity with external references.
- Re-run current supported domains plus evidence-bound inferred-domain probes.
- Perform packaged Windows/native visual/UAT acceptance before any stable promotion.
## 20. Acceptance corpus and regression requirements

Create durable cases that bind question semantics to presentation expectations rather than screenshot-only styling.

Each case should declare source/domain context, user question/perspective/focus, expected analytical intent, required governed metric/evidence state, preferred/allowed/forbidden visual families, expected supporting-analysis relationships, claim provenance, neutral-language/desirability rules, dashboard card roles and export-page expectations.

Representative cases:

- Branch revenue comparison -> ranking; horizontal/vertical bar allowed; line forbidden without ordered-time semantics.
- Revenue across six months -> ordered trend; line preferred.
- Actual revenue versus target by month -> target trend; combo or governed comparative trend preferred.
- Revenue share across four exhaustive channels -> composition; donut allowed; reject donut when category cardinality is too high.
- Cost versus revenue -> relationship; scatter allowed; avoid cause/effect wording unless independently supported.
- Fresh cancellation/waste rate -> use highest/lowest observed wording; do not equate numeric high/low with favorable/adverse unless desirability context is known.
- Inventory coverage -> range/context-sensitive; both extremes may deserve review.

Cross-domain corpus should progressively include current supported domains plus Hospitality, Healthcare/Pharma, Agriculture/Livestock/Aquaculture, Manufacturing and other Cross-Domain Semantic Expansion probes without claiming official support merely because test vocabulary exists.

For each presentation acceptance case, record the **environment matrix** (`web_live_demo`, `desktop_shared_surface`, and `native_packaged` when applicable), viewport, tracked fixture identity, analytical state and any intentional native capability divergence. Shared product behavior must not silently pass on one host and drift on the other.

## 21. Hard invariants during implementation

- Governed source values, aggregation semantics and evidence references must remain unchanged unless a separately reviewed correctness bug is found.
- `SUM` remains `SUM`; presentation refactor must not mutate factual values to improve narrative.
- Micro Brain remains non-authoritative for metrics, formulas, joins, relationships and runtime execution.
- Every MB presentation candidate is rejectable. MB must not directly persist/select a renderer `ChartType`, mutate governed analysis output, or bypass the deterministic Narrative/Visualization/Dashboard planner gates.
- The semantic-retrieval and presentation-advisory dense spaces remain isolated unless a separately benchmarked architecture change proves that merging them cannot regress semantic recall/abstention.
- Unsupported inferred domains remain explicitly unsupported/evidence-bound.
- No claim may silently strengthen from observation/correlation into cause.
- Supporting visual labels must match the metric actually plotted; `UnitPrice` must not be presented as revenue/money total.
- Question, chart, dashboard and report planners may preserve or reduce authority, never strengthen it.
- Evidence must remain reachable even when removed from the main visual flow.
- No raw business data should be sent to new telemetry merely to support this UI refactor.
- No framework migration or Vue bridge is authorized merely to consume Frappe UI; LightBI remains on its current React/Tauri frontend architecture unless separately decided.
- User-facing language must not be embedded in production feature/business code; semantic aliases and multilingual understanding knowledge are not presentation strings and remain allowed.
- Shared UI primitives must not reintroduce Card as the universal layout default.
- External Frappe Books/Frappe UI study must remain principle/behavior translation; no framework migration, source copy or pixel-clone requirement is implied.
- Chart variety is never an acceptance goal; semantic suitability and readability outrank decorative diversity.
- More information must create more structure, not more cards; presentation density is solved with hierarchy/progressive disclosure, not infinite vertical append.
- Full-scope Deep BA and selected-data BA Step 2 must not render simultaneously at full weight on one analysis surface.
- Known IA defects must not be frozen as visual acceptance baselines merely because screenshots can be reproduced.
- Web Live Demo `/app` and Desktop share the same product presentation/state architecture wherever capability exists; native-only differences must be explicit adapters or truthful unavailable states, never a second divergent UI.
- A shared UI/UX phase is not accepted on web alone or desktop alone when both are expected to expose the same surface; environment parity is part of the phase gate.

## 22. Expected product architecture after refactor

`Raw source -> Understanding + semantic MB -> Question/Perspective Intelligence -> governed question/metric authority -> governed analysis artifacts -> MB presentation advice -> deterministic Analysis Narrative / Visualization / Dashboard planners -> Chart Pattern Library + renderer -> Report/Presentation Intelligence -> @lightbi/ui + i18n + Information Architecture/Density contract -> shared React product surfaces -> {Web Live Demo /app | Tauri/Desktop host} -> explicit native capability adapters`

The desired product feeling is:

> The deeper the backend becomes, the calmer the frontend becomes.

LightBI should guide the user from **what the data means** to **what question matters**, then to **the answer**, **the visual evidence**, **the explanation**, and **the next action** — without turning every layer of internal intelligence into another visible card.

## 23. Implementation gate

This document remains the refactor plan. The 2026-09-06 MB presentation-advisory foundation is now source-closed separately at product commit `4be593ae57b4b1385a833675dd4ea2349900d378`, but it is not wired into current BA/chart runtime selection. No NEXT generation, Production service, metric authority, domain-support pack or release artifact is changed by this planning update.

DPR-0 is active and owner-authorized. Broad visual-baseline freeze and screen migration are now gated by the multi-file terminal workflow convergence defined in §16A, followed by equivalent Web Live Demo `/app` and Desktop/shared-surface acceptance. Documentation work must continue to follow `docs/project-book/LIBRARY_RULES.md`.
## 24. Source bookmarks

- [`../../../project-book/LIBRARY_RULES.md`](../../../project-book/LIBRARY_RULES.md) — documentation governance used for this plan.
- [`../../../project-book/LIGHTBI_PROJECT_BOOK.md`](../../../project-book/LIGHTBI_PROJECT_BOOK.md) — durable project direction and current source precedence.
- [`./AGENT_PLAN_ROAD_TO_1_0_2026-08-31.md`](./AGENT_PLAN_ROAD_TO_1_0_2026-08-31.md) — current Road-to-1.0 execution overlay and scheduling boundary.
- [`../../../project-book/EXTERNAL_SOURCE_REGISTER.md`](../../../project-book/EXTERNAL_SOURCE_REGISTER.md) — owner-supplied visual reference provenance and SHA-256 records.
- [`../../../design/ui-baseline.md`](../../../design/ui-baseline.md) — existing design baseline to reconcile at DPR-0 before implementation.
- [Frappe Books](https://github.com/frappe/books) — required product-level UI/UX study source for clean accounting/dashboard workflows; external reference only. Intake `master` snapshot: `a79a1e3b03f424805ad094e2fd8731d04f84d36f`.
- [Frappe UI](https://github.com/frappe/frappe-ui) — external Vue design-system/interaction reference only; not an approved LightBI runtime dependency. Intake `main` snapshot: `ada484717135d9c50e272402012e718ef1dfc2d3`.
- [Frappe UI design language](https://github.com/frappe/frappe-ui/blob/main/skills/frappe-ui/DESIGN.md) — hierarchy/density/color reference to inspect at DPR-0, not a LightBI contract.
- Product code audit bookmarks: `apps/desktop/package.json`, `packages/ui/package.json`, `packages/ui/index.ts`, `apps/desktop/src/i18n/language-registry.ts`, `apps/desktop/src/components/layout/UiTranslationBoundary.tsx`, `apps/desktop/src/lib/ui-language.ts`.

Product code paths cited in this plan were inspected on the separate product successor worktree at snapshot `262bd768`; they must be re-read from the exact active product head before mutation.
