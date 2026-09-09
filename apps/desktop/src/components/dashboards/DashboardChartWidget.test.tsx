// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { formatDashboardCategory, generateDashboardChartOptions } from './DashboardChartWidget';

describe('DashboardChartWidget formatting', () => {
  const mockPreferences = {
    locale: 'en-US',
    timezone: 'UTC',
    numberStyle: 'plain',
    currencyDisplay: 'symbol',
    decimalPlaces: 'auto',
    thousandsSeparator: 'comma',
    negativeStyle: 'minus',
    dateFormat: 'short',
    timeFormat: '24h',
    datetimeFormat: 'compact',
  };

  const chartProps = {
    title: 'Test Bar',
    chartType: 'bar' as const,
    data: [{ name: 'A', value: 1500000 }],
    xAxisKey: 'name',
    seriesKey: 'value',
    valueType: 'number' as const,
    colSpan: 10
  };

  it('compacts the axis if isCompact is true', () => {
    // Generate options with isCompact = true
    const options = generateDashboardChartOptions(chartProps, mockPreferences, true);
    
    // The yAxis formatter should be a function
    const yAxisFormatter = (options as any).yAxis.axisLabel.formatter;
    expect(typeof yAxisFormatter).toBe('function');

    // Executing the formatter with 1500000 should return '1.5M'
    const formattedValue = yAxisFormatter(1500000);
    expect(formattedValue).toBe('1.5M');
  });

  it('does NOT compact the axis if isCompact is false', () => {
    // Generate options with isCompact = false
    const options = generateDashboardChartOptions(chartProps, mockPreferences, false);
    
    const yAxisFormatter = (options as any).yAxis.axisLabel.formatter;
    expect(typeof yAxisFormatter).toBe('function');

    // Executing the formatter with 1500000 should return '1,500,000'
    const formattedValue = yAxisFormatter(1500000);
    expect(formattedValue).toBe('1,500,000');
  });

  it('never compacts the tooltip, regardless of isCompact flag', () => {
    // Generate options with isCompact = true
    const options = generateDashboardChartOptions(chartProps, mockPreferences, true);
    
    // The tooltip valueFormatter should be a function
    const tooltipFormatter = (options as any).tooltip.valueFormatter;
    expect(typeof tooltipFormatter).toBe('function');

    // Executing the tooltip formatter with 1500000 should ALWAYS return '1,500,000' (full detail)
    const formattedValue = tooltipFormatter(1500000);
    expect(formattedValue).toBe('1,500,000');
  });

  it('renders governed ranking rows horizontally with a quantitative x-axis', () => {
    const options = generateDashboardChartOptions({
      ...chartProps,
      chartType: 'row',
      title: 'Ranked groups',
      data: [{ name: 'Long category A', value: 120 }, { name: 'B', value: 80 }],
    }, mockPreferences, true) as any;
    expect(options.xAxis.type).toBe('value');
    expect(options.yAxis).toMatchObject({ type: 'category', inverse: true });
    expect(options.yAxis.data).toEqual(['Long category A', 'B']);
    expect(options.series[0]).toMatchObject({ type: 'bar', barMaxWidth: 28, data: [120, 80] });
  });

  it('does not turn ordinary numeric categories into dates in 1970', () => {
    expect(formatDashboardCategory(1, 'reporting_period', 'vi-VN')).toBe('1');
    expect(formatDashboardCategory(51, 'month_bucket', 'vi-VN')).toBe('51');
  });

  it('formats plausible epoch timestamps but leaves non-date strings unchanged', () => {
    expect(formatDashboardCategory(1_735_689_600_000, 'event_date', 'en-US')).toContain('2025');
    expect(formatDashboardCategory('not-a-date', 'event_date', 'en-US')).toBe('not-a-date');
  });

  it('uses a rich axis tooltip with a category header, series markers and full values', () => {
    const options = generateDashboardChartOptions({
      ...chartProps,
      data: [{ name: 'North', actual: 1500000, target: 1700000 }],
      seriesKey: 'actual',
      seriesKeys: ['actual', 'target'],
      rendererFamily: 'combo_bar_line',
    }, mockPreferences, true) as any;
    const html = options.tooltip.formatter([
      { dataIndex: 0, seriesName: 'actual', value: 1500000, marker: '<span>●</span>' },
      { dataIndex: 0, seriesName: 'target', value: 1700000, marker: '<span>●</span>' },
    ]);
    expect(html).toContain('North');
    expect(html).toContain('actual');
    expect(html).toContain('1,500,000');
    expect(html).toContain('target');
    expect(html).toContain('1,700,000');
  });

  it('materializes rich ECharts families instead of collapsing them all to ordinary bars', () => {
    const cases: Array<{ family: any; data: any[]; xAxisKey?: string; seriesKeys?: string[]; expected: string }> = [
      { family: 'area', data: [{ month: 'Jan', value: 10 }, { month: 'Feb', value: 14 }], xAxisKey: 'month', seriesKeys: ['value'], expected: 'line' },
      { family: 'box_plot', data: [{ group: 'A', value: 10 }, { group: 'A', value: 14 }, { group: 'A', value: 18 }], xAxisKey: 'group', seriesKeys: ['value'], expected: 'boxplot' },
      { family: 'heatmap', data: [{ row: 'A', col: 'X', value: 5 }, { row: 'B', col: 'X', value: 7 }], xAxisKey: 'row', seriesKeys: ['col', 'value'], expected: 'heatmap' },
      { family: 'calendar_heatmap', data: [{ date: '2026-09-01', value: 5 }, { date: '2026-09-02', value: 7 }], xAxisKey: 'date', seriesKeys: ['value'], expected: 'heatmap' },
      { family: 'sankey', data: [{ source: 'A', target: 'B', value: 5 }], xAxisKey: 'source', seriesKeys: ['value'], expected: 'sankey' },
      { family: 'timeline', data: [{ date: '2026-09-01', event: 'Opened' }], xAxisKey: 'date', seriesKeys: ['event'], expected: 'scatter' },
      { family: 'small_multiples', data: [{ period: 'Jan', sales: 10, cost: 6 }, { period: 'Feb', sales: 12, cost: 8 }], xAxisKey: 'period', seriesKeys: ['sales', 'cost'], expected: 'line' },
      { family: 'sparkline', data: [{ period: 'Jan', value: 10 }, { period: 'Feb', value: 12 }], xAxisKey: 'period', seriesKeys: ['value'], expected: 'line' },
    ];
    for (const item of cases) {
      const options = generateDashboardChartOptions({
        ...chartProps,
        rendererFamily: item.family,
        data: item.data,
        xAxisKey: item.xAxisKey,
        seriesKey: item.seriesKeys?.[0] ?? 'value',
        seriesKeys: item.seriesKeys,
      }, mockPreferences, false) as any;
      const series = Array.isArray(options.series) ? options.series : [options.series];
      expect(series.some((entry: any) => entry?.type === item.expected), item.family).toBe(true);
    }
  });

});
