import { describe, expect, it } from 'vitest';
import type { ChartPreviewModel } from './chart-preview-model';
import { createDecisionVisualizationPlan } from './decision-visualization-plan';
import { createInvestigationChartActions } from './investigation-chart-actions';

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
