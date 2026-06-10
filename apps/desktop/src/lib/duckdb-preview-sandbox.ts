import type { RuntimeIntent } from './analysis-runtime-contract';
import type { RuntimePlanPreview } from './runtime-planner-preview';
import type { SafeSqlPreview } from './safe-sql-preview';

export interface DuckDBPreviewInput {
  runtimeIntent: RuntimeIntent;
  runtimePlan: RuntimePlanPreview;
  rows: Record<string, unknown>[];
  tableName?: string;
  safeSqlPreview?: SafeSqlPreview;
}

export interface DuckDBPreviewResult {
  id: string;
  sourceSqlPreviewId: string;
  status: "ready" | "blocked" | "executed" | "failed";
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  maxRows: number;
  warnings: string[];
  blockedReasons: string[];
  errorMessage?: string;
  source: "duckdb_preview_sandbox";
}

export async function executeDuckDBPreviewSandbox(input: DuckDBPreviewInput): Promise<DuckDBPreviewResult> {
  const result: DuckDBPreviewResult = {
    id: `preview_exec_${input.runtimePlan.id}`,
    sourceSqlPreviewId: input.safeSqlPreview?.id || 'unknown',
    status: "executed",
    columns: [],
    rows: [],
    rowCount: 0,
    maxRows: 100,
    warnings: [],
    blockedReasons: [],
    source: "duckdb_preview_sandbox"
  };

  // 1. Check if blocked
  if (input.runtimePlan.status === "blocked") {
    result.status = "blocked";
    result.blockedReasons = [...input.runtimePlan.blockedReasons];
    return result;
  }

  // 2. Add warning about mock executor
  result.warnings.push("Mock preview executor used because DuckDB WASM is not wired yet.");

  // 3. Handle empty input rows
  if (!input.rows || input.rows.length === 0) {
    result.status = "executed";
    result.warnings.push("No dataset rows available for preview.");
    return result;
  }

  // 4. Extract logical operations
  let currentRows = [...input.rows];
  
  // Set columns based on expected output
  result.columns = [...input.runtimePlan.expectedOutput.dimensions];
  for (const m of input.runtimePlan.expectedOutput.measures) {
    result.columns.push(`${m}_count`);
  }

  for (const op of input.runtimePlan.logicalOperations) {
    switch (op.type) {
      case "scan":
        // do nothing, we start with currentRows
        break;

      case "limit":
        currentRows = currentRows.slice(0, Math.min(op.rows, 100));
        break;

      case "group_by": {
        const grouped = new Map<string, Record<string, any>>();
        for (const row of currentRows) {
          const keyValues = op.dimensions.map(dim => row[dim] === undefined ? 'null' : String(row[dim]));
          const key = keyValues.join('||');
          if (!grouped.has(key)) {
            const entry: Record<string, any> = {};
            op.dimensions.forEach((dim) => entry[dim] = row[dim]);
            op.measures.forEach(m => entry[`${m}_count`] = 0);
            grouped.set(key, entry);
          }
          
          const entry = grouped.get(key)!;
          op.measures.forEach(m => {
            if (m === "record_count") {
              entry[`${m}_count`]++;
            } else {
              if (row[m] !== null && row[m] !== undefined) {
                entry[`${m}_count`]++;
              }
            }
          });
        }
        currentRows = Array.from(grouped.values());
        // For simple group_by logic without specific select
        if (result.columns.length === 0) {
          result.columns = [...op.dimensions, ...op.measures.map(m => `${m}_count`)];
        }
        break;
      }

      case "trend": {
        const timeDim = op.timeDimension;
        const grouped = new Map<string, Record<string, any>>();
        for (const row of currentRows) {
          const val = row[timeDim] === undefined ? 'null' : String(row[timeDim]);
          if (!grouped.has(val)) {
            const entry: Record<string, any> = { [timeDim]: row[timeDim] };
            op.measures.forEach(m => entry[`${m}_count`] = 0);
            grouped.set(val, entry);
          }
          
          const entry = grouped.get(val)!;
          op.measures.forEach(m => {
            if (m === "record_count") {
              entry[`${m}_count`]++;
            } else {
              if (row[m] !== null && row[m] !== undefined) {
                entry[`${m}_count`]++;
              }
            }
          });
        }
        currentRows = Array.from(grouped.values());
        // Sort by time dimension heuristically if it looks sortable, otherwise string sort
        currentRows.sort((a, b) => {
          const va = a[timeDim];
          const vb = b[timeDim];
          if (va < vb) return -1;
          if (va > vb) return 1;
          return 0;
        });
        if (result.columns.length === 0) {
          result.columns = [timeDim, ...op.measures.map(m => `${m}_count`)];
        }
        break;
      }

      case "distribution": {
        const dim = op.dimension;
        const grouped = new Map<string, Record<string, any>>();
        for (const row of currentRows) {
          const val = row[dim] === undefined ? 'null' : String(row[dim]);
          if (!grouped.has(val)) {
            grouped.set(val, { [dim]: row[dim], row_count: 0 });
          }
          grouped.get(val)!.row_count++;
        }
        currentRows = Array.from(grouped.values());
        if (result.columns.length === 0) {
          result.columns = [dim, 'row_count'];
        } else {
          // For distribution, the expected measure might be record_count
          if (!result.columns.includes('row_count') && result.columns.includes('record_count_count')) {
             // map row_count to record_count_count if needed
             for (const r of currentRows) {
                r['record_count_count'] = r['row_count'];
                delete r['row_count'];
             }
          }
        }
        break;
      }

      case "relationship": {
        // filter out rows where any measure is null
        currentRows = currentRows.filter(row => {
          return op.measures.every(m => row[m] !== null && row[m] !== undefined);
        });
        if (result.columns.length === 0) {
          result.columns = [...op.measures];
        }
        // Relationship does not aggregate. Just select the measures.
        currentRows = currentRows.map(row => {
          const newRow: Record<string, any> = {};
          op.measures.forEach(m => newRow[m] = row[m]);
          return newRow;
        });
        break;
      }
    }
  }

  // 5. Final enforce max 100 limit globally just in case limit op wasn't last or wasn't present
  if (currentRows.length > 100) {
    currentRows = currentRows.slice(0, 100);
  }

  result.rows = currentRows;
  result.rowCount = currentRows.length;

  console.log("TRACE [SANDBOX] result.rows.length:", result.rowCount);

  return result;
}
