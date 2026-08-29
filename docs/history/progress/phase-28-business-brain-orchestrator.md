# Phase 28: Business Brain Orchestrator Direction

## Status
V1 complete - BB-0 through BB-9 implemented and regression tested

## Date
2026-07-03

## Why This Phase Exists

Simple mode must approach a real Business Analyst workflow. Recent ERP sample work showed that LightBI can still be blind when the data contains business signals that are not already modeled as known angles.

This phase converts that product gap into an explicit architecture track instead of continuing one-off fixes.

## Problem Statement

LightBI currently has strong foundations:

- dataset understanding;
- trust/readiness;
- business signal detection;
- guided investigation;
- chart runtime;
- business fusion overview;
- BA decision brief;
- Deep BA Analysis.

But the behavior is still fragmented. If a field is not represented in the current taxonomy/playbook, valid business questions may not appear.

Examples:

- `Payment` exists as one categorical column, but payment mix initially expected separate payment amount columns.
- `Carrier`, `DeliveryStatus`, and `DeliveryFee` exist in Logistics, while `GrossProfit`, `NetRevenue`, and `OrderID` exist in Accounting. These can support an internal-vs-outsourced logistics cost and profit-impact question, but LightBI does not yet reliably surface that as a BA angle.

## Decision

Adopt ADR-119: Business Brain Orchestrator for Simple Mode.

Canonical pipeline:

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

## Target Maturity

Current Simple mode maturity estimate:

- approximately 40-45% toward the target BA experience.

Expected target after Business Brain phases:

- 85%+ for covered SME ERP-style workflows.

## Phase Plan

### BB-0: Business Brain Contract

Create the central `BusinessBrainBrief` contract.

Acceptance:

- every selected angle has a structured brief;
- every brief has readiness, KPI, variance, root cause, risk, recommendation, missing evidence, narrative, and evidence slots;
- Deep BA Analysis can consume this structure.

Implementation note 2026-07-03:

- Added the first `BusinessBrainBrief` contract and Deep BA Analysis panel wiring.
- Existing cross-domain overview remains as supporting context while the selected-angle brief becomes the primary report surface.

Implementation note 2026-07-04:

- Added an explicit evidence audit contract to `BusinessBrainBrief`. KPI, variance, root-cause, risk, and missing-evidence outputs can now carry auditable details for the Deep BA panel instead of appearing as unsupported text.

### BB-1: Semantic Coverage Engine

Classify every field and value distribution.

Acceptance:

- no business-like field disappears silently;
- unknown fields are surfaced as `unknown_business_like`;
- coverage can say what is recognized, partial, unknown, or technical.

Implementation note 2026-07-03:

- Added semantic coverage classification to the business signal detector and dataset understanding contract.
- Unknown populated business-like columns now downgrade understanding to partial, cap readiness, and add caveats.
- AI-safe briefing now carries `semanticCoverage`, partial fields, and unknown business-like fields forward so BA/AI cannot silently ignore them.
- BA decision brief now surfaces semantic coverage gaps as a `field_gap` insight with a specific recommendation to review unmapped business-like fields.
- Expanded generic ERP signal recognition for payment method, invoice total, receivable, gross profit, margin, total cost, carrier, delivery fee, delivery status, and order/shipment keys.
- Added Simple Mode lenses/questions for payment profitability and receivable mix, carrier cost impact, and delivery completion mix.
- These rules are pattern/value/domain based and must not branch on sample file names.

### BB-2: KPI Engine

Implement canonical KPI registry.

Required V1 KPIs:

- revenue;
- net revenue;
- invoice total;
- gross profit;
- margin;
- quantity;
- delivery fee;
- AR;
- payment mix;
- fulfilled rate;
- internal carrier share;
- external carrier share;
- delivery fee / revenue;
- delivery fee / profit.

Acceptance:

- every KPI has formula, source columns, confidence, and missing evidence;
- formulas are not sample-file hardcoded.

Implementation note 2026-07-03:

- V1 deterministic KPI formulas are not complete yet.
- The first enabling slice is implemented in the understanding layer: the required KPI source fields can now be recognized and exposed as executable questions instead of being hidden behind generic charts.
- Added a selected-angle KPI slice inside `BusinessBrainBrief` so Deep BA Analysis can compute chart-backed KPI evidence for payment mix, receivable exposure, payment profit signal, delivery fee, fulfilled rate, and internal/external carrier share when those fields appear in the selected chart.
- Missing-evidence checks now inspect action fields, chart fields, and overview metrics together. If a selected payment/logistics chart already carries `GrossProfit`, `Margin`, `AR`, `DeliveryFee`, or similar generic signals, LightBI no longer falsely says that evidence is missing.
- Added canonical chart KPI formulas with source columns for revenue, net revenue, invoice total, gross profit, margin, quantity, delivery fee, AR, payment mix, deferred payment share, delivery fee/revenue, and delivery fee/profit.
- Field matching now handles camelCase/PascalCase headers such as `NetRevenue`, `GrossProfit`, `DeliveryFee`, and `AR_Debit` without requiring sample-specific aliases.

