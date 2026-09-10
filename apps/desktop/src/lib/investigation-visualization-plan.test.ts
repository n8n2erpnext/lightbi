import { describe, expect, it } from 'vitest';
import { buildInvestigationDecisionVisualizationPlan, resolveInvestigationVisualizationIntent } from './investigation-visualization-plan';

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

  it('keeps relationship measures as a true scatter plan even with inferred-domain advice present', () => {
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

  it('maps a real numeric distribution to the histogram family instead of category bars', () => {
    const distributionAction = {
      ...action('group_by'), id: 'action_distribution', opportunityName: 'Profit distribution', description: 'Profit distribution',
      actionType: 'distribution' as const, dimensions: [], measures: ['profit'],
    };
    const distributionIntent = {
      ...runtimeIntent('group_by'), id: 'intent_distribution', sourceActionId: 'action_distribution', type: 'distribution' as const,
      dimensions: [], measures: ['profit'], expectedShape: 'bar_chart' as const,
    };
    const plan = buildInvestigationDecisionVisualizationPlan({
      analysisAction: distributionAction, runtimeIntent: distributionIntent, primaryDomain: 'finance',
      chartModel: {
        id: 'chart_dist', sourceResultId: 'result_dist', status: 'ready', chartType: 'bar', title: 'Profit distribution',
        yField: 'profit', seriesFields: ['profit'], rows: [{ profit: 10 }, { profit: 20 }, { profit: 18 }, { profit: 35 }],
        warnings: [], source: 'duckdb_preview_result',
      },
    });
    expect(plan?.result.xFieldRole).toBe('measure');
    expect(plan?.visualizationPlan.patternId).toBe('distribution_histogram');
    expect(plan?.visualizationPlan.rendererFamily).toBe('histogram');
  });

  it('recognizes explicit actual-vs-target semantics as presentation intent without authorizing a metric', () => {
    const targetAction = {
      ...action('relationship'), id: 'action_target', opportunityName: 'Actual vs target', description: 'Compare actual performance with target',
      measures: ['actual','target'], dimensions: [],
    };
    const intent = { ...runtimeIntent('relationship'), id: 'intent_target', measures: ['actual','target'] };
    expect(resolveInvestigationVisualizationIntent(intent, targetAction)).toBe('target_attainment');
  });

  it('recognizes ranking language as a presentation-only ranking intent', () => {
    const rankAction = { ...action('group_by'), opportunityName: 'Top customers by revenue', description: 'Rank top customers' };
    expect(resolveInvestigationVisualizationIntent(runtimeIntent('group_by'), rankAction)).toBe('ranking');
  });

  it('recognizes natural contribution wording as ranking intent instead of generic category comparison', () => {
    const rankAction = { ...action('group_by'), opportunityName: 'Which products contribute the most sales revenue?', description: 'Which products contribute the most sales revenue?', dimensions: ['product'], measures: ['sales_revenue'] };
    const intent = { ...runtimeIntent('group_by'), dimensions: ['product'], measures: ['sales_revenue'] };
    expect(resolveInvestigationVisualizationIntent(intent, rankAction)).toBe('ranking');
  });

  it('does not misclassify a categorical status distribution as a numeric histogram', () => {
    const statusAction = { ...action('group_by'), id: 'action_status', opportunityName: 'Status breakdown', description: 'Status breakdown', actionType: 'distribution' as const, dimensions: ['status'], measures: [] };
    const intent = { ...runtimeIntent('group_by'), id: 'intent_status', sourceActionId: 'action_status', type: 'distribution' as const, dimensions: ['status'], measures: [], expectedShape: 'bar_chart' as const };
    expect(resolveInvestigationVisualizationIntent(intent, statusAction)).toBe('category_comparison');
  });

  it('preserves the actual selected perspective id in the decision visualization plan', () => {
    const chartModel = {
      id: 'chart-perspective', sourceResultId: 'result-perspective', status: 'ready' as const,
      chartType: 'bar' as const, title: 'Revenue by product', xField: 'Product', yField: 'Revenue',
      seriesFields: ['Revenue'], rows: [{ Product: 'A', Revenue: 100 }, { Product: 'B', Revenue: 80 }],
      warnings: [], source: 'duckdb_preview_result' as const,
    };
    const runtimeIntent = {
      id: 'intent-perspective', sourceActionId: 'action-revenue', type: 'group_by' as const,
      dimensions: ['Product'], measures: ['Revenue'], expectedShape: 'bar_chart' as const,
      status: 'ready' as const, warnings: [], blockedReasons: [], source: 'analysis_action' as const,
    };
    const action = {
      id: 'action-revenue', opportunityName: 'Revenue by product', label: 'Revenue by product', description: 'Which products contribute most revenue?',
      actionType: 'group_by' as const, dimensions: ['Product'], measures: ['Revenue'], confidenceScore: 90, source: 'dataset_understanding' as const,
    };
    const plan = buildInvestigationDecisionVisualizationPlan({ chartModel, runtimeIntent, analysisAction: action, primaryDomain: 'revenue', selectedPerspectiveId: 'revenue_money' });
    expect(plan?.perspectiveId).toBe('revenue_money');
  });

  it('recognizes evidence-backed inventory concentration as risk concentration without granting new metric authority', () => {
    const concentrationAction = {
      ...action('group_by'), id: 'action_concentration', opportunityName: 'Inventory concentration exposure',
      description: 'Where is inventory concentration exposure by warehouse?', dimensions: ['Warehouse'], measures: ['inventory_value'],
    };
    const concentrationIntent = { ...runtimeIntent('group_by'), id: 'intent_concentration', sourceActionId: 'action_concentration', dimensions: ['Warehouse'], measures: ['inventory_value'] };
    const plan = buildInvestigationDecisionVisualizationPlan({
      analysisAction: concentrationAction, runtimeIntent: concentrationIntent, primaryDomain: 'inventory', selectedPerspectiveId: 'inventory_health',
      chartModel: { id: 'chart_concentration', sourceResultId: 'result_concentration', status: 'ready', chartType: 'bar', title: 'Inventory concentration', xField: 'Warehouse', yField: 'inventory_value', seriesFields: ['inventory_value'], rows: [{ Warehouse: 'A', inventory_value: 80 }, { Warehouse: 'B', inventory_value: 20 }], warnings: [], source: 'duckdb_preview_result' },
    });
    expect(plan?.visualizationPlan.analyticalIntent).toBe('risk_concentration');
    expect(plan?.visualizationPlan.patternId).toBe('concentration_pareto');
    expect(plan?.visualizationPlan.governance).toMatchObject({ metricAuthority: 'upstream_only', mbAuthority: 'advisory_only', deterministicSuitabilityFinal: true });
  });

  it('does not let an inventory perspective force a special intent when the question only asks a generic category comparison', () => {
    const genericAction = { ...action('group_by'), opportunityName: 'Stock by store', description: 'Show stock quantity by store' };
    const plan = buildInvestigationDecisionVisualizationPlan({
      analysisAction: genericAction, runtimeIntent: runtimeIntent('group_by'), primaryDomain: 'inventory', selectedPerspectiveId: 'inventory_health',
      chartModel: { id: 'chart_generic', sourceResultId: 'result_generic', status: 'ready', chartType: 'bar', title: 'Stock by store', xField: 'Store', yField: 'stock_qty', seriesFields: ['stock_qty'], rows: [{ Store: 'A', stock_qty: 12 }, { Store: 'B', stock_qty: 8 }], warnings: [], source: 'duckdb_preview_result' },
    });
    expect(plan?.visualizationPlan.analyticalIntent).toBe('category_comparison');
    expect(plan?.visualizationPlan.patternId).toBe('ranking_bar');
  });

});
