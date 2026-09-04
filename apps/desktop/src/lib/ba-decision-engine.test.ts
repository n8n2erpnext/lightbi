import { describe, expect, it } from 'vitest';
import { createBADecisionBrief, createPreExecutionBADecisionBrief } from './ba-decision-engine';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { ChartPreviewModel } from './chart-preview-model';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';

const runtimeIntent: RuntimeIntent = {
  id: 'intent_test',
  sourceActionId: 'action_test',
  type: 'group_by',
  dimensions: ['branch'],
  measures: ['amount'],
  expectedShape: 'bar_chart',
  status: 'ready',
  warnings: [],
  blockedReasons: [],
  source: 'analysis_action'
};

const previewResult: DuckDBPreviewResult = {
  id: 'preview_test',
  sourceSqlPreviewId: 'sql_test',
  status: 'executed',
  columns: ['branch', 'amount_sum'],
  rows: [
    { branch: 'A', amount_sum: 700 },
    { branch: 'B', amount_sum: 200 },
    { branch: 'C', amount_sum: 100 }
  ],
  rowCount: 3,
  maxRows: 100,
  warnings: [],
  blockedReasons: [],
  executionScope: 'full_file',
  source: 'backend_duckdb_preview'
};

const chartModel: ChartPreviewModel = {
  id: 'chart_test',
  sourceResultId: 'preview_test',
  status: 'ready',
  chartType: 'bar',
  title: 'Amount by branch',
  xField: 'branch',
  yField: 'amount_sum',
  seriesFields: ['amount_sum'],
  rows: previewResult.rows,
  warnings: [],
  source: 'duckdb_preview_result'
};

