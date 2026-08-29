# ADR 109: Frontend Backend Preview Adapter

## Status
Accepted

## Context
Following the creation of the backend `/api/preview/execute` endpoint (DU-7B), the frontend `DuckDBPreviewSandbox` needs to wire up execution calls. To preserve resilience and offline preview capability where possible, we require a fallback mechanism to our Javascript-based data operations if the backend is down or returns a block for reasons like "No active dataset source available".

## Decision
1. Create a pure networking adapter `executeBackendPreview` that sends the `RuntimePlanPreview` and `limit` to the backend and maps the response to `DuckDBPreviewResult`.
2. Update the `Investigation.tsx` execution handler to prioritize the backend endpoint.
3. If the backend fails (HTTP/Network) or actively blocks with "No active dataset source available" (e.g. testing context or corrupted source cache), the system transparently falls back to `executeDuckDBPreviewSandbox` utilizing the bounded `session.rows` retained during file upload.
4. Add the execution source indicator (`backend_duckdb_preview` or `js_sandbox_fallback`) to the `Investigation.tsx` UI to ensure developers and power users can clearly see which execution engine powered the results.

## Consequences
- **Resilience:** The application smoothly degrades to pure Javascript execution if the server connection drops.
- **Observability:** Explicit UI source tags remove ambiguity around where the preview rows were processed.
- **Safety:** The adapter strictly only forwards `RuntimePlanPreview` JSON, ensuring that SQL strings remain a pure frontend diagnostic tool, eliminating injection paths on the wire.
