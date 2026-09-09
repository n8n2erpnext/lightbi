import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useDisplayPreferences } from '../../stores/display-preferences-store';
import { formatValue } from '../../lib/display-formatter';
import type { VisualizationColorSemanticsV1, VisualizationPatternIdV1 } from '../../lib/visualization-ontology';
import type { VisualizationRendererFamilyV1 } from '../../lib/visualization-renderer-registry';
import { visualizationPalette } from '../../lib/visualization-palette';
import { translateCatalogMessage } from '../../i18n/language-registry';

export interface DashboardChartWidgetProps {
  title: string;
  /** Legacy transport type. Rich renderer family comes from the governed visualization plan when available. */
  chartType: 'bar' | 'row' | 'line' | 'donut' | 'scatter';
  rendererFamily?: VisualizationRendererFamilyV1 | null;
  patternId?: VisualizationPatternIdV1 | null;
  colorSemantics?: VisualizationColorSemanticsV1[] | null;
  data: any[];
  xAxisKey?: string;
  seriesKey?: string;
  seriesKeys?: string[];
  valueType?: 'number' | 'currency';
  className?: string;
  colSpan: number;
}

export const formatDashboardCategory = (value: unknown, key: string, locale = 'en-US'): string => {
  const timeLike = /(date|time|period|month|year|ngay|thang|nam)/.test(key.toLowerCase());
  if (!timeLike) return String(value ?? '');
  const numeric = typeof value === 'number'
    ? value
    : typeof value === 'string' && /^\d{9,13}$/.test(value.trim())
      ? Number(value)
      : null;
  const epoch = numeric !== null && numeric >= 946_684_800_000 && numeric <= 4_102_444_800_000
    ? numeric
    : numeric !== null && numeric >= 946_684_800 && numeric <= 4_102_444_800
      ? numeric * 1000
      : null;
  if (numeric !== null && epoch === null) return String(value ?? '');
  const parsed = epoch !== null ? new Date(epoch) : value instanceof Date ? value : new Date(String(value ?? ''));
  if (Number.isNaN(parsed.getTime())) return String(value ?? '');
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: '2-digit' }).format(parsed);
};

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const WATERFALL_BASE_SERIES = 'wf_base';

const legacyFamily = (chartType: DashboardChartWidgetProps['chartType']): VisualizationRendererFamilyV1 => {
  if (chartType === 'line') return 'line';
  if (chartType === 'row') return 'row';
  if (chartType === 'donut') return 'donut';
  if (chartType === 'scatter') return 'scatter';
  return 'bar';
};

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  return sorted[base + 1] !== undefined ? sorted[base] + rest * (sorted[base + 1] - sorted[base]) : sorted[base];
}

function histogram(values: number[], bucketCount = 8): Array<{ label: string; count: number }> {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return [];
  const min = Math.min(...finite); const max = Math.max(...finite);
  if (min === max) return [{ label: String(min), count: finite.length }];
  const count = Math.max(4, Math.min(bucketCount, Math.ceil(Math.sqrt(finite.length))));
  const width = (max - min) / count;
  const buckets = Array.from({ length: count }, (_, index) => ({
    low: min + index * width,
    high: index === count - 1 ? max : min + (index + 1) * width,
    count: 0,
  }));
  finite.forEach(value => {
    const index = Math.min(count - 1, Math.floor((value - min) / width));
    buckets[index].count += 1;
  });
  return buckets.map(bucket => ({ label: `${bucket.low.toPrecision(3)}–${bucket.high.toPrecision(3)}`, count: bucket.count }));
}


function boxSummary(values: number[]): [number, number, number, number, number] {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return [0,0,0,0,0];
  return [sorted[0], quantile(sorted, 0.25), quantile(sorted, 0.5), quantile(sorted, 0.75), sorted[sorted.length - 1]];
}

