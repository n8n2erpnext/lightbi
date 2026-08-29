# AUDIT: Raw Understanding Algorithm

## Goal
Evaluate whether LightBI's current raw data understanding algorithm is architecturally correct for the product ambition:

`Multi raw data -> LightBI -> Clean Data -> Human reading / BI / downstream analytics`

This audit treats LightBI not only as an SME-facing analysis assistant, but as a modern data-layer component that can create value even when the final consumer is a Data Analyst, a BI tool, or a downstream clean-data pipeline.

## Executive Verdict
**Verdict: Directionally correct, but not yet sufficient as a durable data-layer primitive.**

LightBI is already stronger than classic BI onboarding flows because it begins with semantic understanding instead of dashboard configuration. However, the current implementation is still mostly a **signal detection and heuristic opportunity generation engine**, not yet a full **business understanding engine**.

In practical terms:
- It is already good enough to prove the product philosophy.
- It is not yet strong enough to become a trusted "understanding-to-clean-data" layer across messy, multi-domain, low-quality raw datasets.

## What Is Architecturally Correct Today

### 1. The product flow is correct
The current architecture has the right top-level shape:

`Raw dataset -> Signals -> Dataset Understanding -> Optional analysis artifacts`

This is a strong departure from traditional BI:

`Raw data -> model manually -> dashboard manually -> interpret manually`

That shift is the most important LightBI advantage.

### 2. BusinessSignal is the right semantic unit
ADR-085 made the correct decision: downstream analytical layers should consume canonical `BusinessSignal` objects instead of raw column names.

This is the correct abstraction if LightBI is meant to sit between unstable raw schemas and more stable human/business meaning.

### 3. Understanding-before-questions is the right success metric
ADR-097 is also correct. A dataset can be valuable even when it yields:
- 0 Business Views
- 0 Questions

If LightBI can still explain what the dataset is about, what entities exist, and what analysis is possible, the product is already useful.

This matters even more if LightBI is later used as a data-cleaning or pre-BI layer.

### 4. Execution is increasingly decoupled from understanding
The DU runtime work moved execution toward `RuntimePlanPreview` instead of raw frontend SQL. That is healthy because it keeps semantic understanding and execution contracts separate.

That separation is required if LightBI eventually becomes a middle-layer in a larger modern data stack.

## What Is Not Yet Correct Enough

### 1. The detector is still heavily alias-driven
Today, `detectBusinessSignals()` is dominated by:
- normalized column-name matching
- optional semantic tag matching
- light contextual promotion such as `status -> delivery_status`

This means the engine is currently best described as:

`column alias detector + canonicalizer`

not yet:

`raw business meaning interpreter`

That is acceptable for MVP, but it is fragile when:
- column names are cryptic
- internal abbreviations are used
- multiple business systems use conflicting naming conventions
- meaning is expressed more in values than headers

### 2. Evidence quality is too shallow
The detector defines an evidence model with:
- `columnAliasMatch`
- `semanticTagMatch`
- `relationshipSupport`
- `profileSupport`

But only the first two are meaningfully exercised today. This leaves the understanding layer underpowered because it is not yet using enough evidence from:
- value distributions
- uniqueness / key behavior
- date-like parsing behavior
- cross-column dependencies
- cardinality patterns
- repeated workflow shapes across datasets

For LightBI to become a real modern data-layer component, evidence must move beyond names and tags.

### 3. Business entities are currently too thin
In `dataset-understanding-contract.ts`, `inferredEntities` are almost a direct remap of signals:
- one signal becomes one entity

That is not yet true entity inference.

For example:
- `driver`, `route`, `shipment`, `report_date`, `satisfaction`

should not only produce five concepts. They should also produce a higher-order claim such as:
- "This dataset describes delivery performance operations"
- "Primary grain appears to be shipment-event or report-row"
- "Route and driver are likely dimensions; shipment is likely an activity measure"

That layer is only partially present in the current narrative.

### 4. Workflow understanding is mostly declared, not inferred
The docs define a strong Level 3:
- business workflow / shape

But the implementation is still thin here. Workflow hints are not yet inferred from durable row-level evidence such as:
- status progression
- event sequencing
- repeated lifecycle columns
- source-to-destination patterns
- inbound/outbound movement logic

This is a major gap if LightBI is meant to help produce clean analytical datasets rather than only suggest charts.

### 5. Analysis opportunity generation is still mostly heuristic
Outside the protected delivery special-case, the generic path is:
- every dimension gets a distribution
- every measure gets trend-by-time
- every measure gets group-by-dimension

This is useful, but it is closer to:

`capability generation`