describe('ba decision engine', () => {
  it('creates evidence-backed insights and separates trust from decision readiness', () => {
    const brief = createBADecisionBrief({
      datasetId: 'sales.csv',
      previewResult,
      chartModel,
      runtimeIntent,
      aiBriefing: {
        datasetId: 'sales.csv',
        generatedAt: '2026-06-27T00:00:00.000Z',
        grain: 'transaction',
        grainEvidence: 'sales export',
        readinessTier: 'decision_support',
        readinessScore: 92,
        semanticFields: [],
        caveats: [],
        safeActionHints: []
      }
    });

    expect(brief.dataTrustScore).toBe(92);
    expect(brief.decisionReadinessScore).toBeGreaterThan(70);
    expect(brief.insights.some(insight => insight.type === 'top_concentration')).toBe(true);
    expect(brief.recommendedCharts[0]?.chartType).toBe('bar');
    expect(brief.executiveSummary).toContain('sales.csv');
  });

  it('carries governed execution scope and decision-use restrictions into the BA brief', () => {
    const brief = createBADecisionBrief({
      datasetId: 'sales.csv',
      previewResult,
      chartModel,
      runtimeIntent,
      governedContext: {
        metricId: 'sales_revenue',
        businessPerspectiveIds: ['revenue'],
        evidenceIds: ['document-identity-evidence:test'],
        limitations: ['metric_preflight_is_conditional'],
        restrictions: ['Analytical evidence does not authorize a business decision.'],
        fullFileRowCount: 9994,
        decisionUseAuthorized: false,
      },
    });

    expect(brief.insights.find(insight => insight.id === 'ba_governed_scope')?.statement).toContain('9,994');
    expect(brief.decisionReadinessScore).toBeLessThanOrEqual(79);
    expect(brief.caveats).toContain('Governed limitation: metric_preflight_is_conditional');
    expect(brief.caveats).toContain('Governed restriction: Analytical evidence does not authorize a business decision.');
    expect(brief.decisionSuggestions[0]?.title).toBe('Validate before operational action');
    expect(brief.decisionSuggestions.some(item => item.title === 'Validate before deciding')).toBe(false);
  });

  it('marks decision brief as blocked when preview execution fails', () => {
    const brief = createBADecisionBrief({
      datasetId: 'dirty.xlsx',
      previewResult: {
        ...previewResult,
        status: 'failed',
        rows: [],
        rowCount: 0,
        errorMessage: 'No usable rows'
      },
      chartModel: null,
      runtimeIntent,
      aiBriefing: {
        datasetId: 'dirty.xlsx',
        generatedAt: '2026-06-27T00:00:00.000Z',
        grain: 'unknown',
        grainEvidence: '',
        readinessTier: 'exploratory_only',
        readinessScore: 48,
        semanticFields: [],
        caveats: ['Header is ambiguous'],
        safeActionHints: []
      }
    });

    expect(brief.decisionReadinessScore).toBeLessThanOrEqual(35);
    expect(brief.insights[0]?.severity).toBe('critical');
    expect(brief.decisionSuggestions[0]?.title).toBe('Fix execution or data quality first');
  });

  it('creates a cautious pre-execution brief from retained/profile rows', () => {
    const brief = createPreExecutionBADecisionBrief({
      datasetId: 'sales.csv',
      rows: [
        { branch: 'A', amount: 700 },
        { branch: 'B', amount: 200 },
        { branch: 'C', amount: 100 },
        { branch: 'A', amount: 300 }
      ],
      runtimeIntent,
      rowScope: 'retained_rows',
      aiBriefing: {
        datasetId: 'sales.csv',
        generatedAt: '2026-06-27T00:00:00.000Z',
        grain: 'transaction',
        grainEvidence: 'sales export',
        readinessTier: 'decision_support',
        readinessScore: 88,
        semanticFields: [],
        caveats: [],
        safeActionHints: []
      }
    });

    expect(brief).not.toBeNull();
    expect(brief?.executiveSummary).toContain('Pre-execution estimate');
    expect(brief?.caveats[0]).toContain('Run preview');
    expect(brief?.insights.some(insight => insight.type === 'top_concentration')).toBe(true);
    expect(brief?.decisionReadinessScore).toBeLessThan(brief?.dataTrustScore ?? 0);
    expect(brief?.decisionSuggestions[0]?.title).toBe('Run preview to validate');
  });

  it('detects outliers that can distort a business decision', () => {
    const brief = createBADecisionBrief({
      datasetId: 'sales.csv',
      previewResult: {
        ...previewResult,
        rows: [
          { branch: 'A', amount_sum: 10 },
          { branch: 'B', amount_sum: 11 },
          { branch: 'C', amount_sum: 12 },
          { branch: 'D', amount_sum: 13 },
          { branch: 'E', amount_sum: 14 },
          { branch: 'F', amount_sum: 500 }
        ],
        rowCount: 6
      },
      chartModel,
      runtimeIntent,
      aiBriefing: {
        datasetId: 'sales.csv',
        generatedAt: '2026-06-27T00:00:00.000Z',
        grain: 'transaction',
        grainEvidence: 'sales export',
        readinessTier: 'decision_support',
        readinessScore: 90,
        semanticFields: [],
        caveats: [],
        safeActionHints: []
      }
    });

    expect(brief.insights.some(insight => insight.type === 'outlier')).toBe(true);
    expect(brief.decisionSuggestions.some(suggestion => suggestion.action.includes('unusual values'))).toBe(true);
    expect(brief.decisionReadinessScore).toBeLessThan(75);
  });

  it('detects duplicate key risk before trusting grouped totals', () => {
    const brief = createPreExecutionBADecisionBrief({
      datasetId: 'orders.csv',
      rows: [
        { order_id: 'A001', amount: 100 },
        { order_id: 'A001', amount: 100 },
        { order_id: 'A002', amount: 125 },
        { order_id: '', amount: 80 },
        { order_id: 'A003', amount: 90 },
        { order_id: 'A003', amount: 90 }
      ],
      runtimeIntent: {
        ...runtimeIntent,
        dimensions: ['order_id'],
        measures: ['amount']
      },
      rowScope: 'retained_rows',
      aiBriefing: {
        datasetId: 'orders.csv',
        generatedAt: '2026-06-27T00:00:00.000Z',
        grain: 'transaction',
        grainEvidence: 'orders export',
        readinessTier: 'caution',
        readinessScore: 82,
        semanticFields: [],
        caveats: [],
        safeActionHints: []
      }
    });

    expect(brief?.insights.some(insight => insight.type === 'key_risk')).toBe(true);
    expect(brief?.decisionSuggestions.some(suggestion => suggestion.action.includes('duplicate or empty key'))).toBe(true);
  });

  it('lowers decision readiness when required business fields are missing', () => {
    const brief = createBADecisionBrief({
      datasetId: 'profit.xlsx',
      previewResult,
      chartModel,
      runtimeIntent,
      aiBriefing: {
        datasetId: 'profit.xlsx',
        generatedAt: '2026-06-27T00:00:00.000Z',
        grain: 'transaction',
        grainEvidence: 'finance export',
        readinessTier: 'decision_support',
        readinessScore: 90,
        semanticFields: [
          {
            canonicalId: 'revenue',
            label: 'Doanh thu',
            domain: 'finance',
            role: 'measure',
            confidence: 95
          }
        ],
        caveats: [],
        safeActionHints: []
      }
    });

    expect(brief.insights.some(insight => insight.type === 'field_gap')).toBe(true);
    expect(brief.decisionSuggestions.some(suggestion => suggestion.action.includes('missing business fields'))).toBe(true);
    expect(brief.decisionReadinessScore).toBeLessThan(70);
  });

  it('surfaces semantic coverage gaps when populated business-like fields are not understood yet', () => {
    const brief = createBADecisionBrief({
      datasetId: 'orders.xlsx',
      previewResult,
      chartModel,
      runtimeIntent,
      aiBriefing: {
        datasetId: 'orders.xlsx',
        generatedAt: '2026-06-27T00:00:00.000Z',
        grain: 'transaction',
        grainEvidence: 'orders export',
        readinessTier: 'caution',
        readinessScore: 85,
        semanticFields: [
          {
            canonicalId: 'unknown_business_like:PaymentMode',
            label: 'PaymentMode',
            domain: 'unmapped',
            role: 'dimension',
            confidence: 35,
            coverageStatus: 'unknown_business_like',
            physicalColumn: 'PaymentMode',
            sampleValues: ['Cash', 'Installment'],
            reason: 'Column has business-like data but no safe canonical signal mapping yet.',
          },
        ],
        caveats: ['Unmapped business-like column kept for review: PaymentMode.'],
        safeActionHints: ['Review unmapped business-like fields before final BA/AI narrative.'],
        semanticCoverage: {
          totalColumns: 4,
          nonEmptyColumns: 4,
          recognized: 2,
          partial: 0,
          unknownBusinessLike: 1,
          technicalOrNoise: 1,
          coverageScore: 50,
          unknownBusinessLikeColumns: ['PaymentMode'],
          partialColumns: [],
        },
      },
    });

    const gap = brief.insights.find(insight => insight.id === 'ba_semantic_coverage_gap');
    expect(gap?.type).toBe('field_gap');
    expect(gap?.evidence.some(item => item.includes('PaymentMode'))).toBe(true);
    expect(brief.decisionSuggestions.some(suggestion => suggestion.action.includes('data exists'))).toBe(true);
    expect(brief.decisionReadinessScore).toBeLessThan(75);
  });

  it('adds latest-period movement insight for trend results', () => {
    const trendIntent: RuntimeIntent = {
      ...runtimeIntent,
      type: 'trend',
      dimensions: ['month'],
      measures: ['revenue'],
      expectedShape: 'line_chart'
    };
    const trendChart: ChartPreviewModel = {
      ...chartModel,
      chartType: 'line',
      xField: 'month',
      yField: 'revenue_sum',
      seriesFields: ['revenue_sum']
    };
    const brief = createBADecisionBrief({
      datasetId: 'sales.csv',
      previewResult: {
        ...previewResult,
        columns: ['month', 'revenue_sum'],
        rows: [
          { month: '2026-04', revenue_sum: 100 },
          { month: '2026-05', revenue_sum: 130 },
          { month: '2026-06', revenue_sum: 91 }
        ],
        rowCount: 3
      },
      chartModel: trendChart,
      runtimeIntent: trendIntent,
      aiBriefing: {
        datasetId: 'sales.csv',
        generatedAt: '2026-06-27T00:00:00.000Z',
        grain: 'transaction',
        grainEvidence: 'sales export',
        readinessTier: 'caution',
        readinessScore: 82,
        semanticFields: [],
        caveats: [],
        safeActionHints: []
      }
    });

    expect(brief.insights.some(insight => insight.id === 'ba_period_over_period')).toBe(true);
    expect(brief.recommendedCharts.some(chart => chart.chartType === 'line')).toBe(true);
  });

  it('reports positive-rate status mixes using numerator and denominator instead of treating the rate as a top amount', () => {
    const deliveryIntent: RuntimeIntent = {
      ...runtimeIntent,
      dimensions: ['Xe đến đúng hẹn'],
      measures: ['record_count'],
      derivedMeasures: [{
        id: 'delivery_completion_rate',
        label: 'Delivery completion rate',
        type: 'positive_rate',
        sourceColumn: 'Xe đến đúng hẹn',
        positiveValues: ['Đúng hẹn', 'Dung hen'],
        numeratorLabel: 'completed_deliveries',
        denominatorLabel: 'total_deliveries'
      }]
    };
    const deliveryRows = [
      {
        'Xe đến đúng hẹn': 'Đúng hẹn',
        record_count: 5704,
        completed_deliveries: 5704,
        total_deliveries: 5704,
        delivery_completion_rate: 1
      },
      {
        'Xe đến đúng hẹn': 'Không đúng hẹn',
        record_count: 1198,
        completed_deliveries: 0,
        total_deliveries: 1198,
        delivery_completion_rate: 0
      }
    ];
    const brief = createBADecisionBrief({
      datasetId: 'bcctnhapTTKT_23122024.xlsx',
      previewResult: {
        ...previewResult,
        columns: ['Xe đến đúng hẹn', 'record_count', 'completed_deliveries', 'total_deliveries', 'delivery_completion_rate'],
        rows: deliveryRows,
        rowCount: 2,
        executionScope: 'full_file'
      },
      chartModel: {
        ...chartModel,
        title: 'Delivery completion mix',
        xField: 'Xe đến đúng hẹn',
        yField: 'completed_deliveries',
        seriesFields: ['record_count', 'completed_deliveries', 'total_deliveries', 'delivery_completion_rate'],
        rows: deliveryRows
      },
      runtimeIntent: deliveryIntent,
      aiBriefing: {
        datasetId: 'bcctnhapTTKT_23122024.xlsx',
        generatedAt: '2026-07-04T00:00:00.000Z',
        grain: 'event',
        grainEvidence: 'delivery report',
        readinessTier: 'caution',
        readinessScore: 72,
        semanticFields: [],
        caveats: [],
        safeActionHints: []
      }
    });

    const positiveRateInsight = brief.insights.find(insight => insight.id === 'ba_positive_rate_mix');
    expect(positiveRateInsight?.statement).toContain('Đúng hẹn has 5,704 positive rows');
    expect(positiveRateInsight?.evidence).toContain('Overall: 5,704 / 6,902 (83%)');
    expect(brief.executiveSummary).toContain('Đúng hẹn has 5,704 positive rows');
  });

  it('adds segment spread insight and score breakdown', () => {
    const brief = createBADecisionBrief({
      datasetId: 'segments.csv',
      previewResult: {
        ...previewResult,
        rows: [
          { segment: 'Enterprise', amount_sum: 900 },
          { segment: 'SMB', amount_sum: 220 },
          { segment: 'Retail', amount_sum: 120 },
          { segment: 'Other', amount_sum: 60 }
        ],
        columns: ['segment', 'amount_sum'],
        rowCount: 4
      },
      chartModel: {
        ...chartModel,
        xField: 'segment',
        yField: 'amount_sum',
        seriesFields: ['amount_sum']
      },
      runtimeIntent: {
        ...runtimeIntent,
        dimensions: ['segment']
      },
      aiBriefing: {
        datasetId: 'segments.csv',
        generatedAt: '2026-06-27T00:00:00.000Z',
        grain: 'transaction',
        grainEvidence: 'segment export',
        readinessTier: 'decision_support',
        readinessScore: 88,
        semanticFields: [],
        caveats: [],
        safeActionHints: []
      }
    });

    expect(brief.insights.some(insight => insight.type === 'segment_spread')).toBe(true);
    expect(brief.scoreBreakdown.some(item => item.label === 'Risk penalty')).toBe(true);
  });

  it('attaches raw row pointers to risk insights', () => {
    const brief = createBADecisionBrief({
      datasetId: 'risk.csv',
      previewResult: {
        ...previewResult,
        rows: [
          { order_id: 'A001', amount_sum: 10 },
          { order_id: 'A001', amount_sum: 11 },
          { order_id: 'A002', amount_sum: 12 },
          { order_id: 'A003', amount_sum: 13 },
          { order_id: 'A004', amount_sum: 14 },
          { order_id: 'A005', amount_sum: 500 }
        ],
        columns: ['order_id', 'amount_sum'],
        rowCount: 6
      },
      chartModel: {
        ...chartModel,
        xField: 'order_id',
        yField: 'amount_sum',
        seriesFields: ['amount_sum']
      },
      runtimeIntent: {
        ...runtimeIntent,
        dimensions: ['order_id']
      },
      aiBriefing: {
        datasetId: 'risk.csv',
        generatedAt: '2026-06-27T00:00:00.000Z',
        grain: 'transaction',
        grainEvidence: 'risk export',
        readinessTier: 'decision_support',
        readinessScore: 88,
        semanticFields: [],
        caveats: [],
        safeActionHints: []
      }
    });

    const riskInsight = brief.insights.find(insight => insight.type === 'outlier' || insight.type === 'key_risk');
    expect(riskInsight?.evidenceRows?.length).toBeGreaterThan(0);
  });

  it('formats DuckDB date epochs as business-readable dates in BA findings', () => {
    const brief = createBADecisionBrief({
      datasetId: 'retail.xlsx',
      previewResult: {
        ...previewResult,
        columns: ['time_period', 'sales_revenue'],
        rows: [
          { time_period: 1632009600000, sales_revenue: 300 },
          { time_period: 1632096000000, sales_revenue: 200 },
          { time_period: 1632182400000, sales_revenue: 100 },
        ],
        rowCount: 3,
      },
      chartModel: {
        ...chartModel,
        xField: 'time_period',
        yField: 'sales_revenue',
        seriesFields: ['sales_revenue'],
      },
      runtimeIntent: {
        ...runtimeIntent,
        type: 'trend',
        dimensions: ['time_period'],
        measures: ['sales_revenue'],
        expectedShape: 'line_chart',
      },
      aiBriefing: {
        datasetId: 'retail.xlsx',
        generatedAt: '2026-07-28T00:00:00.000Z',
        grain: 'transaction',
        grainEvidence: 'receipt identity',
        readinessTier: 'decision_support',
        readinessScore: 88,
        semanticFields: [],
        caveats: [],
        safeActionHints: [],
      },
    });

    expect(brief.insights.find(insight => insight.type === 'top_concentration')?.statement).toContain('2021-09-19');
    expect(brief.insights.find(insight => insight.id === 'ba_trend_direction')?.statement).toContain('2021-09-19');
    expect(brief.insights.find(insight => insight.id === 'ba_trend_direction')?.statement).not.toContain('1632009600000');
    expect(brief.executiveSummary).not.toContain('1632009600000');
  });
});

describe('BA preview authority wording', () => {
  it('does not claim a global largest contributor from a truncated governed result page', () => {
    const brief = createBADecisionBrief({
      datasetId: 'sales.csv',
      previewResult: {
        ...previewResult,
        resultBuffer: {
          runId: 'run-truncated',
          columns: [],
          rows: [],
          page: { offset: 0, limit: 100, hasMore: true, estimatedTotal: 150 },
          truncated: true,
        },
      },
      chartModel,
      runtimeIntent,
    });
    const top = brief.insights.find(insight => insight.type === 'top_concentration');
    expect(top?.title).toContain('executed preview');
    expect(top?.statement).toContain('within the executed preview');
    expect(top?.statement).toContain('additional result groups exist');
  });
});
