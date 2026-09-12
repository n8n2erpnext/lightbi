import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { RuntimePlanPreview } from './runtime-planner-preview';
import { matchOfficialDomainCombinationRecipe, officialDomainComplementRoles, officialDomainStoryOrder, resolvePresentationPolicyDomain } from './domain-visual-playbooks';
import { resolveInvestigationVisualizationIntent } from './investigation-visualization-plan';
import type { VisualizationAnalyticalIntentV1 } from './visualization-ontology';
import type { VisualNarrativeLayoutCountV1, VisualNarrativeStoryRoleV1 } from './visual-narrative-composition';
import { adviseMicroBrainPresentation, type MicroBrainPresentationAdviceV1, type MicroBrainPresentationQueryV1 } from './understanding-core/micro-brain/presentation-advisor';
import { createPresentationBallot, microBrainStoryRoleOrder, type PresentationBallotTraceV1 } from './presentation-ballot';

export const PRESENTATION_CAPABILITY_INVENTORY_VERSION = 'lightbi.presentation-capability-inventory.v1' as const;
export const PRESENTATION_STORY_REQUEST_VERSION = 'lightbi.presentation-story-request.v1' as const;

export type PresentationSupportAnalysisV1 = {
  analysisAction: AnalysisAction;
  runtimeIntent: RuntimeIntent;
  runtimePlanPreview: RuntimePlanPreview;
};

export type PresentationCapabilityCandidateV1 = {
  actionId: string;
  sourceIndex: number;
  label: string;
  analyticalIntent: VisualizationAnalyticalIntentV1;
  storyRole: VisualNarrativeStoryRoleV1;
  dimensions: string[];
  measures: string[];
  confidenceScore: number;
  runtimeReady: boolean;
};

export type PresentationCapabilityInventoryV1 = {
  schemaVersion: typeof PRESENTATION_CAPABILITY_INVENTORY_VERSION;
  primaryActionId: string;
  primaryQuestion: string;
  primaryAnalyticalIntent: VisualizationAnalyticalIntentV1;
  primaryDimensions: string[];
  primaryMeasures: string[];
  candidates: PresentationCapabilityCandidateV1[];
  governance: {
    authority: 'presentation_read_only';
    mayCreateMetric: false;
    mayCreateFormula: false;
    mayCreateJoin: false;
    mayMutateUnderstanding: false;
  };
};

export type PresentationStoryRequestReasonV1 =
  | 'domain_combination_recipe'
  | 'mb_requested_role'
  | 'domain_requested_role'
  | 'role_diversity'
  | 'bounded_fallback';

export type PresentationCombinationRequestV1 = {
  recipeId: string;
  companionActionId: string;
  companionStoryRole: VisualNarrativeStoryRoleV1;
  presentation: 'grouped_compare' | 'combo_bar_line';
  allowExplicitMultiUnit: boolean;
  rationale: string;
  sharedDeclaredDimension: string;
  requiresPostExecutionAlignment: true;
};

export type PresentationStoryRequestSelectionV1 = {
  actionId: string;
  storyRole: VisualNarrativeStoryRoleV1;
  reason: PresentationStoryRequestReasonV1;
  sourceIndex: number;
};

export type PresentationStoryRequestPlanV1 = {
  schemaVersion: typeof PRESENTATION_STORY_REQUEST_VERSION;
  primaryActionId: string;
  primaryAnalyticalIntent: VisualizationAnalyticalIntentV1;
  requestedRoles: VisualNarrativeStoryRoleV1[];
  targetLayoutCount: VisualNarrativeLayoutCountV1;
  targetCompanionRoles: VisualNarrativeStoryRoleV1[];
  combinationRequest: PresentationCombinationRequestV1 | null;
  budget: number;
  selections: PresentationStoryRequestSelectionV1[];
  ballotTrace: PresentationBallotTraceV1;
  microBrain: { brainVersion: string; indexVersion: string; conceptIds: string[] };
  governance: {
    bounded: true;
    candidatesMustAlreadyExist: true;
    understandingMutationAllowed: false;
  };
};

