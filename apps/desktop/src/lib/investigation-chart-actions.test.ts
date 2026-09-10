import { describe, expect, it } from 'vitest';
import type { ChartPreviewModel } from './chart-preview-model';
import { createDecisionVisualizationPlan } from './decision-visualization-plan';
import { createInvestigationChartActions } from './investigation-chart-actions';
import { createVisualNarrativeCompositionPlan } from './visual-narrative-composition';

const scatterModel: ChartPreviewModel = {
  id: 'chart_scatter', sourceResultId: 'result_scatter', status: 'ready',
  chartType: 'scatter', title: 'Cost vs revenue', seriesFields: ['cost', 'revenue'],
  rows: [{ cost: 10, revenue: 100 }, { cost: 20, revenue: 180 }],
  warnings: [], source: 'duckdb_preview_result',
};

function relationshipPlan() {
  return createDecisionVisualizationPlan({
    perspectiveId: 'cost_vs_revenue', sourceCount: 1, dimensionField: 'cost', xFieldRole: 'measure',
    metricIds: ['cost', 'revenue'], rows: scatterModel.rows, analyticalIntent: 'relationship',
    availableRoles: ['entity_key', 'measure', 'comparison_measure'], cardinality: { points: 2, series: 2 },
    requiredSurfaces: ['preview', 'persistence', 'dashboard'],
  });
}

describe('DPR-6 investigation chart persistence', () => {
  it('persists relationship scatter without collapsing it to Bar and keeps visualization metadata', () => {
    let captured: any = null;
    const plan = relationshipPlan();
    const actions = createInvestigationChartActions({
      session: { datasetId: 'dataset_1' } as any,
      analysisAction: { id: 'action_relationship', opportunityName: 'Cost vs revenue', measures: ['cost', 'revenue'] } as any,
      chartModel: scatterModel, previewResult: null, primaryDecisionVisualizationPlan: plan,
      singleSourceBAOverview: null, baDecisionBrief: null, governedResultTotal: null, supportingCharts: [],
      createChart: input => { captured = input; return 'chart_saved'; },
      createDashboard: () => 'dashboard_1', addChartToDashboard: () => undefined,
      persistWorkspaceSession: async () => null, setSavedChartNotice: () => undefined,
      closeDeepAnalysis: () => undefined, navigate: () => undefined, t: value => value,
    });

    expect(actions.persistChartModel(scatterModel, 'Cost vs revenue', 'test', plan)).toBe('chart_saved');
    expect(captured.type).toBe('Scatter');
    expect(captured.xAxis).toEqual([{ columnName: 'cost' }]);
    expect(captured.yAxis).toEqual([{ columnName: 'revenue', aggregation: 'None' }]);
    const savedPlan = captured.formatting.lightbiData.decisionVisualizationPlan;
    expect(savedPlan.schemaVersion).toBe('lightbi.decision-visualization-plan.v2');
    expect(savedPlan.visualizationPlan.patternId).toBe('relationship_scatter');
    expect(savedPlan.visualizationPlan.rendererFamily).toBe('scatter');
    expect(savedPlan.visualizationPlan.patternRules.negativeRules).toEqual(expect.arrayContaining([
      expect.stringMatching(/caus/i),
    ]));
    expect(savedPlan.visualizationPlan.governance).toMatchObject({
      metricAuthority: 'upstream_only', mbAuthority: 'advisory_only', deterministicSuitabilityFinal: true,
    });
  });
});




