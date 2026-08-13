import type { RuntimeBoundaryArtifact } from './runtime-boundary-contract';
import type { ExpectedResultContract } from './expected-result-contract';
import type { CompiledQueryContract } from './safe-sql-compiler';
import type { SandboxExecutionRequest, SandboxEvaluationResult } from './runtime-sandbox-policy';
import type { PreviewResultContract } from './preview-result-contract';
import type { BusinessConfidenceResult } from './business-confidence-engine';

/**
 * @deprecated This runtime is a disconnected mock and does not execute real DuckDB.
 * Retained for legacy contract compatibility in Home.tsx. Do not use for actual execution.
 */
export type PreviewRuntimeStatus = "ready" | "warning" | "blocked" | "error";

export type PreviewRuntimeRow = Record<string, string | number | boolean | null>;

/**
 * @deprecated This runtime is a disconnected mock and does not execute real DuckDB.
 */
export type PreviewRuntimeResult = {
  id: string;
  compiledQueryId: string;
  previewResultContractId: string;
  expectedResultId: string;
  sandboxRequestId: string;

  status: PreviewRuntimeStatus;

  columns: {
    id: string;
    label: string;
    role: "dimension" | "measure" | "unknown";
  }[];

  rows: PreviewRuntimeRow[];

  rowCount: number;
  rowCountEstimate?: number;

  truncated: boolean;

  warnings: string[];

  execution: {
    engine: "duckdb";
    mode: "preview";
    maxRows: number;
    executionMs?: number;
  };
};

/**
 * @deprecated This runtime is a disconnected mock and does not execute real DuckDB.
 */
export type PreviewRuntimeInput = {
  artifact: RuntimeBoundaryArtifact;
  expectedResult: ExpectedResultContract;
  compiledQuery: CompiledQueryContract;
  sandboxRequest: SandboxExecutionRequest;
  sandboxEvaluation: SandboxEvaluationResult;
  previewContract: PreviewResultContract;
  businessConfidence?: BusinessConfidenceResult;
};

/**
 * @deprecated This runtime is a disconnected mock and does not execute real DuckDB.
 */
export function createPreviewRuntimeRequest(input: PreviewRuntimeInput): Omit<PreviewRuntimeResult, "execution" | "rows" | "rowCount" | "truncated"> & { _requestContext: PreviewRuntimeInput; maxRows: number } {
  const { sandboxEvaluation, compiledQuery, previewContract, businessConfidence, sandboxRequest } = input;
  
  let status: PreviewRuntimeStatus = "ready";
  const warnings: string[] = [];

  if (sandboxEvaluation.canExecute === false || compiledQuery.status === "blocked" || previewContract.status === "blocked") {
    status = "blocked";
    warnings.push("Execution blocked by upstream contracts.");
  } else if (businessConfidence?.level === "LOW") {
    status = "warning";
    warnings.push("Business confidence is LOW. Proceed with caution.");
  }

  let maxRows = sandboxRequest.policy.maxRowsPreview;
  if (typeof maxRows !== 'number' || maxRows <= 0) maxRows = 100;

  return {
    id: `prv-req-${Date.now()}`,
    compiledQueryId: compiledQuery.id,
    previewResultContractId: previewContract.id,
    expectedResultId: input.expectedResult.id,
    sandboxRequestId: sandboxRequest.id,
    status,
    columns: [],
    warnings,
    maxRows,
    _requestContext: input
  };
}

/**
 * @deprecated This runtime is a disconnected mock and does not execute real DuckDB.
 * Returns fake randomized data. Do not use for real queries.
 */
export function executeDuckDBPreviewRuntime(input: PreviewRuntimeInput): PreviewRuntimeResult {
  const request = createPreviewRuntimeRequest(input);
  
  if (request.status === "blocked") {
    return {
      id: request.id,
      compiledQueryId: request.compiledQueryId,
      previewResultContractId: request.previewResultContractId,
      expectedResultId: request.expectedResultId,
      sandboxRequestId: request.sandboxRequestId,
      status: "blocked",
      columns: [],
      rows: [],
      rowCount: 0,
      truncated: false,
      warnings: request.warnings,
      execution: {
        engine: "duckdb",
        mode: "preview",
        maxRows: request.maxRows
      }
    };
  }

  // Mock DuckDB Execution Boundary
  const maxRows = request.maxRows;
  const mockRows: PreviewRuntimeRow[] = [];
  
  // Mapping columns from PreviewResultContract
  const columns = input.previewContract.columns.map(c => ({
    id: c.id,
    label: c.label,
    role: c.role
  }));

  // Enforce limit
  const rowsToGenerate = Math.min(5, maxRows);
  let truncated = false;
  
  // Generate some safe mock data based on contract
  for (let i = 0; i < rowsToGenerate; i++) {
    const row: PreviewRuntimeRow = {};
    for (const col of columns) {
      if (col.role === "measure") {
        row[col.id] = Math.floor(Math.random() * 1000);
      } else {
        row[col.id] = `Mock ${col.label} ${i + 1}`;
      }
    }
    mockRows.push(row);
  }

  // Check columns match preview contract
  const allColumnsMatch = columns.every(c => input.previewContract.columns.find(pc => pc.id === c.id));
  let finalStatus = request.status;
  if (!allColumnsMatch) {
    finalStatus = "error";
    request.warnings.push("Output columns do not match expected contract columns.");
  }

  return {
    id: `prv-res-12345`, // Use deterministic ID logic or keep static for tests
    compiledQueryId: request.compiledQueryId,
    previewResultContractId: request.previewResultContractId,
    expectedResultId: request.expectedResultId,
    sandboxRequestId: request.sandboxRequestId,
    status: finalStatus,
    columns,
    rows: mockRows,
    rowCount: mockRows.length,
    truncated,
    warnings: request.warnings,
    execution: {
      engine: "duckdb",
      mode: "preview",
      maxRows,
      executionMs: 15
    }
  };
}

/**
 * @deprecated This runtime is a disconnected mock and does not execute real DuckDB.
 */
export function summarizePreviewRuntimeResult(result: PreviewRuntimeResult): string {
  switch (result.status) {
    case "ready": return "DuckDB returned a limited preview result.";
    case "warning": return "DuckDB returned a preview result with warnings.";
    case "blocked": return "Preview runtime was blocked before execution.";
    case "error": return "Preview runtime failed safely.";
    default: return "Unknown preview runtime status.";
  }
}