function normalizePresentationKey(value: string | null | undefined): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function sharedDeclaredDimension(primaryDimensions: readonly string[], candidateDimensions: readonly string[]): string | null {
  const candidateByKey = new Map(candidateDimensions.map(value => [normalizePresentationKey(value), value] as const));
  for (const dimension of primaryDimensions) {
    const match = candidateByKey.get(normalizePresentationKey(dimension));
    if (match) return match;
  }
  return null;
}

export function presentationStoryRoleForIntent(intent: string): VisualNarrativeStoryRoleV1 {
  if (['target_attainment', 'period_comparison'].includes(intent)) return 'comparison';
  if (['trend', 'variance', 'contribution'].includes(intent)) return 'change';
  if (['ranking', 'category_comparison', 'pareto'].includes(intent)) return 'driver';
  if (['composition', 'composition_over_time'].includes(intent)) return 'composition';
  if (['distribution', 'aging', 'process_time'].includes(intent)) return 'distribution';
  if (intent === 'relationship') return 'relationship';
  if (['risk_concentration', 'anomaly_scan', 'quality_control', 'capacity_utilization'].includes(intent)) return 'risk';
  return 'evidence';
}

export function buildPresentationCapabilityInventory(input: {
  primaryAction: AnalysisAction;
  primaryRuntimeIntent: RuntimeIntent;
  supportingAnalyses: readonly PresentationSupportAnalysisV1[];
}): PresentationCapabilityInventoryV1 {
  const primaryAnalyticalIntent = resolveInvestigationVisualizationIntent(input.primaryRuntimeIntent, input.primaryAction);
  const candidates = input.supportingAnalyses
    .map((item, sourceIndex): PresentationCapabilityCandidateV1 | null => {
      if (item.analysisAction.id === input.primaryAction.id) return null;
      const analyticalIntent = resolveInvestigationVisualizationIntent(item.runtimeIntent, item.analysisAction);
      return {
        actionId: item.analysisAction.id,
        sourceIndex,
        label: item.analysisAction.opportunityName,
        analyticalIntent,
        storyRole: presentationStoryRoleForIntent(analyticalIntent),
        dimensions: [...item.runtimeIntent.dimensions],
        measures: [...item.runtimeIntent.measures],
        confidenceScore: item.analysisAction.confidenceScore,
        runtimeReady: item.runtimeIntent.status === 'ready' && item.runtimePlanPreview.status !== 'blocked',
      };
    })
    .filter((item): item is PresentationCapabilityCandidateV1 => Boolean(item));

  return {
    schemaVersion: PRESENTATION_CAPABILITY_INVENTORY_VERSION,
    primaryActionId: input.primaryAction.id,
    primaryQuestion: input.primaryAction.description || input.primaryAction.opportunityName,
    primaryAnalyticalIntent,
    primaryDimensions: [...input.primaryRuntimeIntent.dimensions],
    primaryMeasures: [...input.primaryRuntimeIntent.measures],
    candidates,
    governance: {
      authority: 'presentation_read_only',
      mayCreateMetric: false,
      mayCreateFormula: false,
      mayCreateJoin: false,
      mayMutateUnderstanding: false,
    },
  };
}

