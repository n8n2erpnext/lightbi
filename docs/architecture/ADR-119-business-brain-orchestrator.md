# ADR-119: Business Brain Orchestrator for Simple Mode

## Status
Accepted - V1 implemented

## Context
Simple mode is intended to behave like a Business Analyst decision workspace, not a chart-first BI surface. Recent ERP sample analysis exposed a recurring product gap:

```text
Data contains business evidence
-> LightBI recognizes only the signals already present in a narrow taxonomy/playbook
-> valid business questions remain invisible
```

Examples:

- `Payment` contained values such as `Tiền mặt`, `Trả góp`, and `Chuyển khoản`, but LightBI initially treated payment mix as if separate payment amount columns were required.
- Logistics data contains `Carrier`, `DeliveryStatus`, and `DeliveryFee`, while Accounting contains `GrossProfit`, `NetRevenue`, and `OrderID`. This is enough to ask whether completed deliveries use internal vs outsourced carriers, how much outsourced delivery costs, and how it affects profit. LightBI must not be blind to this just because the exact question was not pre-wired.

This is not a single missing alias. It is an architectural issue: business reasoning is scattered across dataset understanding, analysis opportunities, business fusion overview, BA decision brief, and Deep BA Analysis rendering. The product needs a central contract that every Simple mode answer flows through.

## Decision
Introduce a **Business Brain Orchestrator** as the Simple mode decision layer above raw understanding and below UI rendering.

Canonical flow:

```text
Raw / imported data
-> Semantic Coverage Engine
-> Business Signal Registry
-> KPI Engine
-> Playbook Matcher
-> Variance Engine
-> Root Cause Engine
-> Risk Engine
-> Recommendation Engine
-> Executive Narrative
```

Every selected angle must produce a `BusinessBrainBrief`.

```typescript
type BusinessBrainBrief = {
  angle: string;
  businessQuestion: string;
  readiness: "ready" | "partial" | "blocked";
  dataCoverage: DataCoverageReport;
  kpis: BusinessKpiResult[];
  variance: MetricVariance[];
  rootCauses: RootCauseFinding[];
  risks: BusinessRiskSignal[];
  recommendations: BusinessRecommendation[];
  missingEvidence: MissingEvidence[];
  narrative: ExecutiveNarrative;
  evidence: EvidenceBundle[];
};
```

## Non-Negotiable Rules

1. LightBI must not stay silent when data contains business-like signals.
2. Every field must be classified as one of:
   - `recognized`
   - `partial`
   - `unknown_business_like`
   - `technical_or_noise`
3. Every analysis angle must be one of:
   - `ready`
   - `partial`
   - `blocked`
4. `partial` and `blocked` are valid BA outputs. They must explain exactly what is missing.
5. The Executive Narrative must be selected-angle-first. Cross-domain overview may appear after the answer, but must not replace the answer.
6. LightBI must distinguish:
   - what can be concluded from current data;
   - what is only a possible risk;
   - what requires additional data.
7. Do not hardcode sample file names, month labels, or customer-specific values into logic.

## Business Brain Layers

### 1. Semantic Coverage Engine

Reads headers, values, cardinality, inferred types, repeated keys, and cross-file relationships.

It must detect business meaning from values, not headers only.

Examples:

- `Payment` + values `Tiền mặt`, `Trả góp`, `Chuyển khoản` -> `payment_method`
- `Carrier` + values `Nội bộ`, `GHN`, `Ahamove`, `Xe tải thuê ngoài` -> `carrier` and possible `carrier_type`
- `DeliveryStatus` + values `Đã giao`, `Hoàn tất`, `Giao lại` -> `fulfillment_status`

### 2. KPI Engine

Computes canonical metrics with formula, source columns, confidence, and missing-data reasons.

V1 required KPIs:

- `revenue`
- `net_revenue`
- `invoice_total`
- `gross_profit`
- `margin_pct`
- `quantity`
- `delivery_fee`
- `ar_debit`
- `payment_mix`
- `fulfilled_rate`
- `internal_carrier_share`
- `external_carrier_share`
- `delivery_fee_to_revenue`
- `delivery_fee_to_profit`

### 3. Variance Engine

Supports comparison across:

- explicit period columns;
- file/month inference;
- current vs previous;
- plan/budget if present.

Every variance result must include previous, current, delta, delta percent, direction, severity, and evidence.

### 4. Root Cause Engine

Explains why a metric moved by drilling through available dimensions.

Default drill path:

```text
product -> category -> store -> salesperson -> payment -> logistics
```

The path is adaptive. If the selected angle is logistics, logistics dimensions should lead. If the selected angle is product, product dimensions should lead.

### 5. Risk Engine

V1 risks:

