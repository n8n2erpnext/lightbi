# Phase 7R3.6 Gross-Profit Runtime Closure

## Scope

Phase 7R3.6 closes explicit-currency gross-profit execution only. It does not change inventory, relationship inference, corpus truth, semantic aliases, domains, UI, packaging, or decision-use authority.

## Result

Canonical source evidence now carries source/hash-bound currency, reporting period, provenance, and monetary-column scope through M1, M3, query planning, and the execution result. Gross profit uses only `Revenue_Credit - COGS_Debit`, bound to `OrderID` and grouped by `InvoiceDate`.

The corpus 1.3 generated accounting cases execute exactly:

- May 2026: `3,075,721,244` VND.
- June 2026: `2,934,640,164` VND.

All 15 required negative probes fail closed or remain explanation-only. Missing, inferred, stale, conflicting, wrong-source, wrong-scope, repeated, ambiguous, identity-less, incompatible-period, and tampered-plan cases cannot execute.

## Guardrails

- Global `safeToAggregate` behavior was not weakened.
- Authentic accounting sources without explicit currency remain conditional and non-runnable.
- Inventory remains blocked exactly as before this phase.
- Runtime results remain evidence-only; `decisionUseAuthorized` is false.
- Corpus 1.3 regeneration is byte-identical to the committed corpus.

## Verification

Targeted Phase 7R1-R3.6 tests pass (6 files, 27 tests). The complete understanding-core suite passes (72 files, 318 tests). Phase 5/6 regressions and the unchanged Phase 7 evaluator pass. Repository TypeScript has zero diagnostics; all seven audits parse; corpus 1.3 regeneration is byte-identical; import/reachability governance and `git diff --check` pass.

The full desktop suite was run exactly once on the final implementation state: 165 test files, 161 passed and 4 failed; 1,132 tests, 1,123 passed and 9 failed. All nine failures match the governed Phase 5B6B allowlist by test identity and signature: six deterministic baseline failures and three permitted BA timeouts. Unexpected failures and Phase 7R3.6-owned failures are both zero. The complete log SHA-256 is `ed341bae7bde7f4d53fd6b1d0c3e40be009d8807b60ee21bddde9fa383ce080b`.

## Rollback

Revert the Phase 7R3.6 canonical source-evidence contract, its M1/M3 propagation, and the Phase 7R3.6 tests together. Do not independently weaken currency or repeated-measure blockers.

conditional_finance_execution_ready_for_inventory_remediation
