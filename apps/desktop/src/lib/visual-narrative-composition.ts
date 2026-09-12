import { officialDomainStoryOrder } from './domain-visual-playbooks';

export const VISUAL_NARRATIVE_COMPOSITION_VERSION = 'lightbi.visual-narrative-composition.v1' as const;

export type VisualNarrativeStoryRoleV1 =
  | 'answer' | 'comparison' | 'change' | 'driver' | 'composition'
  | 'distribution' | 'relationship' | 'risk' | 'evidence';

export type VisualNarrativeLayoutCountV1 = 1 | 3 | 5;
export type VisualNarrativeWidthIntentV1 = 'half' | 'wide' | 'full';
export type VisualNarrativeHeightIntentV1 = 'compact' | 'standard' | 'tall';
export type VisualNarrativePresentationV1 = 'single' | 'grouped_compare' | 'combo_bar_line';
export type VisualNarrativeComplementarityV1 =
  | 'primary_answer' | 'legal_combination' | 'same_metric_new_dimension'
  | 'same_metric_new_intent' | 'evidence_detail' | 'official_domain_complement';


export type VisualNarrativeStoryCombinationRequestV1 = {
  recipeId: string;
  companionCandidateId: string;
  presentation: 'grouped_compare' | 'combo_bar_line';
  allowExplicitMultiUnit: boolean;
};

export type VisualNarrativeStoryTargetV1 = {
  layoutCount: VisualNarrativeLayoutCountV1;
  companionRoles: VisualNarrativeStoryRoleV1[];
  combinationRequest?: VisualNarrativeStoryCombinationRequestV1 | null;
  source: 'pre_execution_story_plan' | 'derived_from_materialized_candidates';
};

export type VisualNarrativeCombinationTraceV1 = {
  requestedRecipeId: string | null;
  companionCandidateId: string | null;
  status: 'not_requested' | 'materialized' | 'rejected';
  reason: null | 'candidate_not_materialized' | 'candidate_not_admitted' | 'compatibility_failed';
};

export type VisualNarrativeDegradationV1 = {
  degradedFrom: 3 | 5 | null;
  missingRoles: VisualNarrativeStoryRoleV1[];
  reasons: Array<'planned_companion_not_materialized' | 'insufficient_legal_companions'>;
};

export type VisualNarrativeCombinationHintV1 = {
  groupId: string;
  mark: 'bar' | 'line' | 'reference';
  explicitUnitLabel: boolean;
};

export type VisualNarrativeCandidateV1 = {
  id: string;
  isPrimary?: boolean;
  managementQuestion: string;
  storyRole: VisualNarrativeStoryRoleV1;
  analyticalIntent: string;
  dimensionField?: string | null;
  metricIds: string[];
  unitFamily?: string | null;
  grainId?: string | null;
  sourceScopeKey: string;
  evidenceBacked: boolean;
  evidenceRefs: string[];
  decisionImportance: number;
  visualizationPlanId?: string | null;
  rendererFamily?: string | null;
  pointCount?: number;
  officialComplementToPrimary?: boolean;
  presentationDuplicateOfPrimary?: boolean;
  advisoryRankPrior?: number;
  combination?: VisualNarrativeCombinationHintV1 | null;
  complementarityToPrimary?: VisualNarrativeComplementarityV1;
};

export type VisualNarrativeUnitV1 = {
  id: string;
  candidateIds: string[];
  primaryAnchor: boolean;
  storyRole: VisualNarrativeStoryRoleV1;
  presentation: VisualNarrativePresentationV1;
  rendererFamilies: string[];
  visualizationPlanIds: string[];
  widthIntent: VisualNarrativeWidthIntentV1;
  heightIntent: VisualNarrativeHeightIntentV1;
  reason: string;
  reasonForInclusion: VisualNarrativeComplementarityV1;
};
export type VisualNarrativeRejectionReasonV1 =
  | 'evidence_required' | 'duplicate_question' | 'duplicate_story'
  | 'duplicate_information' | 'not_complementary' | 'visual_budget_exceeded'
  | 'story_target_degraded' | 'story_target_exceeded' | 'combination_not_materialized';

