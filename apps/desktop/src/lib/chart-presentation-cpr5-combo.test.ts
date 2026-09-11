import { describe, expect, it } from 'vitest';
import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { RuntimePlanPreview } from './runtime-planner-preview';
import type { ChartPreviewModel } from './chart-preview-model';
import {
  buildPresentationCapabilityInventory,
  planPresentationStoryRequests,
  type PresentationStoryRequestPlanV1,
  type PresentationSupportAnalysisV1,
} from './presentation-capability-inventory';
import { buildInvestigationDecisionVisualizationPlan } from './investigation-visualization-plan';
import { buildInvestigationVisualNarrativePlan, type InvestigationVisualNarrativeInputItemV1 } from './investigation-visual-narrative';
import { combineVisualNarrativeModels } from './visual-narrative-runtime';

function support(input: {
  id: string;
  label: string;
  description: string;
  actionType: AnalysisAction['actionType'];
  dimension: string;
  metric: string;
  confidence?: number;
}): PresentationSupportAnalysisV1 {
  const analysisAction: AnalysisAction = {
    id: input.id,
    opportunityName: input.label,
    label: input.label,
    description: input.description,
    actionType: input.actionType,
    dimensions: [input.dimension],
    measures: [input.metric],
    confidenceScore: input.confidence ?? 85,
    source: 'dataset_understanding',
  };
  const runtimeIntent: RuntimeIntent = {
    id: `intent:${input.id}`,
    sourceActionId: input.id,
    type: input.actionType,
    dimensions: [input.dimension],
    measures: [input.metric],
    expectedShape: input.actionType === 'trend' ? 'line_chart' : 'bar_chart',
    status: 'ready', warnings: [], blockedReasons: [], source: 'analysis_action',
  };
  const runtimePlanPreview: RuntimePlanPreview = {
    id: `plan:${input.id}`,
    sourceIntentId: runtimeIntent.id,
    status: 'ready', executionMode: 'preview_only', logicalOperations: [],
    requiredColumns: [input.dimension, input.metric],
    expectedOutput: { shape: runtimeIntent.expectedShape, dimensions: [input.dimension], measures: [input.metric] },
    warnings: [], blockedReasons: [], source: 'runtime_intent',
  };
  return { analysisAction, runtimeIntent, runtimePlanPreview };
}

function requestPlan(input: {
  primary: PresentationSupportAnalysisV1;
  supports: PresentationSupportAnalysisV1[];
  domain: string;
}): PresentationStoryRequestPlanV1 {
  return planPresentationStoryRequests({
    inventory: buildPresentationCapabilityInventory({
      primaryAction: input.primary.analysisAction,
      primaryRuntimeIntent: input.primary.runtimeIntent,
      supportingAnalyses: input.supports,
    }),
    primaryDomain: input.domain,
    perspectiveId: `${input.domain}_combo`,
    budget: 6,
  });
}

function materialize(input: {
  item: PresentationSupportAnalysisV1;
  domain: string;
  isPrimary?: boolean;
  values?: readonly string[];
  sourceScopeKey?: string;
}): InvestigationVisualNarrativeInputItemV1 {
  const dimension = input.item.runtimeIntent.dimensions[0];
  const metric = input.item.runtimeIntent.measures[0];
  const values = input.values ?? ['A', 'B', 'C'];
  const rows = values.map((value, index) => ({ [dimension]: value, [metric]: 30 - index * 8 }));
  const chartModel: ChartPreviewModel = {
    id: `chart:${input.item.analysisAction.id}`,
    sourceResultId: `result:${input.item.analysisAction.id}`,
    status: 'ready',
    chartType: input.item.runtimeIntent.type === 'trend' ? 'line' : 'bar',
    title: input.item.analysisAction.opportunityName,
    xField: dimension,
    yField: metric,
    seriesFields: [metric],
    rows,
    warnings: [], source: 'duckdb_preview_result',
  };
  const decisionVisualizationPlan = buildInvestigationDecisionVisualizationPlan({
    chartModel,
    runtimeIntent: input.item.runtimeIntent,
    analysisAction: input.item.analysisAction,
    primaryDomain: input.domain,
    selectedPerspectiveId: `${input.domain}_combo`,
  });
  expect(decisionVisualizationPlan, input.item.analysisAction.id).not.toBeNull();
  return {
    id: input.item.analysisAction.id,
    isPrimary: Boolean(input.isPrimary),
    managementQuestion: input.item.analysisAction.description || input.item.analysisAction.opportunityName,
    analysisAction: input.item.analysisAction,
    runtimeIntent: input.item.runtimeIntent,
    chartModel,
    decisionVisualizationPlan,
    sourceScopeKey: input.sourceScopeKey ?? `dataset:cpr5-${input.domain}`,
  };
}

