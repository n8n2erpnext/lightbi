# Session Context Reconstruction — Visual Narrative Audit + Chart Intelligence Remediation — 2026-09-11

Status: historical walkthrough / context reconstruction
Date: 2026-09-11
Scope: reconstructs the substantive technical conversation, owner intent, audit findings, implementation decisions and stop state of the Visual Narrative chart-quality session
Primary handoff: [AGENT_HANDOFF_VISUAL_NARRATIVE_AUDIT_REMEDIATION_2026-09-11.md](../handoffs/AGENT_HANDOFF_VISUAL_NARRATIVE_AUDIT_REMEDIATION_2026-09-11.md)
Canonical plan: [§23B.16](../plans/AGENT_IMPLEMENTATION_PLAN_DECISION_PRESENTATION_UI_UX_REFACTOR_2026-09-04.md)

## Important note about transcript fidelity

This file is a **technical reconstruction of the session**, assembled from the active chat context, runtime/source evidence and durable audit artifacts. It is intentionally much more complete than a short handoff, but it is **not a platform-native verbatim export of every UI chat token**. Some earlier turns were compacted/skipped by the conversation runtime and cannot be recovered as an exact raw transcript from the VPS. The purpose is continuity: a successor should be able to understand the owner's intent and every consequential engineering decision without reopening the original chat.

Where exact owner wording materially affected architecture, it is preserved or closely paraphrased below. Runtime/test claims are grounded in the Product/docs state and `/tmp/lightbi-chart-audit-20260910` evidence.

## 1. How this session started

The session entered from DPR-10 / Visual Narrative work after an earlier Web candidate `6ba98d9d...` had already implemented:

- perspective-aware chart advice;
- 30-pattern visualization ontology;
- domain visual priors;
- a first 1/3/5 Visual Narrative composer;
- dynamic Dashboard packing;
- combined visual support;
- MB presentation advice routed through domain/perspective profiles.

Source-level tests and the first Web browser gate had passed. The owner then performed visual UAT and rejected the result as not good enough.

The important point: **the owner did not reject the layout mechanics alone; the owner rejected the system's understanding of what visual story should answer a selected business question.**

## 2. Owner's core complaint about Single-file visual stories

The owner showed multiple screenshots and explained the expected behavior.

Key owner requirements:

- A selected question can include `and`, `A/B`, `A or B`, comparison or related measures; the system should understand the question, not mechanically render separate charts.
- A comparison may need **one combined hero** rather than two independent visuals.
- If one main chart fully answers the question, one chart is acceptable.
- If multiple charts are produced, each supporting chart must **add information that explains or proves the main answer**.
- Producing two or three charts that are visually or analytically the same is unacceptable.
- Layout must be dynamic to the content. A fixed “main + one support” arrangement creates large ugly empty space.
- The owner proposed 1/3/5 as a **layout shape constraint** so the grid can be balanced, but repeatedly clarified that LightBI must not generate extra charts just to reach 3 or 5.
- Example mental model: 5 visuals could be arranged as one main visual plus four supporting visuals around it, but the actual count must be determined by evidence/story needs.
- Reference: Frappe Books' dashboard composition where cash flow can be the main chart and Sales Invoice / Profit & Loss / Purchase Invoice provide complementary context. The owner emphasized that even before reading labels, the dashboard presents a coherent overall picture.

A recurring owner statement was effectively:

> One correct main chart is acceptable; multiple charts are only acceptable when they genuinely supplement and explain the selected question.

## 3. Owner's complaint about the Understanding-to-Chart gap

The owner explicitly distinguished two LightBI layers:

- Data Understanding had become reasonably good.
- Perspective/question understanding and visual-story generation remained disappointing.

The owner also reminded the session that MB had previously been trained/tuned with domain/chart knowledge, and requested serious investigation into whether MB actually influenced chart selection.

This triggered an independent source audit.

## 4. Independent audit of MB/chart wiring — key findings

The source audit concluded that MB was technically connected, but much of its chart/perspective knowledge could not materially influence the final outcome.

The important findings discussed in the session were:

