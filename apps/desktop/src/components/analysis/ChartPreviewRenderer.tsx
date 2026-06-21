import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { ChartPreviewModel } from '../../lib/chart-preview-model';
import { useDisplayPreferences } from '../../stores/display-preferences-store';
import { formatValue, inferSemanticType } from '../../lib/display-formatter';

export const ChartPreviewRenderer: React.FC<{ model: ChartPreviewModel }> = ({ model }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { preferences } = useDisplayPreferences();

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

    const series = model.seriesFields.map(field => {
      const sampleVal = model.rows[0]?.[field];
      const sType = inferSemanticType(field, sampleVal);
      return {
        name: field,
        type: seriesType,
        data: model.rows.map(row => {
          const val = row[field];
          return typeof val === 'number' ? val : 0;
        }),
        tooltip: {
          valueFormatter: (value: any) => formatValue(value, sType, preferences)
        }
      };
    });

    // Infer Y-axis type from first series field
    const primaryYField = model.seriesFields[0];
    const primaryYSample = model.rows[0]?.[primaryYField];
    const primaryYSType = primaryYField ? inferSemanticType(primaryYField, primaryYSample) : 'unknown';
    const formatAxisValue = (value: any) => {
      const numericValue = typeof value === 'number' ? Math.abs(value) : Number.NaN;
      const shouldCompact = primaryYSType !== 'currency' || !Number.isFinite(numericValue) || numericValue >= 10000;
      return formatValue(value, primaryYSType, preferences, { compact: shouldCompact });
    };

    const option: any = {
      title: {
        text: model.title,
        left: 'center',
        textStyle: { fontSize: 14, fontWeight: 'normal', color: '#374151' }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: { color: '#6B7280' }
      },
      yAxis: {
        type: 'value',
        axisLabel: { 
          color: '#6B7280',
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
             formatter: (value: any) => formatValue(value, scatXSType, preferences, { compact: true })
           } 
         };
         option.tooltip = {
           trigger: 'item',
           formatter: (params: any) => {
             const [xVal, yVal] = params.value;
             const fX = formatValue(xVal, scatXSType, preferences);
             const fY = formatValue(yVal, scatYSType, preferences);
             return `${params.marker} ${fX} : <b>${fY}</b>`;
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

    chartInstance.setOption(option);

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [model, preferences]);

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
    <div className="w-full h-80 bg-white" ref={chartRef} data-testid="chart-preview-canvas" />
  );
};
