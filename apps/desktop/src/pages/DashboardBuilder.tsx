import React from 'react';
import { RefreshCw, Edit2, Share2, Plus } from 'lucide-react';
import { useAppRuntime } from '@lightbi/runtime';

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
          <div className="col-span-5 row-span-3 bg-white border border-gray-200 rounded-md p-3.5 shadow-sm flex flex-col justify-center">
            <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">Total Revenue</h3>
            <div className="text-xl font-semibold text-gray-900 mt-1">$45,231.89</div>
            <div className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center">+20.1% from last month</div>
          </div>

          {/* KPI Widget 2 */}
          <div className="col-span-5 row-span-3 bg-white border border-gray-200 rounded-md p-3.5 shadow-sm flex flex-col justify-center">
            <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">Active Users</h3>
            <div className="text-xl font-semibold text-gray-900 mt-1">+2350</div>
            <div className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center">+180.1% from last month</div>
          </div>

          {/* KPI Widget 3 */}
          <div className="col-span-5 row-span-3 bg-white border border-gray-200 rounded-md p-3.5 shadow-sm flex flex-col justify-center">
            <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider">Sales</h3>
            <div className="text-xl font-semibold text-gray-900 mt-1">+12,234</div>
            <div className="text-[11px] font-medium text-emerald-600 mt-1 flex items-center">+19% from last month</div>
          </div>

          {/* Donut Chart Widget */}
          <div className="col-span-10 row-span-10 bg-white border border-gray-200 rounded-md p-4 shadow-sm flex flex-col">
            <h3 className="text-[13px] font-semibold text-gray-800 mb-3">Revenue by Category</h3>
            <div className="flex-1 bg-gray-50/50 border border-dashed border-gray-200 rounded flex items-center justify-center text-[13px] text-gray-400">
              [Donut Chart Placeholder]
            </div>
          </div>

          {/* Table Widget */}
          <div className="col-span-10 row-span-10 bg-white border border-gray-200 rounded-md p-4 shadow-sm flex flex-col">
            <h3 className="text-[13px] font-semibold text-gray-800 mb-3">Recent Transactions</h3>
            <div className="flex-1 bg-gray-50/50 border border-dashed border-gray-200 rounded flex items-center justify-center text-[13px] text-gray-400">
              [Table Placeholder]
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
