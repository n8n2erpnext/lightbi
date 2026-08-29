# LightBI MVP — Canonical Understanding, Context Dictionary & Domain Support Plan

**Source snapshot reviewed:** `LightBI-code-docs-20260710-091720.zip`
**Architecture status:** MVP decision document
**Primary objective:** Ship a truthful local-first MVP quickly, with one raw-data understanding pipeline and a verifiable semantic/domain support boundary.

**Document status:** Canonical and executable. This file consolidates and supersedes `LIGHTBI_MVP_CANONICAL_UNDERSTANDING_PLAN.md` and the later context-dictionary/domain-support plan. Codex must use only this `MVP.md` as the roadmap and must execute one phase at a time.

---

## 1. Executive decision

LightBI is directionally correct in using a **context-aware semantic dictionary** and a **sample matrix** to understand raw user data. This is one of the most important architectural assets of the product.

However, the current implementation is not yet safe enough to claim:

> “A domain is supported because its column names can be recognized.”

The product must distinguish four different capabilities:

1. **Signal recognition** — LightBI can identify what a physical column may mean.
2. **Dataset understanding** — LightBI can infer the row grain, relationships, quality, and domain context.
3. **Business interpretation** — LightBI has a valid playbook and metric definitions for the detected context.
4. **Executable decision support** — LightBI can run the analysis correctly and produce traceable evidence.

A domain is only **MVP-supported** when all four layers are proven. Dictionary coverage alone is not domain support.

### Final MVP architecture lock

There must be exactly one canonical understanding path:

```text
Raw Source
  -> Source Adapter
  -> Canonical Full-File Profile + Representative Evidence Sample
  -> Canonical Context Semantic Detector
  -> Mapping Decision + Ambiguity Resolution
  -> Grain / Relationship / Quality Inference
  -> DatasetUnderstandingArtifactV1
  -> Domain Pack Activation Gate
  -> Question / Metric / Action Fit
  -> Runtime Guard
  -> DuckDB Execution
  -> Evidence + Trust
  -> UI / AI Briefing / Export
```

### Ownership lock

| Responsibility | Canonical owner |
|---|---|
| Atomic signal definitions | `semantic-registry.ts` |
| Domain/product support truth | new `domain-support-manifest.ts` |
| Profiling and sampling metadata | `understanding-core/profiler.ts` |
| Semantic candidate generation and mapping decision | `understanding-core/signal-engine.ts` |
| Grain and relationship inference | `understanding-core/grain-engine.ts` and relationship layer |
| Dataset artifact | `DatasetUnderstandingArtifactV1` |
| BA questions, metrics, caveats | `domain-ba-playbooks.ts` |
| Action executability | canonical runtime guard |
| AI | consumer of the artifact only |
| Legacy/Next detectors | adapters during migration, then deletion |

Do not create another detector, another dictionary, another domain classifier, or another understanding contract.

### Why `understanding-core` survives

`understanding-core` is the only suitable canonical engine for the MVP because it already follows the correct long-term principles:

- source-neutral input;
- universal signals before industry labels;
- deterministic, local-first behavior;
- questions as interpretation lenses rather than raw schema guesses;
- execution gated by physical field availability;
- no filename, fixture, customer, or sample-path hardcoding;
- a pure TypeScript boundary that can feed UI, runtime, export, and AI consistently.

It must absorb only the proven parts of `understanding-next`:

- richer full-file and sampled profiles;
- header-recovery status;
- dirty-data and parse-health signals;
- explicit grain/document hypotheses;
- available/unavailable action contracts;
- evidence-backed stakeholder or domain affinity.

The legacy guided-investigation path must not remain a peer engine. Its useful business-view, question, and playbook logic becomes a downstream consumer of `DatasetUnderstandingArtifactV1`.

---

## 2. Current code truth

The reviewed snapshot already contains valuable architecture:

- `semantic-registry.ts` is the intended semantic source of truth.
- `context-semantic-dictionary.ts` scores header, value, shape, neighbor, and cross-file evidence.
- `semantic-sampler.ts` uses deterministic head, tail, evenly spaced, and random rows.
- `semantic-coverage.ts` preserves `unknown_business_like` fields instead of silently dropping them.
- `domain-ba-playbooks.ts` separates semantic recognition from downstream BA logic.
- ADR-120 and ADR-121 state the correct product guarantee: populated business-like signals must not disappear silently.

But the current snapshot also exposes important gaps.

### 2.1 Three understanding paths still coexist

Current paths include:

1. Legacy `business-signal-detector -> guided-investigation`.
2. `understanding-next` profiler/detector/orchestrator.
3. `understanding-core`, adapted back into a Next UI contract.

`Home.tsx` still computes more than one interpretation of the same raw data. This must be eliminated before the dictionary can be trusted as product truth.

### 2.2 Registry support status is not an effective runtime gate

The semantic registry contains **321 signal definitions** in this snapshot:

- approximately **62** default to `supported`;
- approximately **259** are marked `partial`;
- no effective `advertised_only` population is currently used for the broad research catalog.

More importantly, `coverageStatus` is stored in dictionary entries but is not currently used consistently to:

- filter semantic candidates;
- prevent partial/research signals from activating a domain;
- prevent unsupported questions;
- prevent unsupported executable actions;
- cap decision readiness.

