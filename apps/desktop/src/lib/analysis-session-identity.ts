import { ANALYSIS_WORKBOOK_VERSION, type AnalysisWorkbookPlanV1 } from './analysis-workbook';
import { DECISION_VISUALIZATION_PLAN_VERSION } from './decision-visualization-plan';
import type { CanonicalMultiSourceDatasetV1 } from './understanding-core/canonical-multisource-boundary';
import type { CanonicalSourceBoundaryV1 } from './understanding-core/canonical-source-boundary';

export const ANALYSIS_SESSION_IDENTITY_VERSION = 'lightbi.analysis-session-identity.v1' as const;

type SingleSourceAnchorV1 = {
  kind: 'single_source';
  datasetId: string;
  sourceId: string;
  sourceFingerprint: string;
  inspectionGeneration: string;
  profileGeneration: string;
};

type MultiSourceMembershipAnchorV1 = {
  sourceId: string;
  sourceFingerprint: string;
  inspectionGeneration: string;
  profileGeneration: string;
};

type MultiSourceAnchorV1 = {
  kind: 'multi_source';
  multiSourceDatasetId: string;
  identity: string;
  stateGeneration: string;
  relationshipArtifactId: string;
  memberships: MultiSourceMembershipAnchorV1[];
};

export type AnalysisSessionIdentityV1 = {
  schemaVersion: typeof ANALYSIS_SESSION_IDENTITY_VERSION;
  workbook: {
    schemaVersion: AnalysisWorkbookPlanV1['schemaVersion'];
    workbookId: string;
    perspectiveId: string;
    sourceCount: number;
  };
  decisionVisualization: {
    schemaVersion: NonNullable<AnalysisWorkbookPlanV1['decisionVisualizationPlan']>['schemaVersion'];
    planId: string;
    perspectiveId: string;
    sourceCount: number;
    dimensionField: string;
    metricIds: string[];
  };
  sourceAnchor: SingleSourceAnchorV1 | MultiSourceAnchorV1;
  authority: {
    persistedExecutionAuthority: false;
    requiresRevalidation: true;
    decisionUseAuthorized: false;
  };
};

export type AnalysisIdentityRevalidationV1 = {
  valid: boolean;
  blockers: string[];
};

type DatasetIdentitySurface = {
  canonicalSourceBoundary?: CanonicalSourceBoundaryV1 | null;
  canonicalMultiSourceDataset?: CanonicalMultiSourceDatasetV1 | null;
};

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.map(value => String(value)))];
}

function sourceRefsCompatible(plan: AnalysisWorkbookPlanV1, sourceIds: ReadonlySet<string>): boolean {
  const refs = plan.decisionVisualizationPlan?.sourceRefs ?? [];
  const boundIds = refs.map(ref => ref.sourceId).filter((value): value is string => Boolean(value));
  return boundIds.every(sourceId => sourceIds.has(sourceId));
}

