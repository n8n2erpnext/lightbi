import React from 'react';
import type { ResultValidationResult } from '../../lib/result-validator-contract';

interface ResultValidationCardProps {
  result: ResultValidationResult;
}

export const ResultValidationCard: React.FC<ResultValidationCardProps> = ({ result }) => {
  const getLevelColor = (level: string) => {
    switch (level) {
      case "HIGH": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "MEDIUM": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "LOW": return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      default: return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-emerald-400";
    if (score >= 60) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 shadow-md">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            Result Validator
            <span className={`px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wide border ${getLevelColor(result.confidence)}`}>
              {result.status}
            </span>
          </h3>
          <p className="text-sm text-gray-400 mt-1">LightBI checks whether the preview result matches the expected answer structure.</p>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${getScoreColor(result.score)} tracking-tight`}>
            {result.score}<span className="text-lg text-gray-500 font-medium ml-1">/100</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {result.evidence.map((ev, i) => (
          <div key={i} className="flex justify-between items-center bg-gray-900/50 p-2.5 rounded border border-gray-700">
            <div className="text-sm">
              <span className="font-medium text-gray-200 block mb-0.5 capitalize">{ev.category.replace('_', ' ')}</span>
              <span className="text-gray-400 text-xs">{ev.message}</span>
            </div>
            <div className={`text-sm font-bold ${getScoreColor(ev.score)}`}>
              {ev.score}
            </div>
          </div>
        ))}
      </div>

      {result.warnings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <h4 className="text-xs font-semibold text-amber-500 mb-2 uppercase tracking-wider">Warnings</h4>
          <ul className="list-disc pl-4 space-y-1">
            {result.warnings.map((w, i) => (
              <li key={i} className="text-sm text-amber-400/80">{w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
