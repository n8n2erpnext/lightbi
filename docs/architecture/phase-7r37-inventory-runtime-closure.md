# Phase 7R3.7 - Governed Inventory Snapshot Eligibility And Execution Closure

## Outcome

Both corpus 1.3.0 inventory snapshots now travel through the canonical semantic, grain, M1, M2, M3, governed planner and actual local DuckDB path. May returns exactly `211,067 EA` at `2026-05-31`; June returns exactly `378,041 EA` at `2026-06-30`.

The independent oracle was loaded only after governed execution. Complete item/warehouse comparisons covered 1,266 May keys and 2,198 June keys with zero missing keys, unexpected keys, quantity mismatches or duplicate identities. May and June were never combined.

## Correction Boundary

The semantic correction is schema-qualified and generic. Item, warehouse and on-hand compositions require independent presence of item identity, warehouse identity, on-hand quantity, as-of and UOM headers. Generic quantity, shipment, movement, threshold, backlog and money columns remain unpromoted. Source-level `safeToAggregate` remains false; eligibility is metric-specific.

The governed question policy adds inventory-by-warehouse and exact item/warehouse verification lenses without changing existing priorities or the five-question default cap. All actions retain evidence, restrictions, `decisionUseAuthorized:false` and `productionWiring.executed:false`.

## Verification

- Phase 7R3.7 targeted tests: pass.
- Corpus 1.3.0 governed execution: revenue, delivery, gross profit and inventory exact; family coverage 4/4.
- Corpus 1.2.0: mapping precision 100%, held-out core recall 90.91%, domain activation precision 100%, candidate trace baseline 1,225.
- Required negative probes: 15/15 fail closed or explanation-only.
- Repository TypeScript: zero diagnostics.
- Complete understanding-core pre-audit run: 320/321; the sole historical Phase 3A hash assertion was superseded by the Phase 7R3.7 semantic audit, then its governance test and related Phase 5/6 governance regressions passed.
- Import and production-reachability checks: canonical-only, with the previously governed compatibility type adapters retained and no new legacy execution path.
- `git diff --check`: pass.

The full desktop suite was run exactly once on the final source and test state. It completed with 166 test files (162 passed, 4 failed) and 1,135 tests (1,127 passed, 8 failed). All failures conform to the Phase 5B6B governed allowlist by test identity and signature: six deterministic baseline failures and two permitted BA timeouts; the third timing-sensitive BA case passed. Unexpected failures and Phase 7R3.7-owned failures are both zero. The process exit status is `1`, as expected for the governed baseline failures. The complete log is `/tmp/phase7r37-full-desktop-suite.log` with SHA-256 `0e182378c5312e634e7fd7b1ea78a5cabcf2fb46d8489b284972a5e98c4bf641`.

## Rollback

Revert the Phase 7R3.7 semantic composition, inventory source-evidence contract, metric-specific readiness, inventory question lenses, M3 evidence validation and snapshot planner changes together. Revert the isolated oracle table extension and all Phase 7R3.7 audits. Do not retain executable inventory actions without the source-bound contract.

inventory_execution_ready_for_release_gate_retest
