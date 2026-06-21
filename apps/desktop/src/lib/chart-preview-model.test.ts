import { describe, it, expect } from 'vitest';
import { createChartPreviewModel } from './chart-preview-model';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';
import type { RuntimePlanPreview } from './runtime-planner-preview';

describe('Chart Preview Model', () => {

  const dummyPlan: RuntimePlanPreview = {
    id: 'test_plan',
    sourceIntentId: 'intent_1',
    status: 'ready',
    executionMode: 'preview_only',
    logicalOperations: [],
    requiredColumns: [],
    expectedOutput: { shape: 'table', dimensions: [], measures: [] },
    warnings: [],
    blockedReasons: [],
    source: 'runtime_intent'
  };

  const dummyResult: DuckDBPreviewResult = {
    id: 'res_1',
    sourceSqlPreviewId: 'sql_1',
    status: 'executed',
    columns: [],
    rows: [],
    rowCount: 0,
    maxRows: 100,
    warnings: [],
    blockedReasons: [],
    source: 'duckdb_preview_sandbox'
  };

  it('1. bar_chart expected output maps to bar', () => {
    const plan = { ...dummyPlan, expectedOutput: { ...dummyPlan.expectedOutput, shape: 'bar_chart' as const } };
    const model = createChartPreviewModel({ previewResult: { ...dummyResult, rows: [{}] }, runtimePlan: plan, analysisLabel: 'Test' });
    expect(model.chartType).toBe('bar');
  });

  it('2. line_chart maps to line', () => {
    const plan = { ...dummyPlan, expectedOutput: { ...dummyPlan.expectedOutput, shape: 'line_chart' as const } };
    const model = createChartPreviewModel({ previewResult: { ...dummyResult, rows: [{}] }, runtimePlan: plan, analysisLabel: 'Test' });
    expect(model.chartType).toBe('line');
  });

  it('3. scatter_plot maps to scatter', () => {
    const plan = { ...dummyPlan, expectedOutput: { ...dummyPlan.expectedOutput, shape: 'scatter_plot' as const } };
    const model = createChartPreviewModel({ previewResult: { ...dummyResult, rows: [{}] }, runtimePlan: plan, analysisLabel: 'Test' });
    expect(model.chartType).toBe('scatter');
  });

  it('4. empty preview result returns empty model', () => {
    const result = { ...dummyResult, rows: [], status: 'executed' as const };
    const model = createChartPreviewModel({ previewResult: result, runtimePlan: dummyPlan, analysisLabel: 'Test' });
    expect(model.status).toBe('empty');
  });

  it('5. blocked result returns blocked model', () => {
    const result = { ...dummyResult, status: 'blocked' as const, blockedReasons: ['Not allowed'] };
    const model = createChartPreviewModel({ previewResult: result, runtimePlan: dummyPlan, analysisLabel: 'Test' });
    expect(model.status).toBe('blocked');
    expect(model.warnings).toContain('Not allowed');
  });

  it('6. xField comes from runtimePlan dimensions', () => {
    const plan = { ...dummyPlan, expectedOutput: { ...dummyPlan.expectedOutput, dimensions: ['region'] } };
    const model = createChartPreviewModel({ previewResult: { ...dummyResult, rows: [{}] }, runtimePlan: plan, analysisLabel: 'Test' });
    expect(model.xField).toBe('region');
  });

  it('7. yField picks shipment_count / row_count', () => {
    const plan = { ...dummyPlan, expectedOutput: { ...dummyPlan.expectedOutput, dimensions: ['region'] } };
    const result = { ...dummyResult, columns: ['region', 'other_data', 'shipment_count'], rows: [{}] };
    const model = createChartPreviewModel({ previewResult: result, runtimePlan: plan, analysisLabel: 'Test' });
    expect(model.yField).toBe('shipment_count');
    expect(model.seriesFields).toContain('other_data');
    expect(model.seriesFields).toContain('shipment_count');
  });

  it('8. yField prefers response_rate over count fields', () => {
    const plan = { ...dummyPlan, expectedOutput: { ...dummyPlan.expectedOutput, dimensions: ['job'], shape: 'bar_chart' as const } };
    const result = {
      ...dummyResult,
      columns: ['job', 'positive_count', 'total_count', 'response_rate'],
      rows: [{ job: 'admin', positive_count: 10, total_count: 100, response_rate: 0.1 }]
    };
    const model = createChartPreviewModel({ previewResult: result, runtimePlan: plan, analysisLabel: 'Response by audience segment' });
    expect(model.yField).toBe('response_rate');
  });

  it('9. table preview adds a categorical distribution chart alongside the summary', () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      shipment_id: `SHIP-${index}`,
      route: index < 6 ? 'North' : index < 10 ? 'South' : 'Central',
      weight: 100 + index
    }));
    const result = {
      ...dummyResult,
      columns: ['shipment_id', 'route', 'weight'],
      rows,
      rowCount: rows.length
    };

    const model = createChartPreviewModel({
      previewResult: result,
      runtimePlan: dummyPlan,
      analysisLabel: 'Document coverage'
    });

    expect(model.chartType).toBe('bar');
    expect(model.xField).toBe('route');
    expect(model.yField).toBe('row_count');
    expect(model.seriesFields).toEqual(['row_count']);
    expect(model.rows).toEqual([
      { route: 'North', row_count: 6 },
      { route: 'South', row_count: 4 },
      { route: 'Central', row_count: 2 }
    ]);
  });

  it('10. table preview remains a table when no useful category exists', () => {
    const rows = Array.from({ length: 10 }, (_, index) => ({
      id: `ID-${index}`,
      amount: index * 100
    }));
    const result = {
      ...dummyResult,
      columns: ['id', 'amount'],
      rows,
      rowCount: rows.length
    };

    const model = createChartPreviewModel({
      previewResult: result,
      runtimePlan: dummyPlan,
      analysisLabel: 'Document coverage'
    });

    expect(model.chartType).toBe('table');
  });

});