describe('Gate D rich renderer persistence', () => {
  it('preserves histogram semantics through a coarse persisted chart transport', () => {
    let captured: any = null;
    const rows = [{ profit: 10 }, { profit: 14 }, { profit: 18 }, { profit: 35 }];
    const model: ChartPreviewModel = {
      id: 'chart_hist', sourceResultId: 'result_hist', status: 'ready', chartType: 'bar', title: 'Profit distribution',
      yField: 'profit', seriesFields: ['profit'], rows, warnings: [], source: 'duckdb_preview_result',
    };
    const plan = createDecisionVisualizationPlan({
      perspectiveId: 'profit_distribution', sourceCount: 1, dimensionField: 'profit', xFieldRole: 'measure',
      metricIds: ['profit'], rows, analyticalIntent: 'distribution', availableRoles: ['numeric_observation'],
      cardinality: { points: rows.length, series: 1 }, requiredSurfaces: ['preview','persistence','dashboard'],
    });
    const actions = createInvestigationChartActions({
      session: { datasetId: 'dataset_1' } as any,
      analysisAction: { id: 'action_distribution', opportunityName: 'Profit distribution', measures: ['profit'] } as any,
      chartModel: model, previewResult: null, primaryDecisionVisualizationPlan: plan,
      singleSourceBAOverview: null, baDecisionBrief: null, governedResultTotal: null, supportingCharts: [],
      createChart: input => { captured = input; return 'chart_hist_saved'; },
      createDashboard: () => 'dashboard_1', addChartToDashboard: () => undefined,
      persistWorkspaceSession: async () => null, setSavedChartNotice: () => undefined,
      closeDeepAnalysis: () => undefined, navigate: () => undefined, t: value => value,
    });
    actions.persistChartModel(model, 'Profit distribution', 'test', plan);
    expect(captured.type).toBe('Bar');
    expect(captured.formatting.lightbiData.decisionVisualizationPlan.visualizationPlan).toMatchObject({
      patternId: 'distribution_histogram', rendererFamily: 'histogram',
    });
  });
});

