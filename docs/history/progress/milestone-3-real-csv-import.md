# Milestone 3: Real CSV Import Flow

## Goal
Replace the hardcoded `sales.csv` with a real CSV import flow, enabling end-to-end file uploading, dynamic schema extraction, and dynamic chart rendering, while adhering strictly to the UI baseline established in Milestone 2.

## Scope & Constraints
- **File Type**: CSV only, single file, local project storage.
- **UI Baseline**: Maintained compact, Frappe Insights-inspired layouts. No new colors or redesigns.
- **Architecture**: Leveraged the existing `CsvConnector` for schema extraction. Stored the latest uploaded file path in a global `AppState` memory slot as a documented shortcut for this milestone.

## Modified Files
- `apps/server/Cargo.toml`: Enabled `multipart` feature for `axum`.
- `apps/server/src/main.rs`: 
  - Added `latest_csv_path` to `AppState`.
  - Implemented `POST /api/project/import-csv` using `axum::extract::Multipart` to save the file and parse schema dynamically.
  - Replaced unsafe `unwrap()` calls with robust `Result` error handling, returning exact `400` and `500` HTTP status codes.
  - Added structured `println!` logs to track the upload lifecycle (request received, multipart parsing, chunks written, schema discovery).
  - Updated `get_chart`, `ask_question`, and `download_export` to resolve DuckDB queries against the absolute path of the uploaded file.
- `apps/desktop/src/pages/DataSources.tsx`: 
  - Added hidden `<input type="file" />` and wired it to the "Add Source" button.
  - Implemented `FormData` upload to the backend.
  - Added an `AbortController` (30s timeout) and strict `try/catch/finally` error state resets to prevent the UI from hanging on "Uploading...".
  - Added successful schema inference UI mapping the detected columns (and bytes written), alongside a button to "Analyze on Home".
  - Implemented automatic data hydration by fetching `/api/project/current-source` on mount to retain the uploaded schema across route navigations.

## Known Limitations & Architectural Shortcuts
- **Execution Endpoints**: `GET /api/chart/:id`, `GET /api/export/:id/download`, and `POST /api/question/ask` all dynamically resolve the `file_path` of the currently uploaded CSV via a `resolve_current_source` helper rather than hardcoding `sales.csv`.
- **Dynamic Query Generation**: Replaced hardcoded "Date" and "Revenue" column dependencies. The backend now infers `date`, `dimension`, and `measure` columns upon upload, and dynamically builds DuckDB aggregation SQL. Any execution errors are properly caught and returned as JSON (e.g. 500 Internal Server Error) instead of panicking the server.
- **State Persistence**: Moved from memory-only to a disk-backed session metadata approach for Milestone 3. The `resolve_current_source` logic writes session metadata to `project/session/current_source.json` upon upload, and retrieves it if the memory cache is cleared due to server restarts. The system verifies that the actual file path exists before honoring the JSON schema. This ensures the schema persists on refresh and reboot, but it is still a known limitation that there is only one active uploaded source since it hasn't been fully migrated to SQLite yet. The UI correctly notes this as a "Current session source" to avoid implying full durable multi-file persistence.
- **Dataset Registry Linkage**: While we generate dummy `dataset_id` and `source_id` responses, we have not fully linked the uploaded CSV into the persistent `DatasetRegistry` or SQLite metadata store. This is sufficient for Milestone 3's goal of proving dynamic file execution but must be addressed in subsequent persistence phases.

## Stabilization Pass
A bug was discovered where uploading very small CSVs could cause the upload UI to hang indefinitely. The root cause was that `unwrap()` in the backend stream loop was silently failing or swallowing connection drops without returning a response, combined with the frontend lacking a fetch timeout. This was stabilized by rewriting the backend `import_csv` loop with strict `Result` propagation (returning correct JSON error statuses) and adding an `AbortController` to the frontend `fetch` call.

## Network & Routing
Added support for configurable API base URLs via the `VITE_API_BASE_URL` environment variable. This ensures the frontend (often served via HTTPS through a proxy) can correctly target the backend without encountering Mixed Content or CORS unreachable errors when `localhost:3000` evaluates to the client's local machine instead of the host.
Required `.env` file in `apps/desktop`:
```env
VITE_API_BASE_URL=http://localhost:3000
```
(Replace with the public backend URL for remote deployments).

## Verification Results
- Backend compiled successfully (`cargo check -p lightbi-server`).
- Frontend compiled successfully (`npm run build`).
- Uploading a custom `.csv` via the DataSources page correctly streams to the server and returns a valid schema payload.
- Asking a question on the Home page successfully runs DuckDB SQL against the uploaded CSV's absolute path instead of the hardcoded mock path.
- Exporting to Excel successfully packs the dynamically uploaded data.
