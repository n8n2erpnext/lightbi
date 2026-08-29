# Runtime Truth Checkpoint

## 1. What changed in Phase 1
**UI/runtime truth improvements:**
- Boundary validation introduced on the Investigation layer.
- `rows.length === 0` and missing shapes are strictly intercepted.
- Fallback/degraded messaging is explicitly surfaced rather than rendering misleading charts.

## 2. What changed in Phase 2
**SQL preview / sandbox hardening:**
- Removed fake fallbacks such as `op.timeDimension || 'date'` and `selectClause = '*'`.
- Malformed operations (e.g. `trend` without time dimension or `group_by` without dimensions/measures) are now honestly blocked at the compiler and mock executor level.

## 3. What is now prevented
- UI hallucinations where invalid charts were rendered despite logically malformed parameters.
- Silent default injections that fabricated execution data.

## 4. What still fails
- Degraded fallbacks (`js_sandbox_fallback`) still occasionally trigger due to remaining limits.
- Real backend executor / DuckDB WASM path is still mocked and not yet executing real queries against physical data blocks.

## 5. Recommended next phase
**Recommended:** `Trust Mapping Phase 2`
