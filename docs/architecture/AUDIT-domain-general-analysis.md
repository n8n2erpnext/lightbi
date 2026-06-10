# AUDIT: Domain-General Analysis Opportunities

## Status
Audit Completed

## Context
In DU-1, we hardcoded the `availableAnalysis` and `unavailableAnalysis` logic specifically for the "Delivery Performance" dataset (checking for `report_date`, `route`, `driver`, `shipment`, `satisfaction`).
While this proved the Understanding-First pipeline works (DU-1 to DU-5C), it fails for any other dataset (e.g., Sales, HR, Inventory) because the opportunity generator only knows about delivery.

## Problem
If a user uploads an Inventory dataset with `sku`, `warehouse`, and `stock_qty`, `dataset-understanding-contract.ts` will return 0 `availableAnalysis` and 0 `unavailableAnalysis`. The Dataset Understanding will still show `inferredEntities`, but the user will have no one-click Investigation actions available.

## Goal
Implement a domain-general heuristic to generate `availableAnalysis` dynamically based on the detected signals without breaking the existing pipeline or tests.

## Proposal
1. **Signal Taxonomy Enhancement**: 
   Update `TAXONOMY` in `business-signal-detector.ts` to include a `type` field: `"time"`, `"dimension"`, or `"measure"`.
2. **Dynamic Generator in Contract**:
   In `dataset-understanding-contract.ts`, replace the hardcoded "Delivery Performance Logic" with a generic generator:
   - Identify all `time` signals, `dimension` signals, and `measure` signals.
   - For each `measure`, create a trend analysis against each `time` signal (e.g., "Measure over Time").
   - For each `measure`, create a breakdown analysis against each `dimension` signal (e.g., "Measure by Dimension").
   - Cap the number of generated opportunities (e.g., top 10) to avoid overwhelming the UI.
   - For backwards compatibility with tests (which expect specific IDs or exact strings for Delivery), we will keep the exact labels if it matches the Delivery combination, or we'll ensure the tests are slightly relaxed/updated without breaking the core structure.
3. **Action Mapping**:
   In `analysis-opportunity-actions.ts`, map these generated opportunities to the correct `actionType` (`"trend"` for time, `"group_by"` for dimension).
   
## Protected Files Constraint
- We will NOT modify `Investigation.tsx`, `safe-sql-preview.ts`, or any execution-related files.
- We will only edit `business-signal-detector.ts`, `dataset-understanding-contract.ts`, and `analysis-opportunity-actions.ts`.
