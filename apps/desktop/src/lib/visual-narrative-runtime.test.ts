import { describe, expect, it } from 'vitest';
import type { ChartPreviewModel } from './chart-preview-model';
import { combineVisualNarrativeModels, visualNarrativeModelsAreEquivalentSingleSeries, visualNarrativeModelsCanAlign } from './visual-narrative-runtime';

function model(id: string, xField: string, yField: string, values: Array<[string | number, number]>): ChartPreviewModel {
  return {
    id, sourceResultId: `result:${id}`, status: 'ready', chartType: 'bar', title: id,
    xField, yField, seriesFields: [yField],
    rows: values.map(([x, y]) => ({ [xField]: x, [yField]: y })),
    warnings: [], source: 'duckdb_preview_result',
  };
}

describe('visual narrative runtime materialization', () => {
  it('aligns independently governed aggregate results only when the dimension values match', () => {
    const left = model('volume', 'carrier', 'delivery_count', [['A', 10], ['B', 20]]);
    const right = model('delay', 'carrier', 'downtime_minutes', [['A', 2], ['B', 5]]);
    expect(visualNarrativeModelsCanAlign(left, right)).toBe(true);
    const combined = combineVisualNarrativeModels(
      { id: 'volume', label: 'Delivery volume', chartModel: left },
      { id: 'delay', label: 'Downtime', chartModel: right },
      'combo_bar_line',
    );
    expect(combined?.seriesFields).toEqual(['delivery_count', 'downtime_minutes']);
    expect(combined?.rows).toEqual([
      { carrier: 'A', delivery_count: 10, downtime_minutes: 2 },
      { carrier: 'B', delivery_count: 20, downtime_minutes: 5 },
    ]);
  });



  it('suppresses presentation duplicates when an equivalent date grain is epoch-ms in one lane and ISO date in another', () => {
    const primary = model('primary', 'time_period', 'sales_revenue', [
      [Date.UTC(2026, 5, 10), 120],
      [Date.UTC(2026, 5, 11), 180],
      [Date.UTC(2026, 5, 12), 150],
    ]);
    const support = model('support', 'Date', 'Revenue', [
      ['2026-06-10', 120],
      ['2026-06-11', 180],
      ['2026-06-12', 150],
    ]);

    expect(visualNarrativeModelsCanAlign(primary, support)).toBe(false);
    expect(visualNarrativeModelsAreEquivalentSingleSeries(primary, support)).toBe(true);
  });

  it('does not date-normalize arbitrary numeric identifiers for duplicate suppression', () => {
    const left = model('left', 'order_id', 'Revenue', [[Date.UTC(2026, 5, 10), 120]]);
    const right = model('right', 'Date', 'Revenue', [['2026-06-10', 120]]);
    expect(visualNarrativeModelsAreEquivalentSingleSeries(left, right)).toBe(false);
  });

  it('fails closed when result-level categories differ instead of performing a raw or fuzzy join', () => {
    const left = model('volume', 'carrier', 'delivery_count', [['A', 10], ['B', 20]]);
    const right = model('delay', 'carrier', 'downtime_minutes', [['A', 2], ['C', 5]]);
    expect(visualNarrativeModelsCanAlign(left, right)).toBe(false);
    expect(combineVisualNarrativeModels(
      { id: 'volume', label: 'Delivery volume', chartModel: left },
      { id: 'delay', label: 'Downtime', chartModel: right },
      'combo_bar_line',
    )).toBeNull();
  });
});
