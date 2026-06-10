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

});
