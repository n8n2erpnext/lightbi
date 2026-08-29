# Implementation Plan: Global Display Preferences Phase 4 (Dashboards KPI Cards)

## 1. Scope & Priorities
- **Target**: Rollout the `formatValue` presentation layer specifically into the Dashboard KPI/metric widgets.
- **Exclusion**: Dashboard ECharts/Recharts (Charts) are deferred to a subsequent sub-phase to minimize complexity.
- **Non-destructive**: No underlying SQL, analytical logic, or raw chart data structures will be mutated.

## 2. Technical Strategy

### 2.1 Impacted Components
- `apps/desktop/src/pages/DashboardBuilder.tsx`: Where current static KPI cards (e.g., Total Revenue, Sales, Active Users) reside.
- `apps/desktop/src/pages/Dashboards.tsx`: The viewing container for the dashboards.

### 2.2 Formatting Targets
Values inside KPI cards, typically `div` elements storing numeric states (e.g., `<div className="text-xl font-semibold">$45,231.89</div>`), will be piped through `formatValue(metric, 'number', preferences, { compact: isCompactSize })`. This includes percentage variations (`+20.1%`).

### 2.3 Context & State Management
- `useDisplayPreferences` will be consumed strictly at the Widget/Card component boundary. We will NOT lift it to `Dashboards.tsx` root if the layout contains heavy charts, avoiding costly global re-renders.
- By binding preferences at the leaf node, only the text nodes will update when a user switches from `en-US` to `ar-SA` or changes thousands separators.

### 2.4 Dynamic Compaction Rules (`compact: true`)
Unlike the Home layer where cards have relatively fixed dimensions, Dashboard widgets can be resized dynamically (e.g., `1x1`, `2x2`, `4x1` cells). 
- The compact rule will be derived dynamically based on the widget's physical grid size props (e.g., `colSpan`, `rowSpan`, or internal `width`).
- **Rule Example**: `const isCompact = widget.colSpan <= 2;`
- A narrow widget will render `1.5M`, while a wide widget will render `1,500,000`.

### 2.5 Null, Loading, and Empty Fallbacks
- Metrics trapped in a loading state or returning `null` will render `-` (via `formatValue`'s default behavior) or utilize a `<Skeleton />` block to prevent layout jumps or `NaN` errors on screen.

## 3. Verification & Acceptance Criteria
- **Locale Sync**: Dashboard KPI numbers immediately switch format when Investigation settings are changed.
- **Dynamic Compaction**: Dragging/resizing a widget from `4x1` to `1x1` automatically snaps the number from standard notation to compact notation.
- **Null Safety**: No React crashes occur if an API response fails to deliver a numeric metric.
- **Exclusion Audit**: Existing dashboard charts remain undisturbed in this phase.

## 4. Test Strategy
Since dynamic compaction based on grid size is a new logic layer, a targeted UI test is mandatory.
- We will construct/modify `DashboardWidget.test.tsx` to mount the KPI card in a simulated testing environment.
- **Primary Test Cases**:
  1. Inject `width/colSpan = 1` -> Assert output is `1.5M`.
  2. Inject `width/colSpan = 4` -> Assert output is `1,500,000`.
  3. Inject `metric = null` -> Assert output safely falls back to `-`.
