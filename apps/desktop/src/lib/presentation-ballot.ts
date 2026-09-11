import type { MicroBrainPresentationAdviceV1 } from './understanding-core/micro-brain/presentation-advisor';
import type { VisualNarrativeStoryRoleV1 } from './visual-narrative-composition';

export const PRESENTATION_BALLOT_VERSION = 'lightbi.presentation-ballot.v1' as const;

export type PresentationBallotStageV1 = 'pre_execution' | 'post_execution';
export type PresentationBallotSelectionBasisV1 = 'mb_vote' | 'domain_policy' | 'default_policy' | 'abstained';
export type PresentationBallotOutcomeV1 = 'selected' | 'hard_veto' | 'legal_not_selected';

export type PresentationBallotOptionV1 = {
  optionId: string;
  legal: boolean;
  hardVetoReasons?: string[];
};

export type PresentationBallotVoteTraceV1 = {
  optionId: string;
  legal: boolean;
  hardVetoReasons: string[];
  mbRank: number | null;
  domainRank: number | null;
  defaultRank: number | null;
  outcome: PresentationBallotOutcomeV1;
};

export type PresentationBallotTraceV1 = {
  schemaVersion: typeof PRESENTATION_BALLOT_VERSION;
  stage: PresentationBallotStageV1;
  selectionBasis: PresentationBallotSelectionBasisV1;
  selectedOptionIds: string[];
  votes: PresentationBallotVoteTraceV1[];
  governance: {
    mbMayChooseWithinLegalSet: true;
    deterministicAuthority: 'hard_veto_only';
    mayAuthorizeMetric: false;
    mayAuthorizeFormula: false;
    mayAuthorizeJoin: false;
    mayMutateUnderstanding: false;
  };
};

const STORY_ROLES = new Set<VisualNarrativeStoryRoleV1>([
  'answer', 'comparison', 'change', 'driver', 'composition',
  'distribution', 'relationship', 'risk', 'evidence',
]);

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
}

function rankMap(values: readonly string[]): Map<string, number> {
  return new Map(unique(values).map((value, index) => [value, index] as const));
}

export function microBrainStoryRoleOrder(advice: MicroBrainPresentationAdviceV1): VisualNarrativeStoryRoleV1[] {
  const values = advice.candidates.flatMap(candidate => [
    ...(candidate.presentation.requiredRoles ?? []),
    ...(candidate.presentation.dashboardRoles ?? []),
    ...(candidate.presentation.optionalRoles ?? []),
    ...(candidate.presentation.priorities ?? []),
  ]);
  return unique(values)
    .map(value => value.toLowerCase().replace(/[^a-z0-9]+/g, '_'))
    .filter((value): value is VisualNarrativeStoryRoleV1 => STORY_ROLES.has(value as VisualNarrativeStoryRoleV1));
}

export function createPresentationBallot(input: {
  stage: PresentationBallotStageV1;
  options: readonly PresentationBallotOptionV1[];
  mbPreferredOptionIds?: readonly string[];
  domainPreferredOptionIds?: readonly string[];
  defaultOptionIds?: readonly string[];
  limit?: number;
}): PresentationBallotTraceV1 {
  const options = [...input.options];
  const legalIds = new Set(options.filter(option => option.legal).map(option => option.optionId));
  const mb = unique(input.mbPreferredOptionIds ?? []).filter(id => legalIds.has(id));
  const domain = unique(input.domainPreferredOptionIds ?? []).filter(id => legalIds.has(id));
  const defaults = unique(input.defaultOptionIds ?? []).filter(id => legalIds.has(id));
  const fallback = options.filter(option => option.legal).map(option => option.optionId);

  const selectionBasis: PresentationBallotSelectionBasisV1 = mb.length > 0
    ? 'mb_vote'
    : domain.length > 0
      ? 'domain_policy'
      : defaults.length > 0 || fallback.length > 0
        ? 'default_policy'
        : 'abstained';
  const ordered = selectionBasis === 'mb_vote'
    ? unique([...mb, ...domain, ...defaults, ...fallback])
    : selectionBasis === 'domain_policy'
      ? unique([...domain, ...defaults, ...fallback])
      : unique([...defaults, ...fallback]);
  const limit = Math.max(0, Math.min(ordered.length, Math.trunc(input.limit ?? 1)));
  const selectedOptionIds = ordered.slice(0, limit);
  const selected = new Set(selectedOptionIds);
  const mbRanks = rankMap(input.mbPreferredOptionIds ?? []);
  const domainRanks = rankMap(input.domainPreferredOptionIds ?? []);
  const defaultRanks = rankMap(input.defaultOptionIds ?? []);

  return {
    schemaVersion: PRESENTATION_BALLOT_VERSION,
    stage: input.stage,
    selectionBasis,
    selectedOptionIds,
    votes: options.map(option => ({
      optionId: option.optionId,
      legal: option.legal,
      hardVetoReasons: [...(option.hardVetoReasons ?? [])],
      mbRank: mbRanks.get(option.optionId) ?? null,
      domainRank: domainRanks.get(option.optionId) ?? null,
      defaultRank: defaultRanks.get(option.optionId) ?? null,
      outcome: option.legal ? (selected.has(option.optionId) ? 'selected' : 'legal_not_selected') : 'hard_veto',
    })),
    governance: {
      mbMayChooseWithinLegalSet: true,
      deterministicAuthority: 'hard_veto_only',
      mayAuthorizeMetric: false,
      mayAuthorizeFormula: false,
      mayAuthorizeJoin: false,
      mayMutateUnderstanding: false,
    },
  };
}
