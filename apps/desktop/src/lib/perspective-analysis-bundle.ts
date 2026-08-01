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

export function createPerspectiveAnalysisBundle(
  understanding: DatasetUnderstandingResult,
  primaryActionId: string,
  selectedPerspectiveId?: string | null,
  maxSupporting = 3,
): PerspectiveAnalysisBundle {
  const action = understanding.availableActions.find(item => item.id === primaryActionId);
  const questionId = action?.questionId;
  const question = understanding.recommendedQuestions.find(item => item.id === questionId);
  const selectedDomain = selectedPerspectiveId && DOMAIN_IDS.has(selectedPerspectiveId as DomainId)
    ? selectedPerspectiveId as DomainId
    : question?.domain ?? null;
  const questionDomain = new Map(understanding.recommendedQuestions.map(item => [item.id, item.domain]));
  const seenShapes = new Set<string>();
  if (action) seenShapes.add(diversityKey(action));

  const supportingActions = understanding.availableActions
    .filter(candidate => candidate.id !== primaryActionId)
    // Registry and plugin actions are first-class. The old prefix was an
    // implementation detail, not a governance boundary; keeping it here made
    // newly declared domain questions disappear from Easy Mode charts.
    .filter(candidate => candidate.executionScope !== 'not_supported')
    .filter(candidate => !selectedDomain || questionDomain.get(candidate.questionId) === selectedDomain)
    .sort((left, right) => {
      const kindPriority = (value: AnalysisAction) => value.actionKind === 'trend' ? 3 : value.actionKind === 'group_by' ? 2 : value.actionKind === 'distribution' ? 1 : 0;
      return kindPriority(right) - kindPriority(left)
        || right.dimensions.length - left.dimensions.length
        || left.label.localeCompare(right.label);
    })
    .filter(candidate => {
      const key = diversityKey(candidate);
      if (seenShapes.has(key)) return false;
      seenShapes.add(key);
      return true;
    })
    .slice(0, Math.max(0, maxSupporting));

  return { domain: selectedDomain, primaryActionId, supportingActions };
}
