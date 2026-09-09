import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { ChartPreviewModel } from '../../lib/chart-preview-model';
import type { DrillThroughPoint } from '../../lib/drill-through-export';
import { useDisplayPreferences } from '../../stores/display-preferences-store';
import { formatValue, inferSemanticType } from '../../lib/display-formatter';
import type { GovernedVisualizationPlanV1 } from '../../lib/visualization-planner';
import { generateDashboardChartOptions } from '../dashboards/DashboardChartWidget';

type ChartClickParams = {
  dataIndex?: number;
  seriesName?: string;
};

export const ChartPreviewRenderer: React.FC<{
  model: ChartPreviewModel;
  visualizationPlan?: GovernedVisualizationPlanV1 | null;
  onDrillThrough?: (point: DrillThroughPoint) => void;
}> = ({ model, visualizationPlan, onDrillThrough }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const { preferences } = useDisplayPreferences();

  useEffect(() => {
    if (!chartRef.current) return;
    if (model.status !== 'ready' || model.chartType === 'table') return;

    const chartInstance = echarts.init(chartRef.current);
    const xField = model.xField || '';
    const primaryYField = model.seriesFields[0] || model.yField || '';
    const primarySample = primaryYField ? model.rows[0]?.[primaryYField] : undefined;
    const primarySemantic = primaryYField ? inferSemanticType(primaryYField, primarySample) : 'number';
    const valueType = primarySemantic === 'currency' ? 'currency' : 'number';
    const coarseType = model.chartType === 'line' ? 'line' : model.chartType === 'scatter' ? 'scatter' : 'bar';
    const family = visualizationPlan?.rendererFamily ?? (coarseType === 'line' ? 'line' : coarseType === 'scatter' ? 'scatter' : 'bar');
    const colorSemantics = visualizationPlan?.patternRules?.colorSemantics ?? null;

    chartInstance.setOption(generateDashboardChartOptions({
      title: model.title,
      chartType: coarseType,
      rendererFamily: family,
      patternId: visualizationPlan?.patternId ?? null,
      colorSemantics,
      data: model.rows,
      xAxisKey: xField,
      seriesKey: model.yField || primaryYField,
      seriesKeys: model.seriesFields,
      valueType,
      colSpan: 20,
    }, preferences, false));

    const drillUnsafeFamilies = new Set(['histogram','box_plot','pareto','calendar_heatmap','heatmap','cohort_heatmap','sankey','small_multiples']);
    const drillEnabled = Boolean(onDrillThrough && xField && !drillUnsafeFamilies.has(String(family)));
    chartInstance.getZr().setCursorStyle(drillEnabled ? 'pointer' : 'default');
    const handleClick = (params: ChartClickParams) => {
      if (!drillEnabled || !onDrillThrough || typeof params.dataIndex !== 'number') return;
      const row = model.rows[params.dataIndex];
      if (!row) return;
      const rawValue = row[xField];
      const label = formatValue(rawValue, inferSemanticType(xField, rawValue), preferences);
      onDrillThrough({
        dimensionField: xField,
        value: rawValue,
        label,
        dimensionSemanticType: inferSemanticType(xField, rawValue),
        measureField: typeof params.seriesName === 'string' ? params.seriesName : model.yField,
        measureValue: typeof params.seriesName === 'string' ? row[params.seriesName] : undefined,
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
  }, [model, onDrillThrough, preferences, visualizationPlan]);

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