1. user-selected perspective was not always propagated as the true perspective identity into chart planning;
2. the adapter emphasized `domain_profile` while `perspective_profile` and `chart_pattern` knowledge had been underused;
3. supporting analyses were selected mechanically before set-level story planning;
4. a domain chart trio helper existed but was not wired into production;
5. MB could reorder but historically had weak/no authority over membership;
6. runtime domain names and MB corpus domain names differed (`revenue` vs `sales_revenue`, `inventory` vs `inventory_warehouse`, etc.);
7. official priors often outranked MB advice;
8. MB retrieval ranking was flattened when converted to chart-family lists;
9. intent inference remained heavily deterministic/regex-based;
10. source lineage/worktree state could cause agents to inspect older code instead of the actual NEXT candidate.

The audit's architectural conclusion was important:

> The system selected individual trees and then assembled a forest; it did not plan the forest as one story.

Proposed target pipeline:

`User Perspective + Domain + Question Intent + Data Shape`
→ retrieve MB domain + perspective + chart-pattern knowledge
→ candidate visual stories with ranked advisory reasons
→ deterministic evidence/suitability/safety gate
→ set-level complementarity planner
→ choose 1 / 3 / 5 only according to content
→ dynamic layout.

The owner asked to merge the audit with all previous proposals into one implementation plan and deploy first to Web for testing.

## 5. First Visual Narrative refactor and owner rejection

A substantial refactor was implemented and eventually committed as Product:

`6ba98d9d39a95adc5f0ddd9a5aaa48c63cea2220`

It included:

- Visual Narrative composition;
- perspective aliases into MB vocabulary;
- combined hero support;
- dynamic Dashboard packing;
- 1/3/5 layouts;
- Multi two-period comparison behavior;
- stronger perspective propagation;
- MB advice reranking improvements.

Source and initial browser tests were green. It was deployed to NEXT 5273 and the owner tested it.

The owner then posted a set of screenshots and stated that even a few perspectives showed it still did not meet expectations.

## 6. What the owner screenshots revealed

The session analyzed the screenshots cautiously, but the owner correctly objected when the analysis began to infer too much from a small sample.

Before the audit reset, the screenshots suggested issues such as:

- Revenue/category ranking looked reasonable but presentation was weak;
- Inventory risk appeared to use UnitPrice in a way that did not match the business question;
- many Salespeople could create dense/poor ranking presentation;
- 5-chart stories could be domain-related but not actually question-related;
- Revenue-over-time could have a valid main trend but an almost duplicate “Money over time” support;
- time axes could be too granular.

The owner then stopped the speculative diagnosis and gave a much stronger instruction:

> Use Playwright against the main repository sample-data directory, test many files and perspectives sequentially, capture chart screenshots and compare them against the perspective and question; test Single and Multi as broadly as possible. Then generate additional controlled datasets where the expected main/supporting chart is known in advance, and evaluate LightBI against that ground truth.

The owner added one more requirement:

> For the generated sample data, also measure the impact and accuracy of Micro Brain.

This instruction defines the audit method that followed.

## 7. Audit architecture created in response

The session switched to **read-only Product audit first** and created temporary harness/evidence under:

`/tmp/lightbi-chart-audit-20260910`

The key methodological improvement was that Playwright did not only capture screenshots. The session discovered it could inspect React Fiber/ECharts props and extract the actual runtime plan:

- analytical intent;
- pattern ID;
- renderer family;
- suitability candidates;
- chart model fields/rows;
- composition units/rejections;
- layout metadata.

This removed the need to infer chart type from pixels.

## 8. Canonical Single audit — baseline

The tracked canonical corpus contained exactly six official samples:

- Sales May / June
- Accounting May / June
- Logistics May / June

The first inventory found:

- 28 perspectives
- 124 visible/executable question/action paths

Playwright was used to execute the full set. Several harness iterations were required because Investigation can auto-run and a naive runner could misclassify `Running...` as no visual. Transitional cases were rerun until settled.

Baseline result summary discussed in the session:

- 124 question/action paths exercised
- 104 settled visual answers
- 20 execution-complete no-visual answers in the original baseline framing
- many real screenshots + runtime plans captured

The critical insight was that **render coverage was not the same as visual-story correctness**.

## 9. Synthetic controlled corpus

