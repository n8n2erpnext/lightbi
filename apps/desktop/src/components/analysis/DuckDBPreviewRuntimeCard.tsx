import React from 'react';
import type { PreviewRuntimeResult } from '../../lib/duckdb-preview-runtime';

interface DuckDBPreviewRuntimeCardProps {
  result: PreviewRuntimeResult;
}

export const DuckDBPreviewRuntimeCard: React.FC<DuckDBPreviewRuntimeCardProps> = ({ result }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            DuckDB Preview Result
            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide border ${
              result.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              result.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              result.status === 'error' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
              'bg-gray-500/10 text-gray-400 border-gray-500/20'
            }`}>
              {result.status}
            </span>
          </h3>
          <p className="text-sm text-gray-400 mt-1">Preview only. Full execution has not run.</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium text-gray-300">
            {result.rowCount} rows <span className="text-gray-500">(limit {result.execution.maxRows})</span>
          </div>
          {result.execution.executionMs !== undefined && (
            <div className="text-xs text-gray-500 mt-1">
              {result.execution.executionMs} ms
            </div>
          )}
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded p-3">
          <h4 className="text-xs font-semibold text-amber-500 mb-2 uppercase tracking-wider">Warnings</h4>
          <ul className="list-disc pl-4 space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-400/80">{w}</li>
            ))}
          </ul>
        </div>
      )}

      {result.status !== 'blocked' && result.rows.length > 0 && (
        <div className="overflow-x-auto border border-gray-700 rounded-lg">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-400 uppercase bg-gray-900 border-b border-gray-700">
              <tr>
                {result.columns.map((col) => (
                  <th key={col.id} className="px-4 py-3 font-medium">
                    {col.label} <span className="text-gray-600 ml-1">({col.role})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => (
                <tr key={i} className="border-b border-gray-800 last:border-0 hover:bg-gray-800/50">
                  {result.columns.map((col) => (
                    <td key={col.id} className="px-4 py-3">
                      {row[col.id] !== null ? String(row[col.id]) : <span className="text-gray-600 italic">null</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.status !== 'blocked' && result.rows.length === 0 && (
        <div className="py-8 text-center text-gray-500 italic border border-gray-700 border-dashed rounded-lg">
          No data returned.
        </div>
      )}
    </div>
  );
};
