import React from 'react';
import { Save, Play, Settings2 } from 'lucide-react';
import { useAppRuntime } from '@lightbi/runtime';

export const ChartBuilder: React.FC = () => {
  const activeChartId = useAppRuntime(s => s.activeChartId);
  const charts = useAppRuntime(s => s.charts);
  const chart = activeChartId ? charts[activeChartId] : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center space-x-2 text-gray-800">
          <h1 className="text-lg font-semibold">{chart ? chart.name : 'Select a Chart'}</h1>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{chart ? chart.type : 'Chart'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="text-gray-600 hover:text-gray-900 px-3 py-1.5 text-sm font-medium transition-colors">
            Cancel
          </button>
          <button className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors">
            <Save className="w-4 h-4 mr-2" /> Save Chart
          </button>
        </div>
      </header>

      {/* Builder Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Secondary Navigation (e.g. fields) */}
        <div className="w-[208px] border-r border-gray-200 bg-white flex flex-col">
          <div className="p-3 border-b border-gray-200 font-medium text-sm text-gray-800">
            Dataset Fields
          </div>
          <div className="flex-1 p-2 overflow-y-auto space-y-1">
            {['Date', 'Revenue', 'Cost', 'Region', 'Category'].map(field => (
              <div key={field} className="px-3 py-2 text-sm text-gray-600 bg-gray-50 border border-gray-100 rounded cursor-pointer hover:border-gray-300 hover:bg-white hover:text-gray-900 transition-colors">
                {field}
              </div>
            ))}
          </div>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-50 relative">
          <div className="p-4 flex-1 flex flex-col min-h-[24rem]">
            {/* Chart Preview */}
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex-1 flex items-center justify-center p-4">
               <div className="text-gray-400 text-sm flex flex-col items-center">
                 <Play className="w-8 h-8 mb-2 opacity-50" />
                 <span>[ECharts Line Chart Preview]</span>
               </div>
            </div>
          </div>
          
          {/* Data Preview Table */}
          <div className="h-64 border-t border-gray-200 bg-white flex flex-col">
            <div className="p-2 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Data Preview (10 rows)
            </div>
            <div className="flex-1 p-4 flex items-center justify-center text-gray-400 text-sm overflow-hidden">
              [TanStack Table Placeholder]
            </div>
          </div>
        </div>

        {/* Right Configuration Panel */}
        <div className="w-[304px] border-l border-gray-200 bg-white flex flex-col">
          <div className="p-3 border-b border-gray-200 flex items-center text-sm font-medium text-gray-800">
            <Settings2 className="w-4 h-4 mr-2 text-gray-500" />
            Configuration
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto space-y-6 text-sm">
            {/* Chart Type */}
            <div className="space-y-2">
              <label className="font-medium text-gray-700 block">Chart Type</label>
              <select className="w-full border border-gray-300 rounded px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option>Line</option>
                <option>Bar</option>
                <option>Number</option>
                <option>Pie</option>
              </select>
            </div>

            {/* X-Axis */}
            <div className="space-y-2">
              <label className="font-medium text-gray-700 block">X-Axis</label>
              <div className="w-full border border-dashed border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-400 flex items-center justify-center h-10">
                Drop field here
              </div>
            </div>

            {/* Y-Axis */}
            <div className="space-y-2">
              <label className="font-medium text-gray-700 block">Y-Axis</label>
              <div className="w-full border border-dashed border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-400 flex items-center justify-center h-10">
                Drop field here
              </div>
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <label className="font-medium text-gray-700 block">Filters</label>
              <button className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded px-3 py-1.5 font-medium transition-colors">
                + Add Filter
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
