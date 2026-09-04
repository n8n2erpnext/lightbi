# Agent Implementation Plan — Decision Presentation + UI/UX Refactor — 2026-09-04

Status: **OWNER-APPROVED PLANNING DIRECTION — IMPLEMENTATION NOT STARTED**
Date: 2026-09-04
Scope: Question/Perspective, narrative, visualization, Dashboard, evidence, export and product UI-surface refactor.
Authority: design/implementation plan; not runtime or metric authority.
Code-audit snapshot: product successor `codex/r1-roadmap-integration` at `262bd768`; re-verify exact head at DPR-0.
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
## 19. Proposed implementation phases

### DPR-0 — Baseline audit and contract freeze

- Freeze current governed numeric/evidence parity fixtures before presentation refactor.
- Capture representative Home, Understanding, Decision Workspace, Dashboard, Deep BA and Step 2 acceptance screenshots.
- Inventory every chart-type conversion/loss and every duplicate question/presentation path.
- Reconcile `ui-baseline.md` with the owner-approved canvas-first/card-by-exception rules.

### DPR-1 — Claim + Question Provenance foundation

- Add presentation-layer provenance for data evidence, MB/domain context and mixed inference.
- Add claim basis / causal status / limitations contract.
- Build one shared Evidence Inspector contract and navigation model.

### DPR-2 — Open-world Question / Perspective Intelligence

- Separate Domain from Perspective.
- Feed `domainInference`/MB context into question discovery/ranking/presentation without changing governed authority.
- Merge/deduplicate universal + governed question presentation.
- Add answerability states and neutral wording rules.

### DPR-3 — Analysis Narrative Planner + Deep BA hierarchy

- Build answer-first narrative plan over existing governed outputs.
- Remove repeated same-weight Main Answer / driver / risk blocks.
- Add supporting-analysis relevance gate.
- Preserve numeric/evidence parity.

### DPR-4 — BA Step 2 investigation model

- Replace “Deep BA on selected rows” presentation with selected-subject investigation semantics.
- Add benchmark/context decomposition and concise next-action structure.
- Synthesize multi-source evidence into one answer where appropriate.
### DPR-5 — Visualization ontology + Domain Visual Profiles

- Define analytical intents and visual suitability/negative rules.
- Define initial standard visual vocabulary from the supplied reference set.
- Add domain visual profiles as MB/domain context, not execution authority.
- Add metric desirability vocabulary for interpretation where evidence permits.

### DPR-6 — Visualization Planner + renderer/type preservation

- Introduce governed `VisualizationPlan`.
- Fix chart type collapse during persistence/rendering.
- Make chart choice depend on intent, semantic roles, time ordering, cardinality, units and domain prior.
- Expand chart renderer/library only after the planner contract is stable.

### DPR-7 — Dashboard Composition Planner

- Introduce semantic card/section roles and story order.
- Add narrative/visual duplication checks and information budget.
- Use Domain Dashboard Grammar plus current perspective/audience.
- Remove hard-coded Bar breakdown generation as the default.

### DPR-8 — Canvas-first surface refactor

- Flatten Home, Understanding, Decision Workspace, Deep BA and Step 2 according to section 17.
- Replace duplicate technical details with the shared Evidence Inspector.
- Enforce card-by-exception and nested-card-depth rules.
- Preserve accessibility, responsive behavior and existing owner-approved navigation shell.

### DPR-9 — Report Page Model + true export pagination

- Add shared screen/PNG/PDF page plan.
- Implement semantic page breaks and keep-together rules.
- Export PNG as bounded pages/sections and PDF as a true multi-page report.

### DPR-10 — Cross-domain acceptance and release regression

- Run semantic/numeric/evidence parity, question relevance, chart recommendation, dashboard composition, narrative and export acceptance.
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
## 21. Hard invariants during implementation

- Governed source values, aggregation semantics and evidence references must remain unchanged unless a separately reviewed correctness bug is found.
- `SUM` remains `SUM`; presentation refactor must not mutate factual values to improve narrative.
- Micro Brain remains non-authoritative for metrics, formulas, joins, relationships and runtime execution.
- Unsupported inferred domains remain explicitly unsupported/evidence-bound.
- No claim may silently strengthen from observation/correlation into cause.
- Supporting visual labels must match the metric actually plotted; `UnitPrice` must not be presented as revenue/money total.
- Question, chart, dashboard and report planners may preserve or reduce authority, never strengthen it.
- Evidence must remain reachable even when removed from the main visual flow.
- No raw business data should be sent to new telemetry merely to support this UI refactor.

## 22. Expected product architecture after refactor

`Raw source -> Understanding + Micro Brain -> Question/Perspective Intelligence -> governed question/metric authority -> Analysis Narrative Intelligence -> Visualization Intelligence -> Dashboard Composition Intelligence -> Report/Presentation Intelligence -> canvas-first UI + shared Evidence Inspector`

The desired product feeling is:

> The deeper the backend becomes, the calmer the frontend becomes.

LightBI should guide the user from **what the data means** to **what question matters**, then to **the answer**, **the visual evidence**, **the explanation**, and **the next action** — without turning every layer of internal intelligence into another visible card.

## 23. Implementation gate

This document is the refactor plan only. No product source, runtime, NEXT generation, Production service, metric authority, Micro Brain corpus, domain-support pack or release artifact is changed by this documentation step.

Before DPR-0 implementation starts, reconcile the exact active product head/current Road-to-1.0 state and obtain owner execution instruction. Documentation work must continue to follow `docs/project-book/LIBRARY_RULES.md`.
## 24. Source bookmarks

- [`../../../project-book/LIBRARY_RULES.md`](../../../project-book/LIBRARY_RULES.md) — documentation governance used for this plan.
- [`../../../project-book/LIGHTBI_PROJECT_BOOK.md`](../../../project-book/LIGHTBI_PROJECT_BOOK.md) — durable project direction and current source precedence.
- [`./AGENT_PLAN_ROAD_TO_1_0_2026-08-31.md`](./AGENT_PLAN_ROAD_TO_1_0_2026-08-31.md) — current Road-to-1.0 execution overlay and scheduling boundary.
- [`../../../project-book/EXTERNAL_SOURCE_REGISTER.md`](../../../project-book/EXTERNAL_SOURCE_REGISTER.md) — owner-supplied visual reference provenance and SHA-256 records.
- [`../../../design/ui-baseline.md`](../../../design/ui-baseline.md) — existing design baseline to reconcile at DPR-0 before implementation.

Product code paths cited in this plan were inspected on the separate product successor worktree at snapshot `262bd768`; they must be re-read from the exact active product head before mutation.