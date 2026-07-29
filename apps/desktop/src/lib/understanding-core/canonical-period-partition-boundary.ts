import type {
  CanonicalConsumerArtifactV1,
  CanonicalInvestigationHandoffV1,
  GovernedMetricExecutionResultV1,
} from "./canonical-consumer-boundary";
import { prepareCanonicalInvestigationHandoff } from "./canonical-consumer-boundary";
import type { CanonicalSourceRoleV1 } from "./canonical-multisource-boundary";
import type { CanonicalUserOverlayV1 } from "./canonical-user-overlay";
import { validateCanonicalUserOverlay } from "./canonical-user-overlay";
import { deterministicPolicySha256 } from "./contextual-evidence-policy";
import { createGovernedLocalDuckDBBoundary } from "./governed-local-duckdb-boundary";
import { executeGovernedMetricRequest } from "./governed-metric-executor";
import { GOVERNED_FULL_SCOPE_TOTAL_COLUMN } from "./governed-metric-query-planner";

export const CANONICAL_PERIOD_PARTITION_WORKSPACE_VERSION = "lightbi.canonical-period-partition-workspace.v1" as const;

type PeriodValue = {
  start: string;
  end: string;
  label: string;
  declarationId: string;
};

export type CanonicalPeriodPartitionMemberV1 = {
  sourceId: string;
  sourceFingerprint: string;
  sourceArtifactId: string;
  sourceRole: CanonicalSourceRoleV1;
  period: PeriodValue;
  currency: string | null;
  currencyDeclarationId: string | null;
  metricId: string;
  actionCandidateId: string;
  handoff: CanonicalInvestigationHandoffV1;
  artifact: CanonicalConsumerArtifactV1;
  overlay: CanonicalUserOverlayV1;
};

export type CanonicalPeriodPartitionWorkspaceV1 = {
  schemaVersion: typeof CANONICAL_PERIOD_PARTITION_WORKSPACE_VERSION;
  workspaceId: string;
  identity: string;
  sourceRole: CanonicalSourceRoleV1;
  metricId: string;
  periodMembers: CanonicalPeriodPartitionMemberV1[];
  restrictions: string[];
  decisionUseAuthorized: false;
};

export type CanonicalPeriodPartitionBuildResultV1 =
  | { status: "valid"; workspace: CanonicalPeriodPartitionWorkspaceV1; blockers: [] }
  | { status: "invalid"; workspace: null; blockers: string[] };

