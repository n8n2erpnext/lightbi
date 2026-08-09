import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { ChartPreviewModel } from '../../lib/chart-preview-model';
import type { DrillThroughPoint } from '../../lib/drill-through-export';
import { useDisplayPreferences } from '../../stores/display-preferences-store';
import { formatValue, inferSemanticType } from '../../lib/display-formatter';
import { useUiLanguage } from '../../lib/ui-language';

type ChartClickParams = {
  dataIndex?: number;
  seriesName?: string;
};

type ScatterTooltipParams = {
  value?: unknown;
  marker?: string;
};

type AxisTooltipParam = {
  dataIndex?: number;
  seriesName?: string;
  value?: unknown;
  marker?: string;
};

const SERIES_PALETTE = [
  { solid: '#4f46e5', light: '#818cf8', soft: 'rgba(79, 70, 229, 0.14)' },
  { solid: '#0891b2', light: '#22d3ee', soft: 'rgba(8, 145, 178, 0.14)' },
  { solid: '#059669', light: '#34d399', soft: 'rgba(5, 150, 105, 0.14)' },
  { solid: '#d97706', light: '#fbbf24', soft: 'rgba(217, 119, 6, 0.14)' },
  { solid: '#dc2626', light: '#fb7185', soft: 'rgba(220, 38, 38, 0.14)' },
  { solid: '#7c3aed', light: '#a78bfa', soft: 'rgba(124, 58, 237, 0.14)' },
];

