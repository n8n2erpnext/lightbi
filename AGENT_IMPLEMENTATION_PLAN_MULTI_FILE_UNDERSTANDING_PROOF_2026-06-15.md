# Multi-File Understanding Proof UX + Honest Runtime QA Implementation Plan

## Goal Description
1. Create a transparent, data-driven "Multi-file Understanding Proof" UI panel on the Home page (Business View area) to show exactly how LightBI interprets uploaded files together.
2. Fix the runtime path that allows generated actions like `stock_status` or `stock_age` to reach runtime when canonical fields cannot map to raw headers, preventing `CANONICAL_PROJECTION_MISSING` errors. 

*Note: The Investigation page bottom layout clipping has been successfully addressed in a prior execution. The evidence (DATA_XUAT_investigation_bottom_layout.png, Group_B_investigation_bottom_layout.png) and Playwright assertions checking `containerBox.bottom - detailsBox.bottom >= 32` have been captured and verified.*

## Proposed Changes

### 1. Multi-File Proof UI (Home Page)
The UI proof must sit directly on the `Home.tsx` multi-file intake / Business View area. It will use real parsed metadata, relationship graphs, and business view states.

#### [NEW] `apps/desktop/src/components/analysis/MultiFileUnderstandingProofPanel.tsx`
- **Files Detected**: Pulls from the `families` prop (from `pendingLocalBatch.families`). Will display actual uploaded file names, inferred roles, and row counts.
- **Relationship Signals**: Pulls from `workspaceState.relationshipState.graph`. Will display shared candidate join keys and their confidence/status (`matched`, `weak`, `missing`).
- **Business Interpretation**: Uses the selected `BusinessViewCandidate` from `workspaceState` to state what the combined files represent in logistics terms.
- **Honest Execution Status**: Will explicitly state if Group D (virtual preview) is `PARTIAL` and whether the current runtime executes a local table preview rather than a real cross-file join.

#### [MODIFY] `apps/desktop/src/pages/Home.tsx`
- Integrate `<MultiFileUnderstandingProofPanel>` right above the Business View Inspector / "What can I learn from this data?" section.
- Pass `workspaceState` and `pendingLocalBatch?.families` as real data props.

### 2. Runtime Action Gating & Canonical Mapping Fixes

#### [MODIFY] `apps/desktop/src/lib/canonical-row-projection.ts`
- **Alias Resolution Fix**: Fix the bug where `business-signal-detector` contextually promotes `status` to `stock_status` or `delivery_status`, but `projectToCanonicalRows` fails to look up the original `status` aliases (like "Trạng thái"). I will merge the `status` aliases when resolving promoted canonical fields so they map successfully.
- **Add Strict Gating Function**: Create a new exported function:
  ```typescript
  export function getUnprojectableCanonicalFields(
    rawHeaders: string[],
    requiredCanonicalFields: string[]
  ): string[]
  ```
  This function will dry-run the alias resolution to identify exactly which requested fields cannot map to the raw dataset headers.

#### [MODIFY] `apps/desktop/src/lib/guided-investigation-pipeline.ts`
- **Action Downgrade/Hide**: Update the pipeline to use the `rawHeaders` (provided via `DetectorInput.columns`) and the new `getUnprojectableCanonicalFields` function. If a generated `QuestionPlan` requires dimensions or measures (like `stock_status` or `stock_age`) that return as unprojectable, the plan's status will be explicitly downgraded to `rejected` (or marked unavailable) so it is hidden from the user before runtime execution.

#### [MODIFY] `apps/desktop/src/lib/dataset-understanding-domain-coverage.test.ts` (and canonical tests)
- **Focused Gating Tests**: Add strict unit tests ensuring actions requiring `stock_status` and `stock_age` are correctly gated if they cannot be mapped.
- **Anti-Contamination Alias Tests**: Add tests verifying that `delivery_status` does not incorrectly match `stock_status`, and that generic `status` columns are resolved accurately according to their contextual promotion without cross-contamination.

---

## Verification Plan

### Automated Tests
Run the following Playwright test suites to verify functionality and capture proof screenshots:
```bash
npx playwright test e2e/viettel_acceptance.spec.ts -g "Group_A|Group_B|Group_C|Group_D|DATA_XUAT"
```

**Required Playwright Assertions:**
For each Group run, the test script will strictly assert:
1. The `<MultiFileUnderstandingProofPanel>` exists and is visible.
2. The panel contains real uploaded file names.
3. The panel displays explicit relationship/key evidence.
4. When any generated action is executed, the DOM must **not** contain `CANONICAL_PROJECTION_MISSING`.
5. The DOM must **not** contain `Execution Boundary Failed`.
6. The DOM must **not** contain raw `DUCKDB` query execution errors.

### Manual Verification
- Update `AGENT_HANDOFF.md` with explicit verdicts using the format: `PASS / PARTIAL / FAIL based on evidence`.
- Link to the captured `multi_file_understanding.png` screens in the handoff.
