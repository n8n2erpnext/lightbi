# Implementation Plan: Global Display Preferences Phase 3 (Home Summaries)

## 1. Architectural Constraints
- **Scope Limit**: This rollout strictly targets the "Home Summaries" layer (KPI cards, dataset header stats).
- **Dashboards Excluded**: Full analytical dashboards are deferred.
- **Execution Unchanged**: The `formatValue` logic will only wrap presentation outputs. Underlying states and analysis pipelines remain unaffected.
- **Chart Formatting**: No new chart formatting features will be added unless strictly necessary for Home inline charts.

## 2. Technical Details

### 2.1 Affected Files & Components
- `apps/desktop/src/pages/Home.tsx`: Contains inline dataset stats (`currentDataset.rows_count`, `fam.totalRows`).
- `apps/desktop/src/components/data-intake/DataQualityCard.tsx`: Displays high-level percentage scores (completeness, consistency, etc.) inside a constrained grid layout.
- `apps/desktop/src/components/analysis/BusinessViewSummaryCard.tsx`: Renders coverage metrics (datasets, keys, views counts).

### 2.2 Formatting Targets
The following summary values will be piped through `formatValue(..., 'number', preferences)`:
- Dataset total row counts and column counts.
- Data Quality scores (0-100 values).
- Connection coverage metrics.

### 2.3 Compaction Rules (`compact: true`)
Because Home summary cards (like `DataQualityCard`) use tight grid layouts with large font sizes (`text-[18px]`), large numbers risk breaking the container boundaries. 
- Row counts in constrained UI spaces will force the `{ compact: true }` option (e.g. `1,500,000` -> `1.5M`).
- Standard inline text (e.g., "1,500,000 rows" in a long paragraph) will respect the user's standard accounting/thousands separator settings without compaction.

### 2.4 State Management & Blast Radius
- The `useDisplayPreferences()` Zustand hook will be injected *only* at the leaf nodes or exactly where the summaries are rendered (e.g., inside `DataQualityCard` or `Home` component).
- We will avoid lifting the hook to the `App` or `Router` root. This prevents a global re-render of the entire DOM tree when preferences change, tightly scoping the blast radius to just the text nodes that display numbers.

### 2.5 Null, Empty, and Loading States
- When data is fetching or absent (e.g., `rows_count` is `null`), the UI must gracefully handle it to avoid "NaN" or blank strings.
- We will leverage `formatValue`'s built-in fallback (`"-"`), or explicitly render `0` or loading skeleton elements depending on the context. 

## 3. Verification & Acceptance Criteria
- **Locale Reactivity**: Changing the locale/thousands-separator in the (Investigation) Settings UI must immediately update the Home summary cards.
- **Compaction**: Very large row counts must successfully render as shorthand formats (e.g., `1.5M`) in constrained spaces.
- **Safety**: `null` or `undefined` metrics do not crash the React tree.
- **Regression**: The Investigation flow (Table + Charts) remains completely intact.

### 3.1 Required UI Testing
**Yes, a specific UI test is required for the Home summaries layer.**
We will create/update a targeted test (e.g., `DataQualityCard.test.tsx` or an isolated summary test) to verify:
1. **Compact Output**: Providing a value like `1500000` to a metric card utilizing `{ compact: true }` correctly renders the string `1.5M`.
2. **Null Safety**: Providing `null` gracefully renders a fallback character (`-` or `0`) without throwing a React crash.
