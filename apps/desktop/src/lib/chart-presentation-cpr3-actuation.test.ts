import { describe, expect, it } from 'vitest';
import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { RuntimePlanPreview } from './runtime-planner-preview';
import { createDecisionVisualizationPlan } from './decision-visualization-plan';
import { projectDomainVisualProfileFromAdvice } from './domain-visual-profile';
import {
  buildPresentationCapabilityInventory,
  planPresentationStoryRequests,
  type PresentationSupportAnalysisV1,
} from './presentation-capability-inventory';
import type { MicroBrainPresentationAdviceV1 } from './understanding-core/micro-brain/presentation-advisor';

function advice(input: { chartFamilies?: string[]; requiredRoles?: string[] }): MicroBrainPresentationAdviceV1 {
  return {
    brainVersion: 'cpr3-test-brain',
    indexVersion: 'cpr3-test-index',
    authorityNotes: [],
    candidates: [{
      hit: {
        conceptId: `concept.cpr3.${[...(input.chartFamilies ?? []), ...(input.requiredRoles ?? [])].join('_') || 'neutral'}`,
        canonicalSignal: null,
        sparseRank: 1,
        denseRank: 1,
        fusedRank: 1,
        rrfScore: 1,
        sparseScore: 1,
        denseSimilarity: 1,
        positiveUnitIds: [],
        negativeUnitIds: [],
      },
      labels: ['CPR-3 controlled presentation ballot'],
      definition: 'Controlled presentation-only advice for actuation testing.',
      presentation: {
        schemaVersion: 'lightbi.micro-brain.presentation-advisory.v1',
        advisoryKind: 'domain_profile',
        authority: 'advisory_only',
        analyticalIntents: ['category_comparison', 'trend'],
        chartFamilies: input.chartFamilies ?? [],
        requiredRoles: input.requiredRoles ?? [],
        evidenceRequirements: ['governed result required'],
        constraints: ['metric authority stays upstream'],
      },
    }],
  };
}

function decision(profile: ReturnType<typeof projectDomainVisualProfileFromAdvice>, categories = 3) {
  const rows = Array.from({ length: categories }, (_, index) => ({
    category: `C${index + 1}`,
    sales_revenue: 100 - index,
  }));
  return createDecisionVisualizationPlan({
    perspectiveId: 'cpr3_presentation_vote',
    rows,
    sourceCount: 1,
    sourceRefs: [{
      sourceId: 'dataset:cpr3',
      sourceName: 'CPR3 governed fixture',
      role: 'sales',
      period: '2026-09',
      sourceRowCount: categories,
    }],
    dimensionField: 'category',
    metricIds: ['sales_revenue'],
    analyticalIntent: 'category_comparison',
    availableRoles: ['category', 'measure'],
    cardinality: { categories, series: 1, points: categories },
    units: { count: 1, compatible: true, explicitLabels: true, normalizedCommonScale: true },
    requiredSurfaces: ['preview', 'persistence', 'dashboard'],
    domainProfile: profile,
    officialDomainId: 'cpr3_test_domain',
  });
}

function support(input: { id: string; label: string }): PresentationSupportAnalysisV1 {
  const action: AnalysisAction = {
    id: input.id,
    opportunityName: input.label,
    label: input.label,
    description: input.label,
    actionType: 'group_by',
    dimensions: [input.id.includes('mix') ? 'Channel' : 'Product'],
    measures: ['Revenue'],
    confidenceScore: 90,
    source: 'dataset_understanding',
  };
  const runtimeIntent: RuntimeIntent = {
    id: `intent:${input.id}`,
    sourceActionId: action.id,
    type: 'group_by',
    dimensions: [...action.dimensions],
    measures: [...action.measures],
    expectedShape: 'bar_chart',
    status: 'ready',
    warnings: [],
    blockedReasons: [],
    source: 'analysis_action',
  };
  const runtimePlanPreview: RuntimePlanPreview = {
    id: `plan:${input.id}`,
    sourceIntentId: runtimeIntent.id,
    status: 'ready',
    executionMode: 'preview_only',
    logicalOperations: [],
    requiredColumns: [...runtimeIntent.dimensions, ...runtimeIntent.measures],
    expectedOutput: { shape: 'bar_chart', dimensions: [...runtimeIntent.dimensions], measures: [...runtimeIntent.measures] },
    warnings: [],
    blockedReasons: [],
    source: 'runtime_intent',
  };
  return { analysisAction: action, runtimeIntent, runtimePlanPreview };
}

