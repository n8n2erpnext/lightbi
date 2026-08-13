import { materializeRuntimeDatasetSource } from "../full-file-runtime-materializer";
import { initDuckDbWasm } from "../duckdb-wasm-loader";
import type {
  GovernedDuckDBBoundaryResultV1,
  GovernedDuckDBBoundaryV1,
  GovernedMetricExecutionRequestV1,
  GovernedMetricExecutionResultV1,
  GovernedMetricQueryPlanV1,
} from "./canonical-consumer-boundary";
import { executeCanonicalConsumerMetricRequest } from "./canonical-consumer-boundary";
import type { CanonicalMultiSourceDatasetV1, CanonicalMultiSourceInvestigationHandoffV1 } from "./canonical-multisource-boundary";
import { validateCanonicalMultiSourceDataset, validateCanonicalMultiSourceInvestigationHandoff } from "./canonical-multisource-boundary";
import type { MaterializedRuntimeData } from "../full-file-runtime-parser";
import type { CanonicalSourceBoundaryV1 } from "./canonical-source-boundary";

export type CanonicalMultiSourceExecutionEvidenceV1 = {
  multiSourceArtifactId: string;
  relationshipArtifactId: string;
  sourceIds: string[];
  sourceFingerprints: string[];
  sourceRoles: Array<{ sourceId: string; role: string }>;
  rowCounts: Array<{ sourceId: string; expected: number; actual: number }>;
  reportingPeriod: string | null;
  currency: string | null;
  reportingPeriodEvidence: Array<{ sourceId: string; declarationId: string }>;
  currencyEvidence: Array<{ sourceId: string; declarationId: string; currency: string }>;
  metricId: string;
  actionId: string;
  queryPlanIdentity: string;
  executionScope: "full_file_multisource";
  limitations: string[];
  prohibitedUses: string[];
};

export type CanonicalMultiSourceExecutionResultV1 = {
  schemaVersion: "lightbi.canonical-multisource-execution-result.v1";
  status: "executed" | "failed" | "blocked";
  metricResult: GovernedMetricExecutionResultV1;
  evidence: CanonicalMultiSourceExecutionEvidenceV1 | null;
  blockers: string[];
};

export type CanonicalMultiSourceDuckDBSessionV1 = {
  registerJsonView(tableName: string, fileName: string, jsonText: string): Promise<void>;
  query(sql: string): Promise<{ columns: string[]; rows: Record<string, unknown>[] }>;
  close(): Promise<void>;
};

export type CanonicalMultiSourceRuntimeBoundaryV1 = {
  materialize(boundary: CanonicalSourceBoundaryV1, signal?: AbortSignal): Promise<MaterializedRuntimeData>;
  open(): Promise<CanonicalMultiSourceDuckDBSessionV1>;
};

const productionRuntimeBoundary: CanonicalMultiSourceRuntimeBoundaryV1 = {
  materialize: (boundary, signal) => materializeRuntimeDatasetSource(boundary.runtimeSource, signal, boundary.runtimeSource.binding),
  open: async () => {
    const db = await initDuckDbWasm();
    const connection = await db.connect();
    return {
      registerJsonView: async (tableName, fileName, jsonText) => {
        await db.registerFileText(fileName, jsonText);
        await connection.query(`CREATE OR REPLACE VIEW ${quoteIdentifier(tableName)} AS SELECT * FROM read_json_auto('${fileName}')`);
      },
      query: async (sql) => {
        const arrow = await connection.query(sql);
        return { columns: arrow.schema.fields.map((field) => field.name), rows: arrow.toArray().map((row: { toJSON(): Record<string, unknown> }) => row.toJSON()) };
      },
      close: () => connection.close(),
    };
  },
};

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

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
  const result = sql.replace(/\?/g, () => {
    if (index >= parameters.length) throw new Error("MISSING_QUERY_PARAMETER");
    return sqlLiteral(parameters[index++]);
  });
  if (index !== parameters.length) throw new Error("UNUSED_QUERY_PARAMETER");
  return result;
}

function failedResult(error: unknown): GovernedDuckDBBoundaryResultV1 {
  return {
    engine: "duckdb",
    status: "failed",
    columns: [],
    rows: [],
    error: error instanceof Error ? error.message : String(error),
    executionScope: "full_file",
  };
}

