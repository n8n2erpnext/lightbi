# ADR-106: Dataset Rows Preview Wiring

## Context
In Phase DU-5F, we wired the active dataset rows from `Home.tsx` into the `InvestigationSession` so that the `DuckDBPreviewSandbox` can execute on real uploaded data instead of failing with empty rows.

## Decision
1. **Bounded Rows Transfer:**
   - When creating an `InvestigationSession`, the frontend now passes `currentDataset.previewRows` (or `rows`).
   - The session constructor strictly bounds this to a maximum of **1000 rows**.
   - This ensures that transferring data between states doesn't crash the browser or bloat React state excessively when large datasets are imported.

2. **Immutable Cloning:**
   - The passed rows are deep-cloned via `JSON.parse(JSON.stringify(safeRows))` when creating the session. This guarantees that execution inside the sandbox cannot accidentally mutate the original dataset.

3. **No Execution on Home Page:**
   - The Home page does not execute queries. It merely acts as the routing point that supplies the available preview data.
   - The preview execution remains explicitly user-triggered ("Run preview") on the Investigation page.

4. **Honest Empty State Handling:**
   - If the active dataset in memory does not retain its row data after import (as observed: "Dataset rows are not currently retained after import." - current state only retains metadata like columns and `rows_count`), the system gracefully defaults to an undefined `rows` field.
   - The existing honest warning (`"No dataset rows available for preview"`) displays correctly, indicating that future full data execution plumbing will be required.

## Rationale
This approach allows the sandbox to be perfectly viable when in-memory preview arrays are available, without altering the architecture or adding heavy global state management for gigabytes of data.

## Consequences
- Bounded execution remains safe.
- Investigation Session creation is robust and independent of massive data loads.
- A future task will need to implement persistent local storage (e.g. IndexedDB or DuckDB WASM persistent storage) so that rows are properly retained or chunk-streamed to the Investigation layer.
