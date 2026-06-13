# Home Readiness Visibility (Implementation Plan)

## Goal
Make dataset readiness (`decision_support`, `reference_only`, `exploratory_only`) clearly visible and understandable to Standard users on the Home understanding surface, without overwhelming the existing design.

## Target File
- `apps/desktop/src/components/analysis/DatasetUnderstandingCard.tsx`

## Proposed Changes

### 1. Readiness Badge UI
We will introduce a new readiness badge in the top right header area, directly below the existing "Understood" status badge.

- **`decision_support`**:
  - **Text**: "Ready for decisions"
  - **Style**: Subtle emerald/green (e.g., `bg-emerald-50 text-emerald-700 border-emerald-200`)
  - **Icon**: `CheckCircle2`
- **`reference_only`**:
  - **Text**: "Use for reference only"
  - **Style**: Subtle blue (e.g., `bg-blue-50 text-blue-700 border-blue-200`)
  - **Icon**: `Info`
- **`exploratory_only`**:
  - **Text**: "Exploratory use only"
  - **Style**: Prominent amber/orange (e.g., `bg-amber-100 text-amber-800 border-amber-300 font-semibold`)
  - **Icon**: `AlertTriangle`

### 2. Integration into `DatasetUnderstandingCard`
- Map `understanding.readiness.tier` to the visual configuration described above.
- Render the readiness badge inside the existing `<div className="flex flex-col items-end gap-1.5">` at the top right of the card.
- If the dataset has specific readiness caveats (`understanding.readiness.caveats`), append them to the main `understanding.caveats` list at the bottom of the card, deduplicating if necessary, so users can read the detailed reasons (e.g., missing health evidence) in the existing caveat section.
- Optionally add the `grainHint` next to the entity summary to show the data grain (e.g., "Grain: event") in a small, muted tag.

### 3. Avoiding Design Overload
- By placing the readiness indicator as a compact, color-coded badge in the header, it doesn't push down the main content.
- Using standard Lucide icons and plain language ("Ready for decisions" instead of "Tier 1: Decision Support") keeps it user-friendly.
- Merging readiness caveats into the existing bottom caveat list prevents having two separate warning lists on the same card.

## Verification & Testing
- Run `pnpm exec tsc --noEmit` to ensure type safety.
- Run `pnpm test` to verify no existing tests or snapshots break.
- Visually verify (or logic verify) that datasets with missing health checks correctly render the amber "Exploratory use only" badge and that readiness caveats appear at the bottom.