function emptyMetricResult(request: GovernedMetricExecutionRequestV1, blocker: string): GovernedMetricExecutionResultV1 {
  return {
    schemaVersion: "lightbi.governed-metric-execution-result.v1",
    resultId: `multisource-blocked:${request.requestId}`,
    requestId: request.requestId,
    actionId: request.plan.actionId,
    metricId: request.plan.metricId,
    metricVersion: request.plan.metricVersion,
    sourceReference: request.plan.sourceReference,
    queryPlanIdentity: request.plan.planId,
    operator: request.plan.operator,
    dimensions: request.plan.groupingBindings.map((item) => item.semanticId),
    timeBasis: request.plan.asOfBasis ?? request.plan.timeBinding,
    status: "blocked",
    columns: [],
    rows: [],
    rowCount: 0,
    resultShape: request.plan.timeBinding ? "trend" : request.plan.groupingBindings.length ? "grouped" : "summary",
    groundTruthComparison: { state: "unavailable", expected: null, actual: null, tolerance: null },
    evidence: request.plan.evidence,
    restrictions: request.plan.restrictions,
    limitations: [blocker],
    error: blocker,
    runtimeActionCreated: true,
    runtimeActionAuthorized: true,
    executionPerformed: false,
    decisionUseAuthorized: false,
    productionWiring: { executed: false },
  };
}

