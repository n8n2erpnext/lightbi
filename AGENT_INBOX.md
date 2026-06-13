# AGENT INBOX — DU-9 BLOCKED: Fix Domain-Aware Understanding First

Date: 2026-06-13
Phase: Understanding Core Fix — Domain-Aware Opportunity Generation
Commander: Gemini Brain
Priority: P0 — Blocks Beta

---

## Problem Statement

`createDatasetUnderstanding()` in `dataset-understanding-contract.ts` has a hardcoded special case for **exactly one delivery dataset pattern** (`report_date + route + driver + shipment + satisfaction`). All other domains (Finance, Inventory, Revenue, Customer, Performance) fall into a generic `else` branch that produces bland, structurally-named opportunities like `"Revenue distribution"` or `"SKU distribution"`.

This is a critical Beta blocker. Users uploading Finance, Inventory, or Customer data see meaningless output.

Evidence — line 186-294 in `dataset-understanding-contract.ts`:
```
// Maintain Delivery Performance backwards compatibility for strict tests
if (has('report_date') && has('route') && has('driver') && has('shipment') && has('satisfaction')) {
  // 5 specific delivery opportunities hardcoded
} else {
  // generic bland generator for ALL other domains
}
```

Same issue exists at line 290 for `narrative`.

---

## Architecture Decision (Locked by Commander)

The fix MUST stay inside the existing pipeline shape:

```
DetectorInput → BusinessSignalRegistry → DatasetUnderstanding → AnalysisOpportunities → RuntimeIntent
```

Do NOT:
- Create a second understanding engine
- Add cloud/LLM dependency
- Change `business-signal-detector.ts`
- Change `dataset-capability-engine.ts` capability detection logic
- Change any execution/runtime files

The fix must be in `dataset-understanding-contract.ts` only (and its tests).

---

## Required Fix

### Step 1: Remove the hardcoded delivery if/else block

Replace lines 186–284 (the entire `if (has('report_date') && has('route')...`) with a **domain-driven opportunity generator** that works for ALL declared domains.

### Step 2: Implement `generateDomainOpportunities()`

Write a private helper function inside `dataset-understanding-contract.ts`:

```ts
function generateDomainOpportunities(
  signals: BusinessSignal[],
  has: (id: string) => boolean,
  timeSignals: BusinessSignal[],
  measureSignals: BusinessSignal[],
  dimensionSignals: BusinessSignal[]
): { available: AvailableAnalysisItem[]; unavailable: UnavailableAnalysisItem[] }
```

Rules (implement ALL of these, in order):

**Operations / Delivery domain** (when `has('shipment') || has('route') || has('driver')`):
- If `has('route') && has('shipment')` → `group_by`, dimensions: `['route']`, measures: `['shipment']`, label: `"Shipment activity by route"`
- If `has('driver') && has('shipment')` → `group_by`, dimensions: `['driver']`, measures: `['shipment']`, label: `"Shipment activity by driver"`
- If `has('report_date') && has('shipment')` → `trend`, dimensions: `['report_date']`, measures: `['shipment']`, label: `"Shipment trend over time"`
- If `has('satisfaction') && has('route')` → `group_by`, dimensions: `['route']`, measures: `['satisfaction']`, label: `"Satisfaction score by route"`
- Unavailable: if `!has('sla')` → push `{ id: 'ua_sla', label: 'SLA breach analysis', missingSignals: ['sla'], reason: 'Missing SLA data' }`
- Unavailable: if `!has('delivery_status')` → push `{ id: 'ua_delivery_status', label: 'Delivery status analysis', missingSignals: ['delivery_status'], reason: 'Missing delivery status' }`

**Inventory domain** (when `has('sku') || has('stock_age') || has('inventory') || has('stock_qty')`):
- If `has('stock_age') && has('sku')` → `distribution`, dimensions: `['sku']`, measures: `['stock_age']`, label: `"Stock aging profile by SKU"`
- If `has('stock_age') && has('warehouse')` → `group_by`, dimensions: `['warehouse']`, measures: `['stock_age']`, label: `"Average aging by warehouse"`
- If `has('stock_qty') && has('sku')` → `group_by`, dimensions: `['sku']`, measures: `['stock_qty']`, label: `"Inventory level by SKU"`
- If `has('inventory') && has('warehouse')` → `group_by`, dimensions: `['warehouse']`, measures: `['inventory']`, label: `"Inventory by warehouse"`
- If `has('inbound') && has('outbound')` → `relationship`, dimensions: `['sku']`, measures: `['inbound', 'outbound']`, label: `"Inbound vs outbound movement"`
- Unavailable: if `!has('stock_status')` → push `{ id: 'ua_stock_status', label: 'Inventory status analysis', missingSignals: ['stock_status'], reason: 'Missing inventory status column' }`

