# Implementation Plan: Execution Path Unification Phase 1

## Goal
Unify the chaotic execution layers by explicitly resolving the Investigation.tsx reliance on a non-existent backend path. This phase stops blind phantom HTTP calls in local mode, clarifies the strict boundary between unavailable backend and Javascript sandbox fallback, and isolates dead mock paths.

## 1. Top 2 Execution-Path Failures to Address
1. **Phantom HTTP Execution**: ackend-preview-executor.ts blindly sends a etch POST to /api/preview/execute without verifying if a backend is configured, causing a guaranteed network failure and unnecessary timeout on every complex query before fallback.
2. **Disconnected Mock Runtime**: duckdb-preview-runtime.ts exists as a disconnected mock that generates random data (Math.random(), Mock label 1) but is not seemingly used by the orchestration layer, creating massive confusion about whether DuckDB WASM is actually running.

## 2. Usage Verification Step (Pre-Execution)
Before modifying code, a strict usage search will be performed across the repo for:
- duckdb-preview-runtime
- executeBackendPreview
- /api/preview/execute

Decisions on whether to safely remove or just deprecate/isolate duckdb-preview-runtime.ts will strictly depend on whether lingering imports or runtime dependencies are found in this search.

## 3. Path Decisions
- **Path Truth**: The local current truth path = **explicit fail-fast for unavailable backend + restricted JS sandbox for allowed simple intents**.
  - We are not claiming a " true backend executor\ exists locally.
- **Handling /api/preview/execute**: We will not permanently close the door to a real backend. The local flow will stop calling this phantom path blindly, but the backend path capability will remain as an optional future integration point if configured.
- **Handling Mock Runtime**: duckdb-preview-runtime.ts is treated as an unused/dead-path candidate. If verification proves zero dependencies, it will be safely removed. Otherwise, it will be marked deprecated and fully isolated.

## 4. Scope Boundaries
- **In Scope**: Halting blind local fetches in ackend-preview-executor.ts, cleaning up Investigation.tsx orchestration, isolating/deprecating duckdb-preview-runtime.ts.
- **Out of Scope**: Home understanding layer, Taxonomy/Alias/Trust Mapping, UI redesigns, connector work, DU-8.

## 5. Files Expected to Change
1. pps/desktop/src/lib/backend-preview-executor.ts
2. pps/desktop/src/pages/Investigation.tsx
3. pps/desktop/src/pages/Investigation.test.tsx
4. *Conditional*: pps/desktop/src/lib/duckdb-preview-runtime.ts (Maybe touched or deleted after usage verification).

## 6. Acceptance Criteria
1. Local Investigation.tsx flow no longer creates fake network calls when a backend is not configured.
2. Complex intents fail-fast clearly and explicitly.
3. Simple intents only fallback according to the locked fallback rules.
4. Dead/mock runtime path is either safely removed (if unused) or marked deprecated + isolated (if tied).
5. Test coverage proves the new fail-fast behaviors and fallback boundaries.

## 7. Why This Phase Follows Backend Runtime Hardening Verification
The verification phase successfully restricted sandbox fallbacks and surfaced backend errors. However, the backend error surfaced was a fake network timeout (NETWORK_UNAVAILABLE) from a phantom API. To achieve true runtime truth, we must unify the path so that the app explicitly acknowledges the absence of a configured backend (fail-fast), rather than failing a blind HTTP call.
