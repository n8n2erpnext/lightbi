# Phase 7R3.2 - Conditional Gross Profit Eligibility And Execution Closure

## Result

Phase 7R3.2 corrected the gross-profit metric binding without weakening runtime safety. Gross profit contract `1.0.1` now accepts only governed `revenue` or `net_revenue` measures as its revenue basis. It no longer treats tax-inclusive `invoice_total` as an interchangeable component.

For both Accounting May and June, canonical evidence now selects exactly:

- `Revenue_Credit` as `revenue`;
- `COGS_Debit` as `total_cost`;
- `OrderID` / `key:2` as the exact governed identity;
- `InvoiceDate` as the compatible event-period basis.

The selected revenue and cost measures are additive candidates and are not repeated within the selected identity. The previous `runtime_binding_ambiguous:gross_profit_revenue` blocker is resolved generically through the metric definition, without filename, hash, sample ID, header-order, or magnitude exceptions.

## Currency Gate

Neither source contains a canonical currency column. Corpus `1.2.0` contains no frozen source-currency metadata, and the repository contains no governed same-currency contract for these artifacts. Currency therefore remains unknown. LightBI did not infer VND from Vietnamese labels, locale, number formatting, account codes, filename, expected values, or the absence of a currency column.

M1 remains `conditionally_ready`. M2 keeps the gross-profit question explanation-only. M3 remains blocked by `gross_profit_currency_compatibility_not_proved` and the associated conditional-runtime permission guard. No query plan was created and no governed runtime execution is claimed.

An independent non-runtime check confirmed that `SUM(Revenue_Credit - COGS_Debit)` equals the frozen truths exactly: May `3,075,721,244`; June `2,934,640,164`. This confirms the selected arithmetic pair but does not substitute for the missing governed currency evidence or for runtime execution.

## Boundaries Preserved

- Inventory remains `authentic_snapshot_and_frozen_truth_unavailable`.
- Revenue and delivery behavior are unchanged.
- Semantic resolution, grain policy, question policy, UI, packaging, corpus truth, and production consumer wiring were not modified.
- No free-form SQL, SUM fallback, COUNT fallback, cross-source join, currency inference, or decision-use authorization was introduced.
- Corpus `1.2.0` and the Phase 5B6B allowlist remain unchanged.

## Regression Evidence

- Revenue: 12/12 exact.
- Delivery: 8/8 exact.
- Governed gross-profit executions: 0; gross-profit mismatches: 0.
- All governed comparisons: 20/20 exact.
- Family coverage: 2/4, unchanged.
- Advertised-action execution: 30/30, 100%.
- False executable actions: 0.
- False decision-support cases: 0.
- Blocked explanation completeness: 340/340, 100%.
- Mapping precision: 100%.
- Held-out core recall: 90.91%.
- Domain activation precision: 100%.

## Verification

- Phase 7R3.2 targeted: 1 file, 2 tests passed.
- Unchanged Phase 7 evaluator: 1 file, 1 test passed.
- Phase 7R1-R3.1 and Phase 5/6 regressions: 16 files, 65 tests passed.
- Complete `understanding-core`: 70 files, 314 tests passed.
- Repository TypeScript: zero diagnostics.
- Full desktop suite ran exactly once: 159/163 files and 1,119/1,128 tests passed. All nine failures match the governed allowlist: six deterministic signatures and three permitted timeouts. Unexpected failures: 0; Phase 7R3.2-owned failures: 0.
- Full-suite log: `/tmp/phase7r32-full-desktop-suite.log`.
- Full-suite log SHA-256: `bcfc4441c086ac497a2b33711c796e84ccef2b8255ec9eb968ca4beeb17fcd12`.

Phase 7R3.2 cannot pass its execution-closure condition because neither authentic accounting source proves currency compatibility. The correct release classification is therefore a currency-evidence blocker, not a fabricated gross-profit success.

not_ready_currency_compatibility
