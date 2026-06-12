import React, { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { useDisplayPreferences } from '../../stores/display-preferences-store';
import { formatValue } from '../../lib/display-formatter';

export interface DashboardChartWidgetProps {
  title: string;
  chartType: 'bar' | 'line' | 'donut';
  data: any[];
  xAxisKey?: string;
  seriesKey?: string;
  valueType?: 'number' | 'currency';
  className?: string;
  colSpan: number;
}

export const generateDashboardChartOptions = (
  props: DashboardChartWidgetProps,
  preferences: any,
  isCompact: boolean
): echarts.EChartsCoreOption => {
  const { title, chartType, data, xAxisKey = 'name', seriesKey = 'value', valueType = 'number' } = props;

  // The formatter for the axes is dynamic based on widget size
  const axisFormatter = (value: any) => formatValue(value, valueType, preferences, { compact: isCompact });
  
  // The tooltip formatter is ALWAYS full detail
  const tooltipFormatter = (value: any) => formatValue(value, valueType, preferences, { compact: false });

  if (chartType === 'donut') {
    return {
      tooltip: {
        trigger: 'item',
        valueFormatter: tooltipFormatter
      },
      legend: {
        bottom: '5%',
        left: 'center'
      },
      series: [
        {
          name: title,
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 16,
              fontWeight: 'bold',
              formatter: (params: any) => axisFormatter(params.value) // Donut center label can be compact
            }
          },
          labelLine: {
            show: false
          },
          data: data.map(d => ({ name: d[xAxisKey], value: d[seriesKey] }))
        }
      ]
    };
  }

  // Bar or Line chart
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: tooltipFormatter
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: data.map(d => d[xAxisKey]),
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: axisFormatter
      }
    },
    series: [
      {
        name: title,
        type: chartType,
        data: data.map(d => d[seriesKey]),
        itemStyle: {
          color: '#4F46E5' // Indigo 600
        }
      }
    ]
  };
};

export const DashboardChartWidget: React.FC<DashboardChartWidgetProps> = (props) => {
  const { title, className = '', colSpan } = props;
  const chartRef = useRef<HTMLDivElement>(null);
  const { preferences } = useDisplayPreferences();
  
  // Compact rule: if colSpan is 10 or less (out of 20 columns), it's considered compact.
  const isCompact = colSpan <= 10;

  useEffect(() => {
    if (!chartRef.current) return;

    const chartInstance = echarts.init(chartRef.current);
    const options = generateDashboardChartOptions(props, preferences, isCompact);
    chartInstance.setOption(options);

    const handleResize = () => chartInstance.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.dispose();
    };
  }, [props, preferences, isCompact]);

  return (
    <div className={`${className} bg-white border border-gray-200 rounded-md p-4 shadow-sm flex flex-col`}>
      <h3 className="text-[13px] font-semibold text-gray-800 mb-3">{title}</h3>
      <div ref={chartRef} className="flex-1 w-full h-full min-h-[200px]" />
    </div>
  );
};
