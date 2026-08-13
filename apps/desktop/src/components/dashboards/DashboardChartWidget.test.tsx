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

  it('does not turn ordinary numeric categories into dates in 1970', () => {
    expect(formatDashboardCategory(1, 'reporting_period', 'vi-VN')).toBe('1');
    expect(formatDashboardCategory(51, 'month_bucket', 'vi-VN')).toBe('51');
  });

  it('formats plausible epoch timestamps but leaves non-date strings unchanged', () => {
    expect(formatDashboardCategory(1_735_689_600_000, 'event_date', 'en-US')).toContain('2025');
    expect(formatDashboardCategory('not-a-date', 'event_date', 'en-US')).toBe('not-a-date');
  });
});