function storyTarget(plan: PresentationStoryRequestPlanV1) {
  return {
    layoutCount: plan.targetLayoutCount,
    companionRoles: [...plan.targetCompanionRoles],
    combinationRequest: plan.combinationRequest ? {
      recipeId: plan.combinationRequest.recipeId,
      companionCandidateId: plan.combinationRequest.companionActionId,
      presentation: plan.combinationRequest.presentation,
      allowExplicitMultiUnit: plan.combinationRequest.allowExplicitMultiUnit,
    } : null,
    source: 'pre_execution_story_plan' as const,
  };
}

const revenue = support({
  id: 'revenue', label: 'Revenue over time', description: 'How is revenue changing over time?',
  actionType: 'trend', dimension: 'OrderDate', metric: 'sales_revenue', confidence: 100,
});
const units = support({
  id: 'units', label: 'Units sold over time', description: 'How do units sold change with revenue over time?',
  actionType: 'trend', dimension: 'OrderDate', metric: 'quantity', confidence: 96,
});
const driver = support({
  id: 'driver', label: 'Top products by revenue', description: 'Which products contribute the most revenue?',
  actionType: 'group_by', dimension: 'Product', metric: 'sales_revenue', confidence: 92,
});
const composition = support({
  id: 'composition', label: 'Revenue mix by channel', description: 'What is the revenue mix share by channel?',
  actionType: 'group_by', dimension: 'Channel', metric: 'sales_revenue', confidence: 90,
});

