# Implementation Plan: Taxonomy Expansion Phase 1

## Goal
Expand the core business signal taxonomy dictionary to address specific semantic and vocabulary gaps (Taxonomy Gaps) identified during the Alias Batch 2 Verification, strictly without introducing new structural stripping rules (No Alias Batch 3). The expansion must be extremely conservative, utilizing full-phrase context rather than single ambiguous tokens.

## Why This Phase Follows Alias Batch 2
Alias Batch 2 successfully exhausted structural pattern matching (`_qty`, `_total`, `_code`) and proved that the remaining detection failures in clean datasets (like `good_finance.csv` and `good_operations.csv`) are purely semantic vocabulary gaps. Expanding the taxonomy dictionary directly is the most robust way to cross this last mile of Understanding before hardening the execution engine.

## 1. Top 2 Taxonomy Gaps to Address
1. **Finance Semantic Modifiers**: `profit_net`, `margin_pct`, `expense_misc`, `discount_amt`. 
   - *Vocabulary Gap*: Modifiers like `net`, `pct`, `misc`, `amt` change the specific accounting nature of the metric.
2. **Operations Specific Nouns**: `delay_minutes`, `vehicle_plate`, `sla_met`.
   - *Vocabulary Gap*: Modifiers like `minutes`, `plate`, `met` were intentionally excluded from structural stripping because they carry heavy semantic context.

## 2. Canonical Signals to Expand (Conservative Scope)
Only signals with direct evidence from the recent domain audit will be expanded via **Exact Phrases Only**:
- **Finance**:
  - `profit`: Add `profit net`, `net profit`
  - `margin`: Add `margin pct`, `margin %`, `percentage margin`
  - `expense`: Add `expense misc`, `misc expense`, `miscellaneous expense`
  - `discount`: Add `discount amt`, `discount amount`
- **Operations**:
  - `delay`: Add `delay minutes`, `delay mins`
  - `vehicle`: Add `vehicle plate`, `license plate`
  - `sla`: Add `sla met`, `sla status`

## 3. Forbidden Aliases in Phase 1
Single, ambiguous tokens that carry a high risk of cross-domain bleeding are strictly prohibited from being added as aliases:
- `net`
- `pct`
- `misc`
- `amt`
- `minutes`
- `plate`
- `met`

## 4. Test Scope and Guardrails
- **Positive Testing**: Ensure the exact new phrases correctly map to their target canonical signals.
- **Negative Testing**: Ensure the forbidden single tokens alone do NOT trigger any signal mapping.
- **Regression**: Ensure no regression of existing English/Vietnamese tests.
- **Audit Rerun**: Must execute the audit subset for `sample-data-audit/finance/good_finance.csv` and `sample-data-audit/operations/good_operations.csv` to prove before/after improvements.

## 5. Files to Modify
- `apps/desktop/src/lib/business-signal-detector.ts` (Updating the `TAXONOMY` object aliases).
- `apps/desktop/src/lib/business-signal-detector.test.ts` (Adding new phrase vs. token tests).

## 6. Acceptance Criteria
1. Full phrases (`profit_net`, `margin_pct`, `expense_misc`, `discount_amt`, `delay_minutes`, `vehicle_plate`, `sla_met`) map correctly to their canonical signals via exact alias matching.
2. Single tokens (`net`, `pct`, `misc`, `amt`, `plate`, `met`, `minutes`) standing alone do **not** create any signal.
3. Domain Audit Harness (`audit-runner.ts`) shows verifiable before/after metrics for the finance and operations sample files.
