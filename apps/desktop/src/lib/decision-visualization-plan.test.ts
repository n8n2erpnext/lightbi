import { describe, expect, it } from 'vitest';
import { createDecisionVisualizationPlan } from './decision-visualization-plan';

describe('DecisionVisualizationPlan v2', () => {
  const rows = [
    { reporting_period: '2026-05', sales_revenue: 300, gross_profit: 90 },
    { reporting_period: '2026-06', sales_revenue: 250, gross_profit: 70 },
  ];

  it('preserves governed result identity and plans an ordered trend semantically', () => {
    const plan = createDecisionVisualizationPlan({
      perspectiveId: 'executive_overview', rows, sourceCount: 2, dimensionField: 'reporting_period',
      analyticalIntent: 'trend', availableRoles: ['ordered_time','measure','series'],
      cardinality: { points: 2, series: 2 }, requiredSurfaces: ['preview','persistence','dashboard'],
      sourceRefs: [{ sourceId: 'src_sales', sourceName: 'sales.xlsx', role: 'sales', period: '2026-05', sourceRowCount: 200 }],
    });
    expect(plan.schemaVersion).toBe('lightbi.decision-visualization-plan.v2');
    expect(plan.visualizationPlan).toMatchObject({ patternId: 'trend_line', rendererFamily: 'line' });
    expect(plan.primaryVisualization).toMatchObject({ type: 'line', xField: 'reporting_period' });
    expect(plan.result.metricIds).toEqual(['sales_revenue', 'gross_profit']);
    expect(plan.governance).toEqual({ resultAuthority: 'governed_metric_results', evidencePolicy: 'source_bound', rawMultiSourceJoinAllowed: false });
  });
  it('creates a selected-point plan without inventing a cross-source row join', () => {
    const plan = createDecisionVisualizationPlan({
      perspectiveId: 'executive_overview', rows, sourceCount: 2, dimensionField: 'reporting_period',
      selectedScope: { dimensionField: 'reporting_period', dimensionValue: '2026-06', metricId: 'gross_profit' },
      analyticalIntent: 'category_comparison', availableRoles: ['category','measure'],
      cardinality: { categories: 1, series: 1 }, requiredSurfaces: ['preview','persistence','dashboard'],
    });
    expect(plan.result.rows).toEqual([{ reporting_period: '2026-06', gross_profit: 70 }]);
    expect(plan.result.metricIds).toEqual(['gross_profit']);
    expect(plan.visualizationPlan.patternId).toBe('category_compare');
    expect(plan.primaryVisualization.type).toBe('bar');
  });

  it('uses category semantics for non-time dimensions instead of row-count heuristics', () => {
    const plan = createDecisionVisualizationPlan({
      perspectiveId: 'inventory', rows: [{ Store: 'A', stock_qty: 12 }, { Store: 'B', stock_qty: 8 }],
      sourceCount: 1, dimensionField: 'Store', analyticalIntent: 'category_comparison',
      availableRoles: ['category','measure'], cardinality: { categories: 2, series: 1 },
      requiredSurfaces: ['preview','persistence','dashboard'],
    });
    expect(plan.result.dimensionField).toBe('Store');
    expect(plan.primaryVisualization.type).toBe('bar');
    expect(plan.visualizationPlan.patternId).toBe('category_compare');
  });
  it('preserves both measures for a relationship scatter plan', () => {
    const plan = createDecisionVisualizationPlan({
      perspectiveId: 'finance', rows: [{ cost: 10, revenue: 12 }, { cost: 20, revenue: 25 }],
      sourceCount: 1, dimensionField: 'cost', xFieldRole: 'measure', metricIds: ['cost','revenue'],
      analyticalIntent: 'relationship', availableRoles: ['entity_key','measure','comparison_measure'],
      cardinality: { points: 2 }, requiredSurfaces: ['preview','persistence','dashboard'],
    });
    expect(plan.result).toMatchObject({ dimensionField: 'cost', xFieldRole: 'measure', metricIds: ['cost','revenue'] });
    expect(plan.visualizationPlan).toMatchObject({ patternId: 'relationship_scatter', rendererFamily: 'scatter' });
    expect(plan.primaryVisualization).toMatchObject({ type: 'scatter', xField: 'cost', seriesFields: ['cost','revenue'] });
  });

  it('uses explicit governed metric IDs instead of incidental columns', () => {
    const common = {
      perspectiveId: 'inventory', sourceCount: 1, dimensionField: 'Store', analyticalIntent: 'category_comparison' as const,
      availableRoles: ['category','measure'] as const, cardinality: { categories: 1, series: 1 },
      requiredSurfaces: ['preview','persistence','dashboard'] as const,
    };
    const plan = createDecisionVisualizationPlan({ ...common, metricIds: ['stock_qty'], rows: [{ Store: 'A', stock_qty: 12, debug_label: 'source A' }] });
    expect(plan.result.metricIds).toEqual(['stock_qty']);
    expect(() => createDecisionVisualizationPlan({ ...common, metricIds: ['missing_metric'], rows: [{ Store: 'A', stock_qty: 12 }] }))
      .toThrow('DECISION_VISUALIZATION_METRIC_NOT_IN_RESULT');
  });
});
