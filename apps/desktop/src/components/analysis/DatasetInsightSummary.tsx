import React, { useMemo } from 'react';
import { Database, Calendar, AlignLeft, Hash } from 'lucide-react';
import { LogisticsDatasetSummary } from './LogisticsDatasetSummary';
import { buildDatasetProfile } from '../../lib/dataset-profile';

interface DatasetInsightSummaryProps {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
}

export const DatasetInsightSummary: React.FC<DatasetInsightSummaryProps> = ({ columns, rows, rowCount }) => {
  const profile = useMemo(() => buildDatasetProfile(columns, rows), [columns, rows]);

  if (profile.primaryDomain === 'logistics') {
    return <LogisticsDatasetSummary columns={columns} rows={rows} rowCount={rowCount} />;
  }

  // Generic / Retail / Inventory fallback
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4 border-b border-gray-100 pb-3">
        <div className="p-1.5 bg-gray-50 text-gray-600 rounded-md border border-gray-200">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 leading-tight">
            {profile.documentType}
          </h3>
          <p className="text-xs text-gray-500">Quick insights extracted from raw sample rows</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 rounded-md p-3 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1.5"><Hash className="w-3 h-3"/> Total Rows</div>
          <div className="font-semibold text-gray-900">{rowCount.toLocaleString()}</div>
        </div>
        
        <div className="bg-gray-50 rounded-md p-3 border border-gray-100">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1.5"><AlignLeft className="w-3 h-3"/> Total Columns</div>
          <div className="font-semibold text-gray-900">{columns.length.toLocaleString()}</div>
        </div>

        {profile.dateRange ? (
          <div className="border border-gray-100 rounded-md p-3 md:col-span-2 flex flex-col justify-center">
            <div className="text-xs font-medium text-gray-700 mb-1 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-emerald-500"/> Detected Time Range</div>
            <div className="text-xs font-semibold text-gray-900">
              {profile.dateRange.min} — {profile.dateRange.max}
            </div>
          </div>
        ) : (
          <div className="border border-gray-100 rounded-md p-3 md:col-span-2 flex flex-col justify-center">
             <div className="text-xs font-medium text-gray-500 flex items-center gap-1.5">No valid dates detected in sample</div>
          </div>
        )}
      </div>

      <div className="bg-blue-50/50 border border-blue-100 rounded-md p-3 text-xs text-blue-800">
        <p><strong>Features Detected:</strong> 
          {profile.features.hasFinancials ? ' Financials, ' : ''}
          {profile.features.hasQuantities ? ' Quantities, ' : ''}
          {profile.features.hasLocations ? ' Locations, ' : ''}
          {profile.features.hasTime ? ' Time Series' : ''}
          {!profile.features.hasFinancials && !profile.features.hasQuantities && !profile.features.hasLocations && !profile.features.hasTime ? ' None' : ''}
        </p>
      </div>
    </div>
  );
};
