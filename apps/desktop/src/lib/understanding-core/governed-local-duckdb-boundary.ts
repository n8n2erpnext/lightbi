import { executeLocalDuckDB } from "../local-duckdb-executor";
import type { GovernedDuckDBBoundaryV1 } from "./governed-runtime-contracts";

function sqlLiteral(value: string | number | boolean): string {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("NON_FINITE_QUERY_PARAMETER");
    return String(value);
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${value.replace(/'/g, "''")}'`;
}

function materializeParameters(sql: string, parameters: Array<string | number | boolean>): string {
  let index = 0;
  const materialized = sql.replace(/\?/g, () => {
    if (index >= parameters.length) throw new Error("MISSING_QUERY_PARAMETER");
    return sqlLiteral(parameters[index++]);
  });
  if (index !== parameters.length) throw new Error("UNUSED_QUERY_PARAMETER");
  return materialized;
}

export function createGovernedLocalDuckDBBoundary(options: {
  runtimeSource?: import("../runtime-dataset-source").RuntimeDatasetSource;
  expectedRuntimeBinding?: import("../runtime-dataset-source").RuntimeSourceBindingV1;
} = {}): GovernedDuckDBBoundaryV1 {
  return {
    async execute(plan, rows) {
      try {
        const sql = materializeParameters(plan.sql, plan.parameters);
        const requiredColumns = [...plan.metricBindings, ...plan.groupingBindings, ...(plan.timeBinding ? [plan.timeBinding] : [])].map((item) => item.physicalColumn);
        const result = await executeLocalDuckDB({
          runtimePlan: { id: plan.planId, requiredColumns: [...new Set(requiredColumns)], warnings: [] } as never,
          safeSqlPreview: { id: `governed-sql:${plan.planId}`, sql } as never,
          rows,
          runtimeDatasetSource: options.runtimeSource,
          expectedRuntimeBinding: options.expectedRuntimeBinding,
          rowScope: options.runtimeSource ? "full_file" : "retained_rows",
          limit: 100,
        });
        return { engine: "duckdb", status: result.status === "executed" ? "executed" : "failed", columns: result.columns, rows: result.rows, error: result.errorMessage ?? null, executionScope: result.executionScope === "full_file" ? "full_file" : "controlled_rows", actualMaterializedRowCount: result.materializedRowCount };
      } catch (error) {
        return { engine: "duckdb", status: "failed", columns: [], rows: [], error: error instanceof Error ? error.message : String(error), executionScope: "controlled_rows" };
      }
    },
  };
}
