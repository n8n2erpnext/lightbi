# Advanced Mode Export Mechanism (Implementation Plan)

## Goal
Enable Data Analysts to seamlessly copy the `AdvancedHandoffArtifact` directly from the current dataset understanding flow, satisfying MVP requirements without building new backends or ETL pipelines.

## Component & Action
- **Target Screen/Component**: `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx`
- **Action Type**: **Copy to Clipboard**. Data Analysts and engineers typically take this handoff artifact and immediately paste it into Jupyter notebooks, local scripts, or AI context windows (like Cursor/Claude). This approach requires zero file system management and is the lowest friction for the user. We will add a subtle "Copy Advanced JSON" action.

## Proposed Changes
### Files to Change
- `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx`

### Implementation Details
1. **Import the Contract**:
   - Exact import path: `import { generateAdvancedHandoff } from '../../lib/advanced-handoff-contract';`
2. **UI Placement**:
   - Add a subtle icon button (using a `Code` or `Copy` icon from `lucide-react`) next to the "What LightBI Found" header or inside the header flex container.
   - Give it a tooltip or subtle text: "Copy Advanced JSON".
   - This keeps the UI completely restrained for Standard users while exposing the raw JSON for Advanced users.
3. **Generation & Export Logic**:
   - In the `onClick` handler, generate the artifact synchronously: 
     ```ts
     const artifact = generateAdvancedHandoff(understanding);
     const jsonString = JSON.stringify(artifact, null, 2);
     ```
   - Use `navigator.clipboard.writeText(jsonString)` to copy it to the user's clipboard.
   - Provide visual feedback by temporarily changing the button icon to a `Check` mark for 2 seconds.

### Verification & Testing
- Run `pnpm exec tsc --noEmit` to ensure proper import and typing.
- Run `pnpm test` to verify no existing tests break due to the added button logic.
- Verify that standard users' cognitive load is preserved (the button is subtle and unobtrusive).
