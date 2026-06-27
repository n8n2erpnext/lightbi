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
});
