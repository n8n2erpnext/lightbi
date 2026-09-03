# LightBI BA/DA Mode — Future Analyst Workbench Product Concept

Status: draft / future product direction  
Date: 2026-09-03  
Scope: Future BA/DA Mode, analyst workflow, IDE/Python reuse, investigation depth, reusable analysis artifacts, export philosophy, and relationship to Easy/Deep BA/Advanced modes.  
Supersedes: none  
Superseded by: none  
Primary sources: product-owner direction captured 2026-09-03; repository context in [LightBI Project Book](../project-book/LIGHTBI_PROJECT_BOOK.md) and [Product Direction and Pricing Strategy](./product-direction-and-pricing-v1.md).

> This document records an owner-approved future product direction. It is **not evidence that BA/DA Mode is implemented** and must not be used to claim current runtime support.

## 1. Purpose

LightBI began as a product that helps a user give it data, choose a business angle, and understand what the data says. The long-term direction is broader without abandoning that original simplicity: LightBI should become a durable workbench for the full analytical lifecycle of a file, dataset, or connected source.

BA/DA Mode is the future bridge between the current guided business-understanding experience and the technical freedom of Advanced Mode.

Its central question is not only:

> What happened?

It is:

> Why does this result look this way, what evidence supports the explanation, what should be investigated next, and how can an analyst extend the analysis directly with code?

## 2. Product thesis

The future LightBI mode stack should represent different depths of the same analytical workspace rather than separate products:

| Mode | Primary job | User expectation |
| --- | --- | --- |
| Easy / Simple | Understand data quickly | “Tell me what matters.” |
| Deep BA | Explain the governed result | “Give me the business overview, drivers, risks, and next questions.” |
| BA/DA | Investigate the business problem | “Take the overview apart, test explanations, and let me extend the analysis.” |
| Advanced | Manipulate/query data technically | “Give me SQL, transforms, schema tools, IDE/power-user control.” |

Mode switching must preserve analytical context. A user may return from BA/DA to Easy to see the executive view, or move from BA/DA to Advanced to run SQL, build a supporting dataset, and then return to the investigation.

The modes should therefore share one semantic/evidence core rather than rebuild competing interpretations of the same data.

## 3. Deep BA versus BA/DA

Deep BA remains valuable and should not be replaced.

Deep BA answers:

> What is happening in this selected business angle, what evidence supports it, what risks are visible, and what should I look at next?

BA/DA Mode starts from that governed overview and continues:

> Which dimensions, segments, entities, operational drivers, and supporting datasets explain the result, and how strong is the evidence for each explanation?

The distinction is intentional:

```text
Easy        = answer the question
Deep BA     = explain the governed result
BA/DA       = investigate the business problem
Advanced    = manipulate/query the data
```

BA/DA must therefore not become “Deep BA with more cards” or a large static report. It should be an investigation environment whose next step depends on what the previous evidence reveals.

## 4. Investigation path: revenue example

If the user selects **Revenue** as the primary analytical question, BA/DA should first render a governed overview similar to Deep BA, then progressively open deeper investigation paths.

A representative path is:

```text
Revenue
├─ Which store contributes the most revenue?
│  ├─ absolute revenue
│  ├─ contribution share %
│  ├─ growth / variance
│  └─ revenue per order
├─ Why is Store A higher?
│  ├─ more orders?
│  ├─ higher average order value?
│  ├─ better product mix?
│  ├─ higher-margin products?
│  └─ stronger salesperson performance?
```
```text
├─ Which products create the advantage?
│  ├─ units sold / stock-out movement
│  ├─ product/category contribution
│  ├─ attachment / cross-sell pattern
│  └─ gross profit and margin contribution
├─ Which employees create the advantage?
│  ├─ revenue per salesperson
│  ├─ order count per salesperson
│  ├─ average order value per salesperson
│  └─ product-mix quality
└─ How does A differ from B/C/D?
   ├─ order volume share
   ├─ average order value
   ├─ margin
   ├─ product mix
   └─ operational/stock availability differences
```

The desired conclusion is not merely “Store A has the highest revenue.” A high-quality BA/DA finding should be closer to:

> Store A contributes the largest revenue share. Its order count is only slightly above peer stores, while average order value is materially higher. The gap is concentrated in higher-value product categories and a small group of salespeople with stronger basket value and cross-sell behavior. The observed advantage is therefore more strongly associated with basket quality than with traffic/order volume. Margin evidence must then be checked before recommending that the same selling pattern be replicated elsewhere.

