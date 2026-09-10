import type { DatasetUnderstandingResult, DomainId, AnalysisAction } from './understanding-next/contracts';

export interface PerspectiveAnalysisBundle {
  domain: DomainId | null;
  primaryActionId: string;
  supportingActions: AnalysisAction[];
}

const DOMAIN_IDS = new Set<DomainId>(['operations', 'revenue', 'inventory', 'customer', 'performance', 'finance']);

function diversityKey(action: AnalysisAction): string {
  return `${action.actionKind}:${action.dimensions[0] ?? 'none'}:${action.measures[0] ?? action.derivedMeasures?.[0]?.id ?? 'none'}`;
}

function supportsSelectedPerspective(candidateDomain: DomainId | undefined, selectedDomain: DomainId | null): boolean {
  if (!selectedDomain) return true;
  if (candidateDomain === selectedDomain) return true;
  // Commercial value and financial outcome are two views of the same money
  // evidence. A finance brief needs revenue/cost trends as context, while a
  // revenue brief can use profit/margin as a guardrail. Keep every other
  // domain isolated so the chart set still follows the user's chosen angle.
  return (selectedDomain === 'finance' && candidateDomain === 'revenue')
    || (selectedDomain === 'revenue' && candidateDomain === 'finance');
}

export function createPerspectiveAnalysisBundle(
  understanding: DatasetUnderstandingResult,
  primaryActionId: string,
  selectedPerspectiveId?: string | null,
  maxSupporting = 6,
): PerspectiveAnalysisBundle {
  const action = understanding.availableActions.find(item => item.id === primaryActionId);
  const questionId = action?.questionId;
  const question = understanding.recommendedQuestions.find(item => item.id === questionId);
  const selectedDomain = selectedPerspectiveId && DOMAIN_IDS.has(selectedPerspectiveId as DomainId)
    ? selectedPerspectiveId as DomainId
    : question?.domain ?? null;
  const questionDomain = new Map(understanding.recommendedQuestions.map(item => [item.id, item.domain]));
  const questionFit = new Map(understanding.recommendedQuestions.map(item => [item.id, item.fitScore]));
  const seenShapes = new Set<string>();
  if (action) seenShapes.add(diversityKey(action));

  const eligible = understanding.availableActions
    .filter(candidate => candidate.id !== primaryActionId)
    // Registry and plugin actions are first-class. This stage is only a
    // resource-bounded execution pool; final presentation membership is
    // decided later by the visual narrative composer after evidence exists.
    .filter(candidate => candidate.executionScope !== 'not_supported')
    .filter(candidate => supportsSelectedPerspective(questionDomain.get(candidate.questionId), selectedDomain))
    .filter(candidate => {
      const key = diversityKey(candidate);
      if (seenShapes.has(key)) return false;
      seenShapes.add(key);
      return true;
    });

  const buckets = new Map<string, AnalysisAction[]>();
  for (const candidate of eligible) {
    const key = String(candidate.actionKind || 'unknown');
    const bucket = buckets.get(key) ?? [];
    bucket.push(candidate);
    buckets.set(key, bucket);
  }
  for (const bucket of buckets.values()) {
    bucket.sort((left, right) => Number(questionFit.get(right.questionId) ?? 0) - Number(questionFit.get(left.questionId) ?? 0)
      || right.dimensions.length - left.dimensions.length
      || left.label.localeCompare(right.label)
      || left.id.localeCompare(right.id));
  }
  const primaryKind = String(action?.actionKind ?? '');
  const kindOrder = [...buckets.keys()].sort((left, right) => {
    if (left === primaryKind && right !== primaryKind) return 1;
    if (right === primaryKind && left !== primaryKind) return -1;
    return left.localeCompare(right);
  });
  const supportingActions: AnalysisAction[] = [];
  const budget = Math.max(0, maxSupporting);
  while (supportingActions.length < budget) {
    let added = false;
    for (const kind of kindOrder) {
      const next = buckets.get(kind)?.shift();
      if (!next) continue;
      supportingActions.push(next);
      added = true;
      if (supportingActions.length >= budget) break;
    }
    if (!added) break;
  }

  return { domain: selectedDomain, primaryActionId, supportingActions };
}