const primaryAction: AnalysisAction = {
  id: 'primary:revenue-trend',
  opportunityName: 'Revenue over time',
  label: 'Revenue over time',
  description: 'How is Revenue changing over time?',
  actionType: 'trend',
  dimensions: ['OrderDate'],
  measures: ['Revenue'],
  confidenceScore: 100,
  source: 'dataset_understanding',
};
const primaryIntent: RuntimeIntent = {
  id: 'intent:primary:revenue-trend',
  sourceActionId: primaryAction.id,
  type: 'trend',
  dimensions: ['OrderDate'],
  measures: ['Revenue'],
  expectedShape: 'line_chart',
  status: 'ready',
  warnings: [],
  blockedReasons: [],
  source: 'analysis_action',
};

describe('CPR-3 MB presentation voting actuation', () => {
  it('changes a legal rendered pattern when only the controlled MB ballot changes, while governed truth is identical', () => {
    const rankProfile = projectDomainVisualProfileFromAdvice('cpr3_test_domain', advice({ chartFamilies: ['bar'] }));
    const columnProfile = projectDomainVisualProfileFromAdvice('cpr3_test_domain', advice({ chartFamilies: ['column'] }));
    const ranked = decision(rankProfile);
    const column = decision(columnProfile);

    expect(ranked.result).toEqual(column.result);
    expect(ranked.sourceRefs).toEqual(column.sourceRefs);
    expect(ranked.visualizationPlan.patternId).toBe('ranking_bar');
    expect(column.visualizationPlan.patternId).toBe('category_compare');
    expect(ranked.visualizationPlan.rendererFamily).toBe('row');
    expect(column.visualizationPlan.rendererFamily).toBe('bar');
    expect(ranked.visualizationPlan.ballotTrace).toMatchObject({
      stage: 'post_execution', selectionBasis: 'mb_vote', selectedOptionIds: ['ranking_bar'],
    });
    expect(column.visualizationPlan.ballotTrace).toMatchObject({
      stage: 'post_execution', selectionBasis: 'mb_vote', selectedOptionIds: ['category_compare'],
    });
    expect(ranked.visualizationPlan.governance.mbAuthority).toBe('presentation_vote_within_legal_set');
  });

  it('records an explicit hard veto when MB votes for an illegal option instead of silently discarding the vote', () => {
    const profile = projectDomainVisualProfileFromAdvice('cpr3_test_domain', advice({ chartFamilies: ['bar'] }));
    const plan = decision(profile, 30);
    const rejectedVote = plan.visualizationPlan.ballotTrace.votes.find(vote => vote.optionId === 'ranking_bar');

    expect(rejectedVote).toMatchObject({ legal: false, mbRank: 0, outcome: 'hard_veto' });
    expect(rejectedVote?.hardVetoReasons).toContain('CARDINALITY_CATEGORIES_EXCEEDED');
    expect(plan.visualizationPlan.patternId).toBe('evidence_table');
    expect(plan.visualizationPlan.ballotTrace.selectionBasis).not.toBe('mb_vote');
    expect(plan.visualizationPlan.ballotTrace.governance).toMatchObject({
      deterministicAuthority: 'hard_veto_only',
      mbMayChooseWithinLegalSet: true,
      mayAuthorizeMetric: false,
      mayAuthorizeFormula: false,
      mayAuthorizeJoin: false,
      mayMutateUnderstanding: false,
    });
  });

  it('lets the pre-execution MB ballot choose which existing legal companion role consumes a bounded request slot', () => {
    const supporting = [
      support({ id: 'driver-products', label: 'Top products by Revenue' }),
      support({ id: 'mix-channel', label: 'Revenue mix share by Channel' }),
    ];
    const inventory = buildPresentationCapabilityInventory({
      primaryAction,
      primaryRuntimeIntent: primaryIntent,
      supportingAnalyses: supporting,
    });
    const composition = planPresentationStoryRequests({
      inventory,
      budget: 1,
      advisor: () => advice({ requiredRoles: ['composition'] }),
    });
    const driver = planPresentationStoryRequests({
      inventory,
      budget: 1,
      advisor: () => advice({ requiredRoles: ['driver'] }),
    });

    expect(composition.selections.map(item => item.actionId)).toEqual(['mix-channel']);
    expect(driver.selections.map(item => item.actionId)).toEqual(['driver-products']);
    expect(composition.ballotTrace).toMatchObject({
      stage: 'pre_execution', selectionBasis: 'mb_vote', selectedOptionIds: ['composition'],
    });
    expect(driver.ballotTrace).toMatchObject({
      stage: 'pre_execution', selectionBasis: 'mb_vote', selectedOptionIds: ['driver'],
    });
    expect(composition.governance.understandingMutationAllowed).toBe(false);
    expect(driver.governance.understandingMutationAllowed).toBe(false);
  });
});