The wording must remain evidence-bound and must distinguish observed association from proven causation.

## 5. Secondary questions become an internal investigation graph

Easy Mode may expose primary and secondary questions because a non-technical user needs visible guidance. BA/DA Mode should not show a giant menu of secondary questions before analysis begins.
Instead, secondary questions become the internal branching logic of an **Investigation Graph**.

A useful conceptual structure is:

```text
Metric
→ Dimension
→ Segment
→ Driver
→ Evidence
→ Hypothesis
→ Test
→ Finding
→ Business implication
→ Recommended action / next investigation
```

The system may rank likely investigation branches using evidence strength, materiality, variance, data readiness, and business relevance. A future interface may show candidates such as:

```text
Potential driver          Evidence strength
Average order value       HIGH
Order count               LOW
Product mix               HIGH
Discount                  MEDIUM
Salesperson pattern       HIGH
Inventory availability    MEDIUM
```

This ranking is guidance, not authority. Missing or contradictory evidence must remain visible.

## 6. Domain investigation universes

The same engine should support different investigation universes without becoming a fixed dashboard tree.

Examples:

```text
Revenue   → store → product → employee → order → margin
Profit    → revenue → COGS → discount → product mix → logistics
Inventory → stock → turnover → aging → demand → purchase → dead stock
Cash Flow → receivable → customer → aging → invoice → collection behavior
Employee  → sales → orders → AOV → product mix → margin → attendance
```

## 7. Reuse the Advanced IDE inside BA/DA Mode

Advanced Mode already owns the technical IDE/workspace direction. BA/DA Mode should **reuse the same editor/runtime**, not build a second IDE.

The difference is context.

In Advanced Mode the user opens a technical workspace to query or transform data. In BA/DA Mode the IDE opens as an extension of the current investigation and should inherit the exact analytical context that LightBI already understands.

A BA/DA Python workspace may preload concepts such as:

```python
current_metric = "revenue"
current_dimension = "store"
current_period = "2026-08"

# Semantic bindings resolved by LightBI
sales = current_context.dataset("sales")
inventory = current_context.dataset("inventory")
products = current_context.dataset("products")
staff = current_context.dataset("staff")
```

The user should not have to rediscover column meaning from a blank notebook when LightBI has already resolved source identity, semantic roles, canonical metrics, relationships, evidence, and restrictions.

## 8. LightBI analytical Python standard library

The long-term Python experience should grow from LightBI’s own governed BA analysis rather than expose only generic pandas primitives.
A conceptual package layout:

```text
lightbi.analysis.sales
lightbi.analysis.profit
lightbi.analysis.inventory
lightbi.analysis.customer
lightbi.analysis.employee
lightbi.analysis.finance
lightbi.analysis.procurement
lightbi.analysis.logistics
lightbi.analysis.forecast
lightbi.analysis.risk
```

Representative APIs may include:

```python
sales.revenue_trend()
sales.store_contribution()
sales.average_order_value()
profit.gross_margin()
profit.margin_by_product()
inventory.stock_turnover()
inventory.aging()
employee.sales_productivity()
employee.aov_by_salesperson()
customer.repeat_rate()
```

These names are product-direction examples, not frozen APIs. The architectural principle is the important part: the library should encode reusable analytical operations that match LightBI’s semantic/evidence model.

BA users can follow templates. More technical analysts can modify the template, add filters/cohorts/tests, or ignore the helpers and write Python directly.

## 9. Analyst skill ladder

BA/DA Mode should have a low floor and a high ceiling.

```text
Guided analyst
→ choose investigation branch
→ run LightBI template
→ inspect evidence

Working BA/DA
→ copy template
→ add filters / cohorts / comparison logic
→ save reusable analysis

Advanced analyst
→ write custom Python from scratch
→ use SQL/Advanced Mode when needed
→ publish outputs back into the investigation
```

This preserves the original LightBI promise that non-technical users can understand data while allowing professional analysts to remain in the same product as their skill grows.

## 10. SQL and Advanced Mode are adjacent tools, not competing modes

If BA/DA discovers that the current dataset needs a technical join, derived table, filter, or query, the user should be able to open the existing Advanced SQL/IDE workspace with the current context attached.

A representative workflow:

```text
BA/DA finding
→ need supporting inventory join
→ Open in Advanced
→ SQL/query/transform
→ save governed result or derived dataset
→ return to BA/DA
→ continue investigation
```