`inferContextSemanticCandidates()` iterates the entire dictionary and its candidate contract does not carry the signal support status downstream. Therefore a research/partial signal can be recognized like a normal runtime signal.

### 2.3 Broad research signals are folded into six generic domains

Signals for CRM, support, HR, education, healthcare, legal, real estate, construction, agriculture, utilities, audit, nonprofit, and quality control are assigned into the six generic domains:

- operations;
- revenue;
- inventory;
- customer;
- performance;
- finance.

This is useful for a research ontology, but unsafe as a product support boundary. For example, detecting `patient` under `customer` does not mean the Customer BA pack supports healthcare analysis.

### 2.4 Alias collisions are expected but not governed

The current registry has many normalized alias/header collisions. Examples include:

- `status` -> generic status, lead status, ticket status;
- `sales` -> sales and revenue;
- `qty` / `quantity` -> generic quantity and stock quantity;
- `margin pct` -> margin and margin percentage;
- `channel` -> generic channel and sales channel;
- `courier` / `shipper` -> carrier and driver;
- `cost` -> cost and advertising spend;
- `score` -> rating and quality score;
- `order qty` -> order and ordered quantity.

Collisions are not inherently wrong. They become dangerous when there is no declared conflict group, no score-margin rule, and no required-context policy.

### 2.5 Candidate confidence is not calibrated product confidence

Current context scoring sums evidence and caps the result at 95. This score is useful for ranking, but it is not yet calibrated probability.

Current risks include:

- broad shape evidence reinforces many measure candidates;
- generic aliases use partial substring matching;
- header and context can produce multiple matches;
- mapping review may classify conflict by the number of matched IDs rather than the score gap and evidence quality;
- contradiction penalties and negative evidence are not fully implemented;
- support status is not part of candidate selection.

The UI must not present these raw scores as factual certainty.

### 2.6 `DOMAIN_SAMPLE_MATRIX.md` is descriptive, not an acceptance matrix

The current document lists domains, signals, views, and a qualitative support claim such as “Strong.” It does not currently define:

- exact versioned sample IDs;
- ground-truth column mappings;
- forbidden mappings;
- expected grain;
- expected domain pack activation;
- expected blocked packs;
- executable actions;
- verified metric answers;
- false-positive cases;
- held-out files;
- acceptance metrics.

It is currently a documentation matrix, not a proof matrix.

### 2.7 Real-sample tests can silently pass when samples are missing

`understanding-next/real-sample.test.ts` uses patterns such as:

```ts
if (!loaded) return;
```

If a sample file is absent, the test returns successfully rather than failing the acceptance environment. This makes real-data confidence non-portable.

Some real-sample tests also read the first N rows rather than using the production semantic matrix sampler. That can miss rare statuses, late-file schema changes, and tail anomalies.

---

## 3. Correct role of the context dictionary

The dictionary direction is approved, with one important correction:

> The semantic registry owns atomic business meanings. It must not, by itself, declare that an entire industry/domain is supported.

### 3.1 Semantic registry responsibilities

Each signal definition should eventually express:

```ts
type SemanticSignalDefinition = {
  canonicalId: string;
  label: string;

  semanticFamily: string;
  role: "time" | "dimension" | "measure" | "status" | "identifier";

  recognitionStatus: "mvp_proven" | "experimental" | "research_only";

  exactHeaderAliases: string[];
  contextualHeaderAliases: string[];
  valueAliases: string[];
  valuePatterns: RegExp[];
  compatibleTypes: string[];

  requiredContext?: ContextRequirement[];
  negativeContext?: ContextExclusion[];
  conflictGroup?: string;

  unitKind?: "currency" | "percentage" | "quantity" | "duration" | "date" | "none";
  aggregationPolicy?: "sum" | "average" | "count_distinct" | "last_value" | "non_additive" | "unknown";
  grainCompatibility?: Array<"transaction" | "event" | "snapshot" | "master_data" | "summary">;

  provenanceKind?: "observed" | "derived" | "user_mapped";
  derivationRuleId?: string;
};
```

This contract does not need to be implemented in one large change. It defines the direction for incremental migration.

### 3.2 Separate exact aliases from contextual aliases

Aliases such as these can be strong exact evidence:

- `net revenue`;
- `mã vận đơn`;
- `stock age`;
- `payment method`.

Aliases such as these are unsafe without context:

- `status`;
- `type`;
- `amount`;
- `score`;
- `cost`;
- `sales`;
- `unit`;
- `channel`;
- `date`;
- `order`.

Generic terms must be placed in `contextualHeaderAliases` and require one or more of:

- compatible sibling signals;
- value evidence;
- source-system schema evidence;
- user mapping;
- cross-file relationship evidence.

Do not let a generic alias become a high-confidence mapping from header substring matching alone.

### 3.3 Add conflict groups

At minimum, define explicit conflict groups for:

- `margin` vs `margin_pct`;
- `quantity` vs `stock_qty` vs `ordered_qty` vs `sold_qty`;
- `status` vs domain-specific statuses;
- `carrier` vs `driver`;
- `channel` vs `sales_channel`;
- `cost` vs `spend` vs `purchase_cost` vs `operational_cost`;
- `balance` vs opening/closing/running balance;
- `customer` vs buyer/account/contact;
- `order` identifier vs order quantity;
- `retention` vs churn;
- `rating_score` vs quality score;
- `unit` vs unit of measure.

