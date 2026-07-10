# Phase 29: Context-Aware Semantic Dictionary

## Status
V1 testable slice complete

## Date
2026-07-04

## Why This Phase Exists

Business Brain V1 improved reports, KPI evidence, risks, recommendations, and selected-angle narrative. The remaining blocker is upstream: LightBI can still miss business meaning when headers are unclear or wrong.

The user requirement is explicit:

- the dictionary is for all declared domains, not only finance/revenue;
- LightBI must understand context from values, not only headers;
- if data is present but unmapped, LightBI must warn instead of being blind;
- sample ERP files are clean, so real business files will be harder;
- do not lock logic to sample filenames or exact sample data.

## Domain Inventory

Runtime BA domains currently cataloged:

1. `operations`
2. `revenue`
3. `inventory`
4. `customer`
5. `performance`
6. `finance`

Runtime detector taxonomy currently covers 62 signals:

- operations: 11
- revenue: 10
- finance: 11
- inventory: 11
- customer: 8
- performance: 9
- core: 2

Partial or legacy profiler domains:

- logistics_delivery
- sales_revenue
- finance_accounting
- hr_attendance
- education
- support

Advertised/future guidance groups exist in `home-guidance.ts`, but they are not all supported BA domains yet.

## Phase Plan

### SD-0: Document Boundary

Record ADR-120 and this phase plan.

Acceptance:

- supported, partial, and advertised-only domain boundaries are explicit;
- the product does not imply full BA support for domains that are only guidance metadata.

### SD-1: Semantic Dictionary Contract

Create a machine-readable dictionary layer that can represent:

- canonical signal;
- domain(s);
- semantic family;
- role;
- support status;
- header aliases;
- value aliases;
- value patterns;
- compatible data shapes.

Acceptance:

- dictionary is domain-wide;
- payment, delivery status, carrier, status, product, money, time, and quantity can be represented without sample-specific code.

### SD-2: Value Evidence Engine

Infer signal candidates from cell values and value distributions.

Acceptance:

- generic header with payment values maps to payment method;
- generic header with delivery values maps to delivery/fulfillment status;
- generic header with carrier/provider values maps to carrier;
- evidence explains whether inference came from header, value, or shape.

### SD-3: Conflict and Unknown Handling

Detect contradiction between header evidence and value evidence.

Acceptance:

- header/value disagreement is partial/conflicting, not blindly recognized;
- unknown business-like columns stay visible in semantic coverage;
- BA/AI artifacts can see the caveat.

### SD-4: Integration with Business Signal Registry

Feed semantic evidence into the existing registry without breaking downstream consumers.

Acceptance:

- existing supported flows still pass tests;
- new value-based signals become available to question/BA layers;
- no sample filename branching.

### SD-5: Regression Corpus

Add tests with adversarial headers.

Required cases:

- `Type` + payment values;
- `Mode` + delivery status values;
- `Provider` + carrier values;
- wrong header + conflicting values;
- unknown business-like categorical field.

## Implementation Notes

### 2026-07-04

- Phase started after Business Brain V1.
- First slice will integrate with `business-signal-detector.ts` and `semantic-coverage.ts`, because those are already consumed by dataset understanding and downstream BA contracts.

### 2026-07-04 SD-1/SD-4 first implementation slice

- Added `context-semantic-dictionary.ts` as the first machine-readable dictionary layer for contextual evidence.
- Added value-based inference for:
  - payment method values such as cash, installment, transfer, card, COD, and Vietnamese equivalents;
  - delivery status values such as delivered, completed, retry, failed, pending, cancelled, and Vietnamese equivalents;
  - carrier/provider values such as internal vehicle, outsourced vehicle, GHN, GHTK, Viettel Post, Ahamove, Grab, Ninja Van, and related logistics provider patterns.
