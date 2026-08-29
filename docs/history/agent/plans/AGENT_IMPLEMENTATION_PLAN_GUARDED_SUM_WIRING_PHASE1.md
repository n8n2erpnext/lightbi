# Implementation Plan: Guarded SUM Wiring Phase 1

## 1. Context & Architectural Correction
The goal is to safely wire the `Numeric Health Gate` into the analytical pipeline to enable `SUM` operations. Previous proposals suggested calling the gate inside `local-duckdb-executor.ts` or `safe-sql-preview.ts`, which violates separation of concerns. `safe-sql-preview.ts` must remain a pure function that consumes metadata and generates SQL, while the executor must remain blind to query formulation.

## 2. Correct Data Flow & Gate Placement
The correct architectural insertion point is **BEFORE** the generation of the SQL Preview. 

1. **Step 1**: The UI/Orchestrator generates the baseline `RuntimePlanPreview` from the `RuntimeIntent`.
2. **Step 2 (The Gate)**: A new bridge helper (e.g., `enhancePlanWithGuardedSum(plan, rawRows)`) is invoked. It scans the requested measures in the plan, runs them through `evaluateNumericHealth` using the `rawRows`, and mutates the plan to inject aggregation metadata.
3. **Step 3**: `createSafeSqlPreview(plan)` receives the enhanced plan, blindly consuming the metadata to generate the final SQL string.
4. **Step 4**: `executeLocalDuckDB` executes the safe SQL on the raw rows.

## 3. Four Core Architectural Answers

1. **Health gate sẽ được gọi ở layer nào đầu tiên theo flow thật:**
   Health gate sẽ được gọi ở một **helper bridge** (vd: `enhancePlanWithGuardedSum`) chạy ngay sau khi sinh ra `RuntimePlanPreview` và **trước khi** truyền plan đó vào `createSafeSqlPreview(...)`. Helper này sẽ cầm `rawRows` để sample và quyết định.

2. **Metadata tối thiểu nào sẽ được truyền vào plan/sql preview:**
   Một thuộc tính từ điển siêu nhẹ sẽ được đính vào `LogicalRuntimeOperation` (ví dụ `group_by` và `trend`):
   ```typescript
   measureAggregations?: Record<string, "SUM" | "COUNT">
   ```
   `safe-sql-preview.ts` sẽ đọc dictionary này để quyết định hàm SQL nào được dùng.

3. **Nếu gate fail thì downgrade về `COUNT` sẽ diễn ra ở đâu:**
   Sự hạ cấp (downgrade) sẽ diễn ra âm thầm ở **`safe-sql-preview.ts`**. Nếu dictionary `measureAggregations` không chứa chỉ định `"SUM"` cho cột đó, vòng lặp sinh `SELECT` sẽ mặc định rớt xuống `CAST(COUNT(...) AS INTEGER)`.

4. **Phase wiring sau có cần warning propagation ngay không:**
   **Nên để phase riêng**. Trong phase wiring đầu tiên, ta chỉ tập trung vào việc dẫn luồng metadata từ Helper -> Plan -> SQL Generator để code thật gọn nhẹ. Việc đẩy cảnh báo "Đã loại rác" ngược lên Investigation UI có thể tách ra thành Phase 1B để tránh phình to scope UI hiện tại.

## 4. Scope for Next Code Phase
- **Priority**: 
  - Thêm type `measureAggregations` vào `runtime-planner-preview.ts` (contract layer).
  - Viết 1 helper siêu nhỏ `enhancePlanWithGuardedSum` để chạy Health Gate.
  - Sửa `safe-sql-preview.ts` để đọc metadata và nhả `SUM(TRY_CAST(...))`.
- **Avoid**: 
  - Không đụng `local-duckdb-executor.ts` (nó đã bị loại khỏi phase này).
  - Không đụng logic render biểu đồ ở `Investigation.tsx` hoặc cảnh báo UI.
