import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { ChartPreviewModel } from '../../lib/chart-preview-model';

export const ChartPreviewRenderer: React.FC<{ model: ChartPreviewModel }> = ({ model }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (model.status === 'ready') {
      console.log("TRACE [CHART] chartType:", model.chartType);
    }
  }, [model]);

  useEffect(() => {
    if (!chartRef.current) return;
    if (model.status !== 'ready') return;
    if (model.chartType === 'table') return;

    const chartInstance = echarts.init(chartRef.current);

    const xAxisData = model.rows.map(row => String(row[model.xField || ''] || ''));
    
    let seriesType = 'bar';
    if (model.chartType === 'line') seriesType = 'line';
    if (model.chartType === 'scatter') seriesType = 'scatter';

    const series = model.seriesFields.map(field => {
      return {
        name: field,
        type: seriesType,
        data: model.rows.map(row => {
          const val = row[field];
          return typeof val === 'number' ? val : 0;
        })
      };
    });

    const option = {
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
        axisLabel: { color: '#6B7280' },
        splitLine: { lineStyle: { type: 'dashed', color: '#E5E7EB' } }
      },
      series: series
    };

    if (model.chartType === 'scatter') {
       // For scatter, we need 2D data.
       // Assuming seriesFields[0] is X and seriesFields[1] is Y
       if (model.seriesFields.length >= 2) {
         option.xAxis = { type: 'value', axisLabel: { color: '#6B7280' } } as any;
         option.series = [{
           name: model.title,
           type: 'scatter',
           data: model.rows.map(row => [
             row[model.seriesFields[0]] || 0,
             row[model.seriesFields[1]] || 0
           ])
         }] as any;
       }
    }

    chartInstance.setOption(option);

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [model]);

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
                {model.xField && <td className="px-3 py-2 whitespace-nowrap text-gray-900">{String(row[model.xField] ?? '')}</td>}
                {model.seriesFields.map(f => (
                  <td key={f} className="px-3 py-2 whitespace-nowrap text-gray-900">{String(row[f] ?? '')}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="w-full h-80 bg-white" ref={chartRef} />
  );
};
