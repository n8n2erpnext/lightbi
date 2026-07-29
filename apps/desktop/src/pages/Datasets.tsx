import React from 'react';
import { Plus } from 'lucide-react';
import { useAppRuntime } from '@lightbi/runtime';

export const Datasets: React.FC = () => {
  const datasetsObj = useAppRuntime(s => s.datasets);
  const datasets = Object.values(datasetsObj);

  return (
    <div className="flex-1 p-4 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Datasets</h1>
        <button disabled title="Dataset creation is not available in this Beta; import data from New brief" className="flex cursor-not-allowed items-center rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Dataset
        </button>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1 flex flex-col">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-700">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Source</th>
              <th className="px-6 py-3 font-medium">Rows</th>
            </tr>
          </thead>
          <tbody>
            {datasets.map((ds) => (
              <tr key={ds.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {ds.name}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                    {ds.origin.type}
                  </span>
                </td>
                <td className="px-6 py-4">{(ds.rowCount || 0).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {/* Placeholder for Dataset Detail / Metadata View when one is clicked */}
        <div className="flex-1 border-t border-gray-200 bg-gray-50 flex flex-col items-center justify-center text-gray-400 p-4 text-sm">
          Dataset detail editing is not available in this Beta. Import or review data from New brief.
        </div>
      </div>
    </div>
  );
};