A conflict-group winner requires:

- minimum direct evidence;
- a minimum score lead over the second candidate;
- no high-impact contradiction;
- grain/type compatibility.

Otherwise the mapping state is `ambiguous`.

### 3.4 Carry support metadata through the candidate pipeline

`ContextSemanticCandidate` must carry at least:

```ts
recognitionStatus: "mvp_proven" | "experimental" | "research_only";
conflictGroup?: string;
requiredContextSatisfied: boolean;
contradictions: string[];
```

The canonical detector must accept an active support scope:

```ts
activeDomainPacks: DomainPackId[];
allowExperimentalRecognition: boolean;
```

Default Standard Mode behavior:

- `mvp_proven`: may produce probable/confirmed mappings;
- `experimental`: may appear in mapping review, but cannot activate decision support without explicit pack permission;
- `research_only`: shown only as a possible meaning or `unknown_business_like`; cannot activate a BA pack or action.

### 3.5 Derived metrics are not ordinary raw signals

Signals such as:

- revenue delta;
- profit delta;
- margin delta;
- inventory turnover;
- customer value;
- stock value;

must distinguish:

1. an observed source column with that label;
2. a metric derived by LightBI;
3. a user-defined metric.

A derived metric must include formula version, input mappings, grain assumptions, and execution lineage. It must not be treated as a raw semantic field merely because an alias exists.

---

## 4. Domain support must be a separate manifest

Create a canonical domain support manifest, suggested file:

`apps/desktop/src/lib/understanding-core/domain-support-manifest.ts`

### 4.1 Proposed contract

```ts
type DomainPackSupportLevel =
  | "mvp_supported"
  | "conditional"
  | "detect_only"
  | "advertised_only";

type DomainSupportManifest = {
  id: string;
  version: string;
  label: string;
  supportLevel: DomainPackSupportLevel;

  supportedArchetypes: string[];
  supportedGrains: Array<"transaction" | "event" | "snapshot" | "master_data" | "summary">;

  coreSignals: string[];
  optionalSignals: string[];
  forbiddenAssumptions: string[];

  playbookIds: string[];
  executableActionIds: string[];

  activationRules: DomainActivationRule[];
  decisionSupportRules: DecisionSupportRule[];

  acceptanceCorpusIds: string[];
  minimumMappingPrecision: number;
  minimumActionSuccessRate: number;
};
```

### 4.2 Meaning of support levels

#### `mvp_supported`

LightBI has:

- proven signal recognition;
- grain rules;
- a tested BA playbook;
- executable actions;
- verified metrics;
- held-out sample acceptance.

#### `conditional`

LightBI can support the analysis only when explicit required fields, grain, and relationships are present. Missing requirements must block the action with a clear reason.

#### `detect_only`

LightBI may identify the dataset and semantic fields, but it must not promise decision support or domain-specific recommendations.

#### `advertised_only`

Documentation/research only. No production runtime support claim.

### 4.3 Domain activation is evidence, not a label guess

A domain pack must not activate from one generic signal.

Example:

```text
patient column detected
!= healthcare domain supported

expense column detected
!= accounting analysis supported

customer column detected
!= retention analysis supported

KPI column detected
!= performance management supported
```

Activation requires a compatible set of:

- semantic signals;
- grain;
- data quality;
- source archetype;
- time basis;
- relationships;
- metric inputs;
- runtime support.

---

## 5. Truthful MVP domain boundary

The internal ontology may remain broad, but the MVP product promise must remain narrow.

### 5.1 Revenue and sales transactions — `mvp_supported`

Supported when the dataset contains enough evidence for a transaction/document grain and at least:

- a reliable date/period;
- revenue, invoice total, or quantity × unit price;
- order/invoice/receipt or another valid transaction identity;
- one or more valid dimensions where requested.

Safe MVP actions:

- revenue trend;
- revenue ranking by product/category/store/salesperson/channel;
- transaction count and average order value when grain permits;
- discount impact when discount semantics are explicit.

Must block:

- net revenue when returns/refunds are missing or definitions are unclear;
- order count when rows are order lines and no order ID exists;
- margin/profitability when cost is not aligned to the same grain and period.

### 5.2 Inventory snapshot and movement — `mvp_supported` / `conditional`

Snapshot support requires:

- SKU/product;
- stock quantity or inventory value;
- warehouse/location where applicable;
- snapshot date/period where trend/comparison is requested.

Movement support is conditional on:

- movement date;
- movement type or inbound/outbound semantics;
- quantity;
- item identity;
- compatible warehouse/source-destination fields.

Safe MVP actions:

- stock quantity/value;
- inventory aging when age or receipt date supports it;
- low/out-of-stock review;
- slow-moving/risk review when time and movement evidence exist;
- snapshot comparison when periods are aligned.

Must block:

- treating a snapshot as a transaction flow;
- summing duplicated snapshots across dates;
- turnover without verified sales/COGS and average inventory basis.

