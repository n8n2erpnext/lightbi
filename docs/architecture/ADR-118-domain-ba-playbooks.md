# ADR-118: Domain BA Playbooks for Simple Mode

## Status
Accepted - Beta core implemented

## Context
LightBI already has business domains, signals, business views, question templates, trust scoring, and a Simple BA decision brief. This is enough to say that LightBI can recognize many kinds of data.

The next product target is deeper: Simple mode must answer like a real business analyst for each supported domain, not only show a chart or a generic insight.

The differentiator is:

```text
Data understanding -> domain-specific BA reasoning -> evidence-backed decision answer
```

For example, with two monthly business reports, LightBI should answer:

- Did revenue increase or decrease?
- Where did it increase?
- Where did it decrease?
- Why did it increase or decrease?
- Which products, categories, branches, customers, channels, or routes drove the change?
- Which top 10 segments created growth or decline?
- Which products or categories generated higher profit, and why?
- Is the profit conclusion reliable, or is cost/fee/storage data missing?

This must not be hardcoded to a specific file, month, language, or customer dataset.

## Decision
Introduce **Domain BA Playbooks** as the layer above domain detection and below UI rendering.

Each supported domain must define:

1. **Business questions**
   - The real questions a BA would ask in that domain.
2. **Required signals**
   - Minimum fields needed to answer the question safely.
3. **Optional enrichment signals**
   - Fields that improve explanation quality, such as cost, discount, storage fee, route, branch, SLA, stock age, or customer segment.
4. **Metric formulas**
   - Deterministic calculations such as revenue, delta, profit, margin, aging, stock risk, SLA breach, and contribution share.
5. **Driver model**
   - How to explain why a number changed.
6. **Ranking model**
   - Top contributors, bottom contributors, risk contributors, and profit contributors.
7. **Caveat model**
   - What LightBI must refuse or downgrade when important signals are missing.
8. **Recommended charts**
   - Charts that match the domain answer, not just the data type.
9. **Exportable evidence**
   - Row subsets behind each insight so the user can export the exact records that created the conclusion.

## Playbook Contract

```typescript
type DomainBAPlaybook = {
  domainId: string;
  supportedQuestions: DomainBAQuestion[];
  metrics: DomainMetricDefinition[];
  driverModels: DomainDriverModel[];
  caveatRules: DomainCaveatRule[];
  chartRules: DomainChartRule[];
  evidenceRules: DomainEvidenceRule[];
};
```

```typescript
type DomainBAQuestion = {
  id: string;
  label: string;
  intent:
    | "compare_periods"
    | "rank_contributors"
    | "explain_change"
    | "profitability"
    | "risk"
    | "aging"
    | "performance"
    | "coverage";
  requiredSignals: string[];
  optionalSignals: string[];
  answerShape: "brief" | "table" | "chart_table" | "decision_pack";
};
```

## V1 Domain Playbook Targets

### Revenue / Sales
Must answer:

- Revenue increased or decreased between periods.
- Which product, category, branch, customer, channel, salesperson, or order drove the movement.
- Top 10 growth contributors and top 10 decline contributors.
- New, lost, and shrinking segments when period keys are available.
- Discount impact when discount signals exist.

Required signals:

- `revenue`
- one of `time`, `period`, or multi-file period assignment

Optional signals:

- `product`, `category`, `branch`, `customer`, `salesperson`, `order`, `discount`, `quantity`, `unit_price`

### Finance / Profitability
Must answer:

- Which product/category/customer/branch creates the highest profit.
- Which high-revenue segments have weak margin.
- Whether profit increased or decreased between periods.
- Why profit changed: revenue movement, cost movement, discount, fee, storage, returns, or residual unknown.

Required signals:

- `revenue`
- at least one cost-like signal for profit conclusions: `cost`, `purchase_cost`, `operational_cost`, `expense`, `fee`, or `storage_cost`

Optional signals:

- `discount`, `returns`, `quantity`, `unit_price`, `supplier`, `warehouse`, `branch`, `category`

Rule:

- If cost-like signals are missing, LightBI must not claim profit. It may answer revenue only and lower decision readiness.

### Inventory / Stock
Must answer:

- Which products are aging, stuck, overstocked, or at stock-out risk.
- Which warehouse/location holds the most risk.
- Which items moved, did not move, or moved abnormally between periods.
- Which inventory value is exposed if unit cost or declared value exists.

Required signals:

- one of `inventory`, `stock_qty`, `stock_movement`, `stock_age`

Optional signals:

- `sku`, `product`, `warehouse`, `supplier`, `cost`, `value`, `period`, `time`

### Operations / Logistics
Must answer:

- Which route, warehouse step, driver, vehicle, or branch creates delay.
- Which SLA breaches matter most.
- Where the process slows down.
- Which records should be exported for follow-up.

Required signals:

- one of `route`, `driver`, `delivery_status`, `sla`, `duration`, `delay`

Optional signals:

- `warehouse`, `shipment`, `branch`, `time`, `customer`, `cost`

### Customer
Must answer:

- Which customers or segments generate revenue/profit.
- Which customers grow, shrink, disappear, or concentrate risk.
- Which customers are high-value but low-margin when cost signals exist.

Required signals:

- `customer`

Optional signals:

- `revenue`, `profit`, `margin`, `segment`, `order`, `time`, `period`

### Performance / KPI
Must answer:

- Which teams, people, locations, or processes exceed or miss targets.
- Target vs actual gap.
- Top and bottom performers.
- Whether performance is stable or only a one-period spike.