describe('CPR-5 first-class pre-execution compound planning', () => {
  it('requests Revenue + Units before execution and counts the compound primary as one of three visual units', () => {
    const request = requestPlan({ primary: revenue, supports: [units, driver, composition], domain: 'revenue' });
    expect(request.combinationRequest).toMatchObject({
      recipeId: 'revenue-volume-shared-grain', companionActionId: 'units',
      presentation: 'combo_bar_line', sharedDeclaredDimension: 'OrderDate',
      requiresPostExecutionAlignment: true,
    });
    expect(request.selections).toContainEqual(expect.objectContaining({ actionId: 'units', reason: 'domain_combination_recipe' }));
    expect(request.targetLayoutCount).toBe(3);
    expect(request.targetCompanionRoles).toEqual(expect.arrayContaining(['driver', 'composition']));
    expect(request.targetCompanionRoles).not.toContain('change');

    const items = [
      materialize({ item: revenue, domain: 'revenue', isPrimary: true }),
      materialize({ item: units, domain: 'revenue' }),
      materialize({ item: driver, domain: 'revenue' }),
      materialize({ item: composition, domain: 'revenue' }),
    ];
    const result = buildInvestigationVisualNarrativePlan({
      primaryDomain: 'revenue', selectedPerspectiveId: 'revenue_combo', items, storyTarget: storyTarget(request),
    });
    expect(result.plan.combination).toEqual({
      requestedRecipeId: 'revenue-volume-shared-grain', companionCandidateId: 'units', status: 'materialized', reason: null,
    });
    expect(result.plan.layoutCount).toBe(3);
    const compound = result.plan.units.find(unit => unit.primaryAnchor)!;
    expect(compound.presentation).toBe('combo_bar_line');
    expect(compound.candidateIds).toEqual(['revenue', 'units']);
    expect(result.plan.units.flatMap(unit => unit.candidateIds)).toEqual(expect.arrayContaining(['driver', 'composition']));

    const byId = new Map(items.map(item => [item.id, item] as const));
    const combined = combineVisualNarrativeModels(
      { id: 'revenue', label: 'Revenue', chartModel: byId.get('revenue')!.chartModel },
      { id: 'units', label: 'Units', chartModel: byId.get('units')!.chartModel },
      compound.presentation,
    );
    expect(combined?.status).toBe('ready');
    expect(combined?.seriesFields).toHaveLength(2);
    expect(combined?.warnings.join(' ')).toContain('independently governed aggregate results; no raw-row join was performed');
  });

  it('does not pre-request a combo when the declared grouping dimension is incompatible', () => {
    const weeklyUnits = support({
      id: 'weekly-units', label: 'Units sold by week', description: 'How do units sold change with revenue by week?',
      actionType: 'trend', dimension: 'Week', metric: 'quantity', confidence: 96,
    });
    const request = requestPlan({ primary: revenue, supports: [weeklyUnits, driver, composition], domain: 'revenue' });
    expect(request.combinationRequest).toBeNull();
    expect(request.selections).not.toContainEqual(expect.objectContaining({ actionId: 'weekly-units', reason: 'domain_combination_recipe' }));
  });

  it('records a post-execution compatibility rejection when declared grain matches but actual dimension members do not', () => {
    const request = requestPlan({ primary: revenue, supports: [units, driver, composition], domain: 'revenue' });
    expect(request.combinationRequest?.companionActionId).toBe('units');
    const result = buildInvestigationVisualNarrativePlan({
      primaryDomain: 'revenue', selectedPerspectiveId: 'revenue_combo', storyTarget: storyTarget(request),
      items: [
        materialize({ item: revenue, domain: 'revenue', isPrimary: true, values: ['A', 'B', 'C'] }),
        materialize({ item: units, domain: 'revenue', values: ['A', 'B', 'D'] }),
        materialize({ item: driver, domain: 'revenue' }),
        materialize({ item: composition, domain: 'revenue' }),
      ],
    });
    expect(result.plan.combination).toEqual({
      requestedRecipeId: 'revenue-volume-shared-grain', companionCandidateId: 'units', status: 'rejected', reason: 'compatibility_failed',
    });
    expect(result.plan.layoutCount).toBe(3);
    expect(result.plan.units[0].presentation).toBe('single');
    expect(result.plan.rejected).toContainEqual({ candidateId: 'units', reason: 'combination_not_materialized' });
  });

  it('pre-plans and materializes the Finance Profit + Margin recipe on a shared governed time grain', () => {
    const profit = support({
      id: 'profit', label: 'Profit over time', description: 'How is profit changing over time?',
      actionType: 'trend', dimension: 'Period', metric: 'gross_profit', confidence: 100,
    });
    const margin = support({
      id: 'margin', label: 'Margin over time', description: 'How does margin move with profit over time?',
      actionType: 'trend', dimension: 'Period', metric: 'gross_margin', confidence: 96,
    });
    const request = requestPlan({ primary: profit, supports: [margin], domain: 'finance' });
    expect(request.combinationRequest).toMatchObject({
      recipeId: 'finance-profit-margin-shared-grain', companionActionId: 'margin', presentation: 'combo_bar_line',
    });
    expect(request.targetLayoutCount).toBe(1);
    const result = buildInvestigationVisualNarrativePlan({
      primaryDomain: 'finance', selectedPerspectiveId: 'finance_combo', storyTarget: storyTarget(request),
      items: [
        materialize({ item: profit, domain: 'finance', isPrimary: true }),
        materialize({ item: margin, domain: 'finance' }),
      ],
    });
    expect(result.plan.layoutCount).toBe(1);
    expect(result.plan.combination.status).toBe('materialized');
    expect(result.plan.units[0]).toMatchObject({ presentation: 'combo_bar_line', candidateIds: ['profit', 'margin'] });
  });
});
