**Phase 7R3.1 Result**

Phase 7R3.1 audited 15 applicable family/source records and made two narrowly scoped corrections in governed M1/M3 contracts. It did not change semantic resolution, grain policy, revenue behavior, question policy, UI, packaging, corpus truth, or production consumer wiring.

Delivery is now covered. `ShipmentID` is accepted only when the canonical semantic is usable and the full-file profile proves exact cardinality, zero nulls, uniqueness 1, and retained grain identity evidence. May and June both executed through local DuckDB with `governed_identity_count`, returned 1,500, and matched frozen corpus 1.2.0 truth exactly. No row-count or COUNT fallback was introduced.

Gross-profit M1 no longer inherits a repeated-measure blocker from unrelated columns. On both accounting files, the bound `Revenue_Credit` and `COGS_Debit` measures are additive and non-repeated under one exact selected `OrderID` identity. M3 still blocks correctly because currency compatibility is not explicit, the broad revenue requirement has more than one eligible binding, and conditional gross profit is not runtime-permitted. No gross-profit execution is claimed.

Inventory remains a corpus evidence gap. The available files contain a product master, shipment-aging/backlog snapshots, and movement quantities. None contains the required combination of product identity, quantity on hand, explicit as-of basis, and independently frozen stock truth. Movement quantity was not relabeled as inventory.

**Regression Evidence**

- Mapping precision: 100%.
- Held-out core signal recall: 90.91%.
- Domain activation precision: 100%.
- Advertised-action execution: 30/30, 100%.
- Verified comparisons: 20/20 exact, including revenue 12/12.
- False executable actions: 0.
- False decision-support cases: 0.
- Blocked explanation completeness: 100%.

The required family gate remains failed at 2/4 covered families. Corpus 1.2.0 and the Phase 5B6B allowlist were not modified.

**Implementation Scope**

- Updated governed M1/M3 eligibility only in `governed-metric-preflight.ts` and `governed-runtime-preflight.ts`.
- Added `phase-7r31-family-eligibility.test.ts` for canonical evidence, blockers, and actual local DuckDB proof.
- Created the seven machine-readable Phase 7R3.1 audits accompanying this report.
- Did not modify revenue behavior, semantic or grain policy, aliases, corpus truth, action advertisement, UI, packaging, or production consumer wiring.

**Final Verification**

- Phase 7R3.1 targeted: 1 file, 2 tests passed.
- Unchanged Phase 7 evaluator plus R1/R2/R3.1: 4 files, 22 tests passed.
- Phase 5/6 regressions: 12 files, 39 tests passed.
- Complete `understanding-core`: 69 files, 312 tests passed.
- Repository TypeScript: zero diagnostics.
- Audit JSON parsing, canonical import/reachability scans, and `git diff --check`: passed.
- Full desktop suite was run exactly once: 158/162 files and 1,117/1,126 tests passed. All nine failures match the governed allowlist exactly: six deterministic signatures and three permitted 5-second timeouts. Unexpected failures: 0; Phase 7R3.1-owned failures: 0.
- Complete full-suite log: `/tmp/phase7r31-full-desktop-suite.log`.
- Complete-log SHA-256: `e67ebc8825a356805f0fae07fc98a71291a5fce89eac7c5d6f56b2371d0f50eb`.

**Remaining Debt**

- Inventory on hand cannot be claimed without an authentic item-level stock snapshot, explicit as-of basis, and independently frozen truth.
- Conditional gross profit cannot be executed until currency compatibility and one unambiguous revenue binding are governed and proved.
- These are evidence/runtime-eligibility gaps, not reasons to weaken identity, repeated-total, as-of, relationship, or currency guards.

metric_family_coverage_improved_with_documented_debt
