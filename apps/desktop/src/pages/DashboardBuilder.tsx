import React from 'react';
import { RefreshCw, Edit2, Share2, Plus } from 'lucide-react';
import { useAppRuntime } from '@lightbi/runtime';
import { DashboardKPIWidget } from '../components/dashboards/DashboardKPIWidget';
import { DashboardChartWidget } from '../components/dashboards/DashboardChartWidget';

export const DashboardBuilder: React.FC = () => {
  const activeDashboardId = useAppRuntime(s => s.activeDashboardId);
  const dashboards = useAppRuntime(s => s.dashboards);
  const dashboard = activeDashboardId ? dashboards[activeDashboardId] : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Header */}
      <header className="h-12 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center space-x-3 text-gray-900">
          <h1 className="text-[15px] font-semibold">{dashboard ? dashboard.name : 'Select a Dashboard'}</h1>
          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 uppercase tracking-widest font-medium">Mock Data</span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors" title="Share">
            <Share2 className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-300 mx-2"></div>
          <button className="bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors">
            <Plus className="w-4 h-4 mr-1" /> Add Widget
          </button>
        </div>
      </header>

      {/* Grid Canvas */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* 20-col grid placeholder */}
        <div className="grid grid-cols-20 gap-3" style={{ gridAutoRows: '30px' }}>
          
          {/* KPI Widget 1 */}
          <DashboardKPIWidget 
            title="Total Revenue"
            value={45231.89}
            valueType="currency"
            trend={{ value: 20.1, label: 'from last month', isPositive: true }}
            className="col-span-5 row-span-3"
            colSpan={5}
          />

          {/* KPI Widget 2 */}
          <DashboardKPIWidget 
            title="Active Users"
            value={2350}
            valueType="number"
            trend={{ value: 180.1, label: 'from last month', isPositive: true }}
            className="col-span-5 row-span-3"
            colSpan={5}
          />

          {/* KPI Widget 3 */}
          <DashboardKPIWidget 
            title="Sales"
            value={12234}
            valueType="number"
            trend={{ value: 19, label: 'from last month', isPositive: true }}
            className="col-span-5 row-span-3"
            colSpan={5}
          />

          {/* Donut Chart Widget */}
          <DashboardChartWidget
            title="Revenue by Category"
            chartType="donut"
            data={[
              { category: 'Electronics', revenue: 15400.50 },
              { category: 'Clothing', revenue: 8200.75 },
              { category: 'Software', revenue: 21630.64 }
            ]}
            xAxisKey="category"
            seriesKey="revenue"
            valueType="currency"
            className="col-span-10 row-span-10"
            colSpan={10}
          />

          {/* Bar Chart Widget (Replacing Table for demo of formatValue) */}
          <DashboardChartWidget
            title="Recent Transactions"
            chartType="bar"
            data={[
              { date: 'Mon', amount: 12500 },
              { date: 'Tue', amount: 18400 },
              { date: 'Wed', amount: 9600 },
              { date: 'Thu', amount: 22100 },
              { date: 'Fri', amount: 28500 }
            ]}
            xAxisKey="date"
            seriesKey="amount"
            valueType="currency"
            className="col-span-10 row-span-10"
            colSpan={10}
          />

        </div>
      </div>
    </div>
  );
};
