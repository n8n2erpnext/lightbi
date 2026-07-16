# Phase 7R3.4 - Authentic-Anchored Semi-Synthetic ERP Corpus Construction

## Scope

Phase 7R3.4 is a data-construction phase only. It creates corpus `1.3.0` from the six immutable May/June Sales, Logistics, and Accounting repository anchors. It does not run the new corpus through LightBI and does not modify semantic resolution, grain inference, metrics, questions, runtime, UI, consumers, or corpus `1.2.0`.

## Evidence Boundary

The phase distinguishes four evidence classes in `phase-7r34-evidence-policy.json`. The generated files are `authentic_anchored_semi_synthetic_evidence`: their source rows and join keys are anchored to the six required repository files, while currency declarations, inventory events, balances, and snapshots are deterministic scenario constructions.

There is a material provenance limitation. Corpus `1.2.0` labels the six required anchors as `synthetic_erp_export`, `synthetic_logistics_export`, and `synthetic_accounting_export`. Phase 7R3.4 preserves those labels and hashes. It does not relabel the files as externally observed operational truth. Consequently, corpus `1.3.0` is suitable for deterministic arithmetic, relationship, runtime-guard, consistency, and family-coverage checks, but not for mapping-precision or signal-recall release claims.

## Scenario Contract

- Scenario: `commerce_distribution_erp_scenario_v1`
- Legal entity: `LIGHTBI_SCENARIO_ENTITY_001`
- Currency: `VND`; declared explicitly, with no conversion
- Unit of measure: `EA`
- Time zone: `Asia/Ho_Chi_Minh`
- Periods: May and June 2026
- Inventory snapshots: `2026-05-31` and `2026-06-30`
- Deterministic seed: `lightbi-commerce-distribution-erp-v1-seed-20260716`

## Constructed Sources

| Source | Rows | Purpose |
| --- | ---: | --- |
| Derived accounting May | 1,500 | Preserved accounting facts plus explicit scenario metadata |
| Derived accounting June | 1,500 | Preserved accounting facts plus explicit scenario metadata |
| Inventory movements May | 4,032 | Opening, deterministic receipts, and one sales issue per authentic order |
| Inventory movements June | 4,984 | Carried/generated opening, deterministic receipts, and one sales issue per authentic order |
| Inventory snapshot May | 1,266 | Item/warehouse closing balances at 2026-05-31 |
| Inventory snapshot June | 2,198 | Item/warehouse closing balances at 2026-06-30 |

All 3,000 sales orders have exact one-to-one shipment, derived accounting, and inventory-issue relationships by `OrderID`. All 1,266 May snapshot item/warehouse pairs are carried into June opening balances. The relationship manifest contains ten explicit relationship contracts.

## Independent Oracle

The standalone oracle imports no LightBI code and does not read expected metric values from the corpus manifest. It independently recalculates:

| Period | Revenue | Gross profit | Deliveries | Inventory on hand | Per-item balances |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2026-05 | 22,973,896,244 | 3,075,721,244 | 1,500 | 211,067 | 545 |
| 2026-06 | 20,637,539,164 | 2,934,640,164 | 1,500 | 378,041 | 591 |

The oracle confirms exact order sets, no duplicate governed identities, complete sales-issue reconciliation, exact snapshot ledger equations, exact movement balances, nonnegative stock, `VND` consistency, `EA` consistency, and full May-to-June carry-forward continuity.

## Deterministic Reproduction

Two clean temporary output directories were generated independently from the same frozen anchors and scenario contract. Their complete corpus directories were byte-identical. Their independent oracle outputs were also byte-identical. The frozen `sample-corpus/versions/1.3.0` directory is byte-identical to clean reproduction A.

The final corpus manifest SHA-256 is `1dca495e0903a7d9e025d24e103bd6b64de20d13425e2284b6d73901ad6a7cec`. The final corpus directory hash calculated by the oracle is `c71a4ae1c2d06a6814b3e3146b38a3174712fcc561f900c7987e067ff35fb205`.

## Deliverables

- `phase-7r34-evidence-policy.json`
- `phase-7r34-authentic-anchor-inventory.json`
- `phase-7r34-scenario-contract.json`
- `phase-7r34-generation-provenance.json`
- `phase-7r34-cross-file-relationship-manifest.json`
- `phase-7r34-independent-oracle-results.json`
- `phase-7r34-corpus-1.3.0-manifest.json`
- `sample-corpus/tooling/phase-7r34/`
- `sample-corpus/versions/1.3.0/`

## Verification Results

- All six anchor SHA-256 values matched the frozen anchor inventory before and after construction.
- Corpus `1.2.0` manifest SHA-256 remained `a36284c1f4655289ff832bb4102f9e153fdad329020df6972802802368d0adaa`; all six inherited ground-truth file hashes matched the frozen `1.3.0` inheritance record.
- Every generated JSON contract and audit parsed successfully.
- Every derived output hash matched generation provenance.
- All 12 corpus source entries have stable IDs and explicit evidence types; all 30 inherited cases retain source-level provenance and evidence types.
- All relationship, identity, reconciliation, inventory-equation, nonnegative-stock, currency, UOM, and continuity assertions passed.
- Generator and oracle syntax checks passed.
- `git diff --check` passed.
- Phase 7R3.4 changed no production source, policy, test, runtime, UI, or consumer file. Existing unrelated working-tree changes were preserved.
- LightBI was not executed against corpus `1.3.0`, as required by the phase boundary.

## Limitations And Debt

- The required anchors are immutable repository fixtures, not proven externally observed operational exports.
- Inventory opening quantities and receipts are deterministic scenario facts, not authentic source observations.
- Scenario currency is declared rather than inferred from the six anchors.
- Corpus `1.3.0` was intentionally not evaluated through LightBI in this phase.
- No claim is made that any semantic signal or domain is production-proven by these constructed cases.

authentic_anchored_corpus_ready_with_documented_debt
