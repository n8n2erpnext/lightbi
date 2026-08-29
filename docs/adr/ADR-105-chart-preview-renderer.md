# ADR-105: Chart Preview Renderer

## Context
In Phase DU-5E, we need to visually represent the `DuckDBPreviewResult` in the Investigation page. This visualization allows users to see the result of the preview execution directly as a chart or table.

## Decision
1. **Presentation Only Layer:**
   - The `ChartPreviewModel` and `ChartPreviewRenderer` are strictly presentation-layer components.
   - They consume the `DuckDBPreviewResult` and the `RuntimePlanPreview.expectedOutput` contract.

2. **No Execution or Parsing:**
   - The renderer never executes queries.
   - It never parses SQL or infers logic from labels.
   - It relies completely on the structured `DuckDBPreviewResult` returned by the sandbox execution.

3. **ECharts Direct Integration:**
   - Since `echarts` is directly available in `package.json`, we use raw ECharts initialized via `useEffect` in `ChartPreviewRenderer.tsx`.
   - No new chart wrapper dependencies (e.g. `echarts-for-react`) were introduced to keep the architecture light and faithful to the prompt constraints.
   - A fallback HTML table is used when the `chartType` is explicitly set to `"table"`.

4. **Empty and Blocked States:**
   - The model correctly propagates "blocked", "failed", and "empty" statuses. The renderer displays explicit warning states rather than rendering broken charts or faked data.

## Rationale
Strictly separating execution from rendering ensures UI purity. The renderer doesn't need to know how data was obtained; it only needs to map rows and dimensions to ECharts series. Direct integration with `echarts` avoids unnecessary wrapper libraries while fully supporting bar, line, and scatter charts.

## Consequences
- The Investigation UI smoothly transitions from "Ready to Execute" to displaying the expected chart directly on click.
- Chart configurations remain extremely thin and purely driven by metadata.
