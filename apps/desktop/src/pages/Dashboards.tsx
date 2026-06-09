import React from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppRuntime } from '@lightbi/runtime';

export const Dashboards: React.FC = () => {
  const dashboardsObj = useAppRuntime(s => s.dashboards);
  const dashboards = Object.values(dashboardsObj);

  return (
    <div className="flex-1 p-4 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboards</h1>
        <Link to="/dashboards/new" className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          New Dashboard
        </Link>
      </div>
      
      <div className="bg-white rounded-md border border-gray-200 overflow-hidden flex-1 shadow-sm">
        <table className="w-full text-left text-[13px] text-gray-600">
          <thead className="bg-gray-50/50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="px-5 py-2.5 font-medium">Title</th>
              <th className="px-5 py-2.5 font-medium">Last Modified</th>
              <th className="px-5 py-2.5 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dashboards.map((dash) => (
              <tr key={dash.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">
                  <Link to={`/dashboards/${dash.id}`} className="hover:text-gray-600">
                    {dash.name}
                  </Link>
                </td>
                <td className="px-5 py-3 text-gray-500">{new Date(dash.updatedAt || Date.now()).toLocaleDateString()}</td>
                <td className="px-5 py-3 text-right">
                  <Link to={`/dashboards/${dash.id}`} className="text-gray-900 font-medium hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
