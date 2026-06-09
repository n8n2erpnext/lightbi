import React from 'react';
import { Database, Link, Lightbulb, Sparkles } from 'lucide-react';
import type { BusinessViewCandidate } from '../../lib/business-view-generator';

interface DataUnderstandingSummaryProps {
  datasetCount: number;
  relationshipCount: number;
  businessViews: BusinessViewCandidate[];
}

export const DataUnderstandingSummary: React.FC<DataUnderstandingSummaryProps> = ({
  datasetCount,
  relationshipCount,
  businessViews,
}) => {
  const highestConfidenceView = businessViews.reduce((prev, curr) => {
    if (curr.confidence === 'HIGH') return curr;
    if (curr.confidence === 'MEDIUM' && prev?.confidence !== 'HIGH') return curr;
    return prev;
  }, businessViews[0]);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-5 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-blue-600" />
        <h3 className="text-[15px] font-semibold text-blue-900">
          LightBI found possible business views from your uploaded data.
        </h3>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/60 rounded-lg p-3 border border-white/40">
          <div className="flex items-center gap-2 text-gray-500 mb-1 text-[12px] font-medium uppercase tracking-wider">
            <Database className="w-3.5 h-3.5" />
            Datasets
          </div>
          <div className="text-xl font-bold text-gray-900">{datasetCount}</div>
        </div>

        <div className="bg-white/60 rounded-lg p-3 border border-white/40">
          <div className="flex items-center gap-2 text-gray-500 mb-1 text-[12px] font-medium uppercase tracking-wider">
            <Link className="w-3.5 h-3.5" />
            Relationships
          </div>
          <div className="text-xl font-bold text-gray-900">{relationshipCount}</div>
        </div>

        <div className="bg-white/60 rounded-lg p-3 border border-white/40">
          <div className="flex items-center gap-2 text-gray-500 mb-1 text-[12px] font-medium uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5" />
            Business Views
          </div>
          <div className="text-xl font-bold text-gray-900">{businessViews.length}</div>
        </div>
      </div>

      {highestConfidenceView && (
        <div className="mt-4 text-[13px] text-blue-800 bg-white/40 px-3 py-2 rounded-md border border-white/50">
          <span className="font-semibold">Top suggestion:</span> {highestConfidenceView.title} (Confidence: {highestConfidenceView.confidence})
        </div>
      )}
    </div>
  );
};
