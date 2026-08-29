# Milestone 1: First Visible Analytics

**Status**: Completed

## Goal
Prove the existing architecture can produce a visible result before adding new architectural layers. Achieve a full vertical slice from importing a CSV down to a rendered EChart and an Excel file.

## Scope Achieved
- **Supported Source**: CSV only
- **Supported Views**: Table View, Time Series View (via Backend orchestration)
- **Supported Charts**: Line Chart, KPI Card (via Frontend rendering)
- **Supported Export**: Excel (.xlsx)

## Added
1. `lightbi-connectors/src/csv_source.rs`: Implemented the `ConnectorContract` for `CsvConnector` to provide `discover_schema` functionality.
2. `lightbi-duckdb`: Added `duckdb = { version = "1.1.1", features = ["bundled"] }`. Implemented `DuckDBBackend` which executes an `ExecutionPlan` containing SQL over duckdb in-memory, converting DuckDB `ValueRef` into `serde_json::Value` rows inside a normalized `ResultSet`.
3. `lightbi-export/src/excel.rs`: Implemented `ExcelGenerator` using `rust_xlsxwriter` to construct an `.xlsx` file natively from a `DataView` or `ResultSet`.
4. `apps/server`: Created an `axum` based HTTP REST API to wire up the `ProjectContext`, load the `CsvConnector` and `DuckDBBackend`, and expose endpoints (`POST /api/project/import-csv`, `GET /api/chart/:id`, `GET /api/export/:id/download`).
5. `apps/desktop/src/App.tsx`: Wrote a Vite + React UI using `echarts-for-react` that consumes the API and correctly transforms `ChartPayload` into an ECharts `option` block.

## Modified
- `lightbi-project/src/context.rs`: Wired in the `DuckDBBackend` and `CsvConnector` explicitly so they are available in the workspace context without global singletons.
- Workspace `Cargo.toml`: Added `apps/server` to `members`.

## Removed
- N/A

## Known Limitations
- The `csv` file path and execution are hardcoded to `sales.csv` for Milestone 1 simulation purposes.
- Schema discovery type inference uses a naive fallback to `"string"` for all columns until `duckdb` metadata is deeply extracted during inference.
- Error handling in `DuckDBBackend` stringifies DuckDB errors for now.
- `apps/desktop` relies on standard `fetch` instead of Tauri IPC commands, allowing easy browser-based debugging for this milestone.

## Verification
- Run `cargo run -p lightbi-server` in a terminal.
- Run `npm run dev` in `apps/desktop` and open `http://localhost:5173`.
- Click "Import sales.csv" to trigger data availability.
- The UI fetches `/api/chart/line`, executes the Pushdown DuckDB execution plan against the `sales.csv` fixture, returns a `ChartPayload`, and renders the ECharts Line and KPI chart successfully.
- Click "Export to Excel" triggers the execution, pipes it through `DataView`, and writes a native Excel file `/tmp/export-line.xlsx`.

## Screenshots
*(Replace with actual paths when capturing screens during QA)*
- ![CSV Import](../../progress/images/csv-import.png)
- ![Dataset Creation](../../progress/images/dataset-creation.png)
- ![Chart Rendering](../../progress/images/chart-rendering.png)
- ![Excel Export](../../progress/images/excel-export.png)