### 5.3 Delivery and operational execution — `mvp_supported`

Supported when the dataset has an event/shipment grain and combinations of:

- shipment/waybill;
- route;
- driver/carrier;
- delivery status;
- event/report/delivery dates;
- SLA/on-time evidence.

Safe MVP actions:

- status distribution;
- route/driver/carrier performance;
- on-time or delay analysis when time/SLA definitions are valid;
- delivery fee/cost analysis when monetary fields are explicit.

Must block:

- on-time conclusions from a generic status without date/SLA evidence;
- driver performance when the field is actually carrier/provider;
- failure rates when retry/cancel/return status taxonomy is unresolved.

### 5.4 Finance and profitability — `conditional`

Finance must not be declared broadly supported merely because `cost`, `expense`, `profit`, or `margin` columns are detected.

MVP-conditional support may include:

- explicit profit/margin review when source fields are trustworthy;
- calculated gross profit when revenue and COGS share compatible grain and period;
- expense distribution by explicit account/category;
- sales-accounting reconciliation when document keys, dates, and amount basis align.

Detect-only or blocked for MVP unless separately proven:

- full cash-flow classification;
- journal correctness;
- tax compliance;
- accrual accounting interpretation;
- receivable aging without invoice date, due date, payment, and balance basis;
- generic bank reconciliation without matching rules.

### 5.5 Customer — `conditional`

Supported MVP subset:

- customer contribution;
- order/revenue ranking;
- repeat purchase only when customer identity and repeated dated transactions exist.

Detect-only until proven:

- churn;
- retention;
- lifetime value;
- cohort behavior;
- segmentation inferred from labels alone.

### 5.6 Performance — `conditional` / `detect_only`

Conditional support:

- explicit target vs actual;
- achievement rate with compatible units and grain;
- department/team comparison when dimensions are valid.

Detect-only:

- generic efficiency/productivity/KPI columns without formula definitions;
- causal performance diagnosis;
- score interpretation without scale and directionality.

### 5.7 Research-only packs for MVP

Do not activate decision support for:

- healthcare;
- education;
- HR/payroll;
- legal/contracts;
- real estate;
- construction;
- agriculture;
- utilities;
- marketing attribution;
- IT/application logs;
- maintenance/IoT;
- nonprofit/grants;
- manufacturing/QC beyond generic detect-only recognition.

These signals may remain in the research catalog, but must be marked and gated.

---

### 5.8 Commercial wedge and supported MVP questions

The engine may remain universal internally, but MVP acceptance, UI promises, and product communication are restricted to:

> SME commerce, retail, and distribution datasets connecting sales, inventory, finance, and delivery/operations exports.

Supported MVP questions:

1. Revenue and transaction trend.
2. Revenue, profit, and margin by product, category, store, employee, and channel when metric prerequisites are valid.
3. Inventory quantity/value, aging, slow-moving stock, and stock-risk analysis.
4. Sales-to-inventory consistency checks.
5. Sales-to-accounting reconciliation only when compatible keys, time basis, and amount basis exist.
6. Delivery status, on-time performance, delay, and operational execution when required fields exist.
7. Data-quality, semantic-mapping, ambiguity, and trust review.

Deferred until after MVP proof:

- deep HR/payroll/attendance;
- education and healthcare;
- legal, real estate, construction, agriculture, and other research packs;
- campaign intelligence;
- RFM, cohort, churn, and LTV depth;
- forecasting;
- generic dashboard builder;
- destructive automatic cleaning;
- LLM-driven raw-schema interpretation.

Out-of-wedge domains may return detect-only or exploratory results, but may not advertise deep decision support.

## 6. Sampling architecture

The current deterministic matrix sampler is a good foundation, but row sampling alone cannot be the source of truth for full-file understanding.

### 6.1 Separate profiling from evidence rows

Use two artifacts:

1. **Full-file profile/sketch**
   - row count;
   - null/non-empty count;
   - approximate distinct count;
   - top values and counts;
   - min/max;
   - type parse success;
   - numeric/date validity;
   - quantiles where needed;
   - rare/error value counts;
   - source partition/sheet information.

2. **Representative evidence sample**
   - head rows;
   - tail rows;
   - evenly spaced rows;
   - deterministic random rows;
   - selected rare categories/errors;
   - evidence rows shown to the user.

DuckDB should calculate full-file profiles wherever possible. The 1,000-row matrix is for value examples and explainability, not for pretending the whole file was profiled.

### 6.2 Preserve rare semantic values

Head/tail/random/even sampling can still miss rare but important values such as:

- failed/cancelled status;
- returns/refunds;
- formula errors;
- negative quantities;
- a second currency;
- rare payment method;
- outlier warehouse/location;
- special row type.

Add a semantic rare-value supplement:

- top-K values per low-cardinality column;
- bottom/rare values where safely available;
- error-pattern rows;
- negative/zero/null numeric rows;
- date parse failures;
- mixed-type rows.

### 6.3 Sampling uncertainty must be visible

`DatasetUnderstandingArtifactV1` must record:

```ts
profilingScope: "full_file" | "sample_only";
sampleStrategy: "full" | "matrix_sample" | "stratified_matrix";
sourceRowCount: number;
profiledRowCount: number;
evidenceSampleRowCount: number;
coverageLimitations: string[];
```

