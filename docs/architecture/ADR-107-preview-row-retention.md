# ADR-107: Preview Row Retention

## Context
In Phase DU-6A, the DuckDB sandbox was working perfectly, but the `Home` page did not retain the initial rows parsed from local file uploads. Users were seeing the correct datasets but clicking "Run preview" in the Investigation session always resulted in an empty data warning.

## Decision
1. **Local Inspector Slice Boost:**
   - Modified `apps/desktop/src/lib/local-file-inspector.ts` to slice up to `1000` rows for the `preview_rows` array during the local parsing phase.
   - Originally it was capping `preview_rows` at `10` rows which was meant just for basic table previews, but `1000` is small enough to not cause memory issues and big enough to provide a realistic interactive preview in the sandbox.
   - It correctly does this for CSV/TSV, Excel, and JSON data.

2. **React State Retention:**
   - Updated `Home.tsx` to extract this extended `preview_rows` from the `SourceInspectionResult.metadata`.
   - Before inserting into the `currentDataset` state, it is passed through a new normalizer `createPreviewRows`.
   - The React component now stores `previewRows` natively on the `currentDataset` so it survives beyond the initial file upload.

3. **Row Normalization (`createPreviewRows`):**
   - Implemented a resilient normalizer that ensures all rows are valid JS objects matching the detected `columns`.
   - If an array is passed, it zips the array into an object using the schema's column headers.
   - It enforces an absolute 1000-row cap and shallow-clones objects to guarantee the original data isn't mutated by the preview sandbox operations later on.

## Rationale
Since data is parsed fully in memory locally right now to produce profiles, keeping the first 1000 rows incurs virtually zero additional overhead compared to garbage collecting it instantly. By attaching it to the React state, we bridge the data intake process straight into the Investigation workspace preview pipeline safely without creating persistent databases or complex streaming architectures.

## Consequences
- Investigation Sandbox can now successfully generate charts on actual locally imported CSV/Excel files.
- The browser handles up to 1000 rows flawlessly.
- Full dataset processing (which might contain millions of rows) remains disconnected, respecting the preview boundary.
