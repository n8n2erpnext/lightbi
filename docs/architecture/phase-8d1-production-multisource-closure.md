# Phase 8D.1 Production Multi-Source Canonical Dataset And Relationship Closure

## Scope

Phase 8D.1 closes only the missing production boundary for the existing commerce/distribution MVP. It adds a versioned logical multi-source dataset, source-bound role/evidence membership, a governed relationship artifact, unchanged M1/M2/M3 integration, full-source multi-source execution, and a minimal Home/Investigation interaction. It does not add domains, metrics, aliases, formulas, confidence rules, relationship types, runtime operators, or generic multi-source BI support.

## Production Flow

Home now profiles every selected source independently and requires explicit source role, document identity, period, currency, and monetary-column evidence. The canonical multi-source boundary builds an order-invariant composite identity from immutable source-local artifacts and overlays. It invokes the existing relationship candidate and resolution engines, then permits the Sales + Accounting gross-profit action only when the source identities, full-file relationship, period, currency, M1, M2, and M3 gates are current.

The positive governed relationship is exact document-identity reconciliation across two 1,500-row May 2026 sources. It is confirmed one-to-one with 1,500 matched identities. Because the source structural grains differ, the artifact explicitly limits use to identity reconciliation and prohibits cross-source measure joins. Gross profit continues to execute with the frozen Accounting formula; Sales is independently materialized and verifies the declared relationship and scope.

Investigation validates the multi-source artifact, relationship, fingerprints, generations, overlays, handoff, query-plan source membership, and actual row counts. It registers both complete sources independently in DuckDB and returns evidence for every participating source. There is no sample, preview, one-source, row-position, filename-role, or legacy-fusion fallback.

## Persistence And Legacy Closure

Session persistence records only logical membership and source-bound declarations. Raw local-file bytes and executable handoffs are not serialized. Reloading files restores the review draft but requires an explicit relationship rebuild. Stale or legacy fusion sessions are rejected. The old Home branch that built or restored `business_fusion_view` physical datasets has been removed; the remaining fusion overview is informational only.

Inventory snapshot remains an exact source-local metric. Unrelated Sales or Logistics sources do not turn movement data into a snapshot relationship or alter the governed inventory result.

## Verification

- Phase 8A-8D.1 targeted: 8 files, 29 tests passed.
- Phase 7 and corpus family regressions: 9 files, 35 tests passed.
- M1/M2/M3 and relationship governance: 13 files, 49 tests passed.
- Complete `understanding-core`: 78 files, 340 tests passed.
- Investigation, Advanced, and persistence/session: 5 files, 41 tests passed.
- Required negative probes: 30 of 30 fail closed.
- Full-source gross profit: expected and actual `3,075,721,244 VND`, exact match.
- TypeScript, JSON parsing, reachability/import scans, `git diff --check`, and the one final desktop suite are recorded in the regression audit.

The final desktop suite ran exactly once: 175 files and 1,170 tests. It retained 1,161 passing tests. All nine failures matched the frozen Phase 5B6B allowlist by governed test identity and signature: six deterministic baseline failures and three permitted BA timeouts. Unexpected failures and Phase 8D.1-owned failures were zero. The complete log is `/tmp/phase8d1-final-full-desktop.log`, SHA-256 `bd85dcd9b9727fc16fb7f7e0e701d612e9b4839750a8b040c30dab729b2aeaa3`.

## Restrictions

This is not a claim of generic source joining or generic multi-source BI. Production support is limited to relationships and analyses already governed by the commerce/distribution MVP. Decision-use authorization remains false, unsupported source combinations remain non-resolvable, and cross-source measure joins remain prohibited for the verified Sales + Accounting case.

phase8d1_multisource_journey_ready