Decision support must be capped when only a sample was profiled and no full-file execution validation exists.

---

## 7. Executable Domain Sample Matrix

Replace the current descriptive matrix with a versioned acceptance corpus.

### 7.1 Corpus structure

Suggested structure:

```text
sample-corpus/
  manifest.json
  mvp/
    revenue/
    inventory/
    operations/
    finance/
    customer/
    performance/
  adversarial/
  holdout/
```

Sensitive samples must be anonymized or synthesized from real schema patterns. Do not commit customer data.

### 7.2 Per-sample manifest

Each sample needs a machine-readable ground truth:

```ts
type SampleAcceptanceManifest = {
  id: string;
  corpusVersion: string;
  file: string;
  sourceKind: string;

  expectedArchetype: string;
  expectedGrain: string;

  expectedMappings: Array<{
    physicalColumn: string;
    canonicalSignal: string;
    minimumState: "probable" | "confirmed";
  }>;

  expectedAmbiguousColumns: string[];
  expectedUnknownBusinessColumns: string[];
  forbiddenMappings: Array<{
    physicalColumn: string;
    canonicalSignal: string;
  }>;

  expectedActivePacks: string[];
  expectedBlockedPacks: string[];

  expectedRunnableActions: string[];
  expectedBlockedActions: Array<{
    actionId: string;
    reasonCode: string;
  }>;

  verifiedMetrics?: Record<string, number | string>;
};
```

### 7.3 Corpus groups

#### Golden tuning set

Used while developing rules. Every change must keep it green.

#### Held-out validation set

Not used to tune aliases or thresholds. This is the main generalization score.

#### Adversarial set

Must include:

- generic headers: `Type`, `Status`, `Value`, `Amount`, `Score`, `Date`;
- misleading headers with contradictory values;
- Vietnamese/English mixed headers;
- duplicate columns;
- merged/title rows;
- Excel serial dates;
- multiple tables in one sheet;
- summary rows mixed with transactions;
- all-zero or dominant columns;
- identifiers stored as numbers;
- decimal/thousand locale ambiguity;
- blank/`__EMPTY` columns;
- formulas/errors;
- multi-currency data;
- snapshot and movement files with similar column names;
- two domains sharing words such as `order`, `cost`, `status`, `channel`.

#### Multi-file set

Must prove:

- valid joins;
- rejected joins;
- conflicting identifiers;
- date/period alignment;
- sales/inventory/accounting relationship;
- cross-file context strengthening without hallucinating mappings.

### 7.4 Missing sample files must fail acceptance

Do not use silent pass behavior:

```ts
if (!loaded) return;
```

In mandatory acceptance tests, missing sample files must:

- fail with a clear corpus setup error; or
- be explicitly skipped through a visible environment flag outside CI.

CI/release verification must require the corpus.

---

## 8. Mapping decision model

Candidate generation and final mapping are different stages.

### 8.1 Mapping states

Use:

```ts
type MappingState =
  | "confirmed"
  | "probable"
  | "ambiguous"
  | "unknown_business_like"
  | "technical"
  | "rejected";
```

### 8.2 Authority order

1. Persisted user-confirmed mapping scoped to source/schema fingerprint.
2. Strong exact header + compatible value/type/grain evidence.
3. Strong value pattern + required context.
4. Strong source-system schema evidence plus local profile.
5. Neighbor/cross-file support only as reinforcement.
6. Generic header/shape evidence only as a candidate, never a confident mapping.

### 8.3 Required decision rules

A probable/confirmed mapping requires:

- minimum direct evidence;
- type/grain compatibility;
- no blocking contradiction;
- sufficient lead over the next candidate in the same conflict group;
- support scope permission.

Otherwise:

- multiple plausible meanings -> `ambiguous`;
- business-looking but unsupported -> `unknown_business_like`;
- empty/technical field -> `technical`;
- user rejected -> `rejected`.

### 8.4 Confidence bands

Do not interpret raw additive scores as calibrated percentages.

Use bands during MVP:

- `confirmed`: user-confirmed or empirically proven rule combination;
- `probable`: strong evidence and sufficient score margin;
- `ambiguous`: close candidates or contradiction;
- `unknown`: not enough safe evidence.

Only after corpus calibration should a numeric probability be shown externally.

---

## 9. DatasetUnderstandingArtifactV1

Create a single versioned artifact:

