import type { RuntimePlanPreview } from './runtime-planner-preview';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';
import type { SafeSqlPreview } from './safe-sql-preview';
import { executeLocalDuckDB } from './local-duckdb-executor';
import type { RuntimeDatasetSource, RuntimeRowScope } from './runtime-dataset-source';

export interface BackendPreviewInput {
  runtimePlan: RuntimePlanPreview;
  safeSqlPreview?: SafeSqlPreview;
  rows?: Record<string, unknown>[];
  runtimeDatasetSource?: RuntimeDatasetSource;
  rowScope?: RuntimeRowScope;
  endpoint?: string;
  limit?: number;
  signal?: AbortSignal;
}

export async function executeBackendPreview(input: BackendPreviewInput): Promise<DuckDBPreviewResult> {
  const limit = input.limit || 100;
  
  // Local Execution Path / Seam fallback if no endpoint is configured.
  // If no backend endpoint is configured, attempt local DuckDB execution when SQL and rows are available.
  if (!input.endpoint) {
    if (input.safeSqlPreview && (input.runtimeDatasetSource || input.rows)) {
      return executeLocalDuckDB({
        runtimePlan: input.runtimePlan,
        safeSqlPreview: input.safeSqlPreview,
        rows: input.rows,
        runtimeDatasetSource: input.runtimeDatasetSource,
        rowScope: input.rowScope,
        limit,
        signal: input.signal
      });
    }

    return {
      id: `preview_exec_${input.runtimePlan.id}`,
      sourceSqlPreviewId: 'backend_executor',
      status: "failed",
      columns: [],
      rows: [],
      rowCount: 0,
      maxRows: limit,
      warnings: [...input.runtimePlan.warnings],
      blockedReasons: [],
      errorMessage: "NETWORK_UNAVAILABLE: No backend configured for execution.",
      source: "backend_duckdb_preview"
    };
  }

  const endpoint = input.endpoint;
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        runtime_plan: input.runtimePlan,
        limit
      }),
      signal: input.signal
    });

    if (!response.ok) {
      return {
        id: `preview_exec_${input.runtimePlan.id}`,
        sourceSqlPreviewId: 'backend_executor',
        status: "failed",
        columns: [],
        rows: [],
        rowCount: 0,
        maxRows: limit,
        warnings: [...input.runtimePlan.warnings],
        blockedReasons: [],
        errorMessage: `HTTP_ERROR: ${response.status} - ${response.statusText}`,
        source: "backend_duckdb_preview"
      };
    }

    const data = await response.json();
    
    let totalMalformedDropped = 0;
    const rows = data.rows || [];
    const columns = (data.columns || []).filter((name: string) => !name.startsWith('__malformed_'));
    
    for (const jsonRow of rows) {
      for (const key of Object.keys(jsonRow)) {
        if (key.startsWith('__malformed_')) {
          if (typeof jsonRow[key] === 'number') {
            totalMalformedDropped += jsonRow[key];
          } else if (typeof jsonRow[key] === 'bigint') {
            totalMalformedDropped += Number(jsonRow[key]);
          }
          delete jsonRow[key];
        }
      }
    }
    
    const warnings = [...input.runtimePlan.warnings, ...(data.warnings || [])];
    if (totalMalformedDropped > 0) {
      warnings.push(`Guarded SUM detected ${totalMalformedDropped} malformed values skipped during SUM aggregation.`);
    }

    return {
      id: `preview_exec_${input.runtimePlan.id}`,
      sourceSqlPreviewId: 'backend_executor',
      status: data.status as "ready" | "blocked" | "executed" | "failed",
      columns,
      rows,
      rowCount: data.row_count || 0,
      maxRows: data.max_rows || limit,
      warnings,
      blockedReasons: data.blocked_reasons || [],
      errorMessage: data.error_message || undefined,
      source: "backend_duckdb_preview"
    };
  } catch (error) {
    const aborted = input.signal?.aborted || (error instanceof DOMException && error.name === 'AbortError');
    return {
      id: `preview_exec_${input.runtimePlan.id}`,
      sourceSqlPreviewId: 'backend_executor',
      status: "failed",
      columns: [],
      rows: [],
      rowCount: 0,
      maxRows: limit,
      warnings: [...input.runtimePlan.warnings],
      blockedReasons: [],
      errorMessage: aborted
        ? "EXECUTION_ABORTED: Preview execution was cancelled."
        : error instanceof Error
          ? `NETWORK_UNAVAILABLE: ${error.message}`
          : "NETWORK_UNAVAILABLE: Failed to connect to the backend execution API.",
      source: "backend_duckdb_preview"
    };
  }
}
