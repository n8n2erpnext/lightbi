import type { RuntimePlanPreview } from './runtime-planner-preview';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';

export interface BackendPreviewInput {
  runtimePlan: RuntimePlanPreview;
  endpoint?: string;
  limit?: number;
}

export async function executeBackendPreview(input: BackendPreviewInput): Promise<DuckDBPreviewResult> {
  const endpoint = input.endpoint || '/api/preview/execute';
  const limit = input.limit || 100;
  
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
        warnings: [`Backend returned HTTP ${response.status}`],
        blockedReasons: [],
        errorMessage: `HTTP Error: ${response.statusText}`,
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
      warnings: data.warnings || [],
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
      warnings: ["Network failure when connecting to backend."],
      blockedReasons: [],
      errorMessage: error instanceof Error ? error.message : String(error),
      source: "backend_duckdb_preview"
    };
  }
}