```ts
type DatasetUnderstandingArtifactV1 = {
  version: "1.0";

  source: {
    kind: "local_file" | "online_file" | "database_table" | "api_response" | "unknown";
    labels: string[];
    sourceRowCount: number;
    profiledRowCount: number;
    evidenceSampleRowCount: number;
    profilingScope: "full_file" | "sample_only";
    sampleStrategy: "full" | "matrix_sample" | "stratified_matrix";
  };

  schema: {
    columns: CanonicalColumnProfile[];
    headerStatus: "clean" | "recovered" | "ambiguous" | "failed";
  };

  quality: {
    status: "healthy" | "warning" | "blocked";
    issues: DataQualityIssue[];
    score: number;
  };

  semantics: {
    mappings: SemanticMapping[];
    unknownBusinessLikeColumns: UnknownBusinessColumn[];
    coverageScore: number;
    registryVersion: string;
  };

  grain: {
    hypothesis: "transaction" | "event" | "snapshot" | "master_data" | "summary" | "unknown";
    confidenceBand: "confirmed" | "probable" | "ambiguous" | "unknown";
    evidence: string[];
    candidateKeys: string[][];
  };

  relationships: RelationshipEvidence[];

  domainPacks: Array<{
    id: string;
    supportLevel: DomainPackSupportLevel;
    activationStatus: "active" | "conditional" | "detect_only" | "blocked";
    evidenceSignalIds: string[];
    blockedReasons: string[];
  }>;

  capabilities: AnalysisCapability[];
  questions: QuestionCandidate[];
  actions: GuardedAnalysisAction[];

  trust: {
    dataQuality: number;
    semanticConfidence: number;
    metricReadiness: number;
    executionReadiness: number;
    overallTier: "exploratory_only" | "reference_only" | "decision_support";
    caveats: string[];
  };

  lineage: {
    rawColumnToCanonicalSignal: Record<string, string[]>;
    evidenceByMapping: Record<string, SemanticEvidence[]>;
  };
};
```

### Required invariant

Every result must trace through:

```text
physical column
-> mapping decision
-> domain pack rule
-> metric/action requirements
-> guarded query
-> executed result
-> evidence/caveat
```

No chart, report, recommendation, or AI conclusion may bypass this chain.

---

## 10. Codex execution rules

Codex must follow these rules in every phase:

1. One phase per task. Stop after the phase.
2. No new understanding layer or detector.
3. No canonical signal outside `semantic-registry.ts`.
4. No product support claim based only on dictionary coverage.
5. No filename, sample name, exact row count, or customer-value hardcoding.
6. No alias expansion without positive, negative, and collision tests.
7. No high-confidence mapping from neighbor/cross-file evidence alone.
8. No partial/research signal may activate an MVP action unless the domain support manifest explicitly allows it.
9. No UI promise without a guarded runnable action.
10. No confidence increase without new evidence.
11. No silent fallback or silent sample-only assumption.
12. No missing acceptance sample may silently pass.
13. No legacy deletion until parity and held-out tests pass.
14. Every phase must report changed files, tests, corpus evidence, known gaps, and rollback instructions.

---

## 11. Phased MVP implementation plan

## Phase 0 — Architecture and support truth freeze

### Goal

Freeze the current architecture and stop semantic/domain claims from expanding while the canonical path is built.

### Deliverables

Create:

- `docs/adr/ADR-122-canonical-understanding-pipeline.md`;
- `apps/desktop/src/lib/understanding-core/OWNERSHIP.md`;
- `apps/desktop/src/lib/understanding-core/domain-support-manifest.ts` as a contract/skeleton only;
- machine-readable registry inventory report.

Classify modules as:

- canonical;
- adapter;
- legacy-frozen;
- delete-later;
- downstream consumer.

Classify every signal as:

- `mvp_proven`;
- `experimental`;
- `research_only`.

Initial classification may be conservative. Unknown/partial is safer than an unsupported claim.

### Acceptance

- One documented runtime path from Home to execution.
- All 321 current signals have an explicit recognition status after migration; no default implicit `supported` for new entries.
- Domain support is not inferred from the signal's primary generic domain.
- No behavior change yet.

### Forbidden

- No alias expansion.
- No detector behavior change.
- No new domain pack.
- No UI changes.

---

## Phase 1 — Executable sample corpus and collision audit

### Goal

Create ground truth before rewriting the detector.

### Deliverables

- `sample-corpus/manifest.json`;
- MVP golden, holdout, adversarial, and multi-file sets;
- per-sample expected mappings and forbidden mappings;
- registry alias collision report;
- tests that fail when corpus files are missing.

### Minimum corpus

- 5 revenue/sales files;
- 5 inventory files;
- 5 operations/delivery files;
- 5 finance/accounting files;
- 5 multi-file combinations;
- 5 adversarial/dirty files.

At least half of validation files must be held out from rule tuning.

### Acceptance

- Every sample has a machine-readable manifest.
- Positive and negative assertions exist.
- Generic alias collisions have explicit expected outcomes.
- Missing corpus fails release verification.
- Existing `DOMAIN_SAMPLE_MATRIX.md` is either generated from the manifest or clearly marked descriptive only.

---

## Phase 2 — Canonical profiler and sampling truth

### Goal

Produce one profile from the full source and one representative evidence sample.

### Deliverables

Create/consolidate:

- `understanding-core/profiler.ts`;
- full-file aggregate/sketch contract;
- semantic evidence sampler with rare/error supplementation;
- source/profile/sample metadata in `DatasetUnderstandingArtifactV1`.

Port proven logic from existing profilers, then freeze duplicate profilers.

### Acceptance

- Source, profiled, and sample row counts are never conflated.
- Full-file profile is used whenever local DuckDB can access the source.
- Matrix sample is deterministic.
- Rare/error evidence tests exist.
- Header recovery and multi-table ambiguity are surfaced.
- Sample-only analysis cannot claim full-file decision readiness.

---

## Phase 3 — Canonical context semantic detector

### Goal

