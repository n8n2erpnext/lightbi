# Implementation Plan: Local DuckDB Executor Phase 1

## Goal
Establish the structural boundary (the "seam") for genuine local execution of complex intents. Instead of assuming DuckDB WASM is fully ready, this phase starts with a strict Feasibility Verification and constructs the correct execution path. If the required local DuckDB infrastructure exists, we wire it up; if not, we build the robust executor seam that fails gracefully, preparing the exact injection point for the real local database without wasting compiled SQL.

## 1. Feasibility Verification Step (Pre-Execution)
Before writing execution code, the following must be verified:
- `package.json` dependencies (e.g., `@duckdb/duckdb-wasm`).
- Availability of necessary WASM assets in the project bundle.
- Existing import paths for local DuckDB utilities.
If the underlying infrastructure is missing, Phase 1 will strictly build the **executor seam and wiring**, and will *not* promise to execute real WASM in this step.

## 2. Top 2 Executor Failures to Address
1. **Missing Local Executor Seam**: Complex intents (`trend`, `group_by`) currently fail-fast blindly without a designated architectural path for a true local DB executor to handle them.
2. **Wasted SQL Compilation**: `safe-sql-preview.ts` successfully generates dialect-hardened SQL, but this output is completely ignored locally because there is no matching execution consumer to process it.

## 3. Executor Path Truth & Possibilities
Depending on the Feasibility Verification, the true execution path will be established as:
- **If Feasibility is OK**: `Investigation -> backend-preview-executor -> local-duckdb-executor -> result`
- **If Feasibility is NOT OK**: `Investigation -> backend-preview-executor -> executor seam/unavailable state`

This phase targets laying down this path and finalizing the `executor seam` regardless of WASM readiness.

## 4. Reusability and Sandbox Role
- **`duckdb-preview-runtime.ts`**: Will **NOT** be reused. It remains an isolated/deprecated mock. It will only be touched if absolutely necessary.
- **Sandbox Role**: `duckdb-preview-sandbox.ts` remains strictly as a narrow, lightweight fallback for allowed simple intents only. It will not be overclaimed as a local DB path.

## 5. Files Expected to Change
1. `apps/desktop/src/lib/backend-preview-executor.ts` (Keep/Update routing logic)
2. `apps/desktop/src/pages/Investigation.tsx` (Keep/Update orchestration)
3. *Conditional*: `apps/desktop/src/lib/local-duckdb-executor.ts` (New file if Feasibility is OK)
4. Relevant test files for the execution layer.

## 6. Acceptance Criteria
1. The Feasibility Verification result is explicitly documented and reported.
2. Complex intents no longer drop into a "wasted SQL" void; they route correctly to the new executor seam.
3. The local executor path (or the designated executor seam) is clearly tested to handle the generated SQL.
4. No regression on existing execution truth guardrails (sandbox restrictions remain intact).
