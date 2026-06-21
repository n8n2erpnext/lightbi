import { describe, it, expect } from 'vitest';
import { createRuntimeIntentFromAnalysisAction } from './analysis-runtime-contract';
import type { AnalysisAction } from './analysis-opportunity-actions';

describe('Analysis Runtime Contract', () => {
  const baseAction: AnalysisAction = {
    id: 'a1',
    opportunityName: 'Test',
    label: 'Test',
    description: 'Test',
    actionType: 'group_by',
    dimensions: [],
    measures: [],
    confidenceScore: 0.9,
    source: 'dataset_understanding'
  };

  it('group_by route + shipment -> ready bar_chart', () => {
    const action: AnalysisAction = { ...baseAction, actionType: 'group_by', dimensions: ['route'], measures: ['shipment'] };
    const intent = createRuntimeIntentFromAnalysisAction(action);
    expect(intent.status).toBe('ready');
    expect(intent.expectedShape).toBe('bar_chart');
    expect(intent.blockedReasons).toHaveLength(0);
  });

  it('preserves explicit measure aggregation metadata', () => {
    const action: AnalysisAction = {
      ...baseAction,
      actionType: 'group_by',
      dimensions: ['Mã kho'],
      measures: ['Tổng tiền'],
      measureAggregations: { 'Tổng tiền': 'SUM' }
    };
    const intent = createRuntimeIntentFromAnalysisAction(action);
    expect(intent.measureAggregations).toEqual({ 'Tổng tiền': 'SUM' });
  });

  it('group_by with derived measure but no physical measure is ready', () => {
    const action: AnalysisAction = {
      ...baseAction,
      actionType: 'group_by',
      dimensions: ['job'],
      measures: [],
      derivedMeasures: [{
        id: 'response_rate',
        label: 'response_rate',
        type: 'positive_rate',
        sourceColumn: 'y',
        positiveValues: ['yes'],
        numeratorLabel: 'positive_count',
        denominatorLabel: 'total_count',
      }]
    };
    const intent = createRuntimeIntentFromAnalysisAction(action);
    expect(intent.status).toBe('ready');
    expect(intent.derivedMeasures?.[0].label).toBe('response_rate');
  });

  it('trend report_date + shipment -> ready line_chart', () => {
    const action: AnalysisAction = { ...baseAction, actionType: 'trend', dimensions: ['report_date'], measures: ['shipment'] };
    const intent = createRuntimeIntentFromAnalysisAction(action);
    expect(intent.status).toBe('ready');
    expect(intent.expectedShape).toBe('line_chart');
    expect(intent.blockedReasons).toHaveLength(0);
  });

  it('trend Vietnamese date column + revenue -> ready line_chart', () => {
    const action: AnalysisAction = { ...baseAction, actionType: 'trend', dimensions: ['Ngày xuất'], measures: ['Tổng tiền'] };
    const intent = createRuntimeIntentFromAnalysisAction(action);
    expect(intent.status).toBe('ready');
    expect(intent.expectedShape).toBe('line_chart');
    expect(intent.blockedReasons).toHaveLength(0);
  });

  it('trend month period + duration -> ready line_chart', () => {
    const action: AnalysisAction = { ...baseAction, actionType: 'trend', dimensions: ['month'], measures: ['duration'] };
    const intent = createRuntimeIntentFromAnalysisAction(action);
    expect(intent.status).toBe('ready');
    expect(intent.expectedShape).toBe('line_chart');
    expect(intent.blockedReasons).toHaveLength(0);
  });

  it('trend route + shipment -> blocked because no time dimension', () => {
    const action: AnalysisAction = { ...baseAction, actionType: 'trend', dimensions: ['route'], measures: ['shipment'] };
    const intent = createRuntimeIntentFromAnalysisAction(action);
    expect(intent.status).toBe('blocked');
    expect(intent.blockedReasons).toContain('trend requires at least 1 time-like dimension');
  });

  it('relationship with one measure -> blocked', () => {
    const action: AnalysisAction = { ...baseAction, actionType: 'relationship', dimensions: ['route'], measures: ['shipment'] };
    const intent = createRuntimeIntentFromAnalysisAction(action);
    expect(intent.status).toBe('blocked');
    expect(intent.blockedReasons).toContain('relationship requires at least 2 measures');
  });

  it('distribution with no dimension -> blocked', () => {
    const action: AnalysisAction = { ...baseAction, actionType: 'distribution', dimensions: [], measures: ['shipment'] };
    const intent = createRuntimeIntentFromAnalysisAction(action);
    expect(intent.status).toBe('blocked');
    expect(intent.blockedReasons).toContain('distribution requires at least 1 dimension');
  });

  it('contract contains no sql/query/chart config/result rows', () => {
    const action: AnalysisAction = { ...baseAction, actionType: 'group_by', dimensions: ['route'], measures: ['shipment'] };
    const intent = createRuntimeIntentFromAnalysisAction(action);
    const keys = Object.keys(intent);
    expect(keys).not.toContain('sql');
    expect(keys).not.toContain('query');
    expect(keys).not.toContain('chartConfig');
    expect(keys).not.toContain('rows');
    expect(keys).not.toContain('dataset');
  });

  it('table_preview -> ready table', () => {
    const action: AnalysisAction = { ...baseAction, actionType: 'table_preview', dimensions: [], measures: [] };
    const intent = createRuntimeIntentFromAnalysisAction(action);
    expect(intent.status).toBe('ready');
    expect(intent.expectedShape).toBe('table');
    expect(intent.blockedReasons).toHaveLength(0);
    expect(intent.dimensions).toEqual([]);
    expect(intent.measures).toEqual([]);
  });
});