The session generated 12 synthetic datasets, roughly 6.7k rows, deliberately using semantic vocabulary LightBI already understands so schema novelty would not pollute the test.

The synthetic corpus covered approximately these oracle families:

- Revenue by Category ranking
- Revenue daily trend
- Revenue by Payment Method / payment mix
- 30-Salesperson ranking
- Delivery completion/status mix
- Carrier volume + cost
- Inventory aging
- negative Inventory Value Exposure without value authority
- Actual vs Target
- Performance by Team with Actual + Target
- Finance Revenue/Cost/Profit/Margin
- Customer segment/value
- two-period Revenue comparison

Expected visual/business behavior was declared before observing LightBI output.

## 10. Synthetic findings before remediation

### S01 — Revenue by Category

This was a positive control. LightBI could already produce one sensible ranking visual. It proved the architecture did not need multiple charts by default.

### S02 — Revenue daily trend

Main trend was good: hundreds of transactions became roughly one point per day over the month.

Failure: a supporting `Money over time` trend repeated nearly the same Revenue/date story. The composer saw different action identity but not marginal-information duplication.

### S03 — Payment Method

LightBI often used ranking/comparison where a part-to-whole composition story would be more natural. This was considered acceptable in some cases but not ideal.

### S04 — 30 Salespeople

The result engine returned all groups, but renderer suitability could reject the visual because category count exceeded the ranking limit. The correct remedy was not a 30-bar barcode but deterministic Top-N/presentation shaping.

### S05 — Delivery Completion Mix

The intended story was a categorical completion mix. It exposed the need for explicit part-to-whole cues and denominator validation.

### S06 — Carrier Volume + Cost

Controlled data had Carrier + workload evidence + Delivery Fee at the same grain. LightBI initially failed to recognize a compound story.

### S07 — Inventory Aging

The system could degrade the question into record-count coverage rather than governed inventory quantity by Aging Bucket.

### S08 — Inventory Value Exposure negative oracle

This was the most important safety fixture.

Data intentionally lacked governed Inventory Value. Old behavior nevertheless rendered risk concentration using **Unit Price**.

This converted a chart-quality problem into a semantic-correctness problem: correct chart family, wrong business quantity.

The required behavior became explicit abstention/limitation.

### S09 — Actual + Target

Data contained both fields, but Target could be ignored. Later debugging also showed perspective routing and question dedupe could make a card titled Actual-vs-Target execute the generic Actual-only action.

### S10 — Finance compound story

Revenue + Cost + Gross Profit + Margin did not automatically produce a coherent business story. Profit/Margin selection and direct-vs-context ranking needed work.

### S11 — Customer

Some customer segment cases correctly rejected unrelated supporting candidates. This became a positive control for complementarity.

High-cardinality Customer Value exposed the same bounded-ranking problem as Salespeople.

### S12 — Two-period Revenue

The correct business story could fail before the chart planner because Reporting Period was not accepted as a usable period dimension. Later it was made executable and resolved as period comparison rather than a two-point line trend.

## 11. MB A/B findings before remediation

The session measured MB rather than assuming it helped.

Pattern-level controlled result:

- interventions 3 / 11
- improved 0
- neutral 3
- degraded 0

Set-membership controlled result:

- intervention 1 / 5
- that one intervention was degraded

The degraded Revenue Trend case was especially important: MB advice favored another trend and displaced a more distinct item/value view.

The conclusion was nuanced:

- MB retrieval itself was not obviously poor;
- the integration allowed “this perspective likes trend” to become “another trend is a useful support”, which is false;
- MB needed to rank only among candidates already proven question-complementary.

## 12. Remediation plan created — §23B.16

The session wrote a formal plan with ordered gates:

- VN-R1 Semantic Answer Binding
- VN-R2 Question-conditioned Complementarity
- VN-R3 MB after semantic admission
- VN-R4 Cardinality shaping
- VN-R5 Part-to-whole
- VN-R6 Paired/compound measures
- VN-R7 Temporal grain
- VN-R8 Domain semantic recipes
- VN-R9 Before/after benchmark
- VN-R10 Multi systematic closeout

The owner approved proceeding with implementation.

## 13. VN-R1 implementation details

Two concrete root causes were found immediately.