export function planPresentationStoryRequests(input: {
  inventory: PresentationCapabilityInventoryV1;
  primaryDomain?: string | null;
  perspectiveId?: string | null;
  budget?: number;
  advisor?: (query: MicroBrainPresentationQueryV1) => MicroBrainPresentationAdviceV1;
}): PresentationStoryRequestPlanV1 {
  const budget = Math.max(1, Math.min(8, Math.trunc(input.budget ?? 6)));
  const ready = input.inventory.candidates.filter(candidate => candidate.runtimeReady);
  const presentationDomain = resolvePresentationPolicyDomain(input.primaryDomain, input.perspectiveId);
  const requestedRoles = officialDomainComplementRoles(presentationDomain, input.inventory.primaryAnalyticalIntent);
  const storyOrder = officialDomainStoryOrder(presentationDomain).filter(role => role !== 'answer');
  const legalRoles = [...new Set(ready.map(candidate => candidate.storyRole))];
  const primaryRecipeText = [
    input.inventory.primaryQuestion,
    ...input.inventory.primaryDimensions,
    ...input.inventory.primaryMeasures,
  ].filter(Boolean).join(' ');
  const combinationCandidate = [...ready]
    .sort((a, b) => b.confidenceScore - a.confidenceScore || a.sourceIndex - b.sourceIndex || a.actionId.localeCompare(b.actionId))
    .map(candidate => {
      const sharedDimension = sharedDeclaredDimension(input.inventory.primaryDimensions, candidate.dimensions);
      if (!sharedDimension) return null;
      const recipe = matchOfficialDomainCombinationRecipe({
        domainId: presentationDomain,
        primaryText: primaryRecipeText,
        companionText: [candidate.label, ...candidate.dimensions, ...candidate.measures].filter(Boolean).join(' '),
      });
      return recipe ? { candidate, recipe, sharedDimension } : null;
    })
    .find((value): value is NonNullable<typeof value> => Boolean(value)) ?? null;
  const combinationRequest: PresentationCombinationRequestV1 | null = combinationCandidate ? {
    recipeId: combinationCandidate.recipe.id,
    companionActionId: combinationCandidate.candidate.actionId,
    companionStoryRole: combinationCandidate.candidate.storyRole,
    presentation: combinationCandidate.recipe.presentation,
    allowExplicitMultiUnit: combinationCandidate.recipe.allowExplicitMultiUnit,
    rationale: combinationCandidate.recipe.rationale,
    sharedDeclaredDimension: combinationCandidate.sharedDimension,
    requiresPostExecutionAlignment: true,
  } : null;
  const visualReady = combinationRequest
    ? ready.filter(candidate => candidate.actionId !== combinationRequest.companionActionId)
    : ready;
  const visualLegalRoles = [...new Set(visualReady.map(candidate => candidate.storyRole))];
  const advisor = input.advisor ?? adviseMicroBrainPresentation;
  const advice = advisor({
    domainId: presentationDomain ?? undefined,
    perspectiveId: input.perspectiveId ?? undefined,
    analyticalIntent: input.inventory.primaryAnalyticalIntent,
    userQuestion: input.inventory.primaryQuestion,
    semanticSignals: [...new Set(ready.flatMap(candidate => [...candidate.dimensions, ...candidate.measures]))],
    availableRoles: legalRoles,
    limit: 12,
  });
  const mbRoles = microBrainStoryRoleOrder(advice);
  const domainRoles = [...new Set([...requestedRoles, ...storyOrder])];
  const ballotTrace = createPresentationBallot({
    stage: 'pre_execution',
    options: legalRoles.map(optionId => ({ optionId, legal: true })),
    mbPreferredOptionIds: mbRoles,
    domainPreferredOptionIds: domainRoles,
    defaultOptionIds: legalRoles,
    limit: Math.min(budget, legalRoles.length),
  });
  const visualRoleSet = new Set(visualLegalRoles);
  const preferredRoleSet = new Set<VisualNarrativeStoryRoleV1>([
    ...mbRoles.filter(role => visualRoleSet.has(role)),
    ...requestedRoles.filter(role => visualRoleSet.has(role)),
  ]);
  const ballotRoles = ballotTrace.selectedOptionIds
    .map(role => role as VisualNarrativeStoryRoleV1)
    .filter(role => visualRoleSet.has(role));
  const preferredRoles = ballotRoles.filter(role => preferredRoleSet.has(role));
  const officialAvailableRoles = [...new Set(requestedRoles.filter(role => visualRoleSet.has(role)))];
  const primaryAlreadyCompound = input.inventory.primaryMeasures.length > 1;
  // A primary capability that already carries multiple governed measures is
  // already a compound answer. Generic MB role diversity alone must not pad it
  // to 3/5 visuals; additional units need at least two official-domain roles
  // that are actually available. A separate combination request is exempt
  // because its companion is absorbed into the primary visual unit below.
  const compoundPrimaryWithoutDomainStory = primaryAlreadyCompound
    && !combinationRequest
    && officialAvailableRoles.length < 2;
  // A planned compound companion is absorbed into the primary visual unit. It
  // must be requested for execution but must not consume one of the 1/3/5
  // standalone companion slots. Five visuals still require four non-combo roles.
  const targetLayoutCount: VisualNarrativeLayoutCountV1 = compoundPrimaryWithoutDomainStory
    ? 1
    : preferredRoles.length >= 4
      ? 5
      : preferredRoles.length >= 2 || visualLegalRoles.length >= 2
        ? 3
        : 1;
  const targetRoleSource = preferredRoles.length >= 2 ? preferredRoles : ballotRoles;
  const targetCompanionRoles = targetRoleSource.slice(0, targetLayoutCount === 5 ? 4 : targetLayoutCount === 3 ? 2 : 0);
  const selected = new Map<string, PresentationStoryRequestSelectionV1>();
  if (combinationCandidate && budget > 0) {
    selected.set(combinationCandidate.candidate.actionId, {
      actionId: combinationCandidate.candidate.actionId,
      storyRole: combinationCandidate.candidate.storyRole,
      reason: 'domain_combination_recipe',
      sourceIndex: combinationCandidate.candidate.sourceIndex,
    });
  }

  const addBestForRole = (role: VisualNarrativeStoryRoleV1, reason: PresentationStoryRequestReasonV1) => {
    if (selected.size >= budget) return;
    const candidate = ready
      .filter(item => item.storyRole === role && !selected.has(item.actionId))
      .sort((a, b) => b.confidenceScore - a.confidenceScore || a.sourceIndex - b.sourceIndex || a.actionId.localeCompare(b.actionId))[0];
    if (!candidate) return;
    selected.set(candidate.actionId, { actionId: candidate.actionId, storyRole: candidate.storyRole, reason, sourceIndex: candidate.sourceIndex });
  };

  ballotTrace.selectedOptionIds.forEach(role => addBestForRole(
    role as VisualNarrativeStoryRoleV1,
    mbRoles.includes(role as VisualNarrativeStoryRoleV1)
      ? 'mb_requested_role'
      : requestedRoles.includes(role as VisualNarrativeStoryRoleV1)
        ? 'domain_requested_role'
        : 'role_diversity',
  ));

  ready
    .filter(candidate => !selected.has(candidate.actionId))
    .sort((a, b) => b.confidenceScore - a.confidenceScore || a.sourceIndex - b.sourceIndex || a.actionId.localeCompare(b.actionId))
    .forEach(candidate => {
      if (selected.size >= budget) return;
      selected.set(candidate.actionId, {
        actionId: candidate.actionId,
        storyRole: candidate.storyRole,
        reason: 'bounded_fallback',
        sourceIndex: candidate.sourceIndex,
      });
    });

  return {
    schemaVersion: PRESENTATION_STORY_REQUEST_VERSION,
    primaryActionId: input.inventory.primaryActionId,
    primaryAnalyticalIntent: input.inventory.primaryAnalyticalIntent,
    requestedRoles: [...requestedRoles],
    targetLayoutCount,
    targetCompanionRoles,
    combinationRequest,
    budget,
    selections: [...selected.values()],
    ballotTrace,
    microBrain: {
      brainVersion: advice.brainVersion,
      indexVersion: advice.indexVersion,
      conceptIds: advice.candidates.map(candidate => candidate.hit.conceptId),
    },
    governance: {
      bounded: true,
      candidatesMustAlreadyExist: true,
      understandingMutationAllowed: false,
    },
  };
}

export function resolveRequestedSupportingAnalyses(input: {
  supportingAnalyses: readonly PresentationSupportAnalysisV1[];
  requestPlan: PresentationStoryRequestPlanV1;
}): PresentationSupportAnalysisV1[] {
  const byId = new Map(input.supportingAnalyses.map(item => [item.analysisAction.id, item] as const));
  return input.requestPlan.selections
    .map(selection => byId.get(selection.actionId))
    .filter((item): item is PresentationSupportAnalysisV1 => Boolean(item));
}
