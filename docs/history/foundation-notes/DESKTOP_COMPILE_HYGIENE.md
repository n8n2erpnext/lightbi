# Desktop Compile Hygiene

This document tracks the remaining compilation blockers from `npx tsc -p tsconfig.app.json --noEmit` and categorizes them for a future safe cleanup pass.

## 1. Caused by Audit Tooling

These errors stem from the node-based audit scripts being compiled alongside the React app:
- `src/audit-runner.ts(1,21): error TS2591: Cannot find name 'fs'.`
- `src/audit-runner.ts(2,23): error TS2591: Cannot find name 'path'.`
- `src/audit-runner.ts(7,33): error TS2591: Cannot find name 'process'.`
- `src/audit-runner.ts(9,33): error TS2591: Cannot find name 'process'.`
- `src/audit-runner.ts(59,43): error TS7006: Parameter 'l' implicitly has an 'any' type.`
- `src/audit-runner.ts(59,65): error TS7006: Parameter 'l' implicitly has an 'any' type.`

## 2. Worth Fixing Before Phase 2

These are actual contract/type mismatches that could indicate broken test setups or dead code that creates noise during core development:
- `src/lib/runtime-boundary-contract.test.ts(19,5): error TS2353: Object literal may only specify known properties, and 'relationshipIds' does not exist in type 'BusinessViewCandidate'.`

## 3. Pre-existing Unrelated (Harmless Unused Variables)

These are trivial `TS6133` and `TS6196` (declared but never read) errors scattered across components and tests. They are completely harmless to runtime execution but block a strict compile pass:
- `src/components/analysis/BusinessViewSummaryCard.tsx(1,1): error TS6133: 'React' is declared but its value is never read.`
- `src/lib/audit-views.test.ts(6,17): error TS6133: 'key' is declared but its value is never read.`
- `src/lib/business-view-candidate-generator.test.ts(110,11): error TS6133: 'registry' is declared but its value is never read.`
- `src/lib/dataset-understanding-domain-coverage.test.ts(4,1): error TS6133: 'createRuntimeIntentFromAnalysisAction' is declared...`
- `src/lib/dataset-understanding-domain-coverage.test.ts(5,1): error TS6133: 'createRuntimePlanPreview' is declared...`
- `src/lib/decision-readiness-engine.test.ts(58,11): error TS6133: 'understanding' is declared...`
- `src/lib/decision-readiness-engine.test.ts(59,11): error TS6133: 'health' is declared...`
- `src/lib/domain-knowledge-catalog.test.ts(5,3): error TS6133: 'listDomainCatalogs' is declared...`
- `src/lib/domain-knowledge-catalog.test.ts(6,3): error TS6133: 'listBusinessViewsByDomain' is declared...`
- `src/lib/domain-knowledge-catalog.test.ts(9,3): error TS6133: 'listSignalsForDomain' is declared...`
- `src/lib/question-plan-generator.test.ts(4,39): error TS6196: 'BusinessSignal' is declared but never used.`
- `src/lib/question-plan-generator.test.ts(5,1): error TS6133: 'getDomainCatalog' is declared...`
- `src/lib/question-plan-generator.ts(44,3): error TS6133: 'registry' is declared...`
- `src/lib/regression.test.ts(1,24): error TS6133: 'expect' is declared...`
- `src/lib/safe-sql-preview.ts(1,35): error TS6196: 'LogicalRuntimeOperation' is declared but never used.`
- `src/lib/virtual-dataset-planner.ts(68,7): error TS6133: 'hasManyToMany' is declared...`

## Proposed Minimal Cleanup Order

1. **Exclude Audit Tooling from App Build**: Add `src/audit-runner.ts` to the `exclude` array in `tsconfig.app.json`. This correctly delegates it to `tsconfig.node.json` where `@types/node` is available, fixing all Group 1 errors instantly without code changes.
2. **Fix Invalid Type Mock**: Remove `relationshipIds` from the mock in `runtime-boundary-contract.test.ts` to satisfy the strict `BusinessViewCandidate` type.
3. **Sweep Unused Locals**: Perform a simple pass to remove the unused imports and variables listed in Group 3 to achieve a 100% clean `npx tsc -p tsconfig.app.json --noEmit` exit code.
