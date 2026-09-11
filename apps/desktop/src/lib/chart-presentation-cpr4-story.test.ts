import { describe, expect, it } from 'vitest';
import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { RuntimePlanPreview } from './runtime-planner-preview';
import type { ChartPreviewModel } from './chart-preview-model';
import { buildPresentationCapabilityInventory, planPresentationStoryRequests, type PresentationSupportAnalysisV1 } from './presentation-capability-inventory';
import { buildInvestigationDecisionVisualizationPlan } from './investigation-visualization-plan';
import { buildInvestigationVisualNarrativePlan, type InvestigationVisualNarrativeInputItemV1 } from './investigation-visual-narrative';

function support(input: {
  id: string;
  label: string;
  description: string;
  actionType: AnalysisAction['actionType'];
  dimension: string;
  metric: string;
  confidence?: number;
}): PresentationSupportAnalysisV1 {
  const action: AnalysisAction = {
    id: input.id,
    opportunityName: input.label,
    label: input.label,
    description: input.description,
    actionType: input.actionType,
    dimensions: [input.dimension],
    measures: [input.metric],
    confidenceScore: input.confidence ?? 80,
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
    id: `plan:${input.id}`, sourceIntentId: runtimeIntent.id, status: 'ready', executionMode: 'preview_only',
    logicalOperations: [], requiredColumns: [input.dimension, input.metric],
    expectedOutput: { shape: runtimeIntent.expectedShape, dimensions: [input.dimension], measures: [input.metric] },
    warnings: [], blockedReasons: [], source: 'runtime_intent',
  };
  return { analysisAction: action, runtimeIntent, runtimePlanPreview };
}

const primary = support({
  id: 'primary-revenue-trend', label: 'Revenue over time', description: 'How is revenue changing over time?',
  actionType: 'trend', dimension: 'OrderDate', metric: 'sales_revenue', confidence: 100,
});

function materialize(item: PresentationSupportAnalysisV1, isPrimary = false): InvestigationVisualNarrativeInputItemV1 {
  const dimension = item.runtimeIntent.dimensions[0];
  const metric = item.runtimeIntent.measures[0];
  const rows = [
    { [dimension]: 'A', [metric]: 12 },
    { [dimension]: 'B', [metric]: 8 },
    { [dimension]: 'C', [metric]: 5 },
  ];
  const chartModel: ChartPreviewModel = {
    id: `chart:${item.analysisAction.id}`,
    sourceResultId: `result:${item.analysisAction.id}`,
    status: 'ready',
    chartType: item.runtimeIntent.type === 'trend' ? 'line' : 'bar',
    title: item.analysisAction.opportunityName,
    xField: dimension,
    yField: metric,
    seriesFields: [metric],
    rows,
    warnings: [],
    source: 'duckdb_preview_result',
  };
  const decisionVisualizationPlan = buildInvestigationDecisionVisualizationPlan({
    chartModel,
    runtimeIntent: item.runtimeIntent,
    analysisAction: item.analysisAction,
    primaryDomain: 'revenue',
    selectedPerspectiveId: 'revenue_money',
  });
  expect(decisionVisualizationPlan, item.analysisAction.id).not.toBeNull();
  return {
    id: item.analysisAction.id,
    isPrimary,
    managementQuestion: item.analysisAction.description || item.analysisAction.opportunityName,
    analysisAction: item.analysisAction,
    runtimeIntent: item.runtimeIntent,
    chartModel,
    decisionVisualizationPlan,
    sourceScopeKey: 'dataset:cpr4-revenue',
  };
}

function requestPlan(supports: PresentationSupportAnalysisV1[]) {
  const inventory = buildPresentationCapabilityInventory({
    primaryAction: primary.analysisAction,
    primaryRuntimeIntent: primary.runtimeIntent,
    supportingAnalyses: supports,
  });
  return planPresentationStoryRequests({
    inventory,
    primaryDomain: 'revenue',
    perspectiveId: 'revenue_money',
    budget: 6,
  });
}

function story(supports: PresentationSupportAnalysisV1[], materialized = supports) {
  const request = requestPlan(supports);
  const result = buildInvestigationVisualNarrativePlan({
    primaryDomain: 'revenue',
    selectedPerspectiveId: 'revenue_money',
    storyTarget: {
      layoutCount: request.targetLayoutCount,
      companionRoles: [...request.targetCompanionRoles],
      source: 'pre_execution_story_plan',
    },
    items: [materialize(primary, true), ...materialized.map(item => materialize(item))],
  });
  return { request, result };
}

const driver = support({
  id: 'product-driver', label: 'Top products by revenue', description: 'Which products contribute the most revenue?',
  actionType: 'group_by', dimension: 'Product', metric: 'sales_revenue', confidence: 94,
});
const composition = support({
  id: 'channel-mix', label: 'Revenue mix by channel', description: 'What is the revenue mix share by channel?',
  actionType: 'group_by', dimension: 'Channel', metric: 'sales_revenue', confidence: 92,
});
const change = support({
  id: 'order-volume-trend', label: 'Order volume over time', description: 'How is order volume changing over time?',
  actionType: 'trend', dimension: 'OrderDate', metric: 'order_count', confidence: 90,
});
const risk = support({
  id: 'branch-concentration', label: 'Revenue concentration by branch', description: 'Where is revenue concentration exposure highest?',
  actionType: 'group_by', dimension: 'Branch', metric: 'branch_revenue', confidence: 88,
});


describe('CPR-4 planned story composition and 1/3/5 actuation', () => {
  it('keeps a one-visual answer when there are no justified companion capabilities', () => {
    const { request, result } = story([]);
    expect(request.targetLayoutCount).toBe(1);
    expect(result.plan.layoutCount).toBe(1);
    expect(result.plan.degradation.degradedFrom).toBeNull();
  });

  it('plans and materializes a three-visual story from two distinct governed companion roles', () => {
    const { request, result } = story([driver, composition]);
    expect(request.targetLayoutCount).toBe(3);
    expect(request.targetCompanionRoles).toHaveLength(2);
    expect(result.plan.target.layoutCount).toBe(3);
    expect(result.plan.layoutCount).toBe(3);
    expect(result.plan.degradation.degradedFrom).toBeNull();
  });

  it('plans and materializes five visuals only when domain/MB story signals four companion roles', () => {
    const { request, result } = story([driver, composition, change, risk]);
    expect(request.targetLayoutCount).toBe(5);
    expect(request.targetCompanionRoles).toHaveLength(4);
    expect(result.plan.target.layoutCount).toBe(5);
    expect(result.plan.layoutCount).toBe(5);
    expect(result.plan.degradation.degradedFrom).toBeNull();
  });

  it('degrades a planned three-visual story explicitly when one planned companion fails materialization', () => {
    const { request, result } = story([driver, composition], [driver]);
    expect(request.targetLayoutCount).toBe(3);
    expect(result.plan.layoutCount).toBe(1);
    expect(result.plan.degradation.degradedFrom).toBe(3);
    expect(result.plan.degradation.reasons).toContain('insufficient_legal_companions');
    expect(result.plan.degradation.reasons).toContain('planned_companion_not_materialized');
    expect(result.plan.rejected).toContainEqual({ candidateId: 'product-driver', reason: 'story_target_degraded' });
  });
});
