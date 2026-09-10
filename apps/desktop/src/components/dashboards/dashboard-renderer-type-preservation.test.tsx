// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { generateDashboardChartOptions } from './DashboardChartWidget';
import { resolveDashboardRendererType, resolveDashboardVisualizationMetadata } from '../../pages/DashboardBuilder';

const preferences = {
  locale: 'en-US', timezone: 'UTC', numberStyle: 'plain', currencyDisplay: 'symbol',
  decimalPlaces: 'auto', thousandsSeparator: 'comma', negativeStyle: 'minus',
  dateFormat: 'short', timeFormat: '24h', datetimeFormat: 'compact',
};

describe('DPR-6 dashboard renderer type preservation', () => {
  it('preserves persisted Scatter as the dashboard scatter renderer', () => {
    expect(resolveDashboardRendererType('Scatter')).toBe('scatter');
    expect(resolveDashboardRendererType('Line')).toBe('line');
    expect(resolveDashboardRendererType('Donut')).toBe('donut');
  });

  it('generates ECharts scatter coordinates from the persisted x/y measures', () => {
    const options = generateDashboardChartOptions({
      title: 'Cost vs revenue', chartType: 'scatter',
      data: [{ cost: 10, revenue: 100 }, { cost: 20, revenue: 180 }],
      xAxisKey: 'cost', seriesKey: 'revenue', valueType: 'number', colSpan: 10,
    }, preferences, true) as any;
    expect(options.xAxis.type).toBe('value');
    expect(options.yAxis.type).toBe('value');
    expect(options.series).toHaveLength(1);
    expect(options.series[0].type).toBe('scatter');
    expect(options.series[0].data).toEqual([[10, 100], [20, 180]]);
  });

  it('restores a rich renderer family from governed metadata even when the persisted transport type is coarse', () => {
    const chart = {
      id: 'chart_hist', projectId: 'proj', datasetId: 'dataset', name: 'Distribution', type: 'Bar',
      xAxis: [], yAxis: [], filters: {}, createdAt: '2026-09-09', updatedAt: '2026-09-09',
      formatting: { lightbiData: { decisionVisualizationPlan: { visualizationPlan: {
        patternId: 'distribution_histogram', rendererFamily: 'histogram',
        patternRules: { colorSemantics: ['sequential','neutral'] },
      } } } },
    } as any;
    expect(resolveDashboardVisualizationMetadata(chart)).toEqual({
      rendererFamily: 'histogram', patternId: 'distribution_histogram', colorSemantics: ['sequential','neutral'],
    });
  });

  it('prefers an admitted visual-narrative renderer override over coarse persisted transport metadata', () => {
    const chart = {
      id: 'chart_combo', projectId: 'proj', datasetId: 'dataset', name: 'Revenue + cost', type: 'Bar',
      xAxis: [], yAxis: [], filters: {}, createdAt: '2026-09-10', updatedAt: '2026-09-10',
      formatting: { lightbiData: {
        visualNarrativeRendererFamily: 'combo_bar_line',
        decisionVisualizationPlan: { visualizationPlan: {
          patternId: 'category_bar', rendererFamily: 'bar', patternRules: { colorSemantics: ['categorical'] },
        } },
      } },
    } as any;
    expect(resolveDashboardVisualizationMetadata(chart).rendererFamily).toBe('combo_bar_line');
  });

});
