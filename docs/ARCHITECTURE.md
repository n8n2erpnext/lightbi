# LightBI architecture

LightBI separates source understanding, analytical authorization, execution, and presentation so a UI component cannot silently redefine business meaning.

## Runtime path

1. **Intake** parses local files, online files, or database results and records the physical source boundary.
2. **Canonical understanding** profiles columns and rows, generates semantic candidates, resolves contextual evidence, identifies grain, and computes readiness.
3. **Capability projection** exposes only perspectives and questions supported by the resolved evidence. Universal descriptive questions remain namespaced separately from domain-governed metrics.
4. **Handoff** binds the selected action to the artifact identity, source fingerprint, physical fields, dimensions, measures, aggregation, and evidence scope.
5. **Execution** rematerializes the bound source and executes guarded SQL through DuckDB. Stale or mismatched handoffs fail closed.
6. **Presentation** builds the chart, BA decision brief, Deep BA, drill-through rows, Dashboard, and exports from the executed evidence contract.

## Ownership boundaries

- `semantic-registry.ts` owns atomic signal definitions and aliases.
- `understanding-core/` owns evidence artifacts, resolution, grain, readiness, metric preflight, and canonical source continuity.
- runtime executors consume canonical bindings; they do not infer new semantic truth.
- BA and Dashboard layers explain executed evidence and retain scope/limitations; they do not authorize metrics.
- multi-source analysis retains source-local identity and permits only governed relationship or period-partition routes.

## Local-first execution

Local files are fingerprinted, parsed, and materialized in the desktop/web runtime. DuckDB WASM executes browser analytical queries. The native Tauri application embeds the Axum backend for Advanced database workflows and application metadata without requiring a separately installed server.

## Safety invariants

- No speculative joins.
- No unguarded summation of identifiers or ambiguous measures.
- No execution when source identity or runtime continuity is stale.
- No causal claim without supporting evidence.
- No hidden fallback from a governed metric to a different measure.
- Every subset analysis retains its parent scope and active filters.

## Monorepo map

| Path | Responsibility |
|---|---|
| `apps/desktop` | Home, understanding, Investigation, Deep BA, Dashboard, Advanced UI |
| `apps/server` | Database/online-source APIs, embedded application backend |
| `packages/runtime` | In-memory analytical workspace and execution coordination |
| `packages/core-types` | Shared analytical contracts |
| `packages/query-models` | Recipe, plan, and lineage models |
| `crates/lightbi-tauri` | Native Windows shell and embedded router |
| `crates/lightbi-duckdb` | Native DuckDB boundary |
| `sample-corpus` | Sanitized semantic/grain/readiness/relationship regression evidence |
