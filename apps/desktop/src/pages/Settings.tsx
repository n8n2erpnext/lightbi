import React from 'react';

export const Settings: React.FC = () => {
  return (
    <div className="flex-1 p-4 flex flex-col overflow-hidden max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage local workspace settings and preferences.</p>
      </div>
      
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex-1 overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Appearance</h2>
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
            <div>
              <div className="font-medium text-gray-800">Theme</div>
              <div className="text-sm text-gray-500">Select application theme</div>
            </div>
            <select disabled title="Theme selection is not available in this MVP" className="cursor-not-allowed rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm text-gray-500">
              <option>Light (Default)</option>
              <option>Dark</option>
              <option>System</option>
            </select>
          </div>
        </div>

        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Data Storage</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
              <div>
                <div className="font-medium text-gray-800">Local Database Location</div>
                <div className="text-sm text-gray-500">~/.lightbi/data.db</div>
              </div>
              <button disabled title="Database relocation is not available in this MVP" className="cursor-not-allowed rounded-md bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-400">
                Change
              </button>
            </div>
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
              <div>
                <div className="font-medium text-gray-800">DuckDB Engine Cache</div>
                <div className="text-sm text-gray-500">128 MB used</div>
              </div>
              <button disabled title="Cache clearing is not available in this MVP" className="cursor-not-allowed rounded-md px-4 py-1.5 text-sm font-medium text-gray-400">
                Clear Cache
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
