import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import { governedMetricQueryPlanIdentity } from "./governed-metric-query-planner";
import type { GovernedDuckDBBoundaryV1, GovernedExecutionEvidenceV1, GovernedMetricExecutionRequestV1, GovernedMetricExecutionResultV1 } from "./governed-runtime-contracts";

function actualMetricValue(request: GovernedMetricExecutionRequestV1, rows: Record<string, unknown>[]): number | null {
  let total = 0;
  for (const row of rows) {
    const value = row[request.plan.metricId];
    const numeric = typeof value === "number" ? value : typeof value === "bigint" ? Number(value) : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
    if (!Number.isFinite(numeric)) return null;
    total += numeric;
  }
  return rows.length ? total : null;
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
  const executed = output.engine === "duckdb" && output.status === "executed";
  const actual = executed ? actualMetricValue(request, output.rows) : null;
  const comparison = executed ? compareGroundTruth(request, actual) : { state: "unavailable" as const, expected: request.groundTruth.state === "verified" ? request.groundTruth.value : null, actual: null, tolerance: request.groundTruth.state === "verified" ? request.groundTruth.tolerance : null };
  const executionEvidence: GovernedExecutionEvidenceV1 = { evidenceId: `duckdb:${plan.planId}`, kind: "duckdb_execution", references: [output.executionScope, output.status], provenance: "local_duckdb" };
  const identityInput = { requestId: request.requestId, planId: plan.planId, status: output.status, columns: output.columns, rows: output.rows, comparison };
  return {
    schemaVersion: "lightbi.governed-metric-execution-result.v1", resultId: `metric-result:${deterministicPolicySha256(identityInput)}`, requestId: request.requestId, actionId: plan.actionId,
    metricId: plan.metricId, metricVersion: plan.metricVersion, sourceReference: plan.sourceReference, queryPlanIdentity: plan.planId, operator: plan.operator,
    dimensions: plan.groupingBindings.map((item) => item.semanticId), timeBasis: plan.asOfBasis ?? plan.timeBinding, status: executed ? "executed" : "failed", columns: output.columns,
    rows: output.rows, rowCount: output.rows.length, resultShape: plan.timeBinding ? "trend" : plan.groupingBindings.length ? "grouped" : "summary", groundTruthComparison: comparison,
    evidence: [...plan.evidence, executionEvidence], restrictions: plan.restrictions, limitations: executed ? [] : ["duckdb_execution_failed"], error: output.error,
    runtimeActionCreated: true, runtimeActionAuthorized: true, executionPerformed: executed, decisionUseAuthorized: false, productionWiring: { executed: false },
  };
}
