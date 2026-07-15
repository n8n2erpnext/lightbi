# Phase 5B4 Aggregation Intent And Decision-Use Policy

## Scope

Phase 5B4 freezes a deterministic future migration policy that separates physical operator support, operation origin, exploratory consent, business correctness, display, BA/narrative use, and execution authority. It is test/development-only and changes no legacy or canonical runtime behavior.

The Phase 5B comparison policy remains `lightbi.legacy-canonical-comparison-policy.v2` with SHA-256 `deb9a908b698792388b2d7b1fab853978a03087bcda37dc64682ab4d3e60f2c8`. Phase 5B3 remains shadow-only. Frozen semantic, grain, relationship, readiness, and adapter policies were not edited.

## Authority taxonomy

The versioned taxonomy defines eleven independent use classes. An operator never establishes authority by itself. Physical SUM support only states that values are mechanically computable. A planner recommendation is not a selection. An explicit choice is not proof of correctness. Imported configuration is not governed merely because it is explicit. Chart displayability is not decision safety, and execution does not establish metric correctness.

The complete taxonomy, chooser, evidence, allowed/prohibited use, confirmation, authority level, and residual risks are recorded in `phase-5b4-aggregation-authority-taxonomy.json`.

## Consent and correctness

The policy separates:

- `userIntentKnown`
- `exploratoryExecutionConsent`
- `businessCorrectnessEstablished`

An acknowledgement may make an explicit calculation a candidate for a later exploratory boundary. It cannot alter semantic or grain resolution, remove repeated-parent/snapshot/non-additive risks, establish correctness, or grant chart, BA, narrative, alert, persistence, metric execution, or operation authority. No acknowledgement is collected or persisted in this phase, and its contract forbids raw sensitive values.

## Future behavior

- Silent legacy aggregation defaults are prohibited whenever governed metric semantics and canonical aggregation readiness are absent. No automatic COUNT substitution is allowed.
- Explicit SUM, AVG, or COUNT remains exploratory and requires acknowledgement at a later boundary. It remains restricted and uncertified.
- Planner recommendations can expose unresolved evidence but cannot select or execute an operation.
- Imported aggregation configuration remains unverified.
- A governed metric requires the complete versioned evidence contract and canonical compatibility; no metric is created or simulated as approved here.
- Unknown origin and invalid canonical envelopes remain blocked.

## COUNT semantics

The contract distinguishes row count, non-null count, distinct count, entity count, event count, document count, line count, and unknown count semantics. `COUNT(*)` describes rows only. `COUNT(column)` excludes nulls. Distinct and entity counts require governed keys. Duplicate rows, repeated periods, and snapshots remain explicit risks. COUNT is never the automatic fallback for blocked SUM.

## Result-use boundary

All Phase 5B4 artifacts carry structured restrictions and all downstream eligibility flags remain false. Restriction absence is never permission. The present production path has a documented gap: executed preview rows enter `createChartPreviewModel` and `createBADecisionBrief` without a structured aggregation-restriction contract. This phase defines the future compatibility requirement but does not edit chart or BA code.

Future BA and narrative use requires an actual approved metric definition, compatible measure role and grain, governed aggregation rule, repeated-total/snapshot/non-additive handling, and canonical readiness. User acknowledgement never grants BA authority.

## Governed metric evidence

`RequiredMetricEvidenceV1` requires stable ID/version, semantic measure role, operator, source grain, grouping dimensions, numerator/denominator, time behavior, additivity class, repeated-parent handling, snapshot handling, null and duplicate handling, unit/currency behavior, applicable scope, provenance, and approval status. It is a compatibility contract only; no evaluation or domain metric is implemented.

## Authentic replay

The Phase 5B2 governed identity remains the deduplication basis. Phase 5B4 replays all 145 Phase 5B3 source-column artifacts representing 291 raw observations:

- 136 automatic defaults are prohibited by future policy.
- 136 remain physically executable but business-unverified.
- 145 require grain confirmation.
- 133 require measure-role confirmation.
- 12 require non-additive formula evidence.
- repeated-parent and snapshot risk counts remain zero because the retained authentic records do not contain granular evidence establishing those risks.
- BA eligible: zero.
- narrative eligible: zero.

This is policy simulation evidence, not a production-impact or accuracy claim. Source replay artifacts and raw observations are not modified.

## Strategy disposition

No single Phase 5B3 strategy is globally selected. The future policy is compositional: prohibit silent defaults, require acknowledgement for explicit exploratory calculations, require governed metric semantics for decision use, and project canonical restrictions losslessly. Warning-only and retained-legacy behavior are insufficient for silent automatic aggregation. No strategy is implemented.

## Files changed

- `aggregation-intent-contracts.ts`
- `aggregation-intent-policy.ts`
- `aggregation-intent-boundary.ts`
- `aggregation-intent-boundary.test.ts`
- `aggregation-intent-boundary.corpus.test.ts`
- `understanding-core/OWNERSHIP.md`
- seven Phase 5B4 machine-readable audits
- this report

## Verification

- Phase 5B4 targeted plus Phase 5B3/5B2: 5 files, 20 tests passed.
- Forty mandatory probes are enumerated and covered by taxonomy, boundary, replay, strategy, and isolation assertions.
- Focused Phase 4C/5A/5B/5B1-5B4 regression: 9 files, 40 tests passed.
- Long canonical adapter/comparison/readiness corpus regression: 4 files, 4 tests passed.
- Complete `understanding-core` matrix: 42 files, 200 tests passed.
- `npx tsc --noEmit`: passed on final source state.
- Seven Phase 5B4 JSON outputs parse successfully.
- Policy SHA-256: `7b67a5e53d821905e8341b10967e3b13b6d82b605b39d5a37905e49f3b6fc9f5`.
- Import isolation: no production importer and no barrel export; production-path diff is empty.
- `DOMAIN_SUPPORT_MANIFEST` remains empty and `git diff --check` passes.
- Full desktop suite: 135 files and 1,008 tests; 131 files/999 tests passed, while four files/nine tests failed with the exact documented baseline set. Exit status was `1`; Phase 5B4 introduced no suite failure. Complete output is preserved in `/tmp/lightbi-phase5b4-full-suite.log`, with status in `/tmp/lightbi-phase5b4-full-suite.exit`.

## Gates and debt

Automatic-default, exploratory, decision-use, COUNT, and metric-evidence policies are governed. A future non-authoritative, lossless restriction projection is design-eligible. Production migration is not eligible: all 136 critical automatic-SUM divergences remain unresolved, pair/bundle authority debt is not dispositioned, Phase 5C planning evidence is insufficient, and canonical authority migration remains false. `summaryPercentage` remains null, `DOMAIN_SUPPORT_MANIFEST` remains empty, and `productionWiring.executed` remains false.

Rollback consists only of removing the three Phase 5B4 implementation files, two tests, seven Phase 5B4 audits, this report, and the Phase 5B4 ownership paragraph. No runtime rollback or data migration is required.

aggregation_migration_policy_ready_with_documented_debt
