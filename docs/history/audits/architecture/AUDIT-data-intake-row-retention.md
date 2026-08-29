# AUDIT: Data Intake Row Retention

## Where are rows parsed?
Rows are currently parsed locally inside `apps/desktop/src/lib/local-file-inspector.ts`. 
- **Excel:** Parsed via SheetJS (`XLSX.utils.sheet_to_json({ header: 1 })`).
- **CSV/TXT/TSV:** Parsed natively using `string.split()` into an array of string arrays, then mapped to an array of objects.
- **JSON:** Parsed natively using `JSON.parse`.

## Where are rows discarded?
After parsing `allObjects` (the full dataset array) inside `local-file-inspector.ts` for column profiling:
- The system only slices the first 10 rows (`preview_rows = allObjects.slice(0, 10)`).
- The full `allObjects` array goes out of scope and is garbage collected.

## What `currentDataset` stores?
In `Home.tsx`, `setCurrentDataset` only preserves:
- `status`
- `file_name`
- `rows_count`
- `columns`
- `profiles`
- `sourceType`
- `normalizedUrl`
- `sourceFiles`
It did **not** capture any rows array (not even the 10 `preview_rows` natively available in `metadata`).

## Safest Insertion Point for `previewRows`
1. **In `local-file-inspector.ts`**: Update the parsing logic to retain `allObjects.slice(0, 1000)` instead of `10`, or create a new property `metadata.analysis_preview_rows`. Wait, to be safe, I'll update the helper function `createPreviewRows` to slice 1000 and map them correctly.
2. **In `Home.tsx`**: When `setCurrentDataset` is called, map `metadata.preview_rows` (which will now hold up to 1000) into `currentDataset.previewRows`.

This prevents holding 1,000,000 rows in memory, but successfully captures enough sample data (1000 rows) for the Investigation Sandbox preview without causing browser slowdowns.
