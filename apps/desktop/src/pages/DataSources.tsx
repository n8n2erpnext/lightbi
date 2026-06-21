import { getApiBaseUrl } from '../lib/api-base';
import React, { useState, useEffect } from 'react';
import { Database, FileSpreadsheet, Activity, ServerCog } from 'lucide-react';
import { useAppRuntime } from '@lightbi/runtime';

export const DataSources: React.FC = () => {
  const sourcesObj = useAppRuntime(s => s.datasources);
  const sources = Object.values(sourcesObj);
  
  const [apiHealth, setApiHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  
  const API_BASE_URL = getApiBaseUrl();

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/health`);
        if (res.ok) setApiHealth('online');
        else setApiHealth('offline');
      } catch (err) {
        setApiHealth('offline');
      }
    };
    checkHealth();
  }, [API_BASE_URL]);

  return (
    <div className="flex-1 p-4 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-800 flex items-center">
            <ServerCog className="w-6 h-6 mr-3 text-gray-400" />
            Advanced Management
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">Manage imported datasets, optional connectors, and system health.</p>
          <div className="flex items-center mt-3 space-x-3 text-[11px] text-gray-500">
            <span className="px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
              Local file analysis: Available offline
            </span>
            <span className="flex items-center">
              <Activity className="w-3 h-3 mr-1" />
              Connector API: {apiHealth === 'checking' ? 'Checking...' : apiHealth === 'online' ? <span className="text-emerald-500 font-medium">Online</span> : <span className="text-amber-600 font-medium">Offline</span>}
            </span>
            <span>Target: {API_BASE_URL}</span>
          </div>
          {apiHealth === 'offline' && (
            <p className="text-[12px] text-gray-500 mt-2 max-w-2xl">
              Backend is only needed for ERP/database/API connectors, persistence, shared jobs, or server-side execution. Uploaded local files continue to parse and preview in-browser.
            </p>
          )}
        </div>
      </div>


      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map(source => (
          <div key={source.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-gray-100 text-gray-700 rounded-lg">
                {source.type === 'CSV' || source.type === 'Excel' ? <FileSpreadsheet className="w-6 h-6" /> : <Database className="w-6 h-6" />}
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                source.status === 'Connected' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>
                {source.status}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{source.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{source.type}</p>
            
            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end space-x-2 text-sm">
              <button className="text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded transition-colors">Edit</button>
              <button className="text-red-600 hover:text-red-700 px-3 py-1.5 rounded transition-colors">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