describe('DPR-7 single-source dashboard composition', () => {
  it('plans membership before chart creation and persists ranked breakdown visualization authority', async () => {
    const model: ChartPreviewModel = {
      id: 'chart_primary', sourceResultId: 'result_primary', status: 'ready', chartType: 'bar',
      title: 'Revenue by month', xField: 'Month', yField: 'Revenue', seriesFields: ['Revenue'],
      rows: [{ Month: 'May', Revenue: 100 }, { Month: 'June', Revenue: 200 }], warnings: [], source: 'duckdb_preview_result',
    };
    const primaryPlan = createDecisionVisualizationPlan({
      perspectiveId: 'Sales', sourceCount: 1, dimensionField: 'Month', metricIds: ['Revenue'], rows: model.rows,
      analyticalIntent: 'category_comparison', availableRoles: ['category', 'measure'],
      cardinality: { points: 2, categories: 2, series: 1 }, requiredSurfaces: ['preview', 'persistence', 'dashboard'],
    });
    const chartInputs: any[] = []; const added: string[] = []; let dashboardMetadata: any = null;
    const breakdown = (id: string, column: string) => ({
      id, label: column, physicalColumn: column, valueKind: 'money' as const,
      top: [{ label: 'A', value: 120, share: 0.6, rowCount: 2 }, { label: 'B', value: 80, share: 0.4, rowCount: 1 }], bottom: [],
    });    const overview = {
      mode: 'commercial', analysisLabel: 'Sales', sourceRowCount: 3, isRepresentativeSample: false,
      bindings: { selectedMeasure: 'Revenue' }, trendChange: null, findings: ['Observed revenue mix.'],
      recommendedActions: ['Review the strongest group.'], limitations: ['Descriptive only.'],
      investigation: { domain: 'revenue' },
      kpis: Array.from({ length: 6 }, (_, index) => ({ id: `kpi_${index}`, label: `KPI ${index}`, value: 10 + index, kind: 'number' as const })),
      breakdowns: [breakdown('product', 'Product'), breakdown('Region', 'Region'), breakdown('Channel', 'Channel'), breakdown('Branch', 'Branch')],
    } as any;
    const actions = createInvestigationChartActions({
      session: { datasetId: 'dataset_1' } as any,
      analysisAction: { id: 'action_sales', opportunityName: 'Sales', description: 'Review sales revenue', dimensions: ['Month'], measures: ['Revenue'] } as any,
      chartModel: model, previewResult: { status: 'executed' } as any, primaryDecisionVisualizationPlan: primaryPlan,
      singleSourceBAOverview: overview, baDecisionBrief: null, governedResultTotal: 300, supportingCharts: [],
      createChart: input => { chartInputs.push(input); return `chart_${chartInputs.length}`; },
      createDashboard: (_name, metadata) => { dashboardMetadata = metadata; return 'dashboard_1'; },
      addChartToDashboard: (_dashboardId, chartId) => { added.push(chartId); },
      persistWorkspaceSession: async () => null, setSavedChartNotice: () => undefined,
      closeDeepAnalysis: () => undefined, navigate: () => undefined, t: value => value,
    });

    await actions.createPerspectiveDashboard();
    expect(dashboardMetadata.dashboardCompositionPlan.schemaVersion).toBe('lightbi.dashboard-composition-plan.v1');
    expect(dashboardMetadata.dashboardCompositionPlan.governance).toMatchObject({ mbAuthority: 'advisory_only', mbMayChangeMembership: false });
    expect(dashboardMetadata.dashboardCompositionAdvice.governance).toMatchObject({ authority: 'advisory_only', mayChangeMembership: false });    const composition = dashboardMetadata.dashboardCompositionPlan;
    expect(composition.rejected.some((item: any) => item.reason === 'metric_budget_exceeded')).toBe(true);
    expect(composition.rejected.some((item: any) => item.reason === 'visual_budget_exceeded')).toBe(false);
    expect(chartInputs.filter(input => input.type === 'Number')).toHaveLength(4);
    expect(chartInputs).toHaveLength(9);
    expect(added).toEqual(chartInputs.map((_input, index) => `chart_${index + 1}`));

    const breakdownCharts = chartInputs.filter(input => input.formatting?.lightbiData?.source === 'perspective_dashboard_ba_breakdown');
    expect(breakdownCharts).toHaveLength(4);
    for (const chart of breakdownCharts) {
      expect(chart.formatting.lightbiData.decisionVisualizationPlan.schemaVersion).toBe('lightbi.decision-visualization-plan.v2');
      expect(chart.formatting.lightbiData.decisionVisualizationPlan.visualizationPlan.analyticalIntent).toBe('ranking');
      expect(chart.formatting.lightbiData.decisionVisualizationPlan.visualizationPlan.patternId).toBe('ranking_bar');
      expect(chart.type).toBe('Row');
    }
    expect(composition.items.some((item: any) => item.semanticRole === 'hero_metric')).toBe(true);
    expect(composition.items.some((item: any) => item.semanticRole === 'primary_answer')).toBe(true);
    expect(composition.items.some((item: any) => item.semanticRole === 'ranked_driver')).toBe(true);
    expect(composition.items.every((item: any) => item.evidenceRefs.length > 0 && item.reasonForInclusion)).toBe(true);
  });
});

