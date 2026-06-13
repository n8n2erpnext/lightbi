# MVP Stabilization Memo

## Stabilization Principle
MVP v1 prioritizes **truthful capability presentation** and a **stable guided flow**. We strictly favor conservative, reliable understanding over flashy but fragile intelligence. The product must be local-first, utilize no new AI dependencies, and adhere to the existing architecture without reinvention.

## 1. What is now proven
- **Alias Brittleness**: The string-matching signal detector fails on standard English suffixes (e.g., `_amount`, `_name`), causing perfectly valid datasets to degrade to `exploratory_only`.
- **Cross-Domain Bleed**: When matching succeeds, overlapping domains violently compete to claim the dataset without a dominant tiebreaker logic, muddying the intent.
- **Backend Instability**: DuckDB (the primary backend) failed to execute in 100% of the tested audit scenarios, forcing reliance on the `js_sandbox_fallback`.
- **Discovery vs. Runtime Disconnect**: The discovery engine hallucinates capabilities (e.g., claiming 5 business views for a Finance dataset) without verifying if the runtime can execute them. This results in empty investigation views with zero runnable opportunities.

## 2. What is still unproven
- **Performance Semantic Depth**: Whether the complex generated Business Views (when they actually run) provide deeper insight or merely perform superficial groupings.
- **Customer Cohort Intelligence**: The validity of the generated SQL plans for complex behavioral logic (like RFM) against state-changing datasets.

## 3. Top trust breaks in current MVP (Ranked by user harm)
1. **False Promises & Silent/Empty Failures**: The user sees high confidence and deep promised insights (e.g., "Profitability Analysis") on the Home screen, but clicking "Investigate" leads to an empty page with no actionable "Run preview" button and no explanation. This completely breaks user trust.
2. **First-Impression Alias Rejection**: Clean, standard English datasets are rejected as "Exploratory" because of simple suffix mismatches, making the product look incompetent immediately upon upload.
3. **Backend Instability**: The core analytical engine (DuckDB) fails on complex logic, meaning the "Advanced" capabilities are fundamentally brittle and rarely surface to the user intact.

## 4. Recommended fix order

### 1. Fix: Honest Investigation State (Pre-flight Checks)
- **Objective**: Ensure the UI never promises an actionable view if the runtime cannot generate a valid opportunity.
- **Why it comes now**: It stops the most severe trust leak (False Promises). We must align Discovery output with Runtime capabilities.
- **What must NOT be changed**: Do not rewrite the UI framework. Do not replace the DuckDB engine.
- **Acceptance proof**: Datasets that fail to generate valid SQL plans downgrade gracefully on the Home screen, and the Investigation screen always provides either a runnable preview or a clear fallback explanation.

### 2. Fix: Signal Detection Robustness (Alias Resolution)
- **Objective**: Improve the `business-signal-detector.ts` to handle common English suffixes and prefixes without needing exact matches.
- **Why it comes now**: Fixes the first-impression failure for cleanly formatted datasets.
- **What must NOT be changed**: Do not introduce LLM-based vector embeddings or slow semantic searches. Keep it fast and rule-based.
- **Acceptance proof**: `good_operations.csv` and `good_revenue.csv` map to `reference_only` or `decision_support` tiers accurately.

### 3. Fix: Cross-Domain Tiebreaker
- **Objective**: Implement a scoring or hierarchy mechanism to resolve overlapping domains.
- **Why it comes now**: Reduces UI clutter and focuses the Investigation view on the most highly confident domain.
- **What must NOT be changed**: Do not narrow the existing domain definitions.
- **Acceptance proof**: `broken_revenue.csv` clearly prioritizes Revenue over Operations and Inventory.

### 4. Fix: Backend Runtime Hardening
- **Objective**: Audit and repair the DuckDB generation logic so it successfully executes the promised business views.
- **Why it comes now**: We need the engine to actually deliver on its "Reference" capabilities without crashing.
- **What must NOT be changed**: Do not invent new databases. Fix the SQL generation mapping.
- **Acceptance proof**: `broken_finance.csv` successfully renders a DuckDB-backed chart in the Investigation view.

## 5. Proposed next 3 implementation phases

### Phase 1: Pre-flight Integrity & Error Boundaries
- **Exact Scope**: Clearly establish an honest discovery-to-investigation handoff and ensure empty-state/error-state truthfulness first. Implement a validation step between discovery and UI presentation so that zero-opportunity states are handled gracefully with clear fallback messaging.
- **Files Likely Affected**: `apps/desktop/src/lib/guided-investigation-pipeline.ts`, `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx`, `apps/desktop/src/lib/dataset-understanding-contract.ts`.
- **Tests/Evidence**: Verify `broken_finance.csv` drops to `exploratory_only` or displays a clear error state when actionable opportunities are 0.
- **Explicit Non-Goals**: Do not fix DuckDB yet. Focus strictly on honest UI representation and truthful handoffs.

### Phase 2: Lexical Expansion & Dominance
- **Exact Scope**: Expand alias rules in the catalog to handle `_amount`, `_id`, `_name` and introduce a cross-domain dominance tiebreaker in the signal detector.
- **Files Likely Affected**: `apps/desktop/src/lib/business-signal-detector.ts`, `apps/desktop/src/lib/domain-knowledge-catalog.ts`.
- **Tests/Evidence**: The 12 sample CSV files map cleanly with higher signal retention and a single dominant domain.
- **Explicit Non-Goals**: Do not add new domains. Do not introduce LLM semantic search.

### Phase 3: Runtime Execution Rescue
- **Exact Scope**: Debug the DuckDB query generation pipeline to ensure standard Business Views output valid, executable SQL. DuckDB and runtime rescue will happen **only after** the product no longer overpromises runnable analysis (as achieved in Phase 1).
- **Files Likely Affected**: `apps/desktop/src/lib/duckdb-preview-runtime.ts`, `apps/desktop/src/lib/safe-sql-compiler.ts`.
- **Tests/Evidence**: Capture after-run screenshots of DuckDB successfully rendering complex views.
- **Explicit Non-Goals**: Do not add new chart types. Do not change the core architecture.

## 6. What to defer until after MVP trust is stabilized
- **Data Lineage/Provenance Transparency**: Wait until the core queries actually run stably.
- **LLM Semantic Search / Embeddings**: Wait until the rule-based alias expansion proves insufficient.
- **Advanced Investigation Branching**: Wait until a single investigation path works consistently.