export type VisualNarrativeCompositionPlanV1 = {
  schemaVersion: typeof VISUAL_NARRATIVE_COMPOSITION_VERSION;
  primaryCandidateId: string;
  layoutCount: VisualNarrativeLayoutCountV1;
  layoutMode: 'single' | 'hero_plus_two' | 'hero_plus_four';
  target: VisualNarrativeStoryTargetV1;
  degradation: VisualNarrativeDegradationV1;
  combination: VisualNarrativeCombinationTraceV1;
  units: VisualNarrativeUnitV1[];
  rejected: Array<{ candidateId: string; reason: VisualNarrativeRejectionReasonV1 }>;
  governance: {
    evidenceRequired: true;
    primaryAnchorStable: true;
    duplicateSemanticVisualsForbidden: true;
    deterministicMembershipFinal: true;
    domainAuthority: 'presentation_policy_within_governed_evidence';
    mbAuthority: 'presentation_vote_within_legal_set';
    rawJoinAllowed: false;
    allowedVisualCounts: readonly [1, 3, 5];
  };
};

function normalize(value: string | null | undefined): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function metricKey(candidate: VisualNarrativeCandidateV1): string[] {
  return [...new Set(candidate.metricIds.map(normalize).filter(Boolean))].sort();
}

function metricsOverlap(left: VisualNarrativeCandidateV1, right: VisualNarrativeCandidateV1): boolean {
  const a = new Set(metricKey(left));
  return metricKey(right).some(metric => a.has(metric));
}

function metricsEquivalent(left: VisualNarrativeCandidateV1, right: VisualNarrativeCandidateV1): boolean {
  const a = metricKey(left);
  const b = metricKey(right);
  return a.length > 0 && a.join('|') === b.join('|');
}

function sameInformationShape(left: VisualNarrativeCandidateV1, right: VisualNarrativeCandidateV1): boolean {
  return normalize(left.dimensionField) === normalize(right.dimensionField)
    && metricsEquivalent(left, right);
}

function sameMetricIntent(left: VisualNarrativeCandidateV1, right: VisualNarrativeCandidateV1): boolean {
  return metricsEquivalent(left, right)
    && normalize(left.analyticalIntent) === normalize(right.analyticalIntent);
}

function sameStory(left: VisualNarrativeCandidateV1, right: VisualNarrativeCandidateV1): boolean {
  return left.storyRole === right.storyRole
    && normalize(left.dimensionField) === normalize(right.dimensionField)
    && metricKey(left).join('|') === metricKey(right).join('|');
}

function canCombine(left: VisualNarrativeCandidateV1, right: VisualNarrativeCandidateV1): boolean {
  if (!left.combination || !right.combination) return false;
  if (left.combination.groupId !== right.combination.groupId) return false;
  if (left.sourceScopeKey !== right.sourceScopeKey) return false;
  if (normalize(left.grainId) !== normalize(right.grainId)) return false;
  if (normalize(left.dimensionField) !== normalize(right.dimensionField)) return false;
  if (normalize(left.unitFamily) !== normalize(right.unitFamily)
    && (!left.combination.explicitUnitLabel || !right.combination.explicitUnitLabel)) return false;
  return true;
}
function complementarityToPrimary(
  primary: VisualNarrativeCandidateV1,
  candidate: VisualNarrativeCandidateV1,
): VisualNarrativeComplementarityV1 | null {
  if (canCombine(primary, candidate)) return 'legal_combination';
  if (candidate.officialComplementToPrimary) return 'official_domain_complement';
  if (!metricsOverlap(primary, candidate)) return null;
  const sameIntent = normalize(primary.analyticalIntent) === normalize(candidate.analyticalIntent);
  const sameDimension = normalize(primary.dimensionField) === normalize(candidate.dimensionField);

  // Changing only the grouping dimension is not new analytical information.
  // A Product/Brand/Category trio over the same record_count metric and the
  // same category-comparison intent is one story repeated three ways.
  if (metricsEquivalent(primary, candidate) && sameIntent) return null;

  if (!sameDimension) {
    return candidate.storyRole === 'evidence' ? 'evidence_detail' : 'same_metric_new_dimension';
  }
  if (!metricsEquivalent(primary, candidate)) {
    return candidate.storyRole === 'evidence' ? 'evidence_detail' : 'same_metric_new_intent';
  }
  return null;
}

function heightIntent(candidate: VisualNarrativeCandidateV1): VisualNarrativeHeightIntentV1 {
  const family = normalize(candidate.rendererFamily);
  const points = candidate.pointCount ?? 0;
  if (points <= 2 || ['number','bullet','sparkline'].includes(family)) return 'compact';
  if (['heatmap','cohort heatmap','scatter','bubble','sankey','small multiples','radar'].includes(family)) return 'tall';
  if (points <= 10) return 'compact';
  return 'standard';
}

function singleUnit(candidate: VisualNarrativeCandidateV1): VisualNarrativeUnitV1 {
  return {
    id: `visual-unit:${candidate.id}`,
    candidateIds: [candidate.id],
    primaryAnchor: Boolean(candidate.isPrimary),
    storyRole: candidate.storyRole,
    presentation: 'single',
    rendererFamilies: candidate.rendererFamily ? [candidate.rendererFamily] : [],
    visualizationPlanIds: candidate.visualizationPlanId ? [candidate.visualizationPlanId] : [],
    widthIntent: candidate.isPrimary ? 'full' : 'half',
    heightIntent: heightIntent(candidate),
    reason: candidate.isPrimary ? 'Direct visual answer and stable narrative anchor.' : 'Distinct evidence-backed complementary visual.',
    reasonForInclusion: candidate.complementarityToPrimary ?? (candidate.isPrimary ? 'primary_answer' : 'same_metric_new_dimension'),
  };
}
function combinedUnit(left: VisualNarrativeCandidateV1, right: VisualNarrativeCandidateV1): VisualNarrativeUnitV1 {
  const primary = left.isPrimary ? left : right.isPrimary ? right : (left.decisionImportance >= right.decisionImportance ? left : right);
  const sameUnit = normalize(left.unitFamily) === normalize(right.unitFamily);
  const marks = new Set([left.combination?.mark, right.combination?.mark]);
  const combo = !sameUnit || marks.has('line') || marks.has('reference');
  return {
    id: `visual-unit:${left.id}+${right.id}`,
    candidateIds: [left.id, right.id],
    primaryAnchor: Boolean(left.isPrimary || right.isPrimary),
    storyRole: primary.storyRole,
    presentation: combo ? 'combo_bar_line' : 'grouped_compare',
    rendererFamilies: [...new Set([left.rendererFamily, right.rendererFamily].filter((value): value is string => Boolean(value)))],
    visualizationPlanIds: [...new Set([left.visualizationPlanId, right.visualizationPlanId].filter((value): value is string => Boolean(value)))],
    widthIntent: left.isPrimary || right.isPrimary ? 'full' : 'half',
    heightIntent: [heightIntent(left), heightIntent(right)].includes('tall') ? 'tall' : 'standard',
    reason: 'Combined because governed visual layers share source scope, grain and dimension, with explicit unit semantics.',
    reasonForInclusion: 'legal_combination',
  };
}

