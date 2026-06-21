# ADR-113: Shared Simple/Advanced Execution Core

**Date:** 2026-06-19  
**Status:** Accepted, phase 1 implemented

## Context

Simple Mode already has three useful row surfaces:

- `previewRows` for bounded UI evidence;
- `semanticRows` for representative understanding;
- `analysisRows` for retained full rows when the source is small enough.

It also had a local `inspectionRunId` guard in `Home.tsx`. However, cancellation and stale-result protection stopped at the page boundary. Investigation execution, backend fetch, local DuckDB, and the full-file worker did not share one run lifecycle. Runtime results also remained object-row arrays without a transport-neutral buffer that Advanced Mode could reuse.

## Decision

Simple and Advanced Mode will share execution contracts and lifecycle primitives from workspace packages.

### Shared contracts

`@lightbi/core-types` now defines:

- `QueryResultBuffer`;
- `QueryResultColumn` and typed cell values;
- pagination/truncation metadata;
- `QueryRunState` and run status.

`@lightbi/runtime` now provides:

- `ExecutionRunCoordinator` with monotonic generations;
- automatic cancellation of the previous run;
- stale-result checks and guarded completion;
- object-row to matrix-buffer conversion;
- matrix-buffer to named-row projection for existing Simple UI components.

### Compatibility boundary

Semantic understanding continues to use `Record<string, unknown>[]`. Named fields are useful and already deeply integrated into profiling, signal detection, and chart planning.

Execution results are normalized through `QueryResultBuffer`. Simple Mode projects the buffer back to named rows for current summary/chart components. Advanced Mode can consume the matrix directly in a virtualized grid.

This avoids a risky rewrite while establishing one forward-compatible execution boundary.

## Simple Mode Integration

- Local file intake uses `ExecutionRunCoordinator`; replacing/cancelling intake invalidates prior inspection results.
- `inspectLocalFile` accepts an `AbortSignal` and checks cancellation around file reads and workbook sheet processing.
- Investigation preview owns a run coordinator and rejects stale backend, fallback, validation, chart, and result updates.
- Backend fetch receives the same signal.
- Local DuckDB receives the same signal, checks it between expensive phases, and closes its connection in `finally`.
- Full-file materialization terminates its worker on abort.
- A successful preview is normalized into one result buffer before summary and chart state are applied.

## Why This Is Better

- Navigating away or starting a newer run stops avoidable work instead of merely hiding its result.
- Old async work cannot overwrite the current dataset or chart.
- DuckDB connections are released on both success and failure.
- Simple and Advanced Mode now share the same result/lifecycle vocabulary.
- Existing semantic logic and object-row components remain stable.

## Known Boundary

- SheetJS parsing is synchronous after the file buffer is loaded, so an abort cannot interrupt one `XLSX.read` call mid-instruction. It does prevent later sheet/profile work and stale UI application.
- Full-file materialization still creates one JSON text payload before DuckDB registration. Streaming/Arrow ingestion is a later performance phase.
- The current result buffer is page-oriented. It is not a persisted full-dataset cache.
- Two-phase schema/profile enrichment is not part of phase 1. It should be layered onto `QueryRunState.metadataStatus` once the schema catalog service exists.

## Verification

```text
npx tsc --noEmit --pretty false
PASS

npx vitest run src/lib/shared-execution-core.test.ts src/lib/backend-preview-executor.test.ts src/lib/local-duckdb-executor.test.ts src/lib/local-file-inspector.test.ts --reporter=verbose --pool=forks
4 files passed, 26 tests passed
```

The repository-wide build remains blocked by pre-existing type drift in Understanding, Dashboard, and test fixtures. The new shared execution files introduce no remaining direct TypeScript errors.
