import React from 'react';
import { Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppRuntime } from '@lightbi/runtime';

export const Charts: React.FC = () => {
  const chartsObj = useAppRuntime(s => s.charts);
  const charts = Object.values(chartsObj);

  return (
    <div className="flex-1 p-4 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Charts</h1>
        <Link to="/charts/new" className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center transition-colors">
          <Plus className="w-4 h-4 mr-2" />
          New Chart
        </Link>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
            <tr>
              <th className="px-6 py-3 font-medium">Title</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Dataset</th>
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {charts.map((chart) => (
              <tr key={chart.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">
                  <Link to={`/charts/${chart.id}`} className="hover:text-gray-600">
                    {chart.name}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {chart.type}
                  </span>
                </td>
                <td className="px-6 py-4">{chart.datasetId}</td>
                <td className="px-6 py-4 text-right">
                  <Link to={`/charts/${chart.id}`} className="text-gray-900 hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
