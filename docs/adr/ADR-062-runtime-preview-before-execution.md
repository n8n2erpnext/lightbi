# ADR-062: Runtime Preview Before Execution

## Status
Accepted

## Context
In Milestone 5, we built the `VirtualDatasetPlanner` which creates a deterministic abstract plan for execution. However, as we approach Milestone 6 (Runtime Execution), we must ensure a strict "air gap" between planning and actual engine processing (DuckDB, SQL). The user must be fully aware of what operations will occur, which datasets will be touched, and what risks are involved *before* any compute cycles are burned.

## Decision
Execution must **always** be preceded by a `RuntimePreview`.
The UI must intercept the `VirtualDatasetPlan`, translate it into a `RuntimePreview` object, and force the user to "Accept Plan" via the `RuntimePreviewCard`.

The user must see:
- Datasets involved
- Relationships involved
- The specific ordered operations (e.g., Group Records, Sort Results, Prepare Metric)
- Specific risk warnings (like many-to-many cardinality risks)

## Rules
1. **Never Question → DuckDB directly**: The flow is strictly `Question → VirtualDatasetPlan → RuntimePreview → User Accept → Execution Guard → Runtime Engine`.
2. **Blocked Plans**: If the `RuntimePreview` status is "blocked" (e.g., due to a rejected relationship), the "Accept Plan" button is strictly disabled.
3. **No Execution**: The Runtime Preview module remains completely isolated from database connections or execution engines.

## Rationale
This ensures execution is intentional, transparent, and auditable. It gives users the power to veto expensive or potentially inaccurate queries (e.g., many-to-many explosions) before they hit the database, preserving system stability and user trust.