export async function executeCanonicalMultiSourceMetric(input: {
  dataset: CanonicalMultiSourceDatasetV1;
  handoff: CanonicalMultiSourceInvestigationHandoffV1;
  request: GovernedMetricExecutionRequestV1;
  signal?: AbortSignal;
  runtimeBoundary?: CanonicalMultiSourceRuntimeBoundaryV1;
}): Promise<CanonicalMultiSourceExecutionResultV1> {
  const blockers = [
    ...validateCanonicalMultiSourceDataset(input.dataset),
    ...validateCanonicalMultiSourceInvestigationHandoff(input.handoff, input.dataset),
  ];
  const analysis = input.dataset.analyses.find((item) => item.queryPlanIdentity === input.handoff.multiSource.queryPlanIdentity);
  if (!analysis || analysis.state !== "ready") blockers.push("multisource_analysis_not_ready");
  if (input.handoff.queryPlanning.state !== "planned") blockers.push("multisource_metric_plan_not_ready");
  if (input.handoff.multiSource.requiredSourceIds.some((id) => !input.handoff.multiSource.sourceMemberships.some((item) => item.sourceId === id))) blockers.push("multisource_runtime_source_missing");
  if (analysis?.queryPlanSourceIds.some((id) => !input.handoff.multiSource.requiredSourceIds.includes(id))) blockers.push("multisource_plan_source_lineage_mismatch");
  if (blockers.length) return { schemaVersion: "lightbi.canonical-multisource-execution-result.v1", status: "blocked", metricResult: emptyMetricResult(input.request, blockers[0]), evidence: null, blockers: [...new Set(blockers)].sort() };

  const relationship = input.dataset.relationship;
  const metricMember = input.dataset.orderedSourceMemberships.find((item) => item.sourceId === analysis!.metricSourceId)!;
  const materializedRows = new Map<string, number>();
  const runtimeBoundary = input.runtimeBoundary ?? productionRuntimeBoundary;
  let connection: CanonicalMultiSourceDuckDBSessionV1 | null = null;
  let metricBoundaryResult: GovernedDuckDBBoundaryResultV1 | null = null;
  try {
    input.signal?.throwIfAborted();
    connection = await runtimeBoundary.open();
    const tableBySource = new Map<string, string>();
    for (const [index, member] of input.handoff.multiSource.sourceMemberships.entries()) {
      input.signal?.throwIfAborted();
      const materialized = await runtimeBoundary.materialize(member.boundary, input.signal);
      const expected = input.dataset.orderedSourceMemberships.find((item) => item.sourceId === member.sourceId)!.boundary.sourceRowCount;
      if (materialized.rowCount !== expected) throw new Error(`MULTISOURCE_ROW_COUNT_MISMATCH:${member.sourceId}`);
      const fileName = `lightbi_multisource_${index}.json`;
      const tableName = `__LIGHTBI_SOURCE_${index}__`;
      await connection.registerJsonView(tableName, fileName, materialized.jsonText);
      tableBySource.set(member.sourceId, tableName);
      materializedRows.set(member.sourceId, materialized.rowCount);
    }

    const identityBindings = new Map(relationship.identityBindings.map((item) => [item.sourceId, item.physicalColumn]));
    const [leftId, rightId] = relationship.participatingSourceIds;
    const leftTable = tableBySource.get(leftId);
    const rightTable = tableBySource.get(rightId);
    const leftKey = identityBindings.get(leftId);
    const rightKey = identityBindings.get(rightId);
    if (!leftTable || !rightTable || !leftKey || !rightKey) throw new Error("MULTISOURCE_RELATIONSHIP_BINDING_INCOMPLETE");
    const relationshipCheck = await connection.query(`SELECT COUNT(*) AS matched_rows, COUNT(DISTINCT CAST(l.${quoteIdentifier(leftKey)} AS VARCHAR)) AS matched_distinct FROM ${quoteIdentifier(leftTable)} l INNER JOIN ${quoteIdentifier(rightTable)} r ON CAST(l.${quoteIdentifier(leftKey)} AS VARCHAR) = CAST(r.${quoteIdentifier(rightKey)} AS VARCHAR)`);
    const relationshipRow = relationshipCheck.rows[0] ?? {};
    const matchedDistinct = Number(relationshipRow.matched_distinct ?? relationshipRow.MATCHED_DISTINCT ?? -1);
    if (matchedDistinct !== relationship.matchedDistinct) throw new Error("MULTISOURCE_RELATIONSHIP_FULL_SOURCE_MISMATCH");

    const metricTable = tableBySource.get(metricMember.sourceId);
    if (!metricTable) throw new Error("MULTISOURCE_METRIC_SOURCE_NOT_REGISTERED");
    const metricPlan = input.request.plan;
    const sql = materializeParameters(metricPlan.sql.replaceAll(metricPlan.tableIdentity, quoteIdentifier(metricTable)), metricPlan.parameters);
    const output = await connection.query(sql);
    metricBoundaryResult = { engine: "duckdb", status: "executed", columns: output.columns, rows: output.rows, error: null, executionScope: "full_file", actualMaterializedRowCount: materializedRows.get(metricMember.sourceId) };
  } catch (error) {
    metricBoundaryResult = failedResult(error);
  } finally {
    if (connection) await connection.close().catch(() => undefined);
  }

  const boundary: GovernedDuckDBBoundaryV1 = { execute: async (_plan: GovernedMetricQueryPlanV1) => metricBoundaryResult! };
  const metricResult = await executeCanonicalConsumerMetricRequest({
    ...input.request,
    runtimeSource: metricMember.runtimeSource,
    expectedRuntimeBinding: metricMember.runtimeSource.binding,
    expectedSourceRowCount: metricMember.boundary.sourceRowCount,
    artifactIdentity: metricMember.sourceLocalArtifactId,
  }, boundary);
  const executed = metricResult.status === "executed" && input.handoff.multiSource.requiredSourceIds.every((id) => materializedRows.has(id));
  const executionBlockers = executed ? [] : [metricResult.error ?? "multisource_duckdb_execution_failed"];
  const evidence: CanonicalMultiSourceExecutionEvidenceV1 | null = executed ? {
    multiSourceArtifactId: input.dataset.identity,
    relationshipArtifactId: relationship.relationshipArtifactId,
    sourceIds: input.handoff.multiSource.requiredSourceIds,
    sourceFingerprints: input.handoff.multiSource.sourceMemberships.map((item) => item.sourceFingerprint),
    sourceRoles: input.handoff.multiSource.sourceMemberships.map((item) => ({ sourceId: item.sourceId, role: item.sourceRole })),
    rowCounts: input.handoff.multiSource.sourceMemberships.map((item) => ({ sourceId: item.sourceId, expected: item.boundary.sourceRowCount, actual: materializedRows.get(item.sourceId)! })),
    reportingPeriod: relationship.reportingPeriod,
    currency: relationship.currency,
    reportingPeriodEvidence: input.dataset.orderedSourceMemberships.flatMap((member) => member.overlay.sourceEvidenceDeclarations.filter((item) => item.validationStatus === "valid" && item.value.kind === "reporting_period").map((item) => ({ sourceId: member.sourceId, declarationId: item.declarationId }))),
    currencyEvidence: input.dataset.orderedSourceMemberships.flatMap((member) => member.overlay.sourceEvidenceDeclarations.filter((item) => item.validationStatus === "valid" && item.value.kind === "reporting_currency").map((item) => ({ sourceId: member.sourceId, declarationId: item.declarationId, currency: item.value.kind === "reporting_currency" ? item.value.currency : "" }))),
    metricId: input.request.plan.metricId,
    actionId: input.request.plan.actionId,
    queryPlanIdentity: input.handoff.multiSource.queryPlanIdentity,
    executionScope: "full_file_multisource",
    limitations: analysis!.limitations,
    prohibitedUses: analysis!.prohibitedUses,
  } : null;
  return { schemaVersion: "lightbi.canonical-multisource-execution-result.v1", status: executed ? "executed" : "failed", metricResult, evidence, blockers: executionBlockers };
}