Make `understanding-core/signal-engine.ts` the only mapping authority.

### Deliverables

- derive candidates from `semantic-registry.ts`;
- separate exact and contextual aliases;
- support conflict groups;
- carry recognition/support status;
- implement negative/contradiction evidence;
- implement score-margin ambiguity;
- support persisted user mappings;
- make legacy/Next detectors delegate to the canonical engine.

### Acceptance

On held-out files:

- high-confidence/confirmed mapping precision >= 95%;
- core MVP signal recall target >= 90%;
- no populated business-like column disappears silently;
- generic headers do not map confidently without context;
- partial/research signals cannot activate MVP actions;
- unknown is preferred over a wrong confident mapping.

### Important

Do not optimize for 100% mapped columns. Optimize for truthful mappings and visible uncertainty.

---

## Phase 4 — Grain, relationships, domain activation, and trust

### Goal

Determine whether recognized data forms a supported business concept.

### Deliverables

- grain engine;
- candidate keys;
- duplicate-at-grain checks;
- multi-file relationship evidence;
- domain support manifest activation;
- four-part trust model:
  1. data quality;
  2. semantic confidence;
  3. metric readiness;
  4. execution readiness.

### Required refusal behavior

- no identifier summation;
- no margin without compatible revenue/cost;
- no snapshot treated as movement;
- no retention without historical repeated customer activity;
- no reconciliation without compatible keys/time/amount basis;
- no generic KPI interpretation without formula context;
- no `decision_support` with unresolved high-impact ambiguity.

### Acceptance

- Every domain pack has active/conditional/detect-only/blocked status and reasons.
- Every action declares grain, signals, relationships, and metric requirements.
- Domain activation precision >= 95% on held-out corpus.
- No false decision-support case in the corpus.

---

## Phase 5 — Canonical questions and executable actions

### Goal

Generate all questions and actions from one artifact.

### Deliverables

Separate:

- capability: technically possible;
- question: meaningful business lens;
- action: currently executable.

Playbooks may consume only canonical mappings and active/conditional domain packs.

### Acceptance

- Home and Investigation use the same question/action list.
- Only 3–5 best default questions are shown.
- Every advertised action passes runtime preflight.
- Every blocked action explains the missing signal, grain, relationship, or runtime capability.
- AI briefing reads the same mappings and caveats as the UI.

---

## Phase 6 — Home cutover and legacy removal

### Goal

Use one `DatasetUnderstandingArtifactV1` build per dataset state.

### Changes

Replace parallel Home computations with:

```ts
const understandingArtifact = buildDatasetUnderstandingArtifact(coreInput);
```

Derive from it:

- Home summary;
- mapping review;
- role/lens suggestions;
- questions;
- Investigation actions;
- AI briefing;
- caveats;
- trust.

Freeze, adapt, and then remove:

- independent logic in `business-signal-detector.ts`;
- independent logic in `understanding-next/signal-detector.ts`;
- unused `understanding-next/orchestrator.ts`;
- duplicate dataset-understanding builders;
- overlapping cards that display different semantic truths.

### Acceptance

- Exactly one semantic mapping build per dataset state.
- UI and AI cannot disagree about mappings/domain support.
- Production Home cannot reach mock/deprecated detectors.
- Upload -> understand -> choose action -> execute -> evidence passes end to end.

---

## Phase 7 — MVP proof and release gate

### Goal

Prove usefulness on unseen real-world data without adding domains.

### Required measurements

- mapping precision by confidence band;
- core signal recall;
- ambiguity/unknown rate;
- grain accuracy;
- domain pack activation precision;
- runnable-action precision;
- execution success;
- metric correctness;
- false decision-support rate;
- time from import to first valid result.

### MVP ship gate

Ship only when:

- confirmed/high-confidence mapping precision >= 95% on held-out files;
- core MVP signal recall >= 90% on held-out in-domain files;
- domain activation precision >= 95%;
- no known false `decision_support` case;
- >= 90% of advertised MVP actions execute successfully;
- verified revenue/inventory/operations/conditional-finance metrics match ground truth;
- every blocked/failed action explains why;
- no mock/deprecated understanding path is reachable from production Home;
- corpus and tests are reproducible on a clean machine.

---

## 12. Final file ownership

### Canonical

- `semantic-registry.ts` — atomic signal definitions only.
- `understanding-core/domain-support-manifest.ts` — product/domain support truth.
- `understanding-core/artifact.ts` or canonical artifact contract.
- `understanding-core/source-input.ts`.
- `understanding-core/profiler.ts`.
- `understanding-core/signal-engine.ts`.
- `understanding-core/grain-engine.ts`.
- canonical relationship inference layer.
- `understanding-core/trust-engine.ts`.
- `understanding-core/question-engine.ts`.
- `understanding-core/runtime-guard.ts`.
- `understanding-core/build-artifact.ts`.
- `domain-ba-playbooks.ts` — downstream BA definitions consuming the canonical artifact.

### Adapter-only during migration

- `understanding-core/next-adapter.ts`.
- `understanding-next/action-adapter.ts`.
- legacy BusinessSignalRegistry compatibility mapping.
- any UI adapter needed temporarily to consume `DatasetUnderstandingArtifactV1`.