First:

`Inventory` had been mapped to `inventory.age_bucket`.

It was changed to `inventory.on_hand`; Aging Bucket retained the aging semantic.

Second:

Inventory Value Exposure allowed generic money fallback. That made Unit Price eligible as a proxy.

The fallback was removed. Inventory-value/exposure now requires a semantically legitimate value/exposure field or must abstain.

This gate established the session's strongest principle:

> Visualization cannot repair a semantically invalid business answer.

## 14. VN-R2 and VN-R3

Complementarity admission was moved before MB ranking.

Key progression:

- first reject same metric + same dimension + same intent;
- later canonical testing proved dimension swaps alone were still producing fake diversity;
- rule was tightened to reject **same metric + same analytical intent even when dimension changes**, unless there is a legal semantic relationship or genuinely different analytical job.

The composer also began storing machine-readable `reasonForInclusion`.

MB became advisory only after admission.

## 15. VN-R4 High-cardinality shaping

The session was careful not to truncate governed authority.

Implemented model:

- keep the full result rows;
- add presentation shaping metadata;
- deterministically sort and display Top-N;
- disclose omitted category count;
- preserve provenance and drill-through consistency.

This fixed the 30-Salesperson controlled case without creating a vertical barcode.

## 16. VN-R5 Part-to-whole

Strong cues such as mix/share/split/proportion/part-to-whole can open composition intent.

The session initially included `breakdown`, but a regression correctly showed that this was too broad. `breakdown` alone was removed as a denominator cue.

Composition also requires a valid scoped whole: finite non-negative parts and positive total.

## 17. VN-R6 paired/compound measures

Major changes:

- Actual and Target gained separate semantic identities;
- constant targets were allowed as legitimate benchmark evidence;
- Actual-vs-Target question introduced;
- Team/business-group performance retained both Actual and Target;
- Carrier workload + Delivery Fee/Cost legal combination added;
- Profit + Margin legal combination added;
- Profit uses SUM while Margin uses AVG;
- direct answer receives priority over context question for hero selection.

A very important bug appeared here:

Question dedupe used only first metric + dimensions, so Actual and Actual+Target could be merged. The UI card could say Actual-vs-Target while click navigation executed the generic Actual-only action.

The dedupe signature was expanded to all measures + derived measures + dimensions + action kind.

Browser proof then showed correct `target_attainment / target_combo` for both overall and team-grain cases.

## 18. Fee ontology false positive

The Operations debugging revealed a rule effectively treating any header containing `delivery` as money fee.

This caused fields such as Delivery ID / Delivery Status to be misclassified.

The rule was narrowed to fee/charge/cost phrase semantics. When distinct shipment identity is not available, source `record_count` may represent workload, but wording must explicitly call it source-record workload rather than pretending it is distinct deliveries.

## 19. VN-R7 temporal grain

The true execution boundary was found in `safe-sql-preview.ts`, where date trend grouping had been effectively hard-coded daily.

The remediation introduced an adaptive full-file-span policy:

- very short intraday data -> hour when time-of-day is real;
- roughly one month -> day;
- several months -> week;
- multi-year -> month/quarter according to span;
- Reporting Period / Month-like source grain stays as declared source grain;
- exactly two aggregate periods become comparison rather than trend.

The session intentionally refused to install DuckDB native just to run a host-side unit execution because Product uses DuckDB-WASM. Runtime proof was deferred to browser candidate.

## 20. VN-R8 domain semantic recipes

The session explicitly avoided “domain likes chart X” as the only playbook logic.

Recipes were treated as legal relationships between already-governed semantic roles:

- Actual ↔ Target
- Profit ↔ Margin
- Revenue ↔ Cost
- Delivery workload ↔ Fee/Cost
- Inventory on-hand ↔ Aging context

Inventory Aging was fixed to use SUM on-hand by Aging Bucket when on-hand authority exists, with record coverage only as explicit fallback.

## 21. R9 browser candidate strategy

The owner wanted Web-first validation but the session did not want to rotate public 5273 during remediation.

A private audit gateway was used:

`127.0.0.1:5293`