export function createAnalysisSessionIdentity(
  plan: AnalysisWorkbookPlanV1 | null | undefined,
  dataset: DatasetIdentitySurface | null | undefined,
): AnalysisSessionIdentityV1 | null {
  const decision = plan?.decisionVisualizationPlan;
  if (!plan || !decision || !dataset) return null;
  if (plan.perspectiveId !== decision.perspectiveId || plan.sourceCount !== decision.sourceCount) return null;

  let sourceAnchor: AnalysisSessionIdentityV1['sourceAnchor'];
  const multi = dataset.canonicalMultiSourceDataset;
  if (multi) {
    if (plan.sourceCount !== multi.orderedSourceMemberships.length) return null;
    const sourceIds = new Set(multi.orderedSourceMemberships.map(member => member.sourceId));
    if (!sourceRefsCompatible(plan, sourceIds)) return null;
    sourceAnchor = {
      kind: 'multi_source',
      multiSourceDatasetId: multi.multiSourceDatasetId,
      identity: multi.identity,
      stateGeneration: multi.stateGeneration,
      relationshipArtifactId: multi.relationshipArtifactId,
      memberships: multi.orderedSourceMemberships.map(member => ({
        sourceId: member.sourceId,
        sourceFingerprint: member.sourceFingerprint,
        inspectionGeneration: member.inspectionGeneration,
        profileGeneration: member.profileGeneration,
      })),
    };
  } else {
    const boundary = dataset.canonicalSourceBoundary;
    if (!boundary || plan.sourceCount !== 1) return null;
    if (!sourceRefsCompatible(plan, new Set([boundary.sourceId]))) return null;
    sourceAnchor = {
      kind: 'single_source',
      datasetId: boundary.datasetId,
      sourceId: boundary.sourceId,
      sourceFingerprint: boundary.sourceFingerprint,
      inspectionGeneration: boundary.inspectionGeneration,
      profileGeneration: boundary.profileGeneration,
    };
  }

  return {
    schemaVersion: ANALYSIS_SESSION_IDENTITY_VERSION,
    workbook: {
      schemaVersion: plan.schemaVersion,
      workbookId: plan.workbookId,
      perspectiveId: plan.perspectiveId,
      sourceCount: plan.sourceCount,
    },
    decisionVisualization: {
      schemaVersion: decision.schemaVersion,
      planId: decision.planId,
      perspectiveId: decision.perspectiveId,
      sourceCount: decision.sourceCount,
      dimensionField: decision.result.dimensionField,
      metricIds: uniqueStrings(decision.result.metricIds),
    },
    sourceAnchor,
    authority: {
      persistedExecutionAuthority: false,
      requiresRevalidation: true,
      decisionUseAuthorized: false,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}

export function parseAnalysisSessionIdentity(value: unknown): AnalysisSessionIdentityV1 | null {
  if (!isRecord(value) || value.schemaVersion !== ANALYSIS_SESSION_IDENTITY_VERSION) return null;
  const workbook = value.workbook;
  const decision = value.decisionVisualization;
  const anchor = value.sourceAnchor;
  const authority = value.authority;
  if (!isRecord(workbook) || !isRecord(decision) || !isRecord(anchor) || !isRecord(authority)) return null;
  if (workbook.schemaVersion !== ANALYSIS_WORKBOOK_VERSION || typeof workbook.workbookId !== 'string' || !workbook.workbookId || typeof workbook.perspectiveId !== 'string' || !workbook.perspectiveId || !Number.isSafeInteger(workbook.sourceCount) || Number(workbook.sourceCount) < 1) return null;
  if (decision.schemaVersion !== DECISION_VISUALIZATION_PLAN_VERSION || typeof decision.planId !== 'string' || !decision.planId || typeof decision.perspectiveId !== 'string' || !decision.perspectiveId || !Number.isSafeInteger(decision.sourceCount) || Number(decision.sourceCount) < 1 || typeof decision.dimensionField !== 'string' || !decision.dimensionField || !isStringArray(decision.metricIds) || decision.metricIds.length === 0 || new Set(decision.metricIds).size !== decision.metricIds.length) return null;
  if (authority.persistedExecutionAuthority !== false || authority.requiresRevalidation !== true || authority.decisionUseAuthorized !== false) return null;
  if (anchor.kind === 'single_source') {
    for (const key of ['datasetId', 'sourceId', 'sourceFingerprint', 'inspectionGeneration', 'profileGeneration'] as const) if (typeof anchor[key] !== 'string') return null;
  } else if (anchor.kind === 'multi_source') {
    for (const key of ['multiSourceDatasetId', 'identity', 'stateGeneration', 'relationshipArtifactId'] as const) if (typeof anchor[key] !== 'string') return null;
    if (!Array.isArray(anchor.memberships) || anchor.memberships.length === 0 || !anchor.memberships.every(member => isRecord(member)
      && typeof member.sourceId === 'string' && typeof member.sourceFingerprint === 'string'
      && typeof member.inspectionGeneration === 'string' && typeof member.profileGeneration === 'string')) return null;
  } else return null;
  return value as AnalysisSessionIdentityV1;
}

function mismatch(blockers: string[], condition: boolean, code: string): void {
  if (!condition) blockers.push(code);
}

export function revalidateAnalysisSessionSourceIdentity(
  identity: AnalysisSessionIdentityV1,
  dataset: DatasetIdentitySurface | null | undefined,
): AnalysisIdentityRevalidationV1 {
  const blockers: string[] = [];
  if (identity.sourceAnchor.kind === 'single_source') {
    const current = dataset?.canonicalSourceBoundary;
    if (!current) return { valid: false, blockers: ['analysis_source_boundary_required'] };
    mismatch(blockers, current.datasetId === identity.sourceAnchor.datasetId, 'analysis_dataset_id_changed');
    mismatch(blockers, current.sourceId === identity.sourceAnchor.sourceId, 'analysis_source_id_changed');
    mismatch(blockers, current.sourceFingerprint === identity.sourceAnchor.sourceFingerprint, 'analysis_source_fingerprint_changed');
    mismatch(blockers, current.inspectionGeneration === identity.sourceAnchor.inspectionGeneration, 'analysis_inspection_generation_changed');
    mismatch(blockers, current.profileGeneration === identity.sourceAnchor.profileGeneration, 'analysis_profile_generation_changed');
  } else {
    const current = dataset?.canonicalMultiSourceDataset;
    if (!current) return { valid: false, blockers: ['analysis_multisource_dataset_rebuild_required'] };
    mismatch(blockers, current.multiSourceDatasetId === identity.sourceAnchor.multiSourceDatasetId, 'analysis_multisource_dataset_id_changed');
    mismatch(blockers, current.identity === identity.sourceAnchor.identity, 'analysis_multisource_identity_changed');
    mismatch(blockers, current.stateGeneration === identity.sourceAnchor.stateGeneration, 'analysis_multisource_generation_changed');
    mismatch(blockers, current.relationshipArtifactId === identity.sourceAnchor.relationshipArtifactId, 'analysis_relationship_artifact_changed');
    mismatch(blockers, current.orderedSourceMemberships.length === identity.sourceAnchor.memberships.length, 'analysis_membership_count_changed');
    identity.sourceAnchor.memberships.forEach((saved, index) => {
      const active = current.orderedSourceMemberships[index];
      if (!active) return;
      mismatch(blockers, active.sourceId === saved.sourceId, `analysis_membership_${index}_source_id_changed`);
      mismatch(blockers, active.sourceFingerprint === saved.sourceFingerprint, `analysis_membership_${index}_fingerprint_changed`);
      mismatch(blockers, active.inspectionGeneration === saved.inspectionGeneration, `analysis_membership_${index}_inspection_changed`);
      mismatch(blockers, active.profileGeneration === saved.profileGeneration, `analysis_membership_${index}_profile_changed`);
    });
  }
  return { valid: blockers.length === 0, blockers };
}

export function revalidateAnalysisSessionPlanIdentity(
  identity: AnalysisSessionIdentityV1,
  plan: AnalysisWorkbookPlanV1 | null | undefined,
): AnalysisIdentityRevalidationV1 {
  if (!plan?.decisionVisualizationPlan) return { valid: false, blockers: ['analysis_current_decision_plan_required'] };
  const blockers: string[] = [];
  const decision = plan.decisionVisualizationPlan;
  mismatch(blockers, plan.schemaVersion === identity.workbook.schemaVersion, 'analysis_workbook_schema_changed');
  mismatch(blockers, plan.workbookId === identity.workbook.workbookId, 'analysis_workbook_id_changed');
  mismatch(blockers, plan.perspectiveId === identity.workbook.perspectiveId, 'analysis_workbook_perspective_changed');
  mismatch(blockers, plan.sourceCount === identity.workbook.sourceCount, 'analysis_workbook_source_count_changed');
  mismatch(blockers, decision.schemaVersion === identity.decisionVisualization.schemaVersion, 'analysis_decision_schema_changed');
  mismatch(blockers, decision.planId === identity.decisionVisualization.planId, 'analysis_decision_plan_id_changed');
  mismatch(blockers, decision.perspectiveId === identity.decisionVisualization.perspectiveId, 'analysis_decision_perspective_changed');
  mismatch(blockers, decision.sourceCount === identity.decisionVisualization.sourceCount, 'analysis_decision_source_count_changed');
  mismatch(blockers, decision.result.dimensionField === identity.decisionVisualization.dimensionField, 'analysis_decision_dimension_changed');
  mismatch(blockers, JSON.stringify(uniqueStrings(decision.result.metricIds)) === JSON.stringify(identity.decisionVisualization.metricIds), 'analysis_decision_metrics_changed');
  return { valid: blockers.length === 0, blockers };
}