function inferMatrixKeys(data: any[], xAxisKey: string, seriesKeys: string[], seriesKey: string) {
  const keys = Object.keys(data[0] ?? {});
  const numeric = keys.filter(key => data.some(row => Number.isFinite(Number(row[key]))));
  const valueKey = seriesKey || seriesKeys.find(key => numeric.includes(key)) || numeric[0];
  const categoryKeys = keys.filter(key => key !== valueKey);
  const rowKey = categoryKeys.includes(xAxisKey) ? xAxisKey : categoryKeys[0];
  const columnKey = categoryKeys.find(key => key !== rowKey) ?? categoryKeys[0];
  return { rowKey, columnKey, valueKey };
}

export const generateDashboardChartOptions = (
  props: DashboardChartWidgetProps,
  preferences: any,
  isCompact: boolean
): echarts.EChartsCoreOption => {
  const {
    title, chartType, data, xAxisKey = 'name', seriesKey = 'value', valueType = 'number',
    rendererFamily, colorSemantics,
  } = props;
  const family = rendererFamily ?? legacyFamily(chartType);
  const keys = [...new Set((props.seriesKeys?.length ? props.seriesKeys : [seriesKey]).filter(Boolean))];
  const palette = visualizationPalette({ family, colorSemantics });
  const uiLanguage = typeof preferences.language === 'string' ? preferences.language : String(preferences.locale ?? '').toLowerCase().startsWith('vi') ? 'vi' : 'en';
  const uiText = (source: string) => translateCatalogMessage(uiLanguage, source);
  const axisFormatter = (value: any) => formatValue(value, valueType, preferences, { compact: isCompact });
  const tooltipFormatter = (value: any) => formatValue(value, valueType, preferences, { compact: false });
  const categories = data.map(d => formatDashboardCategory(d[xAxisKey], xAxisKey, preferences.locale));

  const richAxisTooltip = (params: any) => {
    const items = (Array.isArray(params) ? params : [params]).filter((item: any) => item?.seriesName !== WATERFALL_BASE_SERIES);
    const first = items[0] ?? {};
    const dataIndex = typeof first.dataIndex === 'number' ? first.dataIndex : 0;
    const header = categories[dataIndex] ?? first.axisValueLabel ?? first.name ?? '';
    const body = items.map((item: any) => {
      const raw = Array.isArray(item.value) ? item.value[item.value.length - 1] : item.value;
      return `<div style="display:flex;align-items:center;justify-content:space-between;gap:24px;margin-top:7px;">`+
        `<span style="display:flex;align-items:center;gap:7px;color:#64748b;">${item.marker ?? ''}${escapeHtml(item.seriesName ?? '')}</span>`+
        `<strong style="color:#0f172a;font-size:13px;">${escapeHtml(tooltipFormatter(raw))}</strong></div>`;
    }).join('');
    return `<div style="min-width:180px"><div style="font-weight:650;color:#334155;margin-bottom:2px">${escapeHtml(header)}</div>${body}</div>`;
  };
  const tooltipBase = {
    trigger: 'axis', formatter: richAxisTooltip, valueFormatter: tooltipFormatter, confine: true,
    backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, padding: [10, 12],
    extraCssText: 'box-shadow:0 12px 28px rgba(15,23,42,.12);border-radius:8px;color:#0f172a;',
  } as const;
  const categoryAxis = { type: 'category' as const, data: categories, axisTick: { show: false }, axisLine: { lineStyle: { color: '#cbd5e1' } }, axisLabel: { color: '#64748b' } };
  const valueAxis = { type: 'value' as const, axisLabel: { formatter: axisFormatter, color: '#64748b' }, splitLine: { lineStyle: { color: '#e5e7eb' } } };
  const grid = { left: '3%', right: '4%', top: 18, bottom: '3%', containLabel: true };

  if (family === 'donut') {
    return {
      color: palette,
      tooltip: { trigger: 'item', valueFormatter: tooltipFormatter, confine: true, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1 },
      legend: { bottom: 0, left: 'center' },
      series: [{
        name: title, type: 'pie', radius: ['45%', '72%'], center: ['50%', '44%'], avoidLabelOverlap: true,
        itemStyle: { borderColor: '#fff', borderWidth: 2 }, label: { show: false },
        emphasis: { label: { show: true, fontSize: 13, fontWeight: 650, formatter: (params: any) => `${params.name}\n${axisFormatter(params.value)}` } },
        data: data.map(d => ({ name: String(d[xAxisKey] ?? ''), value: Number(d[keys[0]] ?? 0) })),
      }],
    };
  }

  if (family === 'scatter' || family === 'bubble') {
    // Relationship axes come from the governed plan/persisted bindings. Do not
    // replace an explicit x-axis measure with the first y-series transport key.
    const xKey = xAxisKey;
    const yKey = keys.find(key => key !== xKey) ?? seriesKey;
    const sizeKey = family === 'bubble' ? keys.find(key => key !== xKey && key !== yKey) : undefined;
    const sizes = sizeKey ? data.map(d => Math.abs(Number(d[sizeKey] ?? 0))).filter(Number.isFinite) : [];
    const maxSize = Math.max(1, ...sizes);
    return {
      color: palette,
      tooltip: {
        trigger: 'item', confine: true, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1,
        formatter: (params: any) => {
          const value = Array.isArray(params.value) ? params.value : [];
          const rows = [
            [xKey, value[0]], [yKey, value[1]], ...(sizeKey ? [[sizeKey, value[2]]] : []),
          ];
          return `<div style="min-width:180px"><div style="font-weight:650;color:#334155">${escapeHtml(title)}</div>${rows.map(([key, raw]) =>
            `<div style="display:flex;justify-content:space-between;gap:20px;margin-top:7px"><span style="color:#64748b">${escapeHtml(key)}</span><strong>${escapeHtml(tooltipFormatter(raw))}</strong></div>`).join('')}</div>`;
        },
      },
      grid,
      xAxis: valueAxis,
      yAxis: valueAxis,
      series: [{
        name: title, type: 'scatter',
        data: data.map(d => [Number(d[xKey] ?? 0), Number(d[yKey] ?? 0), ...(sizeKey ? [Number(d[sizeKey] ?? 0)] : [])]),
        symbolSize: family === 'bubble' && sizeKey ? (value: any[]) => 8 + Math.sqrt(Math.abs(Number(value[2] ?? 0)) / maxSize) * 28 : 11,
        itemStyle: { color: palette[0], opacity: 0.82 },
      }],
    };
  }

  if (family === 'row') {
    return {
      color: palette,
      tooltip: tooltipBase,
      grid: { ...grid, right: '5%' },
      xAxis: valueAxis,
      yAxis: { ...categoryAxis, inverse: true, axisLabel: { width: isCompact ? 110 : 180, overflow: 'truncate', color: '#64748b' } },
      series: [{ name: keys[0], type: 'bar', barMaxWidth: 28, data: data.map(d => Number(d[keys[0]] ?? 0)), itemStyle: { color: palette[0] } }],
    };
  }

  if (family === 'area') {
    return {
      color: palette, tooltip: tooltipBase, grid, xAxis: categoryAxis, yAxis: valueAxis,
      series: keys.map((key, index) => ({
        name: key, type: 'line', smooth: 0.18, showSymbol: data.length <= 24,
        data: data.map(d => Number(d[key] ?? 0)), lineStyle: { width: 2.4, color: palette[index % palette.length] },
        itemStyle: { color: palette[index % palette.length] },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: `${palette[index % palette.length]}55` }, { offset: 1, color: `${palette[index % palette.length]}08` },
        ]) },
      })),
    };
  }

  if (family === 'grouped_bar' || family === 'stacked_bar' || family === 'normalized_stacked') {
    const normalized = family === 'normalized_stacked';
    const valuesByRow = data.map(row => keys.map(key => Number(row[key] ?? 0)));
    return {
      color: palette, tooltip: tooltipBase, grid, xAxis: categoryAxis,
      yAxis: normalized ? { type: 'value', max: 100, axisLabel: { formatter: (value: number) => `${value}%`, color: '#64748b' } } : valueAxis,
      series: keys.map((key, seriesIndex) => ({
        name: key, type: 'bar', barMaxWidth: 34,
        stack: family === 'grouped_bar' ? undefined : 'total',
        data: data.map((_row, rowIndex) => {
          const raw = valuesByRow[rowIndex][seriesIndex];
          if (!normalized) return raw;
          const total = valuesByRow[rowIndex].reduce((sum, value) => sum + Math.max(0, value), 0);
          return total > 0 ? raw / total * 100 : 0;
        }),
        itemStyle: { color: palette[seriesIndex % palette.length] },
      })),
    };
  }

  if (family === 'combo_bar_line') {
    const observed = keys[0]; const target = keys[1];
    return {
      color: palette, tooltip: tooltipBase, grid, xAxis: categoryAxis, yAxis: valueAxis,
      legend: keys.length > 1 ? { bottom: 0, data: keys.slice(0, 2) } : undefined,
      series: [
        { name: observed, type: 'bar', barMaxWidth: 32, data: data.map(d => Number(d[observed] ?? 0)), itemStyle: { color: palette[0] } },
        ...(target ? [{ name: target, type: 'line' as const, data: data.map(d => Number(d[target] ?? 0)), symbol: 'circle', symbolSize: 7, lineStyle: { width: 2.4, color: palette[1] }, itemStyle: { color: palette[1] } }] : []),
      ],
    };
  }

  if (family === 'waterfall') {
    const values = data.map(d => Number(d[keys[0]] ?? 0));
    let running = 0;
    const base = values.map(value => { const start = running; running += value; return value >= 0 ? start : running; });
    return {
      color: palette, tooltip: tooltipBase, grid, xAxis: categoryAxis, yAxis: valueAxis,
      series: [
        { name: WATERFALL_BASE_SERIES, type: 'bar', stack: 'waterfall', silent: true, itemStyle: { color: 'transparent' }, emphasis: { itemStyle: { color: 'transparent' } }, data: base },
        { name: keys[0], type: 'bar', stack: 'waterfall', barMaxWidth: 34, data: values.map(value => Math.abs(value)), itemStyle: { color: (params: any) => values[params.dataIndex] < 0 ? palette[0] : palette[palette.length - 1] } },
      ],
    };
  }

  if (family === 'histogram') {
    const bins = histogram(data.map(d => Number(d[keys[0]] ?? 0)));
    return {
      color: palette, tooltip: { ...tooltipBase, formatter: undefined, valueFormatter: (value: any) => String(value) }, grid,
      xAxis: { ...categoryAxis, data: bins.map(bin => bin.label), axisLabel: { color: '#64748b', rotate: bins.length > 6 ? 25 : 0 } },
      yAxis: { type: 'value', axisLabel: { color: '#64748b' } },
      series: [{ name: uiText('Count'), type: 'bar', barCategoryGap: '2%', data: bins.map(bin => bin.count), itemStyle: { color: palette[0] } }],
    };
  }

  if (family === 'funnel') {
    return {
      color: palette,
      tooltip: { trigger: 'item', valueFormatter: tooltipFormatter, confine: true, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1 },
      series: [{
        name: title, type: 'funnel', left: '8%', top: 10, bottom: 10, width: '84%', min: 0,
        sort: 'descending', gap: 2, label: { show: true, position: 'inside', formatter: '{b}' },
        data: data.map(d => ({ name: String(d[xAxisKey] ?? ''), value: Number(d[keys[0]] ?? 0) })),
      }],
    };
  }

  if (family === 'pareto') {
    const sorted = data.map(d => ({ label: formatDashboardCategory(d[xAxisKey], xAxisKey, preferences.locale), value: Math.max(0, Number(d[keys[0]] ?? 0)) })).sort((a, b) => b.value - a.value);
    const total = sorted.reduce((sum, item) => sum + item.value, 0);
    let cumulative = 0;
    const cumulativePct = sorted.map(item => { cumulative += item.value; return total > 0 ? cumulative / total * 100 : 0; });
    return {
      color: palette, tooltip: tooltipBase, grid,
      xAxis: { ...categoryAxis, data: sorted.map(item => item.label) },
      yAxis: [valueAxis, { type: 'value', min: 0, max: 100, axisLabel: { formatter: '{value}%', color: '#64748b' }, splitLine: { show: false } }],
      series: [
        { name: keys[0], type: 'bar', data: sorted.map(item => item.value), itemStyle: { color: palette[0] } },
        { name: uiText('Cumulative %'), type: 'line', yAxisIndex: 1, data: cumulativePct, lineStyle: { color: palette[1], width: 2.4 }, itemStyle: { color: palette[1] } },
      ],
    };
  }

  if (family === 'bullet') {
    const observed = Number(data[0]?.[keys[0]] ?? 0); const target = Number(data[0]?.[keys[1]] ?? 0);
    return {
      color: palette, tooltip: { trigger: 'item', valueFormatter: tooltipFormatter },
      grid: { left: '4%', right: '8%', top: '20%', bottom: '20%', containLabel: true },
      xAxis: valueAxis, yAxis: { type: 'category', data: [title], axisTick: { show: false }, axisLine: { show: false } },
      series: [{ name: keys[0], type: 'bar', barWidth: 24, data: [observed], itemStyle: { color: palette[0] }, markLine: Number.isFinite(target) ? { symbol: 'none', label: { formatter: `${keys[1] ?? 'Target'}: ${axisFormatter(target)}` }, data: [{ xAxis: target }], lineStyle: { color: palette[1], width: 2 } } : undefined }],
    };
  }

  if (family === 'diverging_bar') {
    const diverging = visualizationPalette({ family, colorSemantics: ['diverging'] });
    return {
      tooltip: tooltipBase, grid, xAxis: valueAxis,
      yAxis: { ...categoryAxis, inverse: true, axisLabel: { width: isCompact ? 110 : 180, overflow: 'truncate', color: '#64748b' } },
      series: [{ name: keys[0], type: 'bar', data: data.map(d => {
        const value = Number(d[keys[0]] ?? 0);
        return { value, itemStyle: { color: value < 0 ? diverging[0] : diverging[2] } };
      }) }],
    };
  }


  if (family === 'sparkline') {
    return {
      color: palette, tooltip: tooltipBase,
      grid: { left: 4, right: 4, top: 6, bottom: 6 },
      xAxis: { type: 'category', data: categories, show: false }, yAxis: { type: 'value', show: false },
      series: [{ name: keys[0], type: 'line', data: data.map(d => Number(d[keys[0]] ?? 0)), showSymbol: false, smooth: 0.18, lineStyle: { width: 2.2, color: palette[0] }, areaStyle: { opacity: 0.05 } }],
    };
  }

  if (family === 'box_plot') {
    const valueKey = keys[0] || seriesKey;
    const grouped = new Map<string, number[]>();
    data.forEach(row => {
      const label = xAxisKey && xAxisKey !== valueKey ? String(row[xAxisKey] ?? 'All') : 'All';
      const value = Number(row[valueKey] ?? row[xAxisKey]);
      if (!Number.isFinite(value)) return;
      const values = grouped.get(label) ?? []; values.push(value); grouped.set(label, values);
    });
    const labels = [...grouped.keys()];
    return {
      color: palette, tooltip: { trigger: 'item', confine: true, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1 }, grid,
      xAxis: { ...categoryAxis, data: labels }, yAxis: valueAxis,
      series: [{ name: valueKey, type: 'boxplot', data: labels.map(label => boxSummary(grouped.get(label) ?? [])), itemStyle: { color: `${palette[0]}22`, borderColor: palette[0] } }],
    };
  }

  if (family === 'heatmap' || family === 'cohort_heatmap') {
    const matrix = inferMatrixKeys(data, xAxisKey, keys, seriesKey);
    const xValues = [...new Set(data.map(row => String(row[matrix.columnKey] ?? '')))].slice(0, 31);
    const yValues = [...new Set(data.map(row => String(row[matrix.rowKey] ?? '')))].slice(0, 30);
    const xIndex = new Map(xValues.map((value, index) => [value, index]));
    const yIndex = new Map(yValues.map((value, index) => [value, index]));
    const points = data.flatMap(row => {
      const xi = xIndex.get(String(row[matrix.columnKey] ?? '')); const yi = yIndex.get(String(row[matrix.rowKey] ?? ''));
      const value = Number(row[matrix.valueKey] ?? 0);
      return xi == null || yi == null || !Number.isFinite(value) ? [] : [[xi, yi, value]];
    });
    const values = points.map(point => Number(point[2])); const min = Math.min(0, ...values); const max = Math.max(1, ...values);
    return {
      tooltip: { trigger: 'item', confine: true, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, formatter: (params: any) => `${escapeHtml(yValues[params.value?.[1]] ?? '')} · ${escapeHtml(xValues[params.value?.[0]] ?? '')}<br/><strong>${escapeHtml(tooltipFormatter(params.value?.[2]))}</strong>` },
      grid: { ...grid, top: 12 }, xAxis: { ...categoryAxis, data: xValues }, yAxis: { type: 'category', data: yValues, axisLabel: { color: '#64748b' } },
      visualMap: { min, max, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, inRange: { color: ['#eff6ff', palette[1] ?? palette[0], palette[0]] } },
      series: [{ type: 'heatmap', data: points, emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(15,23,42,.18)' } } }],
    };
  }

  if (family === 'calendar_heatmap') {
    const measureKey = keys[0] || seriesKey;
    const points = data.flatMap(row => {
      const date = new Date(String(row[xAxisKey] ?? '')); const value = Number(row[measureKey] ?? 0);
      return Number.isNaN(date.getTime()) || !Number.isFinite(value) ? [] : [[date.toISOString().slice(0, 10), value]];
    });
    const year = points.length ? String(points[0][0]).slice(0, 4) : String(new Date().getUTCFullYear());
    const values = points.map(point => Number(point[1]));
    return {
      tooltip: { trigger: 'item', confine: true, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1, formatter: (params: any) => `${escapeHtml(params.value?.[0])}<br/><strong>${escapeHtml(tooltipFormatter(params.value?.[1]))}</strong>` },
      visualMap: { min: Math.min(0, ...values), max: Math.max(1, ...values), show: false, inRange: { color: ['#eff6ff', palette[1] ?? palette[0], palette[0]] } },
      calendar: { range: year, cellSize: ['auto', 14], top: 18, left: 32, right: 8, splitLine: { show: false }, itemStyle: { borderWidth: 2, borderColor: '#fff' } },
      series: [{ type: 'heatmap', coordinateSystem: 'calendar', data: points }],
    };
  }

  if (family === 'sankey') {
    const allKeys = Object.keys(data[0] ?? {});
    const sourceKey = xAxisKey || allKeys[0] || '';
    const targetKey = allKeys.find(key => key !== sourceKey && data.some(row => typeof row[key] === 'string')) ?? allKeys[1] ?? '';
    const valueKey = keys.find(key => key !== targetKey) ?? allKeys.find(key => key !== sourceKey && key !== targetKey && data.some(row => Number.isFinite(Number(row[key])))) ?? '';
    const links = data.flatMap(row => {
      const source = String(row[sourceKey] ?? ''); const target = String(row[targetKey] ?? ''); const value = Number(row[valueKey] ?? 0);
      return source && target && Number.isFinite(value) ? [{ source, target, value }] : [];
    });
    const nodes = [...new Set(links.flatMap(link => [link.source, link.target]))].map(name => ({ name }));
    return {
      color: palette, tooltip: { trigger: 'item', confine: true, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1 },
      series: [{ type: 'sankey', data: nodes, links, emphasis: { focus: 'adjacency' }, lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.3 }, label: { color: '#475569', fontSize: 11 } }],
    };
  }

  if (family === 'timeline') {
    const eventKey = keys[0] || seriesKey;
    return {
      color: palette, tooltip: tooltipBase, grid: { ...grid, top: 16 },
      xAxis: { type: 'category', data: categories, axisLabel: { color: '#64748b', rotate: categories.length > 8 ? 25 : 0 } },
      yAxis: { type: 'category', data: [...new Set(data.map(row => String(row[eventKey] ?? 'Event')))], axisLabel: { color: '#64748b' } },
      series: [{ name: eventKey, type: 'scatter', symbolSize: 12, data: data.map((row, index) => [index, String(row[eventKey] ?? 'Event')]), itemStyle: { color: (params: any) => palette[params.dataIndex % palette.length] } }],
    };
  }

  if (family === 'small_multiples') {
    const panels = keys.slice(0, 4);
    const count = Math.max(1, panels.length);
    return {
      color: palette, tooltip: tooltipBase,
      grid: panels.map((_key, index) => ({ left: index % 2 === 0 ? '7%' : '55%', right: index % 2 === 0 ? '55%' : '5%', top: index < 2 ? '8%' : '55%', bottom: index < 2 ? '55%' : '8%', containLabel: true })),
      xAxis: panels.map((_key, index) => ({ ...categoryAxis, gridIndex: index, axisLabel: { show: count <= 2, color: '#64748b' } })),
      yAxis: panels.map((_key, index) => ({ ...valueAxis, gridIndex: index, axisLabel: { show: false } })),
      series: panels.map((key, index) => ({ name: key, type: 'line', xAxisIndex: index, yAxisIndex: index, data: data.map(row => Number(row[key] ?? 0)), showSymbol: false, lineStyle: { width: 2, color: palette[index % palette.length] } })),
    };
  }

  if (family === 'radar') {
    const radarKeys = keys.slice(0, 8);
    const maxima = radarKeys.map(key => Math.max(1, ...data.map(row => Math.abs(Number(row[key] ?? 0))).filter(Number.isFinite)));
    return {
      color: palette,
      tooltip: { trigger: 'item', confine: true, backgroundColor: '#fff', borderColor: '#e2e8f0', borderWidth: 1 },
      legend: data.length > 1 ? { bottom: 0, data: data.slice(0, 4).map(row => String(row[xAxisKey] ?? 'Profile')) } : undefined,
      radar: { indicator: radarKeys.map((key, index) => ({ name: key, max: maxima[index] })) },
      series: [{ type: 'radar', data: data.slice(0, 4).map((row, rowIndex) => ({ name: String(row[xAxisKey] ?? `Profile ${rowIndex + 1}`), value: radarKeys.map(key => Number(row[key] ?? 0)), areaStyle: { opacity: 0.08 } })) }],
    };
  }

  if (family === 'control_chart') {
    return {
      color: palette, tooltip: tooltipBase, grid, xAxis: categoryAxis, yAxis: valueAxis,
      series: keys.map((key, index) => ({
        name: key, type: 'line', data: data.map(d => Number(d[key] ?? 0)), showSymbol: index === 0,
        lineStyle: { width: index === 0 ? 2.4 : 1.5, type: index === 0 ? 'solid' : 'dashed', color: palette[index % palette.length] },
        itemStyle: { color: palette[index % palette.length] },
      })),
    };
  }

  // Bar/column and ordinary line families. Multiple series stay explicit.
  const line = family === 'line';
  return {
    color: palette, tooltip: tooltipBase, grid, xAxis: categoryAxis, yAxis: valueAxis,
    legend: keys.length > 1 ? { bottom: 0, data: keys } : undefined,
    series: keys.map((key, index) => ({
      name: key, type: line ? 'line' : 'bar', data: data.map(d => Number(d[key] ?? 0)),
      barMaxWidth: line ? undefined : 34, smooth: line ? 0.12 : undefined,
      lineStyle: line ? { width: 2.4, color: palette[index % palette.length] } : undefined,
      itemStyle: { color: palette[index % palette.length] },
      showSymbol: line ? data.length <= 24 : undefined,
    })),
  };
};

export const DashboardChartWidget: React.FC<DashboardChartWidgetProps> = (props) => {
  const { title, className = '', colSpan } = props;
  const chartRef = useRef<HTMLDivElement>(null);
  const { preferences } = useDisplayPreferences();
  const isCompact = colSpan <= 10;

  useEffect(() => {
    if (!chartRef.current) return;
    const chartInstance = echarts.init(chartRef.current);
    chartInstance.setOption(generateDashboardChartOptions(props, preferences, isCompact));
    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); chartInstance.dispose(); };
  }, [props, preferences, isCompact]);

  return (
    <div className={`${className} flex flex-col border border-[var(--lb-divider)] bg-white p-4`}>
      <h3 className="mb-3 text-[13px] font-semibold text-gray-800">{title}</h3>
      <div ref={chartRef} className="h-full min-h-[200px] w-full flex-1" />
    </div>
  );
};
