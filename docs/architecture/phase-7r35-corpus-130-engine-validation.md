# Phase 7R3.5 - Corpus 1.3.0 Governed Engine Validation

## Scope and evidence boundary

This phase evaluated corpus 1.3.0 as `repository_fixture_anchored_semi_synthetic_evidence`. It did not change production semantics, grain, readiness, metrics, questions, actions, runtime, UI, corpus truth, generator, scenario metadata, or oracle outputs. Corpus 1.2.0 remains the authority for mapping precision, held-out recall, domain activation, and ambiguity behavior.

The evaluator loaded only source files plus declared provenance/currency/UOM/as-of evidence before execution. It loaded the corpus manifest and independent oracle only after all governed DuckDB executions completed. No expected total, expected executable state, sample ID, or oracle SQL entered the engine path.

## Canonical-path result

Twelve sources traversed physical profiling, semantic and grain resolution, readiness, activation, metric preflight, question/action generation, runtime preflight, governed planning, and actual local DuckDB execution. Three relationship bundles also traversed canonical candidate and resolution stages.

| Family | May | June | Result |
| --- | ---: | ---: | --- |
| Revenue | 22,973,896,244 | 20,637,539,164 | Exact through `governed_sum` |
| Delivery | 1,500 | 1,500 | Exact through `governed_identity_count` on `ShipmentID` |
| Gross profit | Not executed | Not executed | M1 blocked currency compatibility; May also blocked repeated-measure readiness |
| Inventory on hand | Not executed | Not executed | M1 blocked missing snapshot quantity mapping and as-of basis |

Revenue product/time groupings preserved the complete scope total despite display limits. Delivery used governed identity counting with no row-count fallback. All eight advertised actions passed runtime preflight and executed; there were no false executable actions.

## Blocking evidence

The generated accounting sources expose `Revenue_Credit`, `COGS_Debit`, `OrderID`, `InvoiceDate`, and declared scenario currency `VND`, but the unchanged preflight does not accept the currency basis. May additionally retains repeated-measure blockers. Therefore neither required gross-profit value reached the governed executor.

The inventory snapshots contain `QuantityOnHand`, `ItemID`, `WarehouseID`, `UOM`, and `AsOfDate`, but the unchanged semantic path did not resolve the first three required identities/measures. The inventory metric was correctly blocked; global and per-item/warehouse correctness could not be established through the governed engine. The existing independent oracle contains per-item totals, not a separately persisted complete item/warehouse expected table, so the required item/warehouse comparison is also unavailable without changing the frozen corpus truth.

The independent oracle confirms exact source relationships, inventory equations, nonnegative balances, and May-to-June continuity. The canonical relationship resolver nevertheless leaves declared sales/accounting/shipment cardinalities ambiguous and inventory relationships unknown. It authorizes no undeclared or unsafe join, which preserves safety but does not satisfy relationship proof.

One of 112 explanation-only questions lacks remediation (`derived.accounting_june_vnd`, `commerce.gross_profit.over_time`), producing 111/112 structured explanation completeness.

## Verification

- Phase 7R3.5 targeted evaluator: 1 file, 1 test passed.
- Phase 7 and Phase 7R1-R3.2 plus Phase 5/6 regressions: 17 files, 63 tests passed.
- Complete understanding-core matrix: 71 files, 315 tests passed.
- Repository TypeScript: passed with zero diagnostics.
- Corpus 1.3.0 clean regeneration: byte-identical (`diff -qr` exit 0).
- Eight JSON audits parse successfully. Import/reachability governance remains canonical-only for production execution; compatibility type/presentation imports remain non-executing and governed by the Phase 6 gates.
- `git diff --check`: passed.
- Full desktop suite (run exactly once): 164 files, 160 passed and 4 failed; 1,129 tests, 1,120 passed and 9 failed. All nine failures matched their governed baseline identities and signatures (six deterministic and three timing-sensitive timeouts). Unexpected failures: 0. Phase 7R3.5-owned failures: 0. Process exit: 1. Complete log SHA-256: `7b21257ee19a91eb393ba26de5f0e630046e5aaa1ac06f2304d3a1eb401553fb`.

## Release impact

Scenario-evidence metric-family execution coverage remains 2/4, not 4/4. Revenue and delivery arithmetic are proven on this population. Gross-profit and inventory execution, complete inventory balance comparison, relationship validation, and 100% blocker explanation completeness remain release blockers. No runtime guard was weakened, no decision use was authorized, and no production wiring was executed.

not_ready_gross_profit_execution