The technical result must re-enter the canonical evidence boundary before LightBI presents it as trusted business evidence. Advanced Mode remains a power tool, not a bypass around lineage/trust/governance.

## 11. Save an Analysis Artifact, not only a script

A saved BA/DA analysis should be reproducible as a first-class project artifact rather than an orphaned `.py` file.

Conceptually an Analysis Artifact should preserve:

```text
Analysis
├─ identity / name
├─ business question
├─ source and canonical artifact identities
├─ relationship / overlay identities where applicable
├─ filters and execution scope
├─ code / template reference
├─ analytical-library version
├─ runtime/environment metadata
├─ output tables
├─ charts / visual artifacts
├─ findings
├─ evidence references
├─ limitations / restrictions
└─ execution timestamp / revision
```

Saving must be revision-oriented. Editing an analysis should create traceable evolution rather than silently destroying the prior analytical state.

This becomes important for future Team/Realtime BA directions: managers may consume the finding/evidence/report while analysts can reopen the exact code and execution context that produced it.

## 12. Reproducible and bounded Python execution

Because LightBI is local-first, the preferred future Python model is a bounded local analytical runtime with explicit project/workspace scope.

Future design should consider:

- controlled filesystem access scoped to the active project/workspace;
- no implicit network requirement;
- explicit package/runtime versioning;
- deterministic links to the source/canonical artifact revision used by the analysis;
- safe execution boundaries appropriate to user-authored code;
- clear distinction between a preview/result buffer and a complete governed source result.

## 13. Open export philosophy remains unchanged

BA/DA Mode must strengthen LightBI’s workflow value without turning the product into a data prison.

A user should still be able to move results downstream:

```text
LightBI analysis
├─ Excel / CSV
├─ Pivot-ready Excel artifact
├─ Python / notebook artifact
├─ chart / report
├─ Power BI or another BI tool
└─ database / downstream operational system
```

LightBI does not need to replace Excel, Power BI, Tableau, databases, Jupyter, or every specialized data tool. Its role is to make the full data-working lifecycle coherent around one understood/evidence-bound context and then let the user hand work off cleanly.

The strategic goal is **workflow gravity**, not coercive lock-in.

Users should stay because reusable analytical work accumulates inside LightBI — semantic knowledge, cleaning recipes, SQL, Python analyses, custom KPI, investigations, evidence, reports, templates — while retaining the confidence that their data and deliverables can leave the product.

## 14. Causality boundary

BA/DA Mode may eventually become better at explaining drivers and cause/effect, but early versions must distinguish levels of evidence.

A useful confidence ladder is:

```text
Observation
→ Association
→ Likely driver
→ Supported explanation
→ Causal evidence
```

Correlation or a strong decomposition must not automatically be presented as proof that one factor caused another. Temporal evidence, controlled comparisons, cohorts, confounder handling, or explicit causal methods may be required before stronger causal language is allowed.

This boundary extends the existing LightBI rule that Business Brain recommendations cannot overclaim beyond evidence.

## 15. UX direction

BA/DA should feel like an analyst workbench, not another dashboard page.

A conceptual layout:

```text
┌ Investigation ───────────────────────────────┐
│ Why is Store A revenue higher?              │
│                                             │
│ Finding                                     │
│ AOV appears to be the strongest driver.     │
│                                             │
│ Evidence                                    │
│ AOV +18.7%                                  │
│ Orders +3.1%                                │
│ Margin +1.2pt                               │
│                                             │
│ [Explore deeper]                            │
├─────────────────────────────────────────────┤
│ Analyst Workspace                           │
│ Template: Revenue → Store → AOV             │
│ Python / SQL editor                         │
│ ▶ Run   Save Analysis   Export              │
└─────────────────────────────────────────────┘
```

The upper layer communicates BA reasoning and evidence. The technical workspace exposes DA tooling when wanted. A BA can use the investigation without coding; a DA can inspect or replace the computational path.

Mode switching should be explicit but lightweight:

- **View in Easy Mode** for the simplified/executive view;
- **Open in Advanced** for SQL, schema, transforms, and technical work;
- **Return to Investigation** with the resulting analytical context preserved.

## 16. Full lifecycle positioning

The future product direction is not “LightBI replaces every data tool.” It is that LightBI becomes the place users instinctively open when data work begins.

A full lifecycle may look like:

```text
Raw data
→ Connect / Import
→ Understand
→ Clean / Standardize
→ Trust / Evidence
→ Easy exploration
→ Deep BA overview
→ BA/DA investigation
→ SQL / Python / transform when needed
→ Save / reproduce
→ Share / report
→ Export / hand off downstream
```

