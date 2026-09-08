import { analysisShapeKey, normalizeAnalysisField } from './dashboard-evidence-dedup';

export const DASHBOARD_COMPOSITION_PLAN_VERSION = 'lightbi.dashboard-composition-plan.v1' as const;

export type DashboardStoryStageV1 = 'overview' | 'drivers' | 'risk' | 'evidence';
export type DashboardSemanticRoleV1 =
  | 'hero_metric' | 'context_metric' | 'primary_answer' | 'trend_context' | 'ranked_driver'
  | 'composition_context' | 'target_progress' | 'relationship_context' | 'risk_exception' | 'evidence_table';
export type DashboardArtifactKindV1 = 'metric' | 'visual' | 'narrative' | 'evidence';
export type DashboardCompositionRejectionReasonV1 =
  | 'evidence_required'
  | 'duplicate_management_question'
  | 'duplicate_analysis_shape'
  | 'comparison_metric_mismatch'
  | 'comparison_grain_mismatch'
  | 'item_budget_exceeded'
  | 'metric_budget_exceeded'
  | 'visual_budget_exceeded'
  | 'narrative_budget_exceeded';

export type DashboardCompositionCandidateV1 = {
  id: string;
  managementQuestion: string;
  semanticRole: DashboardSemanticRoleV1;
  artifactKind: DashboardArtifactKindV1;
  evidenceBacked: boolean;
  evidenceRefs: string[];
  decisionImportance: number;
  analysisShape?: { dimension?: string | null; measure?: string | null };
  advisoryRoles?: string[];
  comparison?: { groupId: string; metricId: string; grainId: string };
  visualizationPlanId?: string | null;
  placementGroup?: 'hero' | 'support_band' | 'primary_canvas' | 'supporting' | 'evidence';
  widthIntent?: 'compact' | 'half' | 'wide' | 'full';
  heightIntent?: 'compact' | 'standard' | 'tall';
  reasonForInclusion: string;
  metadata?: Record<string, unknown>;
};
export type DashboardInformationBudgetV1 = {
  maxItems: number;
  maxMetrics?: number;
  maxVisuals?: number;
  maxNarratives?: number;
};

export type DashboardCompositionPlanItemV1 = {
  candidateId: string;
  order: number;
  storyStage: DashboardStoryStageV1;
  semanticRole: DashboardSemanticRoleV1;
  artifactKind: DashboardArtifactKindV1;
  managementQuestion: string;
  decisionImportance: number;
  matchedAdvisoryRole: string | null;
  evidenceRefs: string[];
  visualizationPlanId: string | null;
  placementGroup: 'hero' | 'support_band' | 'primary_canvas' | 'supporting' | 'evidence' | null;
  widthIntent: 'compact' | 'half' | 'wide' | 'full';
  heightIntent: 'compact' | 'standard' | 'tall';
  reasonForInclusion: string;
  metadata: Record<string, unknown>;
};

