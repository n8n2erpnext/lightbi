import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';
import { enhancePlanWithGuardedSum } from './guarded-sum-bridge';
import { executeLocalDuckDB } from './local-duckdb-executor';
import type { RuntimeDatasetSource } from './runtime-dataset-source';
import type { RuntimePlanPreview } from './runtime-planner-preview';
import { createSafeSqlPreview, type SafeSqlPreview } from './safe-sql-preview';
import { sourceBindingsMatch, type CanonicalSourceBoundaryV1 } from './understanding-core/canonical-source-boundary';

export type GovernedDescriptivePreparation = {
  runtimePlan: RuntimePlanPreview;
  sqlPreview: SafeSqlPreview;
};

export function prepareGovernedDescriptiveAnalysis(
  runtimePlan: RuntimePlanPreview,
  rows: Record<string, unknown>[],
): GovernedDescriptivePreparation {
  const preparedPlan = enhancePlanWithGuardedSum(runtimePlan, rows);
  return { runtimePlan: preparedPlan, sqlPreview: createSafeSqlPreview(preparedPlan) };
}

function blocked(preparation: GovernedDescriptivePreparation, reasons: string[]): DuckDBPreviewResult {
  return {
    id: `governed-descriptive:${preparation.runtimePlan.id}`,
    sourceSqlPreviewId: preparation.sqlPreview.id,
    status: 'blocked',
    columns: [],
    rows: [],
    rowCount: 0,
    maxRows: 100,
    warnings: [...preparation.runtimePlan.warnings, 'DECISION_USE_PROHIBITED'],
    blockedReasons: reasons,
    errorMessage: reasons.join(', '),
    source: 'governed_duckdb_execution',
  };
}

export async function executeGovernedDescriptiveAnalysis(input: {
  preparation: GovernedDescriptivePreparation;
  rows: Record<string, unknown>[];
  runtimeDatasetSource?: RuntimeDatasetSource;
  sourceBoundary?: CanonicalSourceBoundaryV1;
  artifactIdentity?: string;
  signal?: AbortSignal;
}): Promise<DuckDBPreviewResult> {
  const { preparation, runtimeDatasetSource } = input;
  const blockers: string[] = [];
  if (!input.artifactIdentity) blockers.push('canonical_artifact_identity_required');
  if (!input.sourceBoundary) blockers.push('canonical_source_boundary_required');
  if (!runtimeDatasetSource?.files.length) blockers.push('canonical_full_file_runtime_source_required');
  if (runtimeDatasetSource && input.sourceBoundary && !sourceBindingsMatch(input.sourceBoundary, runtimeDatasetSource)) {
    blockers.push('canonical_runtime_source_binding_mismatch');
  }
  if (preparation.runtimePlan.status === 'blocked') blockers.push(...preparation.runtimePlan.blockedReasons);
  if (preparation.sqlPreview.status !== 'ready' || !preparation.sqlPreview.sql) {
    blockers.push(...(preparation.sqlPreview.blockedReasons.length ? preparation.sqlPreview.blockedReasons : ['governed_descriptive_query_plan_required']));
  }
  if (blockers.length) return blocked(preparation, [...new Set(blockers)]);

  const result = await executeLocalDuckDB({
    runtimePlan: preparation.runtimePlan,
    safeSqlPreview: preparation.sqlPreview,
    rows: input.rows,
    runtimeDatasetSource,
    expectedRuntimeBinding: runtimeDatasetSource!.binding,
    rowScope: 'full_file',
    limit: 100,
    signal: input.signal,
  });
  const fullFileValid = result.status !== 'executed'
    || (result.executionScope === 'full_file' && result.materializedRowCount === runtimeDatasetSource!.sourceRowCount);
  if (!fullFileValid) {
    return blocked(preparation, ['full_file_materialized_row_count_mismatch']);
  }
  return {
    ...result,
    warnings: [...new Set([...result.warnings, 'DECISION_USE_PROHIBITED', `canonical_artifact:${input.artifactIdentity}`])],
    source: 'governed_duckdb_execution',
  };
}
