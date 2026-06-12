import type { RuntimePlanPreview } from './runtime-planner-preview';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';
import type { SafeSqlPreview } from './safe-sql-preview';
import { executeLocalDuckDB } from './local-duckdb-executor';

export interface BackendPreviewInput {
  runtimePlan: RuntimePlanPreview;
  safeSqlPreview?: SafeSqlPreview;
  rows?: Record<string, unknown>[];
  endpoint?: string;
  limit?: number;
}

export async function executeBackendPreview(input: BackendPreviewInput): Promise<DuckDBPreviewResult> {
  const limit = input.limit || 100;
  
  // Local Execution Path / Seam fallback if no endpoint is configured.
  // Instead of failing blindly, we attempt local execution.
  // Currently, local DuckDB WASM infrastructure is not fully present,
  // so executeLocalDuckDB will cleanly fail-fast at the executor seam.
  if (!input.endpoint) {
    if (input.safeSqlPreview && input.rows) {
      return executeLocalDuckDB({
        runtimePlan: input.runtimePlan,
        safeSqlPreview: input.safeSqlPreview,
        rows: input.rows,
        limit
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
      })
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
    
    return {
      id: `preview_exec_${input.runtimePlan.id}`,
      sourceSqlPreviewId: 'backend_executor',
      status: data.status as "ready" | "blocked" | "executed" | "failed",
      columns: data.columns || [],
      rows: data.rows || [],
      rowCount: data.row_count || 0,
      maxRows: data.max_rows || limit,
      warnings: [...input.runtimePlan.warnings, ...(data.warnings || [])],
      blockedReasons: data.blocked_reasons || [],
      errorMessage: data.error_message || undefined,
      source: "backend_duckdb_preview"
    };
  } catch (error) {
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
      errorMessage: error instanceof Error ? `NETWORK_UNAVAILABLE: ${error.message}` : "NETWORK_UNAVAILABLE: Failed to connect to the backend execution API.",
      source: "backend_duckdb_preview"
    };
  }
}