than:

`business opportunity generation`

That distinction matters.

A modern data-layer LightBI should eventually distinguish:
- "can aggregate"
- from "should investigate"

Those are not the same.

### 6. No explicit "clean data output contract" yet
This is the biggest product-architecture gap relative to your stated ambition.

Right now, LightBI can:
- detect signals
- narrate understanding
- suggest actions
- execute previews

But it does not yet emit a formal intermediate artifact that a DA or BI tool can treat as a stable "clean understanding layer".

For the desired role in the stack, LightBI should eventually output something like:
- normalized field roles
- inferred grain
- canonical entity map
- measure/dimension/time classification
- candidate keys
- quality caveats
- relationship hints
- semantic lineage from raw column -> canonical concept

Without that artifact, LightBI is still mainly an app experience, not yet a reusable data-layer component.

## Current Maturity by Layer

### Level 0: Dataset Profile
**Partial**

The architecture wants row count, column count, types, keys, and data quality. Some of this exists conceptually, but it is not yet a rich, central input to the semantic engine.

### Level 1: Business Concepts
**Good for MVP**

This is currently the strongest layer. Canonical signals and alias-driven semantic normalization are working and align with the product philosophy.

### Level 2: Business Entities
**Partial**

Useful but still too close to "signals rendered nicely" rather than robust entity inference.

### Level 3: Business Workflow / Shape
**Weak**

Declared well in docs, but still under-realized in code.

### Level 4: Relationship Hints / Analytical Potential
**Moderate**

The system can produce useful opportunities, but many are still generic capability outputs rather than strong business opportunities.

### Level 5: Understanding Narrative
**Good UX, moderate engine depth**

The narrative is a correct product move. The issue is not that the narrative exists; the issue is that it is still backed by a shallow inference engine.

### Level 6: Derived Outputs
**Improving**

DU-7J proved that understanding can now reach execution with real backend proof. This is strong progress, but it does not by itself strengthen the understanding algorithm.

## What LightBI Must Become To Fill The Desired Role

If LightBI is meant to be a durable middle layer in modern data workflows, it should evolve from:

`understand enough to suggest a chart`

into:

`understand enough to produce a reusable clean semantic dataset contract`

That future contract should include at least:
- dataset grain hypothesis
- canonical field roles
- entity graph
- measure/dimension/time/status classification
- confidence by evidence type
- raw-to-canonical lineage
- quality warnings that matter analytically
- candidate clean-data transformations

This would let LightBI serve at least three downstream audiences:
- SME users who want quick understanding
- Data Analysts who want a structured semantic audit of raw files
- BI/warehouse systems that need a cleaner intermediate layer

## Recommended Next Evolution

### 1. Promote "understanding artifact" to a first-class output
Create a formal artifact that can survive beyond UI narrative.

Example direction:
- `DatasetUnderstandingArtifact`
- versioned
- traceable
- exportable
- consumable by runtime and future data-prep workflows

### 2. Add evidence beyond column names
Strengthen signal confidence using:
- value-shape detectors
- uniqueness / key detectors
- date parsing evidence
- low-cardinality status detection
- numeric distribution heuristics
- column co-occurrence patterns

This is the highest-leverage algorithmic upgrade.

### 3. Infer dataset grain explicitly
LightBI should answer:
- what does one row represent?
- event, order, shipment, invoice, stock snapshot, customer, daily summary?

This is critical if LightBI will help produce clean data for BI or analysts.

### 4. Separate capability detection from business opportunity detection
Keep both, but do not confuse them.

- Capability detection:
  "You can group by warehouse."
- Business opportunity detection:
  "This dataset appears suitable for aging-risk analysis and replenishment review."

LightBI needs both layers.

### 5. Add a clean-data handoff contract
If the user wants to use LightBI purely for cleaning or understanding, the system should be able to hand off:
- normalized schema proposal
- canonical labels
- inferred semantic roles
- quality issues
- recommended derived fields

This is the missing bridge between "LightBI understands" and "a downstream BI tool can use the result."

## Final Verdict
**The current algorithm is correct as a foundation, but incomplete for the role you want LightBI to play.**

It already has:
- the right product philosophy
- the right semantic direction
- the right understanding-first UX
- the right separation between understanding and execution

It still lacks:
- deep evidence-driven understanding
- real workflow inference
- explicit dataset grain inference
- a reusable clean-data output contract

So the honest conclusion is:

**LightBI already behaves like an emerging Business Understanding Layer.**

**It does not yet behave like a mature semantic-cleaning layer for modern multi-raw-data workflows.**

That should become the next architectural north star.
