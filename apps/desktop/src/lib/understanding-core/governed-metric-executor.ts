import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import { GOVERNED_FULL_SCOPE_TOTAL_COLUMN, governedMetricQueryPlanIdentity } from "./governed-metric-query-planner";
import type { GovernedDuckDBBoundaryV1, GovernedExecutionEvidenceV1, GovernedMetricExecutionRequestV1, GovernedMetricExecutionResultV1 } from "./governed-runtime-contracts";

function actualMetricValue(request: GovernedMetricExecutionRequestV1, rows: Record<string, unknown>[]): number | null {
  const fullScopeValues = rows
    .filter((row) => Object.prototype.hasOwnProperty.call(row, GOVERNED_FULL_SCOPE_TOTAL_COLUMN))
    .map((row) => numericValue(row[GOVERNED_FULL_SCOPE_TOTAL_COLUMN]));
  if (fullScopeValues.length > 0) {
    const first = fullScopeValues[0];
    if (first === null || fullScopeValues.some((value) => value === null || value !== first)) return null;
    return first;
  }
  let total = 0;
  for (const row of rows) {
    const numeric = numericValue(row[request.plan.metricId]);
    if (numeric === null) return null;
    total += numeric;
  }
  return rows.length ? total : null;
}

function numericValue(value: unknown): number | null {
  const numeric = typeof value === "number" ? value : typeof value === "bigint" ? Number(value) : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) ? numeric : null;
}

function visibleRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== GOVERNED_FULL_SCOPE_TOTAL_COLUMN)));
}

function compareGroundTruth(request: GovernedMetricExecutionRequestV1, actual: number | null): GovernedMetricExecutionResultV1["groundTruthComparison"] {
  if (request.groundTruth.state === "unavailable") return { state: "unavailable", expected: null, actual, tolerance: null };
  if (actual === null) return { state: "mismatch", expected: request.groundTruth.value, actual: null, tolerance: request.groundTruth.tolerance };
  const difference = Math.abs(actual - request.groundTruth.value);
  return { state: difference === 0 ? "exact_match" : difference <= request.groundTruth.tolerance ? "within_tolerance" : "mismatch", expected: request.groundTruth.value, actual, tolerance: request.groundTruth.tolerance };
}

export async function executeGovernedMetricRequest(request: GovernedMetricExecutionRequestV1, boundary: GovernedDuckDBBoundaryV1): Promise<GovernedMetricExecutionResultV1> {
  const { plan } = request;
  const { planId: _planId, ...base } = plan;
  const planValid = governedMetricQueryPlanIdentity(base) === plan.planId && plan.decisionUseAuthorized === false && plan.productionWiring.executed === false;
  if (!planValid) {
    return {
      schemaVersion: "lightbi.governed-metric-execution-result.v1", resultId: `metric-result:${deterministicPolicySha256({ requestId: request.requestId, error: "invalid_query_plan_identity" })}`,
      requestId: request.requestId, actionId: plan.actionId, metricId: plan.metricId, metricVersion: plan.metricVersion, sourceReference: plan.sourceReference, queryPlanIdentity: plan.planId,
      operator: plan.operator, dimensions: plan.groupingBindings.map((item) => item.semanticId), timeBasis: plan.asOfBasis ?? plan.timeBinding, status: "blocked", columns: [], rows: [], rowCount: 0,
      resultShape: plan.timeBinding ? "trend" : plan.groupingBindings.length ? "grouped" : "summary", groundTruthComparison: { state: "unavailable", expected: null, actual: null, tolerance: null },
      evidence: plan.evidence, restrictions: plan.restrictions, limitations: ["invalid_query_plan_identity"], error: "invalid_query_plan_identity", runtimeActionCreated: true, runtimeActionAuthorized: true,
      executionPerformed: false, decisionUseAuthorized: false, productionWiring: { executed: false },
    };
  }
  const output = await boundary.execute(plan, request.rows);
  const boundaryExecuted = output.engine === "duckdb" && output.status === "executed";
  const fullFileEvidenceRequired = request.expectedSourceRowCount != null || request.expectedRuntimeBinding != null || request.artifactIdentity != null;
  const fullFileEvidenceError = fullFileEvidenceRequired && boundaryExecuted
    ? output.executionScope !== "full_file"
      ? "full_file_execution_scope_required"
      : output.actualMaterializedRowCount == null
        ? "full_file_materialized_row_count_required"
        : output.actualMaterializedRowCount !== request.expectedSourceRowCount
          ? "full_file_materialized_row_count_mismatch"
          : null
    : null;
  const executed = boundaryExecuted && fullFileEvidenceError === null;
  const actual = executed ? actualMetricValue(request, output.rows) : null;
  const comparison = executed ? compareGroundTruth(request, actual) : { state: "unavailable" as const, expected: request.groundTruth.state === "verified" ? request.groundTruth.value : null, actual: null, tolerance: request.groundTruth.state === "verified" ? request.groundTruth.tolerance : null };
  const rows = executed ? visibleRows(output.rows) : [];
  const columns = output.columns.filter((column) => column !== GOVERNED_FULL_SCOPE_TOTAL_COLUMN);
  const executionEvidence: GovernedExecutionEvidenceV1 = { evidenceId: `duckdb:${plan.planId}`, kind: "duckdb_execution", references: [output.executionScope, output.status, `materialized_rows:${output.actualMaterializedRowCount ?? "unknown"}`], provenance: "local_duckdb" };
  const identityInput = { requestId: request.requestId, planId: plan.planId, status: executed ? output.status : "failed", columns, rows, comparison, fullFileEvidenceError };
  return {
    schemaVersion: "lightbi.governed-metric-execution-result.v1", resultId: `metric-result:${deterministicPolicySha256(identityInput)}`, requestId: request.requestId, actionId: plan.actionId,
    metricId: plan.metricId, metricVersion: plan.metricVersion, sourceReference: plan.sourceReference, queryPlanIdentity: plan.planId, operator: plan.operator,
    dimensions: plan.groupingBindings.map((item) => item.semanticId), timeBasis: plan.asOfBasis ?? plan.timeBinding, status: executed ? "executed" : "failed", columns,
    rows, rowCount: rows.length, resultShape: plan.timeBinding ? "trend" : plan.groupingBindings.length ? "grouped" : "summary", groundTruthComparison: comparison,
    evidence: [...plan.evidence, executionEvidence], restrictions: plan.restrictions, limitations: executed ? [] : [fullFileEvidenceError ?? "duckdb_execution_failed"], error: fullFileEvidenceError ?? output.error,
    runtimeActionCreated: true, runtimeActionAuthorized: true, executionPerformed: executed, decisionUseAuthorized: false, productionWiring: { executed: false },
    fullFileExecution: executed && output.executionScope === "full_file" && request.expectedRuntimeBinding && request.artifactIdentity && request.expectedSourceRowCount != null
      ? { executionScope: "full_file", sourceId: request.expectedRuntimeBinding.sourceId, sourceFingerprint: request.expectedRuntimeBinding.sourceFingerprint, expectedSourceRowCount: request.expectedSourceRowCount, actualMaterializedRowCount: output.actualMaterializedRowCount!, artifactIdentity: request.artifactIdentity }
      : undefined,
  };
}
