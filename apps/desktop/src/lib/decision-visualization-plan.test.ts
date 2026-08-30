import { describe, expect, it } from 'vitest';
import { createDecisionVisualizationPlan } from './decision-visualization-plan';

describe('DecisionVisualizationPlanV1', () => {
  const rows = [
    { reporting_period: '2026-05', sales_revenue: 300, gross_profit: 90 },
    { reporting_period: '2026-06', sales_revenue: 250, gross_profit: 70 },
  ];

  it('preserves governed result identity and source-bound evidence policy', () => {
    const plan = createDecisionVisualizationPlan({
      perspectiveId: 'executive_overview', rows, sourceCount: 2, dimensionField: 'reporting_period',
      sourceRefs: [{ sourceId: 'src_sales', sourceName: 'sales.xlsx', role: 'sales', period: '2026-05', sourceRowCount: 200 }],
    });
    expect(plan.schemaVersion).toBe('lightbi.decision-visualization-plan.v1');
    expect(plan.primaryVisualization).toMatchObject({ type: 'line', xField: 'reporting_period' });
    expect(plan.result.metricIds).toEqual(['sales_revenue', 'gross_profit']);
    expect(plan.governance).toEqual({ resultAuthority: 'governed_metric_results', evidencePolicy: 'source_bound', rawMultiSourceJoinAllowed: false });
  });

  it('creates a selected-point plan without inventing a cross-source row join', () => {
    const plan = createDecisionVisualizationPlan({
      perspectiveId: 'executive_overview', rows, sourceCount: 2, dimensionField: 'reporting_period',
      selectedScope: { dimensionField: 'reporting_period', dimensionValue: '2026-06', metricId: 'gross_profit' },
    });
    expect(plan.result.rows).toEqual([{ reporting_period: '2026-06', gross_profit: 70 }]);
    expect(plan.result.metricIds).toEqual(['gross_profit']);
    expect(plan.primaryVisualization.type).toBe('bar');
  });

  it('supports non-time single-source dimensions without a second visualization contract', () => {
    const plan = createDecisionVisualizationPlan({
      perspectiveId: 'inventory', rows: [{ Store: 'A', stock_qty: 12 }, { Store: 'B', stock_qty: 8 }],
      sourceCount: 1, dimensionField: 'Store',
    });
    expect(plan.result.dimensionField).toBe('Store');
    expect(plan.result.metricIds).toEqual(['stock_qty']);
    expect(plan.primaryVisualization).toMatchObject({ type: 'line', xField: 'Store' });
  });
});