It points at current `apps/desktop/dist`, uses existing Core 5272 and CP 5274, and lets Playwright run the actual DuckDB-WASM/browser code without touching public NEXT.

This was a key operational decision and should be preserved.

## 22. Synthetic before/after outcome

After several remediation cycles, the full 14 controlled cases ran without harness failure or timeout.

The session assessed that no oracle violation remained.

Examples:

- duplicate Revenue trend support removed;
- high-cardinality ranking retained as bounded visual;
- Inventory Aging used governed quantity;
- Inventory Value Exposure without authority abstained;
- Actual + Target used target-aware combo;
- Team Actual + Target retained both series;
- two-period Revenue became comparison rather than trend.

A few cases were still considered “acceptable but not ideal”, which is intentionally different from correctness failure.

## 23. Canonical 126-case remediation sweep

Because question routing/dedupe changed, the session regenerated inventory instead of pretending the old 124 selectors still described the current product.

Fresh current matrix:

- Accounting: 19 questions per file
- Logistics: 24 questions per file
- Sales: 20 questions per file
- total: 126

The full sweep completed 126/126 with 0 browser failure and 0 timeout.

Four execution-complete no-visual cases remained.

### Logistics count cases

`How many governed deliveries are present?`

These returned a valid single value. No chart was considered correct.

### Accounting actor-value cases

These were genuine defects and led to two additional ontology/question fixes.

## 24. Late bug: Salesperson classified as Revenue

Browser diagnostics showed raw headers:

`SALESPERSON | SALESPERSON`

with meaningless values.

The root cause was not the chart planner. Registry-backed alias matching converted `sales` into substring regex, so `Salesperson` could match Revenue.

The session first tightened a compatibility regex, but a regression still failed. Further inspection showed that both canonical `sales` and canonical `revenue` contributed alias `sales` into the merged `money.revenue` rule.

The final correction applied the boundary rule to the alias token itself, regardless of originating canonical signal.

Regression then passed.

## 25. Late bug: generic Value question selected UnitPrice

After fixing Salesperson, browser showed:

- x = Salesperson
- y = UnitPrice

The reason was different: generic Value questions still picked the first generic money signal.

The session changed the generic `Money/Value by time/location/item/actor/customer` family to prioritize true business value:

`Revenue -> Receivable -> generic money fallback`

Browser proof then showed:

`Salesperson × NetRevenue`

and raw governed columns:

`SALESPERSON | NETREVENUE`

This is an important illustration of the session's approach: continue tracing semantic errors upstream rather than accepting a chart that merely renders.

## 26. Late bug: dimension-swap fake diversity

Canonical inventory exposed stories such as:

- Product record_count
- Brand record_count
- Category record_count

The previous composer treated different dimensions as complementary.

The rule was tightened:

> Same metric + same analytical intent is duplicate information even when the dimension differs.

Browser proof on Accounting Inventory after rebuild showed `layoutCount=1`, with only Product record_count retained as primary and Brand/Category not admitted merely to fill the set.

This directly answers one of the owner's original complaints.

## 27. Latest MB A/B state

After semantic admission was tightened, a strict controlled A/B test produced:

- 0 pattern interventions across 11 cases
- 0 membership interventions across 4 cases
- 0 degraded outcomes

The engineering interpretation during the session:

- the dangerous net-negative influence is gone;
- MB influence is now too weak to observe on this controlled set;
- do not solve that by weakening semantic admission;
- later, improve MB ranking within an already-valid complementary set.

## 28. Multi-file audit intent

The owner explicitly asked for both Single and Multi testing.

Seven Multi combinations were defined:

1. Sales May + June
2. Accounting May + June
3. Logistics May + June
4. Sales + Accounting four-file
5. Sales + Logistics four-file
6. Accounting + Logistics four-file
7. full six-file

Fresh current inventory found 34 executable perspectives total. Full-six keeps Order Journey non-executable, which is expected.

The Multi closeout is not complete.

## 29. Multi matrix harness failure at stop

An execution matrix had been started, but its result file is **not valid Product evidence**.

`/tmp/lightbi-chart-audit-20260910/multi-r10-matrix/results.json`