Adapters may translate contracts but may not perform independent profiling, detection, confidence scoring, domain activation, or question generation.

### Freeze, prove parity, then remove

- independent logic in `business-signal-detector.ts`;
- `guided-investigation-pipeline.ts`;
- independent `dataset-understanding-contract.ts` builders;
- `understanding-next/orchestrator.ts`;
- independent `understanding-next/signal-detector.ts`;
- duplicate semantic dictionaries not generated from or governed by `semantic-registry.ts`;
- production-reachable mock/deprecated preview or understanding paths.

### Keep separate as downstream consumers

- DuckDB compiler/runtime/execution;
- chart rendering;
- export;
- AI briefing renderer;
- UI components.

These components consume the canonical artifact. They do not own raw-data understanding.

---

## 13. Codex task template

Use this template for every phase after Phase 0:

```md
# Task: LightBI MVP — Phase X

## Goal
[One measurable goal only]

## Allowed files
[Explicit file list]

## Read-only dependencies
[Explicit file list]

## Forbidden changes
- No new understanding engine, detector, registry, classifier, or contract
- No canonical signal outside semantic-registry.ts
- No product-support claim based only on dictionary coverage
- No fixture, filename, exact row-count, sample-path, or customer-value hardcoding
- No alias expansion without positive, negative, collision, and held-out tests
- No UI promise without a guarded executable action
- No unrelated UI, export, AI, or runtime refactor
- No work from a later phase

## Required implementation
[Exact behavior and ownership]

## Required tests
[Exact corpus groups, fixtures, negative tests, and acceptance commands]

## Acceptance criteria
[Binary checks only]

## Deliverables
1. Code changes
2. Tests
3. Verification report
4. Corpus evidence
5. Known gaps
6. Changed-file list
7. Rollback note
8. Exact recommended next-phase file list

## Stop condition
Stop after this phase. Do not begin the next phase.
```

---

## 14. Immediate Codex task

```md
# Task: LightBI MVP — Phase 0 Architecture and Domain Support Truth Freeze

## Goal
Freeze semantic/domain support claims and document one future canonical understanding path without changing runtime behavior.

## Allowed files
- MVP.md
- docs/adr/ADR-122-canonical-understanding-pipeline.md
- apps/desktop/src/lib/understanding-core/OWNERSHIP.md
- apps/desktop/src/lib/understanding-core/domain-support-manifest.ts
- apps/desktop/src/lib/semantic-registry.test.ts
- a generated audit report under docs/architecture/

## Read-only files
- apps/desktop/src/pages/Home.tsx
- apps/desktop/src/lib/semantic-registry.ts
- apps/desktop/src/lib/context-semantic-dictionary.ts
- apps/desktop/src/lib/business-signal-detector.ts
- apps/desktop/src/lib/understanding-core/**
- apps/desktop/src/lib/understanding-next/**
- apps/desktop/src/lib/domain-ba-playbooks.ts
- apps/desktop/src/lib/domain-knowledge-catalog.ts
- DOMAIN_SAMPLE_MATRIX.md

## Required audit
1. Trace all understanding paths used by Home, Investigation, AI briefing, and runtime actions.
2. Inventory all semantic registry signals by current coverage status.
3. Report normalized alias/header collisions.
4. Identify every place where coverageStatus/support status is ignored.
5. Classify current domain capabilities as mvp_supported, conditional, detect_only, or advertised_only.
6. Identify tests that silently pass when sample files are missing.

## Required decisions
- understanding-core is the only future canonical engine.
- semantic-registry owns atomic signals only.
- domain-support-manifest owns product support truth.
- partial/research signals cannot activate MVP decision support.
- sample matrix must become machine-readable acceptance evidence.

## Forbidden changes
- No detector behavior change.
- No alias additions/removals.
- No test expectation weakening.
- No UI changes.
- No runtime changes.
- No new domain.
- No legacy deletion.

## Acceptance criteria
- ADR contains current and target diagrams.
- OWNERSHIP classifies every understanding module.
- Domain support manifest contract exists and is empty/conservative rather than overclaiming.
- Audit reports signal counts, collisions, support-gate gaps, and sample-test gaps.
- Existing behavior remains unchanged.

## Deliverables
1. ADR
2. Ownership map
3. Domain support manifest skeleton
4. Semantic/support audit report
5. Exact Phase 1 file list
6. Changed-file list
7. Rollback note

## Stop condition
Stop after Phase 0. Do not implement the detector, expand aliases, or start the sample corpus.
```

---

## 15. Final product judgment

The dictionary research direction is correct. It should continue, but research breadth must be isolated from production support claims.

LightBI's moat will not be the number of aliases in the registry. It will be the combination of:

- broad but governed semantic knowledge;
- calibrated uncertainty;
- visible unknown business fields;
- full-file profiling plus representative evidence;
- grain and relationship understanding;
- domain packs with explicit support contracts;
- persistent user-confirmed mappings;
- executable metrics;
- lineage and truthful refusal;
- a held-out real-data acceptance corpus.

The correct MVP is not the system that claims to understand every domain. It is the system that:

> correctly understands the supported commerce/distribution data, clearly identifies what it only partially recognizes, and never turns research-level recognition into an unsupported business conclusion.
