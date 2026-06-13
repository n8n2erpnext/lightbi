# Backend Runtime Hardening — Verification Report

## Scope Verified

This report covers **only** the backend/runtime execution path hardening.  
Taxonomy, alias expansion, and trust mapping work belong to separate phases and are not claimed here.

---

## Files In Scope

| File | Role |
|------|------|
| pps/desktop/src/lib/backend-preview-executor.ts | Primary executor — backend vs. sandbox routing |
| pps/desktop/src/lib/safe-sql-preview.ts | SQL compilation — DuckDB dialect hardening |
| pps/desktop/src/pages/Investigation.tsx | UI orchestration — fallback guard |

Test files exercising this scope:
- src/lib/safe-sql-preview.test.ts
- src/lib/result-validator-contract.test.ts
- src/pages/Investigation.test.tsx

---

## Tests Run

| Suite | Tests | Result |
|-------|-------|--------|
| safe-sql-preview.test.ts | 7 | ✅ PASS |
| esult-validator-contract.test.ts | 7 | ✅ PASS |
| Investigation.test.tsx | 4 | ✅ PASS |

Business-signal-detector tests (24) also pass but belong to a different phase scope.

---

## What Backend Runtime Hardening Actually Improved

### 1. Explicit error surfacing for complex intents
Investigation.tsx now checks isSimpleIntent before allowing fallback to the JS sandbox.
Complex intents (group_by, 	rend, elationship) that fail the backend path now surface
NETWORK_UNAVAILABLE to the user instead of silently running through an incapable sandbox.

### 2. Restricted sandbox fallback scope
ackend-preview-executor.ts fallback to executeDuckDBPreviewSandbox is now gated:
only distribution (simple) intents are allowed to fall back.
Previously any intent could silently fall back, overclaiming sandbox as backend execution.

### 3. SQL dialect hardening
safe-sql-preview.ts adds IS NOT NULL clauses for GROUP BY columns and time dimensions,
preventing DuckDB dialect errors on nullable fields that previously caused silent query failures.

---

## What It Did Not Improve

- Backend server availability — if the backend is truly down, the user sees an explicit error, but
  there is no retry or queue mechanism.
- DuckDB WASM integration — not touched; sandbox remains limited to simple distributions.
- SQL dialect completeness — only IS NOT NULL added; complex dialect differences (window functions,
  LATERAL joins) are not addressed.
- Connector or import path — unchanged.

---

## Compile Truth

Full 	sc -p tsconfig.app.json --noEmit **fails** due to pre-existing repo issues outside scope:
udit-runner.ts (missing @types/node), DatasetUnderstandingCard.tsx, legacy test files with
stale contracts. These errors were present before this phase and were not introduced by it.

Targeted check on scope files confirms no new errors in:
- ackend-preview-executor.ts
- safe-sql-preview.ts
- Investigation.tsx

This is a targeted conclusion only — full compile is not clean.

---

## Scope Drift Corrected

The previous version of this file incorrectly listed alias expansion work (Phase 1 taxonomy,
Phase 2 time_period signal, MappingReview contract alignment) as work completed under this phase.

That work belongs to:
- AGENT_HANDOFF_TAXONOMY_EXPANSION_PHASE1.md
- AGENT_HANDOFF_TAXONOMY_EXPANSION_PHASE2.md
- TRUST_MAPPING_CHECKPOINT.md

This file has been corrected to claim only backend/runtime execution path changes.
usiness-signal-detector.ts alias and mapping work is not claimed here.

---

## Out-of-Scope Dependencies

usiness-signal-detector.ts was restored in the same session due to context loss between
checkpoint and execution — but that restoration belongs to the taxonomy expansion scope, not here.