contains 16 rows, only 3 ok. The first meaningful failure was a `data_trust` perspective timing out while waiting for `collection-decision-workspace`. Then the page/context closed and the same harness kept attempting subsequent perspectives, producing cascading `Target page, context or browser has been closed` failures.

Therefore the session stopped with the following conclusion:

> Rewrite the Multi harness so each perspective is isolated or recovery is robust; do not count the current 13 failures as Product defects.

The next session must understand that this is a harness problem first.

## 30. What must be checked in Multi R10

For every executable perspective:

- primary visual family/pattern;
- two-period `comparison` vs trend;
- supporting metrics;
- 3 follow-up BA questions and whether each answer is truly different;
- source-separation contract;
- no raw join across unrelated files;
- generated Dashboard composition and whitespace packing;
- no horizontal overflow/page error;
- different expected surface for Data Trust if Product contract uses one.

The same complementarity grammar must be used as Single; Multi must not become a parallel intelligence implementation.

## 31. Runtime and deployment discipline repeatedly reinforced by owner

Throughout the larger LightBI effort, the owner has repeatedly enforced:

- NEXT tests use 52xx, not 51xx;
- Production is separately gated;
- do not restart Core/CP for UI-only work;
- prefer immutable Web roots;
- record exact Product/CP/generation identity;
- Web owner UAT before native/Windows acceptance when Product source changes materially.

This session followed that rule by keeping remediation on private 5293 and leaving public 5273 on `6ba98d9d`.

## 32. Owner's domain-expansion question near session end

The owner asked whether these changes would have to be redone when adding new supported domains later.

The session's architectural answer was no, if this refactor closes correctly.

Reusable core should own:

- semantic answer binding;
- surrogate rejection/abstention;
- complementarity;
- duplicate-information detection;
- MB-after-admission;
- dynamic 1/3/5 layout;
- cardinality/time shaping;
- part-to-whole;
- paired/compound recognition;
- renderer suitability;
- governance/evidence.

A new domain should primarily supply a pack:

`Vocabulary + Semantic Recipes + Presentation Priors + MB Cards + Oracle Tests`

Only a genuinely new analytical primitive should require core changes.

This domain-pack direction is important context for how future refactors should be judged. Avoid hard-coded per-domain planners.

## 33. State when owner requested emergency stop/handoff

Owner instruction:

- stop immediately;
- write a full detailed handoff on VPS;
- make the Audit/test results and chart-adjustment direction extremely clear;
- optionally add another file containing the session conversation/context so the next session can understand more completely.

At that moment:

- Product base HEAD = `6ba98d9d39a95adc5f0ddd9a5aaa48c63cea2220`
- Product worktree dirty with 25 remediation files
- Docs base HEAD = `b03912ffe7f71d3be609eee1e506c4273b3f5f7b`
- §23B.16 existed uncommitted
- public 5273 still served old live candidate
- private 5293 served remediation candidate
- Multi 34-perspective inventory complete
- valid Multi full execution **not** complete
- full release-authoritative suite for exact final dirty tree **not** run yet
- no Product commit/deploy for remediation

## 34. Session conclusions that should survive context loss

1. The chart problem is fundamentally an **answer semantics + set composition** problem, not primarily an ECharts/library problem.
2. The system must refuse a visually attractive chart if the measured business quantity is wrong.
3. Supporting visuals require marginal information gain relative to the selected answer.
4. Different dimension does not automatically mean different analytical story.
5. MB retrieval quality and MB decision usefulness are separate things.
6. MB should rank inside an admitted set, not establish admission.
7. 1/3/5 is layout normalization, never a quota.
8. Browser/Fiber/runtime-plan evidence is more reliable than screenshot inference.
9. Controlled synthetic oracles are essential because the expected answer is known before observing LightBI.
10. New domains should extend vocabulary/recipes/knowledge/tests rather than fork the planner.

## 35. Where to continue

Read the primary handoff first. The next actionable engineering step is Multi R10 harness correction and a clean 34-perspective execution on the private remediation candidate, followed by final aggregate/full release verification, docs closeout, separate commits, immutable NEXT Web deployment and owner UAT.

Do not continue from the invalid Multi result file as if it represented Product failures. Do not reset the Product worktree. Do not deploy before the exact dirty-tree remediation has passed the final authoritative suite.