export type DashboardCompositionPlanV1 = {
  schemaVersion: typeof DASHBOARD_COMPOSITION_PLAN_VERSION;
  planId: string;
  items: DashboardCompositionPlanItemV1[];
  rejected: Array<{ candidateId: string; reason: DashboardCompositionRejectionReasonV1 }>;
  informationBudget: DashboardInformationBudgetV1;
  context: {
    decisionPerspective: string;
    audience: string | null;
    audienceSource: 'explicit' | 'unavailable';
    domainId: string | null;
  };
  policy: {
    evidenceRequired: true;
    distinctManagementQuestionRequired: true;
    analyticalShapeDedup: true;
    comparativeCompatibilityRequired: true;
    membershipBeforeAdvisoryOrdering: true;
    informationBudgetMode: 'caller_supplied_relevance_budget';
  };
  governance: {
    evidenceRequired: true;
    distinctManagementQuestionRequired: true;
    deterministicMembershipFinal: true;
    mbAuthority: 'advisory_only';
    mbMayChangeMembership: false;
  };
};
const STAGE_FOR_ROLE: Record<DashboardSemanticRoleV1, DashboardStoryStageV1> = {
  hero_metric: 'overview', context_metric: 'overview', primary_answer: 'overview',
  trend_context: 'drivers', ranked_driver: 'drivers', composition_context: 'drivers',
  target_progress: 'drivers', relationship_context: 'drivers', risk_exception: 'risk', evidence_table: 'evidence',
};
const STAGE_ORDER: Record<DashboardStoryStageV1, number> = {
  overview: 0,
  drivers: 1,
  risk: 2,
  evidence: 3,
};
const ARTIFACT_ORDER: Record<DashboardArtifactKindV1, number> = {
  metric: 0,
  visual: 1,
  narrative: 2,
  evidence: 3,
};
const DEFAULT_LAYOUT_FOR_ROLE: Record<DashboardSemanticRoleV1, { widthIntent: DashboardCompositionPlanItemV1['widthIntent']; heightIntent: DashboardCompositionPlanItemV1['heightIntent'] }> = {
  hero_metric: { widthIntent: 'compact', heightIntent: 'compact' },
  context_metric: { widthIntent: 'compact', heightIntent: 'compact' },
  primary_answer: { widthIntent: 'wide', heightIntent: 'standard' },
  trend_context: { widthIntent: 'wide', heightIntent: 'standard' },
  ranked_driver: { widthIntent: 'half', heightIntent: 'standard' },
  composition_context: { widthIntent: 'half', heightIntent: 'standard' },
  target_progress: { widthIntent: 'half', heightIntent: 'standard' },
  relationship_context: { widthIntent: 'half', heightIntent: 'standard' },
  risk_exception: { widthIntent: 'half', heightIntent: 'standard' },
  evidence_table: { widthIntent: 'full', heightIntent: 'tall' },
};

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `dashboard-composition:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function normalizedQuestion(value: string): string {
  return normalizeAnalysisField(value);
}

function validateCandidate(candidate: DashboardCompositionCandidateV1): void {
  if (!candidate.id.trim()) throw new Error('DASHBOARD_COMPOSITION_CANDIDATE_ID_REQUIRED');
  if (!normalizedQuestion(candidate.managementQuestion)) throw new Error('DASHBOARD_COMPOSITION_MANAGEMENT_QUESTION_REQUIRED');
  if (!Number.isFinite(candidate.decisionImportance)) throw new Error('DASHBOARD_COMPOSITION_IMPORTANCE_REQUIRED');
  if (!candidate.reasonForInclusion.trim()) throw new Error('DASHBOARD_COMPOSITION_INCLUSION_REASON_REQUIRED');
}

function storyStage(candidate: DashboardCompositionCandidateV1): DashboardStoryStageV1 {
  return STAGE_FOR_ROLE[candidate.semanticRole];
}

function deterministicComparator(a: DashboardCompositionCandidateV1, b: DashboardCompositionCandidateV1): number {
  return STAGE_ORDER[storyStage(a)] - STAGE_ORDER[storyStage(b)]
    || b.decisionImportance - a.decisionImportance
    || ARTIFACT_ORDER[a.artifactKind] - ARTIFACT_ORDER[b.artifactKind]
    || normalizedQuestion(a.managementQuestion).localeCompare(normalizedQuestion(b.managementQuestion))
    || a.id.localeCompare(b.id);
}
function comparisonRejections(candidates: DashboardCompositionCandidateV1[]): Map<string, DashboardCompositionRejectionReasonV1> {
  const byGroup = new Map<string, DashboardCompositionCandidateV1[]>();
  for (const candidate of candidates) {
    if (!candidate.comparison) continue;
    const group = byGroup.get(candidate.comparison.groupId) ?? [];
    group.push(candidate);
    byGroup.set(candidate.comparison.groupId, group);
  }
  const rejected = new Map<string, DashboardCompositionRejectionReasonV1>();
  for (const group of byGroup.values()) {
    const metrics = new Set(group.map(candidate => normalizeAnalysisField(candidate.comparison?.metricId)));
    const grains = new Set(group.map(candidate => normalizeAnalysisField(candidate.comparison?.grainId)));
    const reason = metrics.size > 1 ? 'comparison_metric_mismatch' : grains.size > 1 ? 'comparison_grain_mismatch' : null;
    if (reason) for (const candidate of group) rejected.set(candidate.id, reason);
  }
  return rejected;
}

function matchedAdvisoryRole(candidate: DashboardCompositionCandidateV1, advisoryRoleOrder: string[]): string | null {
  const roles = new Set((candidate.advisoryRoles ?? []).map(normalizeAnalysisField));
  for (const role of advisoryRoleOrder) {
    if (roles.has(normalizeAnalysisField(role))) return role;
  }
  return null;
}

function advisoryComparator(advisoryRoleOrder: string[]) {
  const rank = (candidate: DashboardCompositionCandidateV1) => {
    const normalized = new Set((candidate.advisoryRoles ?? []).map(normalizeAnalysisField));
    const index = advisoryRoleOrder.findIndex(role => normalized.has(normalizeAnalysisField(role)));
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  };
  return (a: DashboardCompositionCandidateV1, b: DashboardCompositionCandidateV1): number =>
    STAGE_ORDER[storyStage(a)] - STAGE_ORDER[storyStage(b)]
      || b.decisionImportance - a.decisionImportance
      || ARTIFACT_ORDER[a.artifactKind] - ARTIFACT_ORDER[b.artifactKind]
      || rank(a) - rank(b)
      || normalizedQuestion(a.managementQuestion).localeCompare(normalizedQuestion(b.managementQuestion))
      || a.id.localeCompare(b.id);
}
export function createDashboardCompositionPlan(input: {
  candidates: DashboardCompositionCandidateV1[];
  informationBudget: DashboardInformationBudgetV1;
  decisionPerspective: string;
  audience?: string | null;
  domainId?: string | null;
  advisoryRoleOrder?: string[];
}): DashboardCompositionPlanV1 {
  if (!String(input.decisionPerspective ?? '').trim()) throw new Error('DASHBOARD_COMPOSITION_DECISION_PERSPECTIVE_REQUIRED');
  if (!Number.isInteger(input.informationBudget.maxItems) || input.informationBudget.maxItems < 1) {
    throw new Error('DASHBOARD_COMPOSITION_ITEM_BUDGET_REQUIRED');
  }
  const ids = new Set<string>();
  for (const candidate of input.candidates) {
    validateCandidate(candidate);
    if (ids.has(candidate.id)) throw new Error('DASHBOARD_COMPOSITION_DUPLICATE_CANDIDATE_ID');
    ids.add(candidate.id);
  }
  const deterministic = [...input.candidates].sort(deterministicComparator);
  const comparisonRejected = comparisonRejections(deterministic);
  const admitted: DashboardCompositionCandidateV1[] = [];
  const rejected: DashboardCompositionPlanV1['rejected'] = [];
  const seenQuestions = new Set<string>();
  const seenShapes = new Set<string>();
  let metricCount = 0;
  let visualCount = 0;
  let narrativeCount = 0;

  const reject = (candidate: DashboardCompositionCandidateV1, reason: DashboardCompositionRejectionReasonV1) => {
    rejected.push({ candidateId: candidate.id, reason });
  };
  for (const candidate of deterministic) {
    if (!candidate.evidenceBacked || candidate.evidenceRefs.length === 0) { reject(candidate, 'evidence_required'); continue; }
    const comparisonReason = comparisonRejected.get(candidate.id);
    if (comparisonReason) { reject(candidate, comparisonReason); continue; }
    const question = normalizedQuestion(candidate.managementQuestion);
    if (seenQuestions.has(question)) { reject(candidate, 'duplicate_management_question'); continue; }
    const shape = candidate.analysisShape
      ? analysisShapeKey(candidate.analysisShape.dimension, candidate.analysisShape.measure)
      : null;
    if (shape && seenShapes.has(shape)) { reject(candidate, 'duplicate_analysis_shape'); continue; }
    if (admitted.length >= input.informationBudget.maxItems) { reject(candidate, 'item_budget_exceeded'); continue; }
    if (candidate.artifactKind === 'metric' && input.informationBudget.maxMetrics != null && metricCount >= input.informationBudget.maxMetrics) {
      reject(candidate, 'metric_budget_exceeded'); continue;
    }
    if (candidate.artifactKind === 'visual' && input.informationBudget.maxVisuals != null && visualCount >= input.informationBudget.maxVisuals) {
      reject(candidate, 'visual_budget_exceeded'); continue;
    }
    if (candidate.artifactKind === 'narrative' && input.informationBudget.maxNarratives != null && narrativeCount >= input.informationBudget.maxNarratives) {
      reject(candidate, 'narrative_budget_exceeded'); continue;
    }
    admitted.push(candidate);
    seenQuestions.add(question);
    if (shape) seenShapes.add(shape);
    if (candidate.artifactKind === 'metric') metricCount += 1;
    if (candidate.artifactKind === 'visual') visualCount += 1;
    if (candidate.artifactKind === 'narrative') narrativeCount += 1;
  }

  const advisoryRoleOrder = input.advisoryRoleOrder ?? [];
  const ordered = [...admitted].sort(advisoryComparator(advisoryRoleOrder));
  const seed = JSON.stringify({
    candidates: deterministic.map(candidate => ({ ...candidate, advisoryRoles: [...(candidate.advisoryRoles ?? [])].sort() })),
    informationBudget: input.informationBudget,
    advisoryRoleOrder,
    decisionPerspective: input.decisionPerspective.trim(),
    audience: input.audience?.trim() || null,
    domainId: input.domainId?.trim() || null,
  });
  return {
    schemaVersion: DASHBOARD_COMPOSITION_PLAN_VERSION,
    planId: stableId(seed),
    items: ordered.map((candidate, order) => ({
      candidateId: candidate.id,
      order,
      storyStage: storyStage(candidate),
      semanticRole: candidate.semanticRole,
      artifactKind: candidate.artifactKind,
      managementQuestion: candidate.managementQuestion,
      decisionImportance: candidate.decisionImportance,
      matchedAdvisoryRole: matchedAdvisoryRole(candidate, advisoryRoleOrder),
      evidenceRefs: [...candidate.evidenceRefs],
      visualizationPlanId: candidate.visualizationPlanId ?? null,
      placementGroup: candidate.placementGroup ?? null,
      widthIntent: candidate.widthIntent ?? DEFAULT_LAYOUT_FOR_ROLE[candidate.semanticRole].widthIntent,
      heightIntent: candidate.heightIntent ?? DEFAULT_LAYOUT_FOR_ROLE[candidate.semanticRole].heightIntent,
      reasonForInclusion: candidate.reasonForInclusion,
      metadata: { ...(candidate.metadata ?? {}) },
    })),
    rejected,
    informationBudget: { ...input.informationBudget },
    context: {
      decisionPerspective: input.decisionPerspective.trim(),
      audience: input.audience?.trim() || null,
      audienceSource: input.audience?.trim() ? 'explicit' : 'unavailable',
      domainId: input.domainId?.trim() || null,
    },
    policy: {
      evidenceRequired: true,
      distinctManagementQuestionRequired: true,
      analyticalShapeDedup: true,
      comparativeCompatibilityRequired: true,
      membershipBeforeAdvisoryOrdering: true,
      informationBudgetMode: 'caller_supplied_relevance_budget',
    },
    governance: {
      evidenceRequired: true,
      distinctManagementQuestionRequired: true,
      deterministicMembershipFinal: true,
      mbAuthority: 'advisory_only',
      mbMayChangeMembership: false,
    },
  };
}