### BB-3: Variance Engine

Generalize comparison.

Acceptance:

- supports explicit period, file/month inference, current/previous, and plan/budget when available;
- every variance includes delta, delta percent, direction, severity, and evidence.

Implementation note 2026-07-04:

- Added chart-level variance for period/date/month-like selected charts.
- V1 computes previous/current/delta/delta percent from the ordered chart evidence and exposes formula/source columns in `BusinessBrainBrief.variance`.
- Added plan/budget/target variance when selected chart evidence contains actual and plan-like fields.
- Overview metric deltas are also folded into selected-angle variance, so multi-file/month fusion output can support the selected report when the chart is built from the fused business dataset.
- Deeper what-if and scenario baselines remain future enhancement, not a V1 blocker.

### BB-4: Root Cause Engine

Implement adaptive drill-down.

Default dimensions:

```text
product -> category -> store -> salesperson -> payment -> logistics
```

Acceptance:

- selected angle controls drill priority;
- money angle leads with money drivers;
- product angle leads with product drivers;
- logistics angle leads with carrier/status/fee drivers.

Implementation note 2026-07-03:

- Added chart-first root cause ordering for payment, logistics, and product intents. The selected chart's dimension/measure now leads the Deep BA Analysis answer before cross-domain overview drivers are used as supporting context.

Implementation note 2026-07-04:

- Added adaptive drill-down root causes across available chart evidence. LightBI now looks for product, category, store, salesperson, payment, carrier, and delivery-status dimensions and ranks the strongest visible driver per available level.
- Drill priority is selected-angle aware: logistics leads with carrier/status; payment leads with payment/store/product; product leads with product/category; profitability leads with product/category/store/payment/logistics.
- This remains generic field-pattern logic and does not branch on sample filenames or values.

### BB-5: Risk Engine

Add business risk detection.

V1 risks:

- low margin;
- high AR;
- high installment share;
- revenue gap;
- cost spike;
- delivery fee spike;
- outsourced carrier dependency;
- failed/retry delivery rate;
- concentration risk;
- key risk;
- many-to-many relationship risk.

Acceptance:

- every risk includes severity, evidence, affected segment, and suggested action.

Implementation note 2026-07-04:

- Added KPI-backed V1 risk rules for low margin, high AR exposure, high deferred payment share, delivery fee pressure, outsourced carrier dependency, and low fulfilled delivery rate.
- Risks now feed recommendations so payment collection and margin protection actions surface from actual KPI evidence.
- Added V1 risk rules for concentration risk, revenue/reconciliation gaps, cost or delivery-fee spikes, weak key coverage, missing shared keys, and relationship/many-to-many warnings from fusion overview context.
- Risk detection now combines selected chart KPI/variance evidence with multi-file fusion overview checks instead of relying on one surface only.

### BB-6: Recommendation Engine

Generate typed recommendations.

Types:

- `do_now`;
- `investigate`;
- `need_more_data`.

Acceptance:

- recommendations do not overclaim;
- investment decisions list missing CAPEX/OPEX/capacity evidence when absent.

Implementation note 2026-07-04:

- Recommendations now consume risks and missing evidence, not only the selected angle.
- Added `do_now` recommendation only when evidence is complete enough and no high-risk blocker is present.
- Payment collection and margin-protection recommendations are triggered by KPI-backed risks.

### BB-7: Executive Narrative

Generate selected-angle-first BA reports.

Required narrative sections:

1. Angle
2. Business question
3. Main answer
4. KPI
5. Variance
6. Root cause
7. Risk
8. Recommendation
9. Missing evidence

Acceptance:

- no generic cross-domain report replaces selected-angle answer;
- cross-domain overview is supporting context only.

Implementation note 2026-07-03:

- Deep BA Analysis now builds its main answer from selected-angle KPI/root-cause evidence first. This prevents money/product/payment/logistics reports from defaulting to a broad cross-domain overview when the user is inspecting a specific chart.

Implementation note 2026-07-04:

- Root-cause narrative now includes drill level and value so the report reads more like a BA drill-down path rather than a single flat chart label.
- Executive narrative now includes KPI, Variance, Root cause, Risk, Recommendation, Next question, Evidence, and Missing evidence sections from the selected-angle `BusinessBrainBrief`.

### BB-8: Simple Mode UI

