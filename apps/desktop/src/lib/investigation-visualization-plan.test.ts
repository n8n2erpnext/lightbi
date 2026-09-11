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

  it('recognizes an exhaustive payment mix as part-to-whole composition and selects a donut for a small category set', () => {
    const paymentAction = {
      ...action('group_by'), id: 'action_payment_mix', opportunityName: 'Payment method mix',
      description: 'How is revenue split across payment methods?', dimensions: ['Payment Method'], measures: ['Revenue'],
    };
    const intent = { ...runtimeIntent('group_by'), id: 'intent_payment_mix', sourceActionId: 'action_payment_mix', dimensions: ['Payment Method'], measures: ['Revenue'] };
    const plan = buildInvestigationDecisionVisualizationPlan({
      analysisAction: paymentAction, runtimeIntent: intent, primaryDomain: 'revenue', selectedPerspectiveId: 'revenue_money',
      chartModel: {
        id: 'chart_payment', sourceResultId: 'result_payment', status: 'ready', chartType: 'bar', title: 'Payment mix',
        xField: 'Payment Method', yField: 'Revenue', seriesFields: ['Revenue'],
        rows: [{ 'Payment Method': 'Cash', Revenue: 40 }, { 'Payment Method': 'Card', Revenue: 30 }, { 'Payment Method': 'Bank', Revenue: 20 }, { 'Payment Method': 'Voucher', Revenue: 10 }],
        warnings: [], source: 'duckdb_preview_result',
      },
    });
    expect(plan?.visualizationPlan.analyticalIntent).toBe('composition');
    expect(plan?.visualizationPlan.patternId).toBe('composition_donut');
    expect(plan?.visualizationPlan.rendererFamily).toBe('donut');
  });

  it('recognizes a delivery-status mix as count-based part-to-whole composition instead of a numeric histogram', () => {
    const statusAction = { ...action('group_by'), id: 'action_delivery_mix', opportunityName: 'Delivery completion mix', description: 'What share of deliveries are completed, retried, failed, or in progress?', actionType: 'distribution' as const, dimensions: ['Status'], measures: [] };
    const intent = { ...runtimeIntent('group_by'), id: 'intent_delivery_mix', sourceActionId: 'action_delivery_mix', type: 'distribution' as const, dimensions: ['Status'], measures: [], expectedShape: 'bar_chart' as const };
    const plan = buildInvestigationDecisionVisualizationPlan({
      analysisAction: statusAction, runtimeIntent: intent, primaryDomain: 'operations', selectedPerspectiveId: 'ops_flow',
      chartModel: { id: 'chart_delivery_mix', sourceResultId: 'result_delivery_mix', status: 'ready', chartType: 'bar', title: 'Delivery completion mix', xField: 'Status', yField: 'record_count', seriesFields: ['record_count'], rows: [{ Status: 'Completed', record_count: 70 }, { Status: 'Retry', record_count: 15 }, { Status: 'Failed', record_count: 10 }, { Status: 'In progress', record_count: 5 }], warnings: [], source: 'duckdb_preview_result' },
    });
    expect(plan?.visualizationPlan.analyticalIntent).toBe('composition');
    expect(plan?.visualizationPlan.patternId).toBe('composition_donut');
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

  it('keeps the full governed high-cardinality result while planning a bounded Top-N ranking presentation', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({ Salesperson: `NV${String(index + 1).padStart(2, '0')}`, Revenue: (30 - index) * 1000 }));
    const rankAction = {
      ...action('group_by'), id: 'action_salespeople', opportunityName: 'Which salespeople contribute the most revenue?',
      description: 'Rank salespeople by revenue', dimensions: ['Salesperson'], measures: ['Revenue'],
    };
    const rankIntent = { ...runtimeIntent('group_by'), id: 'intent_salespeople', sourceActionId: 'action_salespeople', dimensions: ['Salesperson'], measures: ['Revenue'] };
    const plan = buildInvestigationDecisionVisualizationPlan({
      analysisAction: rankAction, runtimeIntent: rankIntent, primaryDomain: 'revenue', selectedPerspectiveId: 'revenue_money',
      chartModel: { id: 'chart_salespeople', sourceResultId: 'result_salespeople', status: 'ready', chartType: 'bar', title: 'Salespeople by revenue', xField: 'Salesperson', yField: 'Revenue', seriesFields: ['Revenue'], rows, warnings: [], source: 'duckdb_preview_result' },
    });
    expect(plan?.result.rows).toHaveLength(30);
    expect(plan?.visualizationPlan.patternId).toBe('ranking_bar');
    expect(plan?.visualizationPlan.rendererFamily).toBe('row');
    expect(plan?.visualizationPlan.presentationShaping).toEqual({
      kind: 'top_n', limit: 15, sourceCategoryCount: 30, omittedCategoryCount: 15,
      sortMetricId: 'Revenue', sortDirection: 'desc', reason: 'high_cardinality_ranking',
    });
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


  it('materializes explicit actual and target on one governed target-combo visual', () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({ Date: `2026-${String(index + 1).padStart(2, '0')}-01`, Actual: 80 + index, Target: 100 }));
    const targetAction = {
      id: 'action_actual_vs_target', opportunityName: 'Actual versus target performance', label: 'Actual versus target performance',
      description: 'How does the actual result compare with the target over time?', actionType: 'trend' as const,
      dimensions: ['Date'], measures: ['Actual','Target'], confidenceScore: 100, source: 'dataset_understanding' as const,
    };
    const intent = {
      id: 'intent_actual_vs_target', sourceActionId: targetAction.id, type: 'trend' as const,
      dimensions: ['Date'], measures: ['Actual','Target'], expectedShape: 'line_chart' as const,
      status: 'ready' as const, warnings: [], blockedReasons: [], source: 'analysis_action' as const,
    };
    const plan = buildInvestigationDecisionVisualizationPlan({
      analysisAction: targetAction, runtimeIntent: intent, primaryDomain: 'performance', selectedPerspectiveId: 'performance_ranking',
      chartModel: { id: 'chart_target', sourceResultId: 'result_target', status: 'ready', chartType: 'line', title: targetAction.opportunityName, xField: 'Date', yField: 'Actual', seriesFields: ['Actual','Target'], rows, warnings: [], source: 'duckdb_preview_result' },
    });
    expect(plan?.visualizationPlan).toMatchObject({ analyticalIntent: 'target_attainment', patternId: 'target_combo', rendererFamily: 'combo_bar_line' });
    expect(plan?.result.metricIds).toEqual(['Actual','Target']);
  });
  it('uses the governed base count for status composition even when derived rate fields are present', () => {
    const rows = [
      { Status: 'Delivered', record_count: 70, completed_deliveries: 70, total_deliveries: 70, delivery_completion_rate: 1 },
      { Status: 'Failed', record_count: 20, completed_deliveries: 0, total_deliveries: 20, delivery_completion_rate: 0 },
      { Status: 'Pending', record_count: 10, completed_deliveries: 0, total_deliveries: 10, delivery_completion_rate: 0 },
    ];
    const action = { id:'delivery_completion_mix', opportunityName:'Delivery completion mix', description:'What share of deliveries are completed, failed, or pending?', actionType:'group_by' as const, dimensions:['Status'], measures:['record_count'], confidenceScore:100, source:'dataset_understanding' as const };
    const intent = { sourceActionId:'delivery_completion_mix', type:'group_by' as const, dimensions:['Status'], measures:['record_count'], derivedMeasures:[{ id:'delivery_completion_rate', label:'delivery_completion_rate', type:'positive_rate' as const, sourceColumn:'Status', positiveValues:['Delivered'], numeratorLabel:'completed_deliveries', denominatorLabel:'total_deliveries' }], expectedShape:'bar_chart' as const, status:'ready' as const, warnings:[], blockedReasons:[], source:'analysis_action' as const };
    const plan = buildInvestigationDecisionVisualizationPlan({
      chartModel: { id:'c', sourceResultId:'r', status:'ready', chartType:'bar', title:'Completion', xField:'Status', yField:'completed_deliveries', seriesFields:['record_count','completed_deliveries','total_deliveries','delivery_completion_rate'], rows, warnings:[], source:'duckdb_preview_result' },
      runtimeIntent:intent, analysisAction:action, primaryDomain:'operations', selectedPerspectiveId:'operations',
    });
    expect(plan?.visualizationPlan.analyticalIntent).toBe('composition');
    expect(plan?.result.metricIds).toEqual(['record_count']);
    expect(plan?.visualizationPlan.patternId).toBe('composition_donut');
  });

  it('treats an exactly two-point time result as period comparison before trend', () => {
    const rows = [{ 'Reporting Period':'2026-05', Revenue:100 }, { 'Reporting Period':'2026-06', Revenue:130 }];
    const action = { id:'money_over_time', opportunityName:'Money over time', description:'Revenue across reporting periods', actionType:'trend' as const, dimensions:['Reporting Period'], measures:['Revenue'], confidenceScore:100, source:'dataset_understanding' as const };
    const intent = { sourceActionId:'money_over_time', type:'trend' as const, dimensions:['Reporting Period'], measures:['Revenue'], expectedShape:'line_chart' as const, status:'ready' as const, warnings:[], blockedReasons:[], source:'analysis_action' as const };
    const plan = buildInvestigationDecisionVisualizationPlan({
      chartModel:{ id:'c2', sourceResultId:'r2', status:'ready', chartType:'line', title:'Revenue', xField:'Reporting Period', yField:'Revenue', seriesFields:['Revenue'], rows, warnings:[], source:'duckdb_preview_result' },
      runtimeIntent:intent, analysisAction:action, primaryDomain:'revenue', selectedPerspectiveId:'revenue',
    });
    expect(plan?.visualizationPlan.analyticalIntent).toBe('period_comparison');
    expect(plan?.visualizationPlan.patternId).not.toBe('trend_line');
  });

});