Required signals:

- one of `target`, `achievement`, `kpi`, `actual`

Optional signals:

- `team`, `employee`, `branch`, `time`, `period`, `revenue`, `cost`

## Multi-Period Comparison Requirement
Period comparison is a cross-domain capability.

It must support:

- two files representing two periods;
- multiple files representing many periods;
- explicit time columns inside one file;
- user-assigned period labels when automatic detection is ambiguous.

The first implementation should target two-period comparison, then expand to N-period trends.

The comparison artifact must include:

```typescript
type DomainComparisonBrief = {
  domainId: string;
  periods: string[];
  headline: string;
  trustScore: number;
  decisionReadinessScore: number;
  metricDeltas: MetricDelta[];
  topGrowthDrivers: DriverContribution[];
  topDeclineDrivers: DriverContribution[];
  topProfitDrivers: DriverContribution[];
  reasonCodes: ReasonCode[];
  caveats: string[];
  recommendedCharts: BAChartRecommendation[];
  exportableEvidence: ExportableEvidenceSet[];
};
```

## Rules

- Do not hardcode customer-specific examples into engines.
- Do not claim profit without cost-like evidence.
- Do not explain causality beyond available signals; use "likely driver" or "needs verification" when appropriate.
- Do not let connectors own business logic.
- Keep domain playbooks deterministic and testable.
- LLMs may later rewrite the explanation, but must consume structured playbook artifacts rather than raw data.
- Every decision claim must have metric evidence and, where possible, raw row pointers or exportable row subsets.

## Implementation Plan

1. Add a `domain-ba-playbooks.ts` registry for machine-readable playbooks. Done for Beta domains.
2. Add a `ba-comparison-engine.ts` module for two-period and multi-period comparison artifacts. Done for first-vs-last period comparison across compatible dataset families.
3. Extend dataset family inspection to assign or infer period labels across multiple files. Done through file labels/period hints; explicit user period-label UI remains Beta polish.
4. Add metric derivation for revenue, cost, gross profit, estimated net profit, margin, quantity, unit price, discount, fee, and stock value where signals exist. Done for revenue/cost/profit/quantity/discount-oriented Beta comparison.
5. Add driver ranking. Done for:
   - top growth contributors;
   - top decline contributors;
   - top profit contributors;
   - high revenue but weak margin where profit/cost evidence exists;
   - low revenue but strong margin where profit/cost evidence exists.
6. Add reason-code generation. Done for:
   - volume effect;
   - price effect where source signals exist;
   - cost effect;
   - discount effect;
   - fee/storage effect through cost-like evidence;
   - mix effect through contributor shifts;
   - missing-signal caveat.
7. Render a Simple Mode "Business comparison brief" when multiple compatible reports are imported. Done.
8. Add export actions for each driver/risk group. Done for evidence groups with CSV/XLSX export.
9. Add tests for revenue, finance/profitability, inventory, and logistics playbooks. Done for registry coverage plus revenue/profitability comparison behavior; deeper inventory/logistics runtime assertions remain future domain expansion.

## Implementation Status

The Beta core is implemented in:

- `apps/desktop/src/lib/domain-ba-playbooks.ts`
- `apps/desktop/src/lib/ba-comparison-engine.ts`
- `apps/desktop/src/components/analysis/BusinessComparisonBriefCard.tsx`
- `apps/desktop/src/pages/Home.tsx`

Current supported Simple Mode flow:

```text
Import compatible business reports
  -> LightBI groups them as one dataset family
  -> BA comparison engine compares first period vs latest period
  -> Simple Mode renders revenue/profit/driver/caveat answers
  -> User exports evidence rows behind the answer as CSV/XLSX
```

Five-phase Beta smoothing status:

1. **Period mapping**: implemented as deterministic period inference with confidence and review warning. If file names expose month/date/year-month, LightBI orders them chronologically; otherwise it falls back to import order and lowers readiness. Simple Mode also lets users edit period labels and recompute the comparison when labels are ambiguous.
2. **Business question preset**: implemented as `business_period_review`, a structured preset for revenue movement, growth/decline drivers, profit evidence, caveats, and evidence export.
3. **Profit evidence deepening**: implemented with three states: direct profit/margin available, estimated from cost-like fields, or missing. Missing evidence blocks profit claims.
4. **Narrative BA report**: implemented as structured narrative sections: executive answer, where it changed, why it changed, profitability answer, and decision safety.
5. **Interactive evidence/export**: implemented through exportable evidence groups with both previous and current period rows, ready for CSV/XLSX export from the Simple Mode card.

Current guardrails:

- Profit is not claimed when cost/profit/margin evidence is missing.
- Revenue growth is not treated as profit growth.
- Caveats lower decision readiness when required business signals are absent.
- Evidence export is generated from the rows used by the deterministic answer artifact.
- Domain playbooks now define `basic`, `standard`, and `advanced` signal tiers so LightBI can deepen answers by domain without hardcoding one customer file.

Deferred polish:

- Richer period-label UX for many files, such as drag-to-order and named month presets.
- Deeper N-period trend narratives after the two-period path is validated in Beta.
- More domain-specific runtime assertions for inventory/logistics/customer/performance after real Beta files are collected.

## Consequences
This makes Simple Mode the primary product differentiator. Advanced Mode remains the DA/pro workspace, but Simple Mode becomes the business decision layer that can compete by answering domain-specific questions instead of merely showing generic BI charts.