describe('Visual narrative dashboard inheritance', () => {
  it('persists one combined hero widget and the real selected perspective without resurrecting consumed support charts', async () => {
    const primary: ChartPreviewModel = {
      id: 'primary', sourceResultId: 'result_revenue', status: 'ready', chartType: 'bar', title: 'Revenue',
      xField: 'Month', yField: 'Revenue', seriesFields: ['Revenue'],
      rows: [{ Month: 'May', Revenue: 100 }, { Month: 'June', Revenue: 140 }], warnings: [], source: 'duckdb_preview_result',
    };
    const support: ChartPreviewModel = {
      id: 'support', sourceResultId: 'result_cost', status: 'ready', chartType: 'line', title: 'Cost',
      xField: 'Month', yField: 'Cost', seriesFields: ['Cost'],
      rows: [{ Month: 'May', Cost: 70 }, { Month: 'June', Cost: 88 }], warnings: [], source: 'duckdb_preview_result',
    };
    const primaryPlan = createDecisionVisualizationPlan({
      perspectiveId: 'view:executive', sourceCount: 1, dimensionField: 'Month', metricIds: ['Revenue'], rows: primary.rows,
      analyticalIntent: 'category_comparison', availableRoles: ['category','measure'],
      cardinality: { points: 2, categories: 2, series: 1 }, requiredSurfaces: ['preview','persistence','dashboard'],
    });
    const visualNarrativePlan = createVisualNarrativeCompositionPlan({ candidates: [
      { id: 'action_revenue', isPrimary: true, managementQuestion: 'Compare revenue and cost', storyRole: 'comparison', analyticalIntent: 'period_comparison', dimensionField: 'Month', metricIds: ['Revenue'], unitFamily: 'money', grainId: 'month', sourceScopeKey: 'artifact-1', evidenceBacked: true, evidenceRefs: ['e:revenue'], decisionImportance: 100, rendererFamily: 'bar', pointCount: 2, combination: { groupId: 'finance-story', mark: 'bar', explicitUnitLabel: true } },
      { id: 'action_cost', managementQuestion: 'Show cost on the same monthly comparison', storyRole: 'comparison', analyticalIntent: 'period_comparison', dimensionField: 'Month', metricIds: ['Cost'], unitFamily: 'money', grainId: 'month', sourceScopeKey: 'artifact-1', evidenceBacked: true, evidenceRefs: ['e:cost'], decisionImportance: 90, rendererFamily: 'line', pointCount: 2, combination: { groupId: 'finance-story', mark: 'line', explicitUnitLabel: true } },
    ] });
    expect(visualNarrativePlan.layoutCount).toBe(1);
    expect(visualNarrativePlan.units[0].presentation).toBe('combo_bar_line');

    const chartInputs: any[] = []; const layouts: any[] = []; let dashboardMetadata: any = null;
    const actions = createInvestigationChartActions({
      session: { datasetId: 'dataset_1', supportingAnalyses: [{ analysisAction: { id: 'action_cost', measures: ['Cost'] } }] } as any,
      analysisAction: { id: 'action_revenue', opportunityName: 'Revenue performance', description: 'Compare revenue and cost', dimensions: ['Month'], measures: ['Revenue'] } as any,
      chartModel: primary, previewResult: { status: 'executed' } as any, primaryDecisionVisualizationPlan: primaryPlan,
      singleSourceBAOverview: null, baDecisionBrief: null, governedResultTotal: null,
      supportingCharts: [{ actionId: 'action_cost', label: 'Cost', chartModel: support, decisionVisualizationPlan: null }],
      visualNarrativePlan, selectedPerspectiveId: 'view:executive',
      createChart: input => { chartInputs.push(input); return `chart_${chartInputs.length}`; },
      createDashboard: (_name, metadata) => { dashboardMetadata = metadata; return 'dashboard_1'; },
      addChartToDashboard: (_dashboardId, _chartId, layout) => { layouts.push(layout); },
      persistWorkspaceSession: async () => null, setSavedChartNotice: () => undefined,
      closeDeepAnalysis: () => undefined, navigate: () => undefined, t: value => value,
    });
    await actions.createPerspectiveDashboard();
    expect(chartInputs).toHaveLength(1);
    expect(chartInputs[0].formatting.lightbiData.visualNarrativeRendererFamily).toBe('combo_bar_line');
    expect(chartInputs[0].formatting.lightbiData.rows[0]).toMatchObject({ Month: 'May', Revenue: 100, Cost: 70 });
    expect(layouts).toEqual([{ x: 0, y: 0, w: 20, h: 8 }]);
    expect(dashboardMetadata.visualNarrativeCompositionPlan.layoutCount).toBe(1);
    expect(dashboardMetadata.perspectiveId).toBe('view:executive');
    expect(dashboardMetadata.dashboardCompositionPlan.context.decisionPerspective).toBe('view:executive');
  });
});