- Integrated contextual candidates into `business-signal-detector.ts` without replacing the existing taxonomy detector.
- Extended evidence breakdown with value and shape support fields.
- Changed multi-signal-per-column mapping to surface as partial/conflicting coverage instead of silently choosing one meaning.
- Guardrail: dictionary shape evidence cannot create a signal by itself.
- Guardrail: generic `internal` / `external` values are not enough to infer carrier, because they appear across many domains.
- Guardrail: `shipper` / `courier` must not make a driver/person field also look like a carrier unless stronger provider evidence exists.
- Added adversarial-header regression tests:
  - generic `Type` with payment values maps to `payment_method`;
  - generic `Mode` with delivery values maps to `delivery_status`;
  - generic `Provider` with logistics provider values maps to `carrier`;
  - header/value disagreement becomes partial/conflicting;
  - unknown business-like categorical fields remain visible for review.

Verification:

- `pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/business-signal-detector.test.ts src/lib/semantic-coverage.test.ts --reporter=dot` -> 31 tests passed.
- `pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/business-fusion-overview.test.ts src/lib/business-brain-brief.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/understanding-core/next-adapter.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts --reporter=dot` -> 110 tests passed.
- `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json` -> pass.

Remaining:

- Add neighbor evidence and cross-file evidence.
- Unify overlapping signal registries so domain knowledge does not drift across engines.
- Add UI surface for conflicting value/header mappings if not already visible through semantic coverage.

### 2026-07-04 SD-1 domain-wide expansion

- Expanded `CONTEXT_SEMANTIC_DICTIONARY_V1` beyond payment/logistics into all six runtime BA domains:
  - operations;
  - revenue;
  - inventory;
  - customer;
  - performance;
  - finance.
- Added dictionary entries for route, shipment, delivery fee, revenue, net revenue, invoice total, receivable, branch, salesperson, gross profit, profit, margin, total cost, customer, segment, retention/churn, sku, product, stock quantity, inventory, warehouse, stock status, target, actual, achievement, department, KPI, and time period.
- Added regression to assert the dictionary covers every supported BA runtime domain.
- Added value-based tests for inventory status and performance achievement with imperfect headers.

Verification:

- `pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/business-signal-detector.test.ts src/lib/semantic-coverage.test.ts --reporter=dot` -> 34 tests passed.
- `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json` -> pass.

### 2026-07-04 SD-6 neighbor and cross-file evidence slice

- Added optional semantic inference context so a column can use:
  - sibling columns in the same imported profile;
  - related columns from other imported files;
  - previously detected cross-file signals.
- Added neighbor evidence for:
  - generic delivery/status columns near shipment, route, delivery, carrier, driver, or delivery-fee fields;
  - generic inventory/status columns near SKU, product, warehouse, inventory, stock, or quantity fields;
  - payment method columns near invoice, receivable, payment, customer, order, revenue, or amount fields;
  - carrier columns near shipment, route, delivery, freight, waybill, or driver fields;
  - profit/cost, customer, and performance families where nearby columns support the interpretation.
- Added cross-file evidence as a support boost, not as a standalone signal creator. Cross-file context can strengthen payment, logistics, finance, and inventory interpretations only when the current column already has enough header/value/context evidence.
- Extended detector evidence breakdown with `neighborSupport` and `crossFileSupport`.
- Added guardrail regression:
  - generic `State` plus `ShipmentID` and `DeliveryFee` maps to `delivery_status`;
  - generic `State` plus `SKU` and `Warehouse` maps to `stock_status`;
  - payment values plus invoice/receivable cross-file context records cross-file evidence;
  - weak generic `Internal` / `External` values do not become payment method just because another file has receivables;
  - dictionary canonical IDs must exist in the runtime detector taxonomy.

Verification:

- `pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/business-signal-detector.test.ts src/lib/semantic-coverage.test.ts --reporter=dot` -> 38 tests passed.
- `pnpm --dir apps/desktop exec vitest run src/lib/context-semantic-dictionary.test.ts src/lib/business-fusion-overview.test.ts src/lib/business-brain-brief.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/understanding-core/next-adapter.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/semantic-coverage.test.ts --reporter=dot` -> 117 tests passed.
- `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json` -> pass.

Long-running architecture items, no longer blocking this phase slice:

- Unify overlapping signal registries so domain knowledge does not drift across engines.
- Add UI surface for conflicting value/header mappings if not already visible through semantic coverage.
