import { describe, expect, it } from 'vitest';
import { buildInvestigationVisualNarrativePlan, type InvestigationVisualNarrativeInputItemV1 } from './investigation-visual-narrative';

function item(input: {
  id: string; primary?: boolean; question: string; actionType?: 'group_by'|'trend'|'distribution';
  dimension: string; metric: string; renderer?: string; values?: number[]; confidence?: number;
}): InvestigationVisualNarrativeInputItemV1 {
  const values = input.values ?? [10, 20, 30];
  const rows = values.map((value, index) => ({ [input.dimension]: `G${index + 1}`, [input.metric]: value }));
  const actionType = input.actionType ?? 'group_by';
  const expectedShape = actionType === 'trend' ? 'line_chart' : 'bar_chart';
  const chartType = actionType === 'trend' ? 'line' : 'bar';
  return {
    id: input.id, isPrimary: Boolean(input.primary), managementQuestion: input.question,
    sourceScopeKey: 'dataset:logistics',
    analysisAction: {
      id: input.id, opportunityName: input.question, label: input.question, description: input.question,
      actionType, dimensions: [input.dimension], measures: [input.metric], confidenceScore: input.confidence ?? 80,
      source: 'dataset_understanding',
    },
    runtimeIntent: {
      id: `intent:${input.id}`, sourceActionId: input.id, type: actionType,
      dimensions: [input.dimension], measures: [input.metric], expectedShape, status: 'ready', warnings: [], blockedReasons: [], source: 'analysis_action',
    },
    chartModel: {
      id: `chart:${input.id}`, sourceResultId: `result:${input.id}`, status: 'ready', chartType,
      title: input.question, xField: input.dimension, yField: input.metric, seriesFields: [input.metric], rows, warnings: [], source: 'duckdb_preview_result',
    },
    decisionVisualizationPlan: {
      schemaVersion: 'lightbi.decision-visualization-plan.v2', planId: `decision:${input.id}`, perspectiveId: input.id,
      selectedScope: null, sourceCount: 1, sourceRefs: [],
      result: { dimensionField: input.dimension, xFieldRole: 'dimension', metricIds: [input.metric], rows },
      visualizationPlan: {
        schemaVersion: 'lightbi.visualization-plan.v1', planId: `visual:${input.id}`,
        analyticalIntent: actionType === 'trend' ? 'trend' : 'category_comparison', patternId: 'category_compare',
        rendererFamily: (input.renderer ?? chartType) as any, status: 'planned', candidates: [], requiredSurfaces: ['preview'], patternRules: null,
        governance: { metricAuthority: 'upstream_only', evidenceAuthority: 'upstream_only', mbAuthority: 'presentation_vote_within_legal_set', deterministicSuitabilityFinal: true, retrievalRankIsConfidence: false },
      },
      primaryVisualization: { type: chartType, xField: input.dimension, seriesFields: [input.metric] },
      governance: { resultAuthority: 'governed_metric_results', evidencePolicy: 'source_bound', rawMultiSourceJoinAllowed: false },
    },
  };
}