function layoutMode(count: VisualNarrativeLayoutCountV1): VisualNarrativeCompositionPlanV1['layoutMode'] {
  if (count === 1) return 'single';
  if (count === 3) return 'hero_plus_two';
  return 'hero_plus_four';
}
export function createVisualNarrativeCompositionPlan(input: {
  candidates: VisualNarrativeCandidateV1[];
  officialDomainId?: string | null;
  storyTarget?: VisualNarrativeStoryTargetV1 | null;
}): VisualNarrativeCompositionPlanV1 {
  const primary = [...input.candidates]
    .filter(candidate => candidate.isPrimary)
    .sort((a, b) => b.decisionImportance - a.decisionImportance || a.id.localeCompare(b.id))[0];
  if (!primary) throw new Error('VISUAL_NARRATIVE_PRIMARY_REQUIRED');
  if (!primary.evidenceBacked || primary.evidenceRefs.length === 0) throw new Error('VISUAL_NARRATIVE_PRIMARY_EVIDENCE_REQUIRED');

  const rejected: VisualNarrativeCompositionPlanV1['rejected'] = [];
  primary.complementarityToPrimary = 'primary_answer';
  const deterministicallyAdmitted: VisualNarrativeCandidateV1[] = [primary];
  const seenQuestions = new Set([normalize(primary.managementQuestion)]);
  // Semantic admission is deliberately independent of Micro Brain ordering.
  // MB may rank already-admitted presentation choices, but it may never make an
  // unrelated or duplicate visual eligible.
  const others = input.candidates
    .filter(candidate => candidate.id !== primary.id)
    .sort((a, b) => b.decisionImportance - a.decisionImportance || a.id.localeCompare(b.id));

  for (const candidate of others) {
    if (!candidate.evidenceBacked || candidate.evidenceRefs.length === 0) {
      rejected.push({ candidateId: candidate.id, reason: 'evidence_required' });
      continue;
    }
    const question = normalize(candidate.managementQuestion);
    if (seenQuestions.has(question)) {
      rejected.push({ candidateId: candidate.id, reason: 'duplicate_question' });
      continue;
    }
    if (candidate.presentationDuplicateOfPrimary) {
      rejected.push({ candidateId: candidate.id, reason: 'duplicate_information' });
      continue;
    }
    if (deterministicallyAdmitted.some(existing => sameStory(existing, candidate))) {
      rejected.push({ candidateId: candidate.id, reason: 'duplicate_story' });
      continue;
    }
    if (deterministicallyAdmitted.some(existing => sameInformationShape(existing, candidate))) {
      rejected.push({ candidateId: candidate.id, reason: 'duplicate_information' });
      continue;
    }
    if (deterministicallyAdmitted.some(existing => sameMetricIntent(existing, candidate))) {
      rejected.push({ candidateId: candidate.id, reason: 'duplicate_information' });
      continue;
    }
    const relation = complementarityToPrimary(primary, candidate);
    if (!relation) {
      rejected.push({ candidateId: candidate.id, reason: 'not_complementary' });
      continue;
    }
    candidate.complementarityToPrimary = relation;
    seenQuestions.add(question);
    deterministicallyAdmitted.push(candidate);
  }

  const storyOrder = officialDomainStoryOrder(input.officialDomainId);
  const storyRank = new Map(storyOrder.map((role, index) => [role, index] as const));
  const defaultStoryRank = storyOrder.length + 1;
  const admittedSupports = deterministicallyAdmitted.slice(1);
  const derivedLayoutCount: VisualNarrativeLayoutCountV1 = admittedSupports.length >= 4 ? 5 : admittedSupports.length >= 2 ? 3 : 1;
  const target: VisualNarrativeStoryTargetV1 = input.storyTarget ?? {
    layoutCount: derivedLayoutCount,
    companionRoles: admittedSupports.slice(0, derivedLayoutCount === 5 ? 4 : derivedLayoutCount === 3 ? 2 : 0).map(candidate => candidate.storyRole),
    combinationRequest: null,
    source: 'derived_from_materialized_candidates',
  };
  const targetRoleRank = new Map(
    (target.source === 'pre_execution_story_plan' ? target.companionRoles : [])
      .map((role, index) => [role, index] as const),
  );
  const defaultTargetRank = targetRoleRank.size + 1;
  const eligible = [
    primary,
    ...admittedSupports.sort((a, b) =>
      (targetRoleRank.get(a.storyRole) ?? defaultTargetRank) - (targetRoleRank.get(b.storyRole) ?? defaultTargetRank)
      || (storyRank.get(a.storyRole) ?? defaultStoryRank) - (storyRank.get(b.storyRole) ?? defaultStoryRank)
      || (b.advisoryRankPrior ?? 0) - (a.advisoryRankPrior ?? 0)
      || b.decisionImportance - a.decisionImportance
      || a.id.localeCompare(b.id)),
  ];

  const candidateById = new Map(eligible.map(candidate => [candidate.id, candidate] as const));
  let units: VisualNarrativeUnitV1[] = [];
  const supports = eligible.slice(1);
  const requestedCombination = target.combinationRequest ?? null;
  const requestedCombinationInputCandidate = requestedCombination
    ? input.candidates.find(candidate => candidate.id === requestedCombination.companionCandidateId) ?? null
    : null;
  const requestedCombinationCandidate = requestedCombination
    ? supports.find(candidate => candidate.id === requestedCombination.companionCandidateId) ?? null
    : null;
  const requestedCombinationMaterialized = Boolean(
    requestedCombinationCandidate && canCombine(primary, requestedCombinationCandidate),
  );
  const combination: VisualNarrativeCombinationTraceV1 = !requestedCombination
    ? { requestedRecipeId: null, companionCandidateId: null, status: 'not_requested', reason: null }
    : !requestedCombinationInputCandidate || !requestedCombinationInputCandidate.evidenceBacked
      ? { requestedRecipeId: requestedCombination.recipeId, companionCandidateId: requestedCombination.companionCandidateId, status: 'rejected', reason: 'candidate_not_materialized' }
      : !requestedCombinationCandidate
        ? { requestedRecipeId: requestedCombination.recipeId, companionCandidateId: requestedCombination.companionCandidateId, status: 'rejected', reason: 'candidate_not_admitted' }
        : requestedCombinationMaterialized
          ? { requestedRecipeId: requestedCombination.recipeId, companionCandidateId: requestedCombination.companionCandidateId, status: 'materialized', reason: null }
          : { requestedRecipeId: requestedCombination.recipeId, companionCandidateId: requestedCombination.companionCandidateId, status: 'rejected', reason: 'compatibility_failed' };

  const standaloneSupports = requestedCombination
    ? supports.filter(candidate => candidate.id !== requestedCombination.companionCandidateId)
    : supports;
  const plannedPrimaryUnit = requestedCombinationMaterialized && requestedCombinationCandidate
    ? combinedUnit(primary, requestedCombinationCandidate)
    : singleUnit(primary);
  if (requestedCombination && requestedCombinationCandidate && !requestedCombinationMaterialized) {
    rejected.push({ candidateId: requestedCombinationCandidate.id, reason: 'combination_not_materialized' });
  }

  const targetSupportSlots = target.layoutCount - 1;
  if (target.layoutCount === 1) {
    if (requestedCombination) {
      units = [plannedPrimaryUnit];
      for (const candidate of standaloneSupports) rejected.push({ candidateId: candidate.id, reason: 'story_target_exceeded' });
    } else {
      // Compatibility fallback for callers that have not supplied a pre-execution
      // combination request. CPR-5 runtime paths always carry the request.
      const legacyCombination = supports.find(candidate => canCombine(primary, candidate));
      if (legacyCombination) {
        units = [combinedUnit(primary, legacyCombination)];
        for (const candidate of supports) {
          if (candidate.id !== legacyCombination.id) rejected.push({ candidateId: candidate.id, reason: 'story_target_exceeded' });
        }
      } else {
        units = [singleUnit(primary)];
        for (const candidate of supports) rejected.push({ candidateId: candidate.id, reason: 'story_target_exceeded' });
      }
    }
  } else if (standaloneSupports.length >= targetSupportSlots) {
    const chosen = standaloneSupports.slice(0, targetSupportSlots);
    units = [plannedPrimaryUnit, ...chosen.map(singleUnit)];
    for (const candidate of standaloneSupports.slice(targetSupportSlots)) rejected.push({ candidateId: candidate.id, reason: 'story_target_exceeded' });
  } else {
    const legalLowerCount: VisualNarrativeLayoutCountV1 = standaloneSupports.length >= 2 ? 3 : 1;
    if (legalLowerCount === 3) {
      units = [plannedPrimaryUnit, ...standaloneSupports.slice(0, 2).map(singleUnit)];
      for (const candidate of standaloneSupports.slice(2)) rejected.push({ candidateId: candidate.id, reason: 'story_target_degraded' });
    } else {
      units = [plannedPrimaryUnit];
      for (const candidate of standaloneSupports) rejected.push({ candidateId: candidate.id, reason: 'story_target_degraded' });
    }
  }

  units.sort((left, right) => Number(right.primaryAnchor) - Number(left.primaryAnchor));
  units = units.map(unit => ({ ...unit, widthIntent: unit.primaryAnchor ? 'full' : 'half' }));
  const count = units.length as VisualNarrativeLayoutCountV1;
  if (![1, 3, 5].includes(count)) throw new Error(`VISUAL_NARRATIVE_LAYOUT_INVALID:${count}`);
  const finalCandidateIds = new Set(units.flatMap(unit => unit.candidateIds));
  const finalRoles = new Set(
    [...finalCandidateIds]
      .map(candidateId => candidateById.get(candidateId)?.storyRole)
      .filter((role): role is VisualNarrativeStoryRoleV1 => Boolean(role) && role !== 'answer'),
  );
  const missingRoles = target.companionRoles.filter(role => !finalRoles.has(role));
  const degradedFrom = target.layoutCount > count && target.layoutCount !== 1 ? target.layoutCount as 3 | 5 : null;
  const degradation: VisualNarrativeDegradationV1 = {
    degradedFrom,
    missingRoles,
    reasons: degradedFrom
      ? [...new Set<VisualNarrativeDegradationV1['reasons'][number]>([
          ...(missingRoles.length > 0 ? ['planned_companion_not_materialized' as const] : []),
          'insufficient_legal_companions' as const,
        ])]
      : [],
  };

  return {
    schemaVersion: VISUAL_NARRATIVE_COMPOSITION_VERSION,
    primaryCandidateId: primary.id,
    layoutCount: count,
    layoutMode: layoutMode(count),
    target,
    degradation,
    combination,
    units,
    rejected,
    governance: {
      evidenceRequired: true,
      primaryAnchorStable: true,
      duplicateSemanticVisualsForbidden: true,
      deterministicMembershipFinal: true,
      domainAuthority: 'presentation_policy_within_governed_evidence',
      mbAuthority: 'presentation_vote_within_legal_set',
      rawJoinAllowed: false,
      allowedVisualCounts: [1, 3, 5],
    },
  };
}
