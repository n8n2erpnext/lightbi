# Post-Beta Deep BA Investigation Handoff — 2026-08-13

## Purpose

This checkpoint enriches the existing single-source Deep BA framework into a progressive, evidence-bound investigation. It does not replace canonical understanding, governed execution, chart planning, drill-through, or the existing BA overview engine.

## Shipped behavior

- Eight progressive layers: what happened, where, possible drivers, unusual evidence, priorities, follow-up questions, actions, and unknowns.
- Every structured finding carries confidence, evidence basis, physical evidence fields, and up to five source-row references.
- Recommendations are explicitly classified as evidence-backed, hypothesis, or needs verification.
- Priority ranking uses contribution multiplied by confidence; it does not assert causality.
- Comparison context discloses whether period, peer, baseline, and target comparisons are available.
- Domain decomposition reuses the existing domain BA playbooks:
  - Revenue: volume, price, discount, and mix.
  - Inventory: stock health, inbound/outbound balance, and value concentration.
  - Operations: service/exception and cost per shipment.
  - Finance: margin and working-capital bridges.
  - Customer and performance retain their own professional question frames.
- Missing inputs make a decomposition partial/unavailable and create explicit unknowns instead of narrative guesses.
- The selected business perspective is preserved through the transient workspace dataset without changing the byte-locked Phase 8E investigation-session contract.
- Filtered step-2 analysis uses the same framework and only the selected rows. No full-source dashboard claim is created for a filtered scope.

## Verified workflows

### Dirty multi-sheet workbook

`Ton kho vat tu 022025.xlsx`:

- Sheet selection exposed six sheets; `Tổng hợp` produced 331 physical rows and nine physical columns.
- Governed execution completed with 14 result groups and no `RUNTIME_MATERIALIZATION_ROW_COUNT_EXCESS`.
- Drill `ĐVT = Cái`, filter `MVT = XP901`, select 1/1 row, then Deep BA step 2.
- Deep BA remained in Inventory and exposed partial stock health, inbound/outbound, and inventory-value decompositions.
- The finding retained the selected evidence row; no browser console errors were observed.

### Single-source domain matrix

- Sales ERP May: supported revenue bridge with Qty, UnitPrice, Discount, and Product.
- Logistics ERP June: partial service/exception bridge and supported logistics unit economics.
- Accounting ERP May: supported margin bridge and partial working-capital bridge because payable/inventory evidence was absent.

### Six-file ERP multi-source matrix

- Six sources, three roles, two periods, 9,000 rows recognized.
- Executive overview produced Sales Revenue, Delivery Count, and Gross Profit period comparisons.
- Driver investigation produced growth/decline ranking, volume and discount effects, profit/margin context, and exportable evidence rows.
- Current UX distinction: multi-source driver investigation remains embedded in the Home executive workspace; single-source Deep BA uses the side panel. This is existing behavior and was not changed in this risk-bounded checkpoint.

## Gates

- Focused BA, Investigation, i18n, and frozen architecture gates: 41/41 passed.
- Production TypeScript/Vite build passed.
- Full suite: 203 files / 1,353 tests passed in the parallel run; six large sample tests hit their existing 5-second timeout under eight-worker contention.
- Those exact six tests were rerun serially: 6/6 passed.
- The earlier full run's two real failures (new Vietnamese strings and a byte-locked Phase 8E contract edit) were fixed before this checkpoint.

## Safety invariants

- Canonical semantic mapping and governed runtime remain authoritative.
- No filename, workbook, sheet, or physical-column special case was added.
- A cause is never claimed from a partial decomposition.
- Evidence rows never escape the currently analyzed subset.
- Existing user ZIPs, logs, PIDs, and release artifacts were not modified.