- low margin;
- high AR;
- high installment / deferred payment share;
- Sales vs Accounting revenue gap;
- cost spike;
- delivery fee spike;
- outsourced carrier dependency;
- failed/retry delivery rate;
- concentration risk;
- missing key risk;
- many-to-many relationship risk.

Risk output must include severity, evidence, affected metric, affected segment, and recommended action.

### 6. Recommendation Engine

Recommendations must be typed:

- `do_now`
- `investigate`
- `need_more_data`

Example: LightBI may identify outsourced carrier cost and profit impact from current ERP data. It must not recommend buying more internal vehicles unless CAPEX/OPEX, depreciation, driver salary, maintenance, capacity, and utilization data are present. Without those inputs, it should recommend a follow-up investment analysis and list missing evidence.

### 7. Executive Narrative

Required shape:

```text
1. Angle
2. Business question
3. Main answer
4. Key KPI
5. Variance
6. Root cause
7. Risks
8. Recommendation
9. Missing evidence
```

## Target Product Outcome

The expected Simple mode maturity target after implementation is 85%+ for covered SME ERP-style workflows:

- from chart preview to decision brief;
- from generic overview to selected-angle answer;
- from alias matching to semantic coverage;
- from silent missing logic to explicit partial/blocked reasoning.

## Implementation Phases

### Phase BB-0: Contract

Define `BusinessBrainBrief` and related types. Wire selected-angle Deep BA Analysis to consume this contract.

### Phase BB-1: Semantic Coverage

Build coverage classification for every column and value distribution. Surface unknown business-like fields instead of hiding them.

### Phase BB-2: KPI Engine

Add canonical KPI registry and deterministic KPI calculations with confidence and missing-evidence reporting.

### Phase BB-3: Variance Engine

Generalize period comparison across single-file time fields, multi-file month labels, and plan/budget columns.

### Phase BB-4: Root Cause Engine

Add adaptive driver analysis across product/category/store/salesperson/payment/logistics.

### Phase BB-5: Risk Engine

Add business risk detection with severity and evidence.

### Phase BB-6: Recommendation Engine

Add action recommendations that distinguish what to do now, what to investigate, and what data is missing.

### Phase BB-7: Executive Narrative

Generate selected-angle-first BA reports from the structured brief.

### Phase BB-8: Simple Mode UI

Render Ready/Partial/Blocked, evidence, missing data, and recommended next question in the investigation workspace.

### Phase BB-9: Regression Suite

Add tests that fail if data contains business signals but LightBI neither creates an angle nor explains why it cannot.

## Consequences

- Simple mode cannot be evaluated only by whether a chart renders.
- Every future domain expansion must add signal coverage, KPI definitions, caveat rules, and regression tests.
- Deep BA Analysis must not be a generic cross-domain block. It must be an angle-specific answer backed by Business Brain output.
- This ADR supersedes piecemeal fixes for individual signals where the missing behavior is better addressed by semantic coverage and playbook matching.

## Implementation Checkpoint 2026-07-04

Business Brain V1 is implemented for the current Simple Mode flow.

Completed:

- `BusinessBrainBrief` contract includes readiness, data coverage, KPI, variance, root cause, risk, recommendation, missing evidence, next questions, narrative, and evidence audit trail.
- Deep BA Analysis renders the selected-angle report from `BusinessBrainBrief` instead of replacing it with a generic cross-domain overview.
- KPI Engine V1 computes chart-backed canonical KPIs for revenue, net revenue, invoice total, gross profit, margin, quantity, delivery fee, AR, payment mix, fulfilled rate, internal/external carrier share, delivery fee/revenue, and delivery fee/profit.
- Variance Engine V1 supports selected chart period variance, overview metric deltas from multi-file fusion, and plan/budget/target variance when present.
- Root Cause Engine V1 drills through available product, category, store, salesperson, payment, carrier, and delivery-status dimensions with selected-angle priority.
- Risk Engine V1 covers margin, AR/deferred payment, delivery fee pressure/spike, outsourced carrier dependency, fulfilled-rate risk, concentration, revenue gap, weak keys, missing shared keys, and relationship warnings.
- Regression suite reads the six ERP sample files and verifies Payment, Carrier, and DeliveryStatus are not silently hidden.

Verification:

- `pnpm --dir apps/desktop exec vitest run src/lib/business-brain-brief.test.ts --reporter=dot` passes 12 tests.
- `pnpm --dir apps/desktop exec vitest run src/lib/business-brain-brief.test.ts src/lib/business-fusion-overview.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/semantic-coverage.test.ts src/lib/ai-briefing-generator.test.ts src/lib/ba-decision-engine.test.ts --reporter=dot` passes 118 tests.
- `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json` passes.
