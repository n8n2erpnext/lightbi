# Domain Sample Data Pack & Core Behavior Audit (Implementation Plan)

## Goal
Generate realistic raw sample datasets (good and broken) for every currently covered domain in LightBI. Use these datasets to audit the current core understanding engine (end-to-end), taking screenshots of the UI flow, and compiling a final audit report.

## Domain Inventory
Based on `domain-knowledge-catalog.ts`, the following 6 domains are covered:
1. `operations`
2. `revenue`
3. `inventory`
4. `customer`
5. `performance`
6. `finance`

## Proposed Execution Steps

### Step 1: Create Domain Sample Matrix
- I will generate `DOMAIN_SAMPLE_MATRIX.md` on the VPS to document each of the 6 domains, listing their likely canonical concepts/signals, and noting their supported behaviors.

### Step 2: Generate Sample Data
- Create a dedicated folder: `n8n2erpnext/LightBI/sample-data-audit/`
- For each of the 6 domains, I will generate 2 ASCII CSV files:
  - `sample-data-audit/<domain>/good_<domain>.csv`: Structurally plausible, strong signal coverage, realistic headers and rows.
  - `sample-data-audit/<domain>/broken_<domain>.csv`: Messy real-world data (mixed naming, inconsistent semantics, partial missingness, duplicate-like columns) but not fully corrupted.

### Step 3: Build Automated Audit Harness
- Create a practical, repo-local TypeScript script (e.g., `audit-runner.ts` in `scripts/` or `sample-data-audit/`).
- The runner will import the core LightBI pipeline functions (`createDatasetUnderstanding`, `generateAnalysisActions`, `evaluateDecisionReadiness`, etc.).
- It will loop through the `sample-data-audit/` directories, read the CSV headers (and a few rows), and pass them through the core engine.
- The runner will output a summary of:
  - Detected signals
  - Inferred grainHint
  - Readiness tier & caveats
  - Opportunities generated
  - Domain-aware suggestions

### Step 4: UI Evidence Capture
- I will manually load a representative subset of these generated datasets (e.g., 2 good datasets, 2 broken datasets) into the LightBI desktop app flow.
- I will capture screenshots of the "Home understanding state" and "Investigation state" (especially degraded/fallback visibility).
- Screenshots will be saved to `sample-data-audit/screenshots/` on the VPS.

### Step 5: Final Report Generation
- Synthesize the findings from the audit harness and UI inspection into `DOMAIN_CORE_AUDIT_REPORT.md`.
- The report will detail what passed well, what failed, domains with convincing Standard Mode behavior vs partial support, and rank the top next fixes by impact.

## Constraints & Rules Followed
- No new architecture or backend/runtime redesign.
- No widening of domain support beyond the existing 6 domains.
- Will strictly respect the existing `MVP_CHECKPOINT.md` and multi-evidence engine rules.
