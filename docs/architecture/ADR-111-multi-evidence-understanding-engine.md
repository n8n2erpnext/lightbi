# ADR 111: Multi-Evidence Understanding Engine

## Status
Proposed

## 1. Context
LightBI's current understanding stack is directionally correct:

`Raw Data -> Business Signals -> Dataset Understanding -> Analysis Opportunities -> Investigation`

This aligns with:
- ADR-085 `Business Signal Registry`
- ADR-096 `Guided Investigation Pipeline`
- ADR-097 `Dataset Understanding Before Questions`
- ADR-098 `Dataset Understanding Contract`
- ADR-099 `Analysis Action Runtime Contract`
- ADR-073 `Dataset Health Engine`

However, the current implementation is still dominated by:
- column alias matching
- optional semantic tag matching
- light contextual promotion
- generic signal-to-opportunity heuristics

This is good enough for early product proof, but too shallow for the long-term role of LightBI as:

`Multi Raw Data -> LightBI -> Clean / Prepared Data -> Human Reading / BI / Downstream Analytics`

We need a more capable understanding algorithm.

But we must stay practical:
- no radical rewrite
- no cloud dependence
- no parallel second architecture
- no "beautiful algorithm" that cannot fit the current pipeline

## 2. Decision
We evolve LightBI toward a **Multi-Evidence Understanding Engine**, implemented as an incremental upgrade to the existing `BusinessSignal -> DatasetUnderstanding` pipeline.

We do **not** replace the current architecture.

We strengthen it by adding richer evidence layers and clearer intermediate outputs.

## 3. Core Rule
Every understanding upgrade must fit inside the existing flow:

`DetectorInput -> BusinessSignalRegistry -> DatasetUnderstanding -> Analysis Opportunities -> RuntimeIntent`

If a proposal cannot be expressed as an upgrade to one of those stages, it is not acceptable for MVP v1.

## 4. What Changes

### 4.1 BusinessSignal detection becomes multi-evidence, not alias-only
`BusinessSignal` confidence must no longer be driven mainly by column names.

The engine should accumulate confidence from multiple evidence classes:

1. **Alias Evidence**
   Existing behavior:
   - normalized column names
   - semantic tags

2. **Profile Evidence**
   Derived from local dataset profiling:
   - numeric vs categorical behavior
   - null ratio
   - distinct ratio
   - low-cardinality status-like patterns
   - date-parse success

3. **Relational Evidence**
   Evidence from other detected columns:
   - `driver` coexisting with `route` and `shipment`
   - `sku` coexisting with `warehouse` and `stock_qty`
   - `status` promoted by domain context

4. **Grain Evidence**
   Evidence about what one row likely represents:
   - event row
   - entity row
   - daily summary row
   - snapshot row

Important:
- alias matching remains valid
- it simply stops being the only strong signal

### 4.2 Dataset grain becomes a first-class understanding output
LightBI must start explicitly answering:

`What does one row most likely represent?`

Examples:
- shipment event
- order line
- inventory snapshot
- customer record
- daily rollup

This does not require a new runtime layer.

It should be implemented first as a derived output inside the understanding phase, based on local evidence already available or cheaply computable.

### 4.3 Capability detection and business opportunity detection are separated
The current generic generator is useful, but it mixes:
- what the dataset technically allows
- what the dataset is most meaningful for

We formally separate:

1. **Capability Layer**
   - can trend over time
   - can group by route
   - can distribute by SKU

2. **Opportunity Layer**
   - should investigate shipment activity by route
   - should review inventory aging risk
   - should inspect branch sales performance

For MVP v1:
- capability generation may remain heuristic
- business opportunity generation may remain conservative
- but the two must be conceptually distinct in code and docs

### 4.4 Dataset Understanding must produce structured downstream artifacts
The current `DatasetUnderstanding` already supports user-facing narrative.

We extend the intention of this layer so it can support three outputs without creating three different systems:

1. **Standard Mode Output**
   - user-readable understanding
   - chart opportunities
   - decision-readiness guidance

2. **Advanced Mode Output**
   - semantic field-role classification
   - raw-to-canonical lineage
   - caveats for cleanup
   - lightweight clean-data handoff artifact

3. **AI Mode Output**
   - semantic keys briefing
   - grain hint
   - trust / readiness summary
   - caveat summary before AI action

The same core understanding object should power all three.

## 5. What Does Not Change

### 5.1 No new parallel architecture
We do not create:
- a second AI-only understanding engine
- a separate DA-only pipeline
- a separate BI-cleaning subsystem

Everything must remain a direct output of the shared understanding core.

### 5.2 No cloud dependency for base understanding
This ADR is local-first by default.

Cloud AI may remain optional in the future, but:
- basic signal detection
- grain inference
- readiness inference
- semantic preparation outputs

must remain possible without cloud dependence.

### 5.3 No execution-layer contamination
This ADR does not alter the runtime contract shape:
- `AnalysisAction`
- `RuntimeIntent`
- `RuntimePlanPreview`

Understanding gets stronger.
Execution stays isolated.

## 6. MVP v1 Practical Implementation Order
To stay realistic, implementation should happen in this order:

### Phase 1: Expand evidence without changing the pipeline shape
Upgrade `business-signal-detector.ts` to use more profile evidence that is already locally available or cheap to derive.

First targets:
- date-like parsing support
- low-cardinality status detection
- numeric/categorical reinforcement
- distinct-ratio hints

### Phase 2: Add grain hint to `DatasetUnderstanding`
Add a lightweight `grainHint` or equivalent derived understanding output.

It can begin as:
- `event`
- `entity`
- `snapshot`
- `summary`
- `unknown`

This is enough for MVP v1 and is immediately useful to:
- Standard Mode
- Advanced Mode
- AI Mode

### Phase 3: Separate capability from opportunity
Keep current generated actions working, but refactor the mental model:
- capability first
- opportunity second

This can happen inside existing understanding/action generation files.

### Phase 4: Emit lightweight handoff outputs
Without building a full ETL system, expose:
- semantic roles
- grain hint
- caveats
- raw-to-canonical mapping

This is enough to make Advanced Mode genuinely useful for Data Analysts.

### Phase 5: Add AI semantic briefing contract
Expose a compact understanding summary for AI action orchestration.

This should be a direct structured derivative of `DatasetUnderstanding`, not a separate detector.

## 7. Explicit Non-Goals

- No attempt to replace notebooks, dbt, or full Python transformation workflows in MVP v1.
- No attempt to create a general-purpose LLM semantic engine as the main understanding path.
- No heavy probabilistic graph engine that bypasses current TypeScript contracts.
- No runtime or DuckDB redesign as part of the understanding upgrade.
- No widening of unsupported domains just to "look smart."

## 8. Consequences

### Positive
- The current codebase can absorb these changes incrementally.
- Understanding becomes more trustworthy without abandoning the existing architecture.
- Standard / Advanced / AI Mode all improve from the same core investment.
- LightBI gets closer to becoming a true semantic bridge between raw data and clean analytical use.

### Negative
- Some outputs will remain heuristic in MVP v1.
- Grain inference may be imperfect early on.
- The understanding contract may need one or two careful shape extensions.

## 9. Final Practical Rule
Any proposed algorithmic improvement must satisfy all three conditions:

1. It fits the existing understanding pipeline.
2. It improves at least one of Standard / Advanced / AI outputs.
3. It does not create a second competing architecture.

If any one of these is false, it is not the right algorithm for LightBI MVP v1.