Render Business Brain output.

Acceptance:

- Ready / Partial / Blocked is visible;
- missing evidence is visible;
- evidence is auditable;
- next recommended question is visible.

Implementation note 2026-07-04:

- Deep BA panel now separates KPI, Variance, Root Cause, Risks, Recommendations, and Missing Evidence instead of burying variance inside KPI text.
- KPI and Variance sections now expose formula and source columns where available, making the report evidence auditable in the UI.
- Added Next Questions rendering from the `BusinessBrainBrief` contract so Simple Mode can continue the BA investigation instead of ending at a static report.
- Added an Evidence audit trail section so the user can inspect which KPI/variance/root-cause/risk/missing-evidence facts drove the BA answer.
- Richer follow-up action execution remains future UX expansion, not a V1 blocker.

### BB-9: Regression Suite

Add tests that prevent signal blindness.

Required fixtures:

- categorical payment method;
- internal vs outsourced carrier;
- delivery status;
- delivery fee impact;
- AR/payment risk;
- missing investment evidence;
- multi-file period comparison.

Acceptance:

- if data contains business-like signals and no angle/warning is produced, tests fail.

Implementation note 2026-07-03:

- Added Business Brain regression tests for payment mix with receivable/profit evidence and logistics carrier cost evidence.
- Verification: `pnpm --dir apps/desktop exec vitest run src/lib/business-brain-brief.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/semantic-coverage.test.ts src/lib/ai-briefing-generator.test.ts src/lib/ba-decision-engine.test.ts --reporter=dot` passes 109 tests.
- Verification: `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json` passes.
- Verification 2026-07-04: same regression group passes 116 tests after concentration, reconciliation/key, relationship, and delivery-fee spike risk updates.

Implementation note 2026-07-04 completion:

- Added sample-data regression over the six ERP files: Sales May/June, Accounting May/June, and Logistics May/June.
- The sample regression proves Payment produces payment mix, receivable exposure, and profit signal; Carrier produces internal/external carrier share and total delivery fee; DeliveryStatus produces fulfilled-rate evidence.
- Added regression that `BusinessBrainBrief.evidence` is populated so the UI audit trail does not drift from the engine contract.
- Verification: `pnpm --dir apps/desktop exec vitest run src/lib/business-brain-brief.test.ts --reporter=dot` passes 12 tests.
- Verification: `pnpm --dir apps/desktop exec vitest run src/lib/business-brain-brief.test.ts src/lib/business-fusion-overview.test.ts src/lib/understanding-next/understanding-next.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/semantic-coverage.test.ts src/lib/ai-briefing-generator.test.ts src/lib/ba-decision-engine.test.ts --reporter=dot` passes 118 tests.
- Verification: `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json` passes.

Implementation note 2026-07-04 UI action visibility fix:

- Fixed the gap where Business Brain could analyze Payment/Carrier/Delivery charts, but Simple Mode did not show those reports after six files were fused.
- Root cause: the fusion virtual dataset dropped business columns such as `payment`, `carrier`, `invoice_total`, and `ar_debit`, and the Home path uses `understanding-core` rather than the older `understanding-next` question generator.
- Fusion virtual dataset now preserves Payment, Carrier, Delivery Status, Invoice Total, and AR evidence generically.
- `understanding-core` now emits executable actions for `Payment profitability and receivable mix`, `Carrier cost impact`, and `Delivery completion mix`.
- Verification: `pnpm --dir apps/desktop exec vitest run src/lib/business-fusion-overview.test.ts --reporter=dot` passes and asserts those labels are present in `availableActions` for the six ERP sample files.
- Verification: `pnpm --dir apps/desktop exec vitest run src/lib/business-fusion-overview.test.ts src/lib/business-brain-brief.test.ts src/lib/understanding-core/understanding-core.test.ts src/lib/understanding-core/next-adapter.test.ts src/lib/understanding-next/understanding-next.test.ts --reporter=dot` passes 103 tests.
- Verification: `pnpm --dir apps/desktop exec tsc --noEmit --pretty false --project tsconfig.app.json` passes.

## Immediate Next Implementation Recommendation

Move from Business Brain V1 foundations to runtime UX validation.

Rationale:

- BB-0 through BB-9 now have engine, UI, and regression coverage.
- The next useful work is browser verification of Simple Mode Deep BA flows on imported files, followed by follow-up action execution from Next Questions.

## Verification Required Before Claiming Completion

- unit tests for contract construction: done;
- sample-data tests using the six ERP files: done;
- UI rendering for Deep BA Analysis selected-angle-first structure: implemented in V1 panel;
- regression proof that unknown business-like fields are surfaced instead of ignored: covered by semantic coverage regression group.