**Finance domain** (when `has('revenue') || has('cost') || has('profit') || has('margin')`):
- If `has('revenue') && has('cost')` → `relationship`, dimensions: `[]`, measures: `['revenue', 'cost']`, label: `"Revenue vs cost breakdown"`
- If `has('profit') && has('margin')` → `distribution`, dimensions: `[]`, measures: `['profit']`, label: `"Profit distribution"`
- If `has('revenue') && timeSignals.length > 0` → `trend`, dimensions: [timeSignals[0].canonicalId], measures: `['revenue']`, label: `"Revenue over ${timeSignals[0].label}"`
- If `has('expense') && has('budget')` → `relationship`, dimensions: `[]`, measures: `['expense', 'budget']`, label: `"Expense vs budget"`
- Unavailable: if `!has('cost')` → push `{ id: 'ua_cost', label: 'Cost breakdown analysis', missingSignals: ['cost'], reason: 'Missing cost data' }`

**Revenue / Sales domain** (when `has('sales') || has('order') || has('revenue')`):
- If `has('sales') && has('branch')` → `group_by`, dimensions: `['branch']`, measures: `['sales']`, label: `"Sales by branch"`
- If `has('revenue') && has('salesperson')` → `group_by`, dimensions: `['salesperson']`, measures: `['revenue']`, label: `"Revenue by salesperson"`
- If `has('order') && timeSignals.length > 0` → `trend`, dimensions: [timeSignals[0].canonicalId], measures: `['order']`, label: `"Order volume over time"`
- If `has('discount') && has('revenue')` → `relationship`, dimensions: `[]`, measures: `['discount', 'revenue']`, label: `"Discount impact on revenue"`
- Unavailable: if `!has('customer')` → push `{ id: 'ua_customer', label: 'Customer cohort analysis', missingSignals: ['customer'], reason: 'Missing customer identifier' }`

**Customer domain** (when `has('customer') || has('segment') || has('retention')`):
- If `has('retention') && has('segment')` → `group_by`, dimensions: `['segment']`, measures: `['retention']`, label: `"Retention rate by segment"`
- If `has('order_count') && has('segment')` → `group_by`, dimensions: `['segment']`, measures: `['order_count']`, label: `"Order frequency by segment"`
- If `has('contribution') && has('segment')` → `group_by`, dimensions: `['segment']`, measures: `['contribution']`, label: `"Revenue contribution by segment"`
- If `has('last_purchase') && has('segment')` → `distribution`, dimensions: `['segment']`, measures: `['last_purchase']`, label: `"Recency distribution by segment"`
- Unavailable: if `!has('last_purchase')` → push `{ id: 'ua_recency', label: 'Recency analysis', missingSignals: ['last_purchase'], reason: 'Missing last purchase date' }`

**Performance domain** (when `has('kpi') || has('target') || has('achievement') || has('actual')`):
- If `has('target') && has('achievement')` → `relationship`, dimensions: `['kpi']`, measures: `['target', 'achievement']`, label: `"Target vs achievement by KPI"`
- If `has('actual') && has('department')` → `group_by`, dimensions: `['department']`, measures: `['actual']`, label: `"Actual performance by department"`
- If `has('efficiency') && has('department')` → `group_by`, dimensions: `['department']`, measures: `['efficiency']`, label: `"Efficiency by department"`
- If `has('performance_gap') && has('kpi')` → `distribution`, dimensions: `['kpi']`, measures: `['performance_gap']`, label: `"Performance gap distribution"`
- Unavailable: if `!has('target')` → push `{ id: 'ua_target', label: 'Target vs actual comparison', missingSignals: ['target'], reason: 'Missing target data' }`

**Fallback for unrecognized or cross-domain** (when none of the above domain checks hit, but signals exist):
- Use the existing generic structural generator (the current `else` block logic) — but ONLY as fallback
- This ensures datasets with detected signals always get at least some opportunities

### Step 3: Fix `narrative` generation