This preserves the original product philosophy while increasing the professional ceiling dramatically.

The desired user behavior is:

> “I received a dataset. I will put it through LightBI first.”

That behavior should come from workflow quality and accumulated reusable analytical assets, not from preventing users from leaving.

## 17. Product retention thesis: workflow gravity

Easy Mode can create the initial “wow” moment because LightBI understands a raw file and produces useful business analysis quickly. BA/DA and Advanced are expected to create long-term retention because they become daily working surfaces.

Over time a user may accumulate:

- semantic mappings and evidence decisions;
- cleaning/standardization recipes;
- saved SQL;
- Python analysis artifacts;
- custom KPI and formulas;
- investigation paths;
- reports, charts and dashboards;
- reusable team analysis and evidence.

This is the desired moat: another product may offer a free chart, SQL editor, notebook, or AI summary, but replacing LightBI should require replacing a coherent accumulated workflow rather than a single feature.

No current pricing or entitlement boundary is decided by this document. In particular, this concept must not be used to infer which portions belong to Basic, Pro, Team, or a future package.

## 18. Architectural invariants carried forward

BA/DA Mode must inherit existing LightBI invariants rather than create an ungoverned parallel analytics stack:

- original data remains evidence and is not silently mutated;
- semantic understanding and user evidence overlays remain source-bound;
- cross-source relationships remain governed and operation-specific;
- full-source versus partial/preview scope remains explicit;
- technical results must preserve lineage and completeness truth;
- charts, reports, Python outputs and exports should consume governed result identity rather than independently reinterpret totals;
- missing evidence must remain visible;
- AI may assist explanation/orchestration but does not become analytical truth authority.

## 19. Non-goals

BA/DA Mode is **not** intended to:

- replace Easy Mode;
- turn every user into a programmer;
- make Deep BA obsolete;
- fork a second semantic engine;
- turn Advanced Mode into an ungoverned bypass;
- replace Jupyter, Excel, Power BI, databases, or every specialized analytical tool;
- claim causality from correlation;
- force user data to remain in LightBI;
- define current commercial packaging before a separate pricing decision.

## 20. Future implementation questions

The direction is approved, but implementation details remain deliberately open. Future design work must decide:

- exact BA/DA navigation and information hierarchy;
- the persisted Analysis Artifact schema;
- Python runtime/sandbox model and package policy;
- analytical standard-library API boundaries;
- how user-authored Python declares and returns governed result scope;
- how SQL/Advanced derived datasets re-enter the canonical boundary;
- versioning/replay rules for saved analyses;
- causal-analysis confidence policy;
- Team/Realtime BA sharing and execution semantics;
- edition/entitlement boundaries.

## 21. Current status

As of 2026-09-03 this document is a **future product concept**. The current repository already contains important foundations — Easy/Simple business understanding, governed Investigation, Deep BA/Business Brain, Advanced Mode direction, semantic/evidence governance, export boundaries, and technical workspace evolution — but this document does not claim that the integrated BA/DA workbench described here exists yet.

When implementation begins, future agents must perform scoped code/Git archaeology against the then-current generation before writing an execution plan. They must not implement directly from this concept document as though it were a current architecture contract.

## 22. Repository bookmarks

Current/foundation context:

- [LightBI Project Book](../project-book/LIGHTBI_PROJECT_BOOK.md) — current project model and source precedence.
- [Product Direction and Pricing Strategy](./product-direction-and-pricing-v1.md) — historical/draft product modes and local-first direction.
- [Phase 28 Business Brain Orchestrator](../history/progress/phase-28-business-brain-orchestrator.md) — Deep BA / Business Brain foundation.
- [Phase 6B Advanced Cutover](../architecture/phase-6b-advanced-cutover-and-legacy-retirement.md) — Advanced Mode boundary.
- [Phase 8D Advanced Boundary Audit](../architecture/phase-8d-advanced-boundary-audit.json) — governed technical-result boundary.
- [Phase 8D Export Handoff Audit](../architecture/phase-8d-export-handoff-audit.json) — export/handoff evidence boundary.

Future product principle captured here:

> LightBI should evolve from “an app that analyzes data from a business angle” into a complete analyst workbench that can carry a dataset from raw intake through understanding, investigation, code-assisted analysis, reproducible artifacts, and open downstream export — while preserving Easy Mode simplicity and avoiding coercive ecosystem lock-in.
