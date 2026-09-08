import { describe, expect, it } from 'vitest';
import { buildInvestigationDecisionVisualizationPlan } from './investigation-visualization-plan';

const action = (actionType: 'group_by' | 'relationship') => ({
  id: `action_${actionType}`, opportunityName: actionType, label: actionType, description: actionType,
  actionType, dimensions: actionType === 'group_by' ? ['Store'] : [],
  measures: actionType === 'relationship' ? ['cost','revenue'] : ['stock_qty'],
  confidenceScore: 100, source: 'dataset_understanding' as const,
});

const runtimeIntent = (type: 'group_by' | 'relationship') => ({
  id: `intent_${type}`, sourceActionId: `action_${type}`, type,
  dimensions: type === 'group_by' ? ['Store'] : [], measures: type === 'relationship' ? ['cost','revenue'] : ['stock_qty'],
  expectedShape: type === 'relationship' ? 'scatter_plot' as const : 'bar_chart' as const,
  status: 'ready' as const, warnings: [], blockedReasons: [], source: 'analysis_action' as const,
});

describe('DPR-6 Investigation visualization adapter', () => {
  it('turns a grouped category result into a governed category pattern instead of a row-count heuristic line', () => {
    const plan = buildInvestigationDecisionVisualizationPlan({
      analysisAction: action('group_by'), runtimeIntent: runtimeIntent('group_by'), primaryDomain: null,
      chartModel: {
        id: 'chart_store', sourceResultId: 'result_store', status: 'ready', chartType: 'bar', title: 'Stock',
        xField: 'Store', yField: 'stock_qty', seriesFields: ['stock_qty'],
        rows: [{ Store: 'A', stock_qty: 12 }, { Store: 'B', stock_qty: 8 }], warnings: [], source: 'duckdb_preview_result',
      },
    });
    expect(plan?.visualizationPlan.patternId).toBe('category_compare');
    expect(plan?.primaryVisualization.type).toBe('bar');
  });

  it('keeps relationship measures as a true scatter plan even with domain advice present', () => {
    const plan = buildInvestigationDecisionVisualizationPlan({
      analysisAction: action('relationship'), runtimeIntent: runtimeIntent('relationship'), primaryDomain: 'retail',
      chartModel: {
        id: 'chart_rel', sourceResultId: 'result_rel', status: 'ready', chartType: 'scatter', title: 'Cost vs revenue',
        seriesFields: ['cost','revenue'], rows: [{ cost: 10, revenue: 100 }, { cost: 20, revenue: 180 }],
        warnings: [], source: 'duckdb_preview_result',
      },
    });
    expect(plan?.result.xFieldRole).toBe('measure');
    expect(plan?.result.metricIds).toEqual(['cost','revenue']);
    expect(plan?.visualizationPlan.patternId).toBe('relationship_scatter');
    expect(plan?.visualizationPlan.rendererFamily).toBe('scatter');
    expect(plan?.visualizationPlan.governance.mbAuthority).toBe('advisory_only');
  });
});