export type CanonicalPeriodPartitionExecutionResultV1 = {
  schemaVersion: "lightbi.canonical-period-partition-execution-result.v1";
  status: "executed" | "blocked" | "failed";
  metricId: string;
  columns: ["reporting_period", string];
  rows: Array<Record<string, string | number>>;
  rowCount: number;
  memberResults: Array<{
    sourceId: string;
    period: string;
    expectedRows: number;
    result: GovernedMetricExecutionResultV1;
  }>;
  evidence: {
    workspaceIdentity: string;
    sourceIds: string[];
    sourceFingerprints: string[];
    periods: Array<{ sourceId: string; start: string; end: string; declarationId: string }>;
    currencies: Array<{ sourceId: string; currency: string | null; declarationId: string | null }>;
    executionScope: "full_file_period_partitions";
  } | null;
  blockers: string[];
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function activeDeclarations(overlay: CanonicalUserOverlayV1) {
  const superseded = new Set(overlay.sourceEvidenceDeclarations
    .map((item) => item.supersededDeclarationReference)
    .filter((item): item is string => Boolean(item)));
  return overlay.sourceEvidenceDeclarations
    .filter((item) => !superseded.has(item.declarationId) && item.validationStatus === "valid");
}

function declaredRole(overlay: CanonicalUserOverlayV1): { value: CanonicalSourceRoleV1; declarationId: string } | null {
  const item = activeDeclarations(overlay).find((candidate) => candidate.value.kind === "source_role");
  return item?.value.kind === "source_role" ? { value: item.value.role, declarationId: item.declarationId } : null;
}

function declaredPeriod(overlay: CanonicalUserOverlayV1): PeriodValue | null {
  const item = activeDeclarations(overlay).find((candidate) => candidate.value.kind === "reporting_period");
  if (item?.value.kind !== "reporting_period") return null;
  const startMonth = item.value.start.slice(0, 7);
  const endMonth = item.value.end.slice(0, 7);
  return {
    start: item.value.start,
    end: item.value.end,
    label: startMonth === endMonth ? startMonth : `${item.value.start}/${item.value.end}`,
    declarationId: item.declarationId,
  };
}

function declaredCurrency(overlay: CanonicalUserOverlayV1): { value: string; declarationId: string } | null {
  const item = activeDeclarations(overlay).find((candidate) => candidate.value.kind === "reporting_currency");
  return item?.value.kind === "reporting_currency"
    ? { value: item.value.currency.trim().toUpperCase(), declarationId: item.declarationId }
    : null;
}

export function buildCanonicalPeriodPartitionWorkspace(input: {
  workspaceId: string;
  metricId: string;
  members: Array<{ artifact: CanonicalConsumerArtifactV1; overlay: CanonicalUserOverlayV1 }>;
}): CanonicalPeriodPartitionBuildResultV1 {
  const blockers: string[] = [];
  if (!input.workspaceId.trim()) blockers.push("period_partition_workspace_id_required");
  if (!input.metricId.trim()) blockers.push("period_partition_metric_required");
  if (input.members.length < 2) blockers.push("period_partition_requires_two_sources");

  const projected = input.members.flatMap(({ artifact, overlay }) => {
    const boundary = artifact.sourceBoundary;
    if (!boundary) {
      blockers.push("period_partition_source_boundary_required");
      return [];
    }
    if (!validateCanonicalUserOverlay(boundary, overlay).valid || artifact.overlayIdentity !== overlay.overlayId) {
      blockers.push(`period_partition_overlay_invalid_or_stale:${boundary.sourceId}`);
      return [];
    }
    const role = declaredRole(overlay);
    const period = declaredPeriod(overlay);
    const currency = declaredCurrency(overlay);
    if (!role) blockers.push(`period_partition_source_role_required:${boundary.sourceId}`);
    if (!period) blockers.push(`period_partition_reporting_period_required:${boundary.sourceId}`);
    const action = artifact.questionGeneration.actionCandidates
      .find((candidate) => candidate.metricId === input.metricId);
    if (!action) blockers.push(`period_partition_metric_action_unavailable:${boundary.sourceId}:${input.metricId}`);
    const handoff = action ? prepareCanonicalInvestigationHandoff(artifact, action.actionCandidateId) : null;
    if (!handoff?.runtimePreflight.executionAllowed || handoff.queryPlanning.state !== "planned") {
      blockers.push(`period_partition_metric_not_executable:${boundary.sourceId}:${input.metricId}`);
    }
    if (!role || !period || !action || !handoff || handoff.queryPlanning.state !== "planned") return [];
    return [{
      sourceId: boundary.sourceId,
      sourceFingerprint: boundary.sourceFingerprint,
      sourceArtifactId: artifact.identity,
      sourceRole: role.value,
      period,
      currency: currency?.value ?? null,
      currencyDeclarationId: currency?.declarationId ?? null,
      metricId: input.metricId,
      actionCandidateId: action.actionCandidateId,
      handoff,
      artifact,
      overlay,
    }];
  });

  const roles = [...new Set(projected.map((member) => member.sourceRole))];
  if (roles.length > 1) blockers.push("period_partition_source_role_mismatch");
  const periods = projected.map((member) => member.period.label);
  if (new Set(periods).size !== periods.length) blockers.push("period_partition_duplicate_reporting_period");
  const currencies = unique(projected.flatMap((member) => member.currency ? [member.currency] : []));
  if (currencies.length > 1) blockers.push("period_partition_currency_mismatch");
  if (projected.some((member) => member.currency === null) && projected.some((member) => member.currency !== null)) {
    blockers.push("period_partition_currency_evidence_incomplete");
  }
  const finalBlockers = unique(blockers);
  if (finalBlockers.length) return { status: "invalid", workspace: null, blockers: finalBlockers };

  const periodMembers = [...projected].sort((left, right) =>
    left.period.start.localeCompare(right.period.start) || left.sourceId.localeCompare(right.sourceId));
  const identityBody = {
    schemaVersion: CANONICAL_PERIOD_PARTITION_WORKSPACE_VERSION,
    workspaceId: input.workspaceId,
    metricId: input.metricId,
    sourceRole: roles[0],
    members: periodMembers.map((member) => ({
      sourceId: member.sourceId,
      sourceFingerprint: member.sourceFingerprint,
      sourceArtifactId: member.sourceArtifactId,
      overlayIdentity: member.overlay.overlayId,
      period: member.period,
      currency: member.currency,
      actionCandidateId: member.actionCandidateId,
      queryPlanIdentity: member.handoff.queryPlanning.state === "planned" ? member.handoff.queryPlanning.plan.planId : null,
    })),
  };
  return {
    status: "valid",
    workspace: {
      schemaVersion: CANONICAL_PERIOD_PARTITION_WORKSPACE_VERSION,
      workspaceId: input.workspaceId,
      identity: `canonical-period-workspace:${deterministicPolicySha256(identityBody)}`,
      sourceRole: roles[0],
      metricId: input.metricId,
      periodMembers,
      restrictions: [
        "period_partitions_execute_independently",
        "no_cross_period_row_join",
        "same_metric_definition_required",
        "decision_use_prohibited",
      ],
      decisionUseAuthorized: false,
    },
    blockers: [],
  };
}

function metricTotal(result: GovernedMetricExecutionResultV1, metricId: string): number | null {
  const governedActual = result.groundTruthComparison?.actual;
  if (governedActual !== null && governedActual !== undefined && Number.isFinite(Number(governedActual))) return Number(governedActual);
  const fullScopeTotals = result.rows
    .map((row) => Number(row[GOVERNED_FULL_SCOPE_TOTAL_COLUMN]))
    .filter(Number.isFinite);
  if (fullScopeTotals.length) {
    const uniqueTotals = [...new Set(fullScopeTotals)];
    return uniqueTotals.length === 1 ? uniqueTotals[0] : null;
  }
  const values = result.rows.map((row) => Number(row[metricId])).filter(Number.isFinite);
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

export async function executeCanonicalPeriodPartitionWorkspace(
  workspace: CanonicalPeriodPartitionWorkspaceV1,
  options: {
    signal?: AbortSignal;
    executeMember?: (member: CanonicalPeriodPartitionMemberV1) => Promise<GovernedMetricExecutionResultV1>;
  } = {},
): Promise<CanonicalPeriodPartitionExecutionResultV1> {
  const executeMember = options.executeMember ?? (async (member) => {
    if (member.handoff.queryPlanning.state !== "planned" || !member.artifact.sourceBoundary) {
      throw new Error("period_partition_member_plan_not_ready");
    }
    const boundary = member.artifact.sourceBoundary;
    return executeGovernedMetricRequest({
      schemaVersion: "lightbi.governed-metric-execution-request.v1",
      requestId: `period-partition:${workspace.identity}:${member.sourceId}`,
      plan: member.handoff.queryPlanning.plan,
      rows: [],
      runtimeSource: boundary.runtimeSource,
      expectedRuntimeBinding: boundary.runtimeSource.binding,
      artifactIdentity: member.artifact.identity,
      expectedSourceRowCount: boundary.sourceRowCount,
      groundTruth: {
        state: "unavailable",
        value: null,
        tolerance: null,
        provenance: "period_partition_no_external_ground_truth",
      },
    }, createGovernedLocalDuckDBBoundary({
      runtimeSource: boundary.runtimeSource,
      expectedRuntimeBinding: boundary.runtimeSource.binding,
    }));
  });

  const memberResults: CanonicalPeriodPartitionExecutionResultV1["memberResults"] = [];
  const blockers: string[] = [];
  for (const member of workspace.periodMembers) {
    options.signal?.throwIfAborted();
    try {
      const result = await executeMember(member);
      memberResults.push({
        sourceId: member.sourceId,
        period: member.period.label,
        expectedRows: member.artifact.sourceBoundary?.sourceRowCount ?? 0,
        result,
      });
      if (result.status !== "executed") blockers.push(`period_partition_execution_${result.status}:${member.sourceId}`);
      if (metricTotal(result, workspace.metricId) === null) blockers.push(`period_partition_metric_result_missing:${member.sourceId}`);
    } catch (error) {
      blockers.push(`period_partition_execution_failed:${member.sourceId}:${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const finalBlockers = unique(blockers);
  const rows = finalBlockers.length ? [] : workspace.periodMembers.map((member) => {
    const result = memberResults.find((item) => item.sourceId === member.sourceId)!.result;
    return {
      reporting_period: member.period.label,
      [workspace.metricId]: metricTotal(result, workspace.metricId)!,
    };
  });
  return {
    schemaVersion: "lightbi.canonical-period-partition-execution-result.v1",
    status: finalBlockers.length ? (memberResults.length ? "failed" : "blocked") : "executed",
    metricId: workspace.metricId,
    columns: ["reporting_period", workspace.metricId],
    rows,
    rowCount: rows.length,
    memberResults,
    evidence: finalBlockers.length ? null : {
      workspaceIdentity: workspace.identity,
      sourceIds: workspace.periodMembers.map((member) => member.sourceId),
      sourceFingerprints: workspace.periodMembers.map((member) => member.sourceFingerprint),
      periods: workspace.periodMembers.map((member) => ({
        sourceId: member.sourceId,
        start: member.period.start,
        end: member.period.end,
        declarationId: member.period.declarationId,
      })),
      currencies: workspace.periodMembers.map((member) => ({
        sourceId: member.sourceId,
        currency: member.currency,
        declarationId: member.currencyDeclarationId,
      })),
      executionScope: "full_file_period_partitions",
    },
    blockers: finalBlockers,
  };
}
