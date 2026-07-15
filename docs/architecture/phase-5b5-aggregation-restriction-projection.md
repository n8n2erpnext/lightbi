# Phase 5B5 Aggregation Restriction Projection

## Scope

Phase 5B5 adds an import-isolated, test/development-only model proving that aggregation origin, structured restrictions, governed source identity, metric-reference absence, evidence requirements, lineage, integrity, and use eligibility can remain attached across future plan, SQL-preview, result, chart, and BA contracts. It does not wire or change production behavior.

The projection policy is `lightbi.aggregation-restriction-projection-policy.v1`. It is separate from canonical readiness. Projection failure is explicit and fail-closed; it never becomes ordinary readiness `unknown`.

## Production Contract Loss

The actual production path remains unchanged:

1. `evaluateNumericHealth` reports physical parse support.
2. `enhancePlanWithGuardedSum` may insert `SUM`, or `COUNT` as fallback, without a semantic aggregation-origin contract.
3. `createSafeSqlPreview` encodes the operator in SQL but carries no metric, grain, measure-role, restriction, acknowledgement, or result-use metadata.
4. `Investigation.handleRunPreview` submits SQL created from the enhanced plan while separately passing the unenhanced `runtimePlanPreview`.
5. Backend/local DuckDB result contracts return rows and execution metadata without aggregation authority lineage.
6. Chart, BA, narrative/recommendation, and persistence consumers receive no structured aggregation restriction set.

The machine-readable loss audit classifies provenance, origin, metric identity, grain, measure role, restriction, acknowledgement, decision-use and authority-escalation risks at each transition. No production contract was modified.

## Projection Contracts

The contract suite defines lineage, origin trace, restriction set, metric reference, use eligibility, limitations, debt, integrity, and stage-specific plan, SQL-preview, result, chart, and BA envelopes. Every stage is fixed to `shadowOnly: true`, `approvalGranted: false`, `executionAuthorized: false`, and `productionWiring.executed: false`.

Restriction sets are deterministic and deduplicated by governed identity. Downstream consumers may add stricter restrictions, but removal fails integrity validation. SQL or query success, non-empty rows, chart rendering, sorting, formatting, acknowledgement, and trust ratios cannot remove restrictions or grant metric authority.

Lineage identity includes source hash, physical column, operator, COUNT semantics, origin, grouping, filters, time basis, metric-reference state, restriction-set identity, and upstream policy identities. It excludes raw values, timestamps, paths, locale, environment values, UI IDs, corpus IDs, and expected answers. Identical SQL with different origin or restrictions therefore cannot share lineage identity.

## Replay

All 145 governed Phase 5B4 source-column artifacts are projected:

- 145 valid plan and SQL-preview projections.
- 136 automatic legacy defaults remain prohibited.
- 9 informational non-SUM records remain represented.
- 145 exploratory restricted-display candidates, but 145 decision-chart-ineligible records.
- BA, narrative, automatic alert, and persisted-metric eligibility remain zero.
- 133 records require measure-role evidence.
- 145 records require grain evidence.
- 136 records require metric definitions.
- 12 records require non-additive formulas.
- Projection loss from the Phase 5B4 boundary through all simulated stages is zero.

The replay is policy simulation, not accuracy or production-impact measurement. `summaryPercentage` remains null.

## Requirement Intersections

Requirements are represented per record and are not treated as exclusive. Measure role, grain, formula, repeated-total, snapshot, metric-definition, and acknowledgement requirements can overlap or be conditional. Pair intersections and one/multiple/no-requirement counts are recorded in `phase-5b5-requirement-intersection-audit.json`.

## Compatibility And Debt

The consumer matrix covers plan preview, SQL preview, backend request, result, chart, KPI card, BA brief, narrative, recommendation, alert, and persisted metric. The shadow contracts can express the required restrictions for every surface, but none of the current production consumer contracts supports this projection. Production migration therefore remains ineligible.

The authentic Phase 5B4 replay artifact also does not retain the original canonical capability-state map or real runtime plan/SQL. Phase 5B5 marks that absence explicitly and does not reconstruct it from outcomes. This is upstream contract debt, while propagation from the retained aggregation boundary is lossless.

No approved metric exists in the replay. Synthetic approved-metric behavior is contract-test-only, marked synthetic, rejected as repository support, and excluded from diagnostics and gates.

## Files

- Three isolated projection contract/policy/engine modules.
- Two targeted verification files covering 42 mandatory probes and all 145 records.
- Seven machine-readable Phase 5B5 audits.
- This report and the ownership addition.

## Verification

- Phase 5B5 targeted tests: 2 files, 14 tests passed.
- All 42 mandatory probes are enumerated and exercised.
- Canonical/upstream/legacy `understanding-core` matrix: 44 files, 214 tests passed, including Phase 4C, 5A, 5B, 5B1, 5B2, 5B3, 5B4, controlled-clock, and Phase 5B5 checks.
- All seven audit JSON files parse successfully.
- Import isolation reports zero production importers and no barrel export.
- Projection source has no TypeScript diagnostics; repository-wide `tsc --noEmit` remains blocked by pre-existing diagnostics outside Phase 5B5, recorded in `/tmp/lightbi-phase5b5-tsc.log`.
- `git diff --check` and Phase 5B5 trailing-whitespace checks passed.
- Full desktop suite ran exactly once on final source/test state: 137 files and 1,022 tests; 133 files/1,013 tests passed. Four files/nine tests failed with the exact documented baseline set, and Phase 5B5 had zero failures. Exit status is `1`; complete output is `/tmp/lightbi-phase5b5-full-suite.log` and `/tmp/lightbi-phase5b5-full-suite.exit`.

## Preservation

Phase 4C readiness policy v2, Phase 5A adapter policy, Phase 5B comparison policy v2, Phase 5B3 guard policy, and Phase 5B4 intent policy were not edited. All 145 source identities remain present and raw observations are unchanged. No plan or SQL was changed, no query was executed by the projection, no operation or metric was approved, no measure became `safeToAggregate`, no production importer was added, and no UI, AI, DuckDB, persistence, telemetry, feature flag, or domain support behavior changed. `DOMAIN_SUPPORT_MANIFEST` remains empty, `criticalAggregationDivergencesResolved` remains false, and canonical authority migration remains false.

Rollback removes the three Phase 5B5 implementation modules, two tests, seven audits, this report, and the Phase 5B5 ownership paragraph. No runtime rollback or data migration is required.

restriction_projection_ready_with_documented_debt
