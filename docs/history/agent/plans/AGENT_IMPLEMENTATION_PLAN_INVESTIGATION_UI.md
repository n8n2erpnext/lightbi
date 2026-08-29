# Investigation Fallback Warning (Implementation Plan)

## Goal
Make degraded execution (`js_sandbox_fallback`) visually obvious to the user in the Investigation preview UI without altering any backend or runtime logic.

## Proposed Changes

### Target File
- `apps/desktop/src/pages/Investigation.tsx`

### Implementation Details

1. **Import Required Icon**
   - Import `AlertTriangle` from `lucide-react` to use as the warning icon.

2. **Add Degraded Mode Banner**
   - Inside the `{previewResult && ( ... )}` rendering block, add a conditional check for `previewResult.source === 'js_sandbox_fallback'`.
   - If true, render a prominent (but restrained) amber warning banner directly above the results table/status line.
   - The banner will contain:
     - An alert icon.
     - A clear heading: "Degraded Execution Mode".
     - Explanatory text indicating that the backend is unavailable and the preview was generated using a constrained sandbox fallback.

3. **Highlight Source Indicator**
   - Update the small `Source:` tag in the status row. If the source is `js_sandbox_fallback`, change its styling from the default neutral `bg-slate-100` to a more noticeable `bg-amber-100 text-amber-800` to reinforce the degraded state visually.

## Constraints Verified
- **No Backend/Runtime Changes**: Execution semantics remain identical. The fallback logic itself is unchanged.
- **Local Scope**: All changes are confined to `Investigation.tsx` presentation code.
- **Backend Preservation**: Successful backend previews will continue to render without warnings and with the standard neutral styling.
- **Visual Clarity**: The amber banner ensures the fallback state cannot be missed or mistaken for a successful backend execution, solving the trust issue.
