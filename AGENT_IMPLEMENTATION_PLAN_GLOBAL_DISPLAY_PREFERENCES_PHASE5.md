# Implementation Plan: Global Display Preferences Phase 5 (Dashboard Charts)

## 1. Scope & Constraints
- **Target Layer**: Dashboard chart representations (specifically replacing the existing static placeholders like `[Donut Chart Placeholder]`).
- **Boundaries Secured**: No modifications to the Investigation flow, Dashboard KPI cards (Phase 4), or underlying SQL engines.
- **Execution Unchanged**: The formatting engine will operate strictly at the ECharts presentation layer.

## 2. Technical Details

### 2.1 Component Interventions
- **New Component**: `apps/desktop/src/components/dashboards/DashboardChartWidget.tsx`. We will abstract the chart logic into a dedicated, reusable widget to manage its own lifecycle and sizing boundaries, mirroring the KPI widget architecture.
- **Integration Point**: `apps/desktop/src/pages/DashboardBuilder.tsx` will be updated to replace the hardcoded `<div>` placeholders with the new `<DashboardChartWidget />`.

### 2.2 Reusability Strategy
- The core logic for injecting `useDisplayPreferences` into ECharts configuration objects will be derived/reused from the Investigation layer (`ChartPreviewRenderer.tsx`).
- Specifically, the ECharts properties `xAxis.axisLabel.formatter`, `yAxis.axisLabel.formatter`, and `tooltip.valueFormatter` will intercept numeric values and run them through `formatValue()`.

### 2.3 Compaction & Sizing Rules
- **Axis Labels (Compact by Size)**: Axis labels must be highly resilient to overlapping. Inside `DashboardChartWidget`, a compaction rule will dynamically evaluate the grid width (`colSpan`). If the widget is narrow (e.g., `colSpan <= 10`), the axis formatter will receive `{ compact: true }`. If the chart expands full-width, it may receive full notation.
- **Tooltips (Always Full Detail)**: Tooltips are ephemeral layers that float above the chart bounds. Therefore, the `tooltip.valueFormatter` will permanently default to full notation (`{ compact: false }`), ensuring users can hover over compressed axes (e.g., `1.5M`) to reveal exact figures (`1,500,234`).
- **Zero Mutation**: Data passed into the ECharts `series` payload remains in primitive `<number>` format.

## 3. Verification & Acceptance Criteria
- Dashboard chart axes respect locale/currency/number style selections.
- Dashboard chart tooltips respect locale/currency/number style selections.
- Axis labels compress down (`1.5M`) in narrow widgets.
- Tooltips persistently expose full numbers (`1,500,000`).
- No regressions occur in the neighboring Dashboard KPI cards layer.

## 4. Test Strategy
A specialized test (e.g., `DashboardChartWidget.test.tsx`) is required to validate the ECharts `options` payload configuration. 
- **Target Assertion**: Instead of testing canvas rendering, the test will intercept or inspect the generated ECharts `options` dictionary.
- **Differential Proof**: The test will assert that `options.yAxis.axisLabel.formatter` has been configured with compact logic (dependent on widget sizing props), while `options.tooltip.valueFormatter` strictly lacks compaction logic.