Replace the hardcoded delivery narrative with a domain-aware narrative:

```ts
function generateNarrative(
  status: DatasetUnderstandingStatus,
  signals: BusinessSignal[],
  availableCount: number,
  has: (id: string) => boolean
): string
```

Rules:
- `status === "insufficient"` → `"Insufficient data to understand this dataset."`
- Detect dominant domain from signals (most common domain among detected signals)
- Operations → `"This appears to be an operations or delivery dataset. ${availableCount} analysis paths identified."`
- Inventory → `"This appears to be an inventory dataset. ${availableCount} analysis paths identified."`
- Finance → `"This appears to be a finance or P&L dataset. ${availableCount} analysis paths identified."`
- Revenue → `"This appears to be a sales or revenue dataset. ${availableCount} analysis paths identified."`
- Customer → `"This appears to be a customer analytics dataset. ${availableCount} analysis paths identified."`
- Performance → `"This appears to be a performance or KPI dataset. ${availableCount} analysis paths identified."`
- Unknown/mixed → `"Detected ${signals.length} business concepts across ${availableCount} analysis paths."`

---

## Test Requirements

### File to UPDATE: `apps/desktop/src/lib/dataset-understanding-contract.test.ts`

The existing delivery test (line 36, 82) must remain passing.
Add tests for ALL other domains:

```ts
it('Finance dataset generates finance-aware opportunities')
→ signals: ['revenue', 'cost', 'profit', 'time_period']
→ expect at least 1 opportunity with label containing "Revenue" or "cost"
→ expect narrative contains "finance"

it('Inventory dataset generates inventory-aware opportunities')
→ signals: ['sku', 'stock_age', 'warehouse', 'stock_qty']
→ expect opportunity: "Stock aging profile by SKU"
→ expect narrative contains "inventory"

it('Customer dataset generates customer-aware opportunities')
→ signals: ['customer', 'segment', 'retention', 'order_count']
→ expect opportunity with dimensions: ['segment']
→ expect narrative contains "customer"

it('Performance dataset generates KPI-aware opportunities')
→ signals: ['kpi', 'target', 'achievement', 'department']
→ expect opportunity: "Target vs achievement by KPI"

it('Revenue/Sales dataset generates sales-aware opportunities')
→ signals: ['sales', 'branch', 'revenue', 'salesperson']
→ expect opportunity with dimensions: ['branch'] and measures: ['sales']
```

### File to UPDATE: `apps/desktop/src/lib/dataset-understanding-domain-coverage.test.ts`

Expand the inventory test to check specific labels (not just `length > 0`):

```ts
expect(du.availableAnalysis.some(a => a.label === 'Stock aging profile by SKU')).toBe(true)
```

---

## Verification Commands

Run in order. Do NOT claim success unless all pass:

```bash
cd /home/ubuntu/n8n2erpnext/LightBI/apps/desktop

# 1. Target tests
pnpm exec vitest run src/lib/dataset-understanding-contract.test.ts src/lib/dataset-understanding-domain-coverage.test.ts

# 2. Related action generation
pnpm exec vitest run src/lib/analysis-opportunity-actions.test.ts

# 3. Full suite — zero regressions
pnpm test

# 4. TypeScript
npx tsc --noEmit
```

---

## Forbidden Files (Do NOT touch)

- `apps/server/src/main.rs`
- `apps/desktop/src/lib/business-signal-detector.ts`
- `apps/desktop/src/lib/dataset-capability-engine.ts`
- `apps/desktop/src/lib/backend-preview-executor.ts`
- `apps/desktop/src/lib/runtime-planner-preview.ts`
- `apps/desktop/src/pages/Home.tsx`
- `apps/desktop/src/pages/Investigation.tsx`
- Any DuckDB / executor / display-preferences files

---

## Handoff Requirements

When done, write:
- `AGENT_HANDOFF_DOMAIN_AWARE_UNDERSTANDING_PHASE1.md`
  - List every domain block added
  - List every test added/updated
  - Test output (pass count)
  - TypeScript result
  - Whether the hardcoded delivery block was fully removed

- Update `AGENT_OUTBOX.md`
- Update `CHANGELOG.md` with entry for this fix

---

## Commander Note

DU-9 Semantic Graph is BLOCKED until this fix is verified green.
A graph of meaningless generic opportunities is worthless.
Fix the understanding core first. Graph comes after.
