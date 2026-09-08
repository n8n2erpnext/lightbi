// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { generateDashboardChartOptions } from './DashboardChartWidget';
import { resolveDashboardRendererType } from '../../pages/DashboardBuilder';

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
});