describe('Investigation visual narrative adapter', () => {
  it('does not admit carrier cost as support for a governed delivery-count answer', () => {
    const result = buildInvestigationVisualNarrativePlan({ primaryDomain: 'operations', items: [
      item({ id: 'count', primary: true, question: 'How many governed deliveries are present?', dimension: 'delivery_status', metric: 'delivery_count' }),
      item({ id: 'cost', question: 'Carrier cost impact', dimension: 'carrier', metric: 'delivery_fee' }),
    ] });
    expect(result.plan.layoutCount).toBe(1);
    expect(result.plan.rejected).toContainEqual({ candidateId: 'cost', reason: 'not_complementary' });
  });
  it('rejects a near-duplicate Revenue trend support before Micro Brain ranking can affect membership', () => {
    const result = buildInvestigationVisualNarrativePlan({ primaryDomain: 'revenue', selectedPerspectiveId: 'revenue_money', items: [
      item({ id: 'revenue-trend', primary: true, question: 'How is Revenue changing over time?', actionType: 'trend', dimension: 'Date', metric: 'Revenue' }),
      item({ id: 'money-over-time', question: 'Money over time', actionType: 'trend', dimension: 'Date', metric: 'Revenue', confidence: 95 }),
    ] });
    expect(result.plan.layoutCount).toBe(1);
    expect(result.plan.rejected).toContainEqual({ candidateId: 'money-over-time', reason: 'duplicate_information' });
  });

  it('combines governed operations volume and downtime only on a shared grain', () => {
    const result = buildInvestigationVisualNarrativePlan({ primaryDomain: 'operations', items: [
      item({ id: 'volume', primary: true, question: 'Delivery volume by carrier', dimension: 'carrier', metric: 'delivery_count' }),
      item({ id: 'downtime', question: 'Downtime by carrier', dimension: 'carrier', metric: 'downtime_minutes' }),
    ] });
    expect(result.plan.layoutCount).toBe(1);
    expect(result.plan.units).toHaveLength(1);
    expect(result.plan.units[0]).toMatchObject({
      primaryAnchor: true,
      presentation: 'combo_bar_line',
      candidateIds: expect.arrayContaining(['volume', 'downtime']),
    });
  });

  it('does not combine the same metrics when their governed grain differs', () => {
    const result = buildInvestigationVisualNarrativePlan({ primaryDomain: 'operations', items: [
      item({ id: 'volume', primary: true, question: 'Delivery volume by carrier', dimension: 'carrier', metric: 'delivery_count' }),
      item({ id: 'downtime', question: 'Downtime by route', dimension: 'route', metric: 'downtime_minutes' }),
    ] });
    expect(result.plan.layoutCount).toBe(1);
    expect(result.plan.units[0].candidateIds).toEqual(['volume']);
  });
  it('keeps deterministic membership stable across user perspectives while advisory evidence stays bounded', () => {
    const items = [
      item({ id: 'primary', primary: true, question: 'Where is inventory concentration exposure by warehouse?', dimension: 'Warehouse', metric: 'inventory_value', confidence: 90 }),
      item({ id: 'trend', question: 'Inventory value trend over time', actionType: 'trend', dimension: 'Month', metric: 'inventory_value', renderer: 'line', confidence: 80 }),
      item({ id: 'distribution', question: 'Inventory value distribution', actionType: 'distribution', dimension: 'StockAge', metric: 'inventory_value', renderer: 'histogram', confidence: 80 }),
      item({ id: 'product_rank', question: 'Top products by inventory value', dimension: 'Product', metric: 'inventory_value', renderer: 'row', confidence: 80 }),
      item({ id: 'category_risk', question: 'Concentration exposure by category', dimension: 'Category', metric: 'inventory_value', renderer: 'pareto', confidence: 80 }),
      item({ id: 'warehouse_rank', question: 'Top warehouses by inventory value', dimension: 'WarehouseName', metric: 'inventory_value', renderer: 'row', confidence: 80 }),
    ];
    const executive = buildInvestigationVisualNarrativePlan({ primaryDomain: 'inventory', selectedPerspectiveId: 'executive_overview', items });
    const inventory = buildInvestigationVisualNarrativePlan({ primaryDomain: 'inventory', selectedPerspectiveId: 'inventory_health', items });
    const admitted = (result: typeof executive) => result.plan.units.flatMap(unit => unit.candidateIds).sort();
    expect(executive.plan.layoutCount).toBe(3);
    expect(inventory.plan.layoutCount).toBe(3);
    expect(admitted(executive)).toEqual(admitted(inventory));
    expect(executive.plan.primaryCandidateId).toBe('primary');
    expect(inventory.plan.primaryCandidateId).toBe('primary');
    expect(executive.plan.governance).toMatchObject({ mbAuthority: 'advisory_only', deterministicMembershipFinal: true, rawJoinAllowed: false });
  });


  it('combines delivery workload and carrier cost only when the governed carrier grain aligns', () => {
    const result = buildInvestigationVisualNarrativePlan({ primaryDomain: 'operations', items: [
      item({ id: 'volume', primary: true, question: 'Delivery workload by carrier', dimension: 'Carrier', metric: 'record_count' }),
      item({ id: 'cost', question: 'Carrier cost impact by delivery fee', dimension: 'Carrier', metric: 'Delivery Fee' }),
    ] });
    expect(result.plan.layoutCount).toBe(1);
    expect(result.plan.units[0]).toMatchObject({ presentation: 'combo_bar_line', primaryAnchor: true });
    expect(result.plan.units[0].candidateIds).toEqual(expect.arrayContaining(['volume','cost']));
  });

  it('combines profit and margin context on one finance visual when the time grain aligns', () => {
    const result = buildInvestigationVisualNarrativePlan({ primaryDomain: 'finance', items: [
      item({ id: 'profit', primary: true, question: 'Profit performance over time', actionType: 'trend', dimension: 'Date', metric: 'Gross Profit', renderer: 'line' }),
      item({ id: 'margin', question: 'Margin context for profit performance', actionType: 'trend', dimension: 'Date', metric: 'Margin', renderer: 'line' }),
    ] });
    expect(result.plan.layoutCount).toBe(1);
    expect(result.plan.units[0]).toMatchObject({ presentation: 'combo_bar_line', primaryAnchor: true });
    expect(result.plan.units[0].candidateIds).toEqual(expect.arrayContaining(['profit','margin']));
  });
});