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
  | 'same_metric_new_intent' | 'evidence_detail';

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
  | 'duplicate_information' | 'not_complementary' | 'layout_normalization' | 'visual_budget_exceeded';

export type VisualNarrativeCompositionPlanV1 = {
  schemaVersion: typeof VISUAL_NARRATIVE_COMPOSITION_VERSION;
  primaryCandidateId: string;
  layoutCount: VisualNarrativeLayoutCountV1;
  layoutMode: 'single' | 'hero_plus_two' | 'hero_plus_four';
  units: VisualNarrativeUnitV1[];
  rejected: Array<{ candidateId: string; reason: VisualNarrativeRejectionReasonV1 }>;
  governance: {
    evidenceRequired: true;
    primaryAnchorStable: true;
    duplicateSemanticVisualsForbidden: true;
    deterministicMembershipFinal: true;
    domainAuthority: 'advisory_only';
    mbAuthority: 'advisory_only';
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

  const eligible = [
    primary,
    ...deterministicallyAdmitted.slice(1).sort((a, b) =>
      (b.advisoryRankPrior ?? 0) - (a.advisoryRankPrior ?? 0)
      || b.decisionImportance - a.decisionImportance
      || a.id.localeCompare(b.id)),
  ];

  let units = eligible.slice(0, 5).map(singleUnit);
  for (const candidate of eligible.slice(5)) {
    rejected.push({ candidateId: candidate.id, reason: 'visual_budget_exceeded' });
  }

  const candidateById = new Map(eligible.map(candidate => [candidate.id, candidate] as const));
  const mergeAt = (leftIndex: number, rightIndex: number): boolean => {
    const leftIds = units[leftIndex]?.candidateIds ?? [];
    const rightIds = units[rightIndex]?.candidateIds ?? [];
    if (leftIds.length !== 1 || rightIds.length !== 1) return false;
    const left = candidateById.get(leftIds[0]);
    const right = candidateById.get(rightIds[0]);
    if (!left || !right || !canCombine(left, right)) return false;
    const merged = combinedUnit(left, right);
    units = units.filter((_unit, index) => index !== leftIndex && index !== rightIndex);
    units.push(merged);
    return true;
  };
  if (units.length === 2) {
    if (!mergeAt(0, 1)) {
      const demoted = units.find(unit => !unit.primaryAnchor) ?? units[1];
      for (const candidateId of demoted.candidateIds) rejected.push({ candidateId, reason: 'layout_normalization' });
      units = units.filter(unit => unit !== demoted);
    }
  }

  if (units.length === 4) {
    let merged = false;
    for (let left = 1; left < units.length && !merged; left += 1) {
      for (let right = left + 1; right < units.length && !merged; right += 1) merged = mergeAt(left, right);
    }
    if (!merged) {
      for (let right = 1; right < units.length && !merged; right += 1) merged = mergeAt(0, right);
    }
    if (!merged) {
      const demoted = [...units].reverse().find(unit => !unit.primaryAnchor) ?? units[units.length - 1];
      for (const candidateId of demoted.candidateIds) rejected.push({ candidateId, reason: 'layout_normalization' });
      units = units.filter(unit => unit !== demoted);
    }
  }

  units.sort((left, right) => Number(right.primaryAnchor) - Number(left.primaryAnchor));
  units = units.map(unit => ({ ...unit, widthIntent: unit.primaryAnchor ? 'full' : 'half' }));
  const count = units.length as VisualNarrativeLayoutCountV1;
  if (![1, 3, 5].includes(count)) throw new Error(`VISUAL_NARRATIVE_LAYOUT_INVALID:${count}`);

  return {
    schemaVersion: VISUAL_NARRATIVE_COMPOSITION_VERSION,
    primaryCandidateId: primary.id,
    layoutCount: count,
    layoutMode: layoutMode(count),
    units,
    rejected,
    governance: {
      evidenceRequired: true,
      primaryAnchorStable: true,
      duplicateSemanticVisualsForbidden: true,
      deterministicMembershipFinal: true,
      domainAuthority: 'advisory_only',
      mbAuthority: 'advisory_only',
      rawJoinAllowed: false,
      allowedVisualCounts: [1, 3, 5],
    },
  };
}
