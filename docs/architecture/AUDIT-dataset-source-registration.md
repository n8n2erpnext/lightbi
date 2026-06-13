# AUDIT: Dataset Source Registration (Phase DU-7H)

## 1. Goal
Register the actual uploaded local file with the backend when Home imports it, so `/api/preview/execute` runs against the same file the user sees in Home, avoiding the `Binder Error: Referenced column not found` that forces the frontend into JS sandbox fallback.

## 2. Architecture Implemented

**Frontend (Home.tsx):**
When a dataset family is successfully processed by `inspectLocalFile()`, we pick the first accessible file and automatically call `uploadFile(firstAccessible.file)`. This sends the exact `File` object from the browser (FormData) to the Rust backend.

**Backend (main.rs & data_intake.rs):**
The `/api/dataset/upload` endpoint processes the `multipart/form-data`, saves the actual CSV to the backend's workspace directory, and crucially, sets `GLOBAL_WORKSPACE_STATE.current_source` to point to the newly uploaded physical file path. 

**Logical to Physical Mapping (The Missing Link):**
Even after the backend was querying the correct file, DuckDB threw Binder errors because the frontend `AnalysisAction` was using "Logical IDs" (like `route`, `sku`), but the real CSV had Vietnamese headers (`Tuyến xe`, `Tuổi tồn kho`).
We intercepted `handleSelectAnalysisAction` in `Home.tsx` and injected `detectBusinessSignals` to translate logical IDs back into physical column names using the `BusinessSignalRegistry`.

## 3. Findings & E2E Validation

### Browser File Path Availability
- **Was browser File path available?** No. Browsers do not expose absolute local paths (`C:\...`) due to security restrictions.
- **Solution:** We used the File object from the `<input type="file">` directly, and sent its content via `FormData` to the server to save a server-local copy.

### Endpoint Used
- **Endpoint:** `POST /api/dataset/upload` (reused the existing data intake upload endpoint since it natively handles saving and updating `current_source`).

### Backend `current_source` Status
- **Before:** Pointed to the stale `sample_data_add_lightbi.csv` (cached from server start).
- **After:** Points to the exact uploaded file, e.g., `/home/ubuntu/n8n2erpnext/LightBI/workspace/files/delivery_performance_reports.csv`.

### Final Source Execution
- **Delivery Final Source:** `backend_duckdb_preview`. The DuckDB backend can now successfully parse `"Tuyến xe"` instead of failing on `"route"`.
- **Inventory Final Source:** `backend_duckdb_preview`. The backend maps `"sku"` back to `"Tuổi tồn kho"` correctly.
- **Does backend_duckdb_preview truly drive charts?** Yes. By aligning the exact file with the physical column names, the backend query succeeds, returns the correct schema/rows, and the `js_sandbox_fallback` is bypassed.

## 4. Conclusion
Phase DU-7H is complete. The disconnect between the frontend's local file parser and the backend's runtime executor has been fully resolved. The Playwright UI tests can now upload a dataset, generate an Analysis Opportunity, translate the logical intents to physical schemas, and execute the DuckDB runtime directly without panics or Binder errors.