export const ChartPreviewRenderer: React.FC<{
  model: ChartPreviewModel;
  onDrillThrough?: (point: DrillThroughPoint) => void;
}> = ({ model, onDrillThrough }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { preferences } = useDisplayPreferences();
  const { t } = useUiLanguage();

  useEffect(() => {
    if (!chartRef.current) return;
    if (model.status !== 'ready') return;
    if (model.chartType === 'table') return;

    const chartInstance = echarts.init(chartRef.current);

    const xField = model.xField || '';
    const xSampleVal = model.rows[0]?.[xField];
    const xSType = inferSemanticType(xField, xSampleVal);

    // Format X-axis data for category charts
    const xAxisData = model.rows.map(row => {
      const val = row[xField];
      return formatValue(val, xSType, preferences);
    });
    
    let seriesType = 'bar';
    if (model.chartType === 'line') seriesType = 'line';
    if (model.chartType === 'scatter') seriesType = 'scatter';

    // Infer Y-axis type from first series field
    const primaryYField = model.seriesFields[0];
    const primaryYSample = model.rows[0]?.[primaryYField];
    const primaryYSType = primaryYField ? inferSemanticType(primaryYField, primaryYSample) : 'unknown';

    const canShowSequentialDelta = ['date', 'time', 'datetime'].includes(xSType)
      || /\b(month|quarter|year|week|day|tháng|quý|năm|tuần|ngày)\b/i.test(xField);
    const formatPercentDelta = (value: number) => `${value >= 0 ? '+' : ''}${Math.round(value)}%`;

    const buildAxisTooltip = (params: AxisTooltipParam | AxisTooltipParam[]) => {
      const items = Array.isArray(params) ? params : [params];
      const first = items[0];
      const dataIndex = typeof first?.dataIndex === 'number' ? first.dataIndex : 0;
      const title = xAxisData[dataIndex] ?? '';
      const rows = items.map(item => {
        const field = item.seriesName ?? primaryYField ?? '';
        const value = typeof item.value === 'number' ? item.value : Number(item.value ?? 0);
        const previous = dataIndex > 0 ? Number(model.rows[dataIndex - 1]?.[field] ?? 0) : Number.NaN;
        const delta = Number.isFinite(previous) && previous !== 0 ? ((value - previous) / Math.abs(previous)) * 100 : 0;
        const deltaClass = delta >= 0 ? 'background:#dff8ee;color:#059669;' : 'background:#fde8ef;color:#d61f69;';
        const sampleVal = model.rows[0]?.[field];
        const sType = inferSemanticType(field, sampleVal);
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:8px;">
            <span style="display:flex;align-items:center;gap:7px;color:#6b7280;">${item.marker ?? ''}${field}</span>
            <span style="display:flex;align-items:center;gap:8px;">
              <strong style="font-size:18px;color:#111827;">${formatValue(value, sType, preferences)}</strong>
              ${canShowSequentialDelta && dataIndex > 0 ? `<span title="${t('Change vs previous time bucket')}" style="${deltaClass}border-radius:7px;padding:2px 6px;font-size:11px;font-weight:700;">${formatPercentDelta(delta)}</span>` : ''}
            </span>
          </div>
        `;
      }).join('');

      return `
        <div style="min-width:170px;">
          <div style="font-size:14px;font-weight:600;color:#4b5563;">${title}</div>
          ${rows}
          ${onDrillThrough ? `<div style="margin-top:10px;border-top:1px solid #eef0f3;padding-top:8px;font-size:11px;color:#6d3ef2;font-weight:600;">${t('Click bar to view/export rows')}</div>` : ''}
        </div>
      `;
    };

    const series = model.seriesFields.map((field, seriesIndex) => {
      const sampleVal = model.rows[0]?.[field];
      const sType = inferSemanticType(field, sampleVal);
      const isBar = seriesType === 'bar';
      const palette = SERIES_PALETTE[seriesIndex % SERIES_PALETTE.length];
      const data = model.rows.map(row => {
        const val = row[field];
        return typeof val === 'number' ? val : 0;
      });
      const baseSeries = {
        name: field,
        type: seriesType,
        data,
        animationDuration: 720,
        animationEasing: 'cubicOut',
        animationDelay: (idx: number) => idx * 28,
        barMaxWidth: isBar ? 36 : undefined,
        itemStyle: isBar
          ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: palette.light },
                  { offset: 0.48, color: palette.solid },
                  { offset: 1, color: palette.solid },
                ],
              },
              borderRadius: [8, 8, 0, 0],
              borderColor: palette.solid,
              borderWidth: 0,
            }
          : {
              color: palette.solid,
            },
        lineStyle: seriesType === 'line'
          ? {
              color: palette.solid,
              width: 3,
            }
          : undefined,
        areaStyle: seriesType === 'line'
          ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: palette.soft },
                  { offset: 1, color: 'rgba(255,255,255,0)' },
                ],
              },
            }
          : undefined,
        emphasis: isBar
          ? {
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 0,
                  y2: 1,
                  colorStops: [
                    { offset: 0, color: palette.light },
                    { offset: 0.38, color: palette.solid },
                    { offset: 1, color: palette.solid },
                  ],
                },
                borderColor: palette.solid,
                borderWidth: 1,
              },
            }
          : {
              focus: 'series',
            },
        tooltip: {
          valueFormatter: (value: unknown) => formatValue(value, sType, preferences)
        }
      };
      return baseSeries;
    });

    const formatAxisValue = (value: unknown) => {
      const numericValue = typeof value === 'number' ? Math.abs(value) : Number.NaN;
      const shouldCompact = primaryYSType !== 'currency' || !Number.isFinite(numericValue) || numericValue >= 10000;
      return formatValue(value, primaryYSType, preferences, { compact: shouldCompact });
    };

    const option: Record<string, unknown> = {
      title: {
        text: model.title,
        left: 'center',
        top: 4,
        textStyle: { fontSize: 15, fontWeight: 600, color: '#374151' }
      },
      tooltip: {
        trigger: 'axis',
        formatter: buildAxisTooltip,
        confine: true,
        appendToBody: true,
        backgroundColor: '#ffffff',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        padding: [12, 14],
        extraCssText: 'box-shadow:0 18px 45px rgba(15,23,42,.14);border-radius:14px;color:#111827;',
        textStyle: { color: '#374151', fontSize: 12 },
        axisPointer: {
          type: 'line',
          lineStyle: { color: '#202123', width: 1.5, type: 'dashed' },
          shadowStyle: { color: 'rgba(109,62,242,.08)' },
        }
      },
      legend: {
        bottom: 0,
        data: model.seriesFields,
        icon: 'roundRect',
        itemWidth: 22,
        itemHeight: 12,
        textStyle: { color: '#6b7280', fontSize: 12 },
      },
      grid: {
        top: 54,
        left: '4%',
        right: '4%',
        bottom: 44,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: '#d1d5db' } },
        axisLabel: { color: '#6B7280', fontSize: 12, margin: 14 }
      },
      yAxis: {
        type: 'value',
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { 
          color: '#6B7280',
          fontSize: 12,
          formatter: formatAxisValue
        },
        splitLine: { lineStyle: { type: 'dashed', color: '#E5E7EB' } }
      },
      series: series
    };

    if (model.chartType === 'scatter') {
       if (model.seriesFields.length >= 2) {
         const scatXField = model.seriesFields[0];
         const scatYField = model.seriesFields[1];
         const scatXSample = model.rows[0]?.[scatXField];
         const scatYSample = model.rows[0]?.[scatYField];
         const scatXSType = inferSemanticType(scatXField, scatXSample);
         const scatYSType = inferSemanticType(scatYField, scatYSample);

         option.xAxis = { 
           type: 'value', 
           axisLabel: { 
             color: '#6B7280',
             formatter: (value: unknown) => formatValue(value, scatXSType, preferences, { compact: true })
           } 
         };
         option.tooltip = {
           trigger: 'item',
           formatter: (params: ScatterTooltipParams) => {
             const value = Array.isArray(params.value) ? params.value : [];
             const [xVal, yVal] = value;
             const fX = formatValue(xVal, scatXSType, preferences);
             const fY = formatValue(yVal, scatYSType, preferences);
             return `${params.marker ?? ''} ${fX} : <b>${fY}</b>`;
           }
         };
         option.series = [{
           name: model.title,
           type: 'scatter',
           data: model.rows.map(row => [
             row[scatXField] || 0,
             row[scatYField] || 0
           ])
         }];
       }
    }

    chartInstance.setOption(option as echarts.EChartsOption);
    chartInstance.getZr().setCursorStyle(onDrillThrough ? 'pointer' : 'default');
    const handleClick = (params: ChartClickParams) => {
      if (!onDrillThrough || !model.xField) return;
      if (typeof params.dataIndex !== 'number') return;
      const row = model.rows[params.dataIndex];
      if (!row) return;
      const rawValue = row[model.xField];
      const label = formatValue(rawValue, inferSemanticType(model.xField, rawValue), preferences);
      onDrillThrough({
        dimensionField: model.xField,
        value: rawValue,
        label,
        measureField: typeof params.seriesName === 'string' ? params.seriesName : model.yField,
        measureValue: typeof params.dataIndex === 'number' && params.seriesName ? row[params.seriesName] : undefined,
      });
    };
    chartInstance.on('click', handleClick);

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      chartInstance.off('click', handleClick);
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [model, onDrillThrough, preferences]);

  if (model.status === 'empty') {
    return (
      <div className="w-full h-64 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400">
        <span className="text-sm font-medium">Run preview returned no rows.</span>
      </div>
    );
  }

  if (model.status === 'blocked' || model.status === 'failed') {
    return (
      <div className="w-full h-64 bg-red-50 border border-red-200 rounded-lg flex flex-col items-center justify-center text-red-500 p-6 text-center">
        <span className="text-sm font-semibold mb-2">Analysis cannot be rendered</span>
        <div className="text-xs space-y-1">
          {model.warnings.map((w, i) => <p key={i}>{w}</p>)}
        </div>
      </div>
    );
  }

  if (model.chartType === 'table') {
    return (
      <div className="w-full h-64 overflow-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {model.xField && <th className="px-3 py-2 font-medium text-gray-500">{model.xField}</th>}
              {model.seriesFields.map(f => (
                <th key={f} className="px-3 py-2 font-medium text-gray-500">{f}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {model.rows.map((row, i) => (
              <tr key={i}>
                {model.xField && <td className="px-3 py-2 whitespace-nowrap text-gray-900">{formatValue(row[model.xField], inferSemanticType(model.xField, row[model.xField]), preferences)}</td>}
                {model.seriesFields.map(f => (
                  <td key={f} className="px-3 py-2 whitespace-nowrap text-gray-900">{formatValue(row[f], inferSemanticType(f, row[f]), preferences)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      className="h-[360px] w-full rounded-[18px] bg-white transition-[filter] duration-200"
      ref={chartRef}
      data-testid="chart-preview-canvas"
    />
  );
};
