import {
  adviseMicroBrainPresentation,
  type MicroBrainPresentationAdviceV1,
  type MicroBrainPresentationQueryV1,
} from './understanding-core/micro-brain/presentation-advisor';

export type DashboardCompositionAdviceV1 = {
  roleOrder: string[];
  conceptIds: string[];
  brainVersion: string | null;
  indexVersion: string | null;
  authorityNotes: string[];
  governance: {
    authority: 'advisory_only';
    retrievalScoreIsConfidence: false;
    mayChangeMembership: false;
  };
};

export type DashboardCompositionAdviceInputV1 = {
  domainId?: string | null;
  perspectiveId?: string | null;
  userQuestion?: string;
  semanticSignals?: string[];
  availableRoles?: string[];
};type Advisor = (query: MicroBrainPresentationQueryV1) => MicroBrainPresentationAdviceV1;

const EMPTY: DashboardCompositionAdviceV1 = {
  roleOrder: [], conceptIds: [], brainVersion: null, indexVersion: null, authorityNotes: [],
  governance: { authority: 'advisory_only', retrievalScoreIsConfidence: false, mayChangeMembership: false },
};

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
}

export function adviseDashboardComposition(
  input: DashboardCompositionAdviceInputV1,
  options: { advisor?: Advisor } = {},
): DashboardCompositionAdviceV1 {
  const domainId = input.domainId?.trim() || null;
  const perspectiveId = input.perspectiveId?.trim() || null;
  if (!domainId && !perspectiveId) return { ...EMPTY, governance: { ...EMPTY.governance } };
  const raw = (options.advisor ?? adviseMicroBrainPresentation)({
    domainId: domainId ?? undefined,
    perspectiveId: perspectiveId ?? undefined,
    analyticalIntent: 'dashboard_composition',
    userQuestion: input.userQuestion,
    semanticSignals: input.semanticSignals,
    availableRoles: input.availableRoles,
    limit: 8,
  });  const eligible = raw.candidates.filter(candidate =>
    ['dashboard_narrative', 'perspective_profile', 'domain_profile', 'self_charter']
      .includes(candidate.presentation.advisoryKind));
  return {
    roleOrder: unique(eligible.flatMap(candidate => candidate.presentation.dashboardRoles ?? [])),
    conceptIds: unique(eligible.map(candidate => candidate.hit.conceptId)),
    brainVersion: raw.brainVersion,
    indexVersion: raw.indexVersion,
    authorityNotes: [...raw.authorityNotes],
    governance: {
      authority: 'advisory_only',
      retrievalScoreIsConfidence: false,
      mayChangeMembership: false,
    },
  };
}