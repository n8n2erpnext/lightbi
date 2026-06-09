import React from 'react';
import type { BusinessConfidenceResult } from '../../lib/business-confidence-engine';

interface BusinessConfidenceCardProps {
  result: BusinessConfidenceResult;
}

export const BusinessConfidenceCard: React.FC<BusinessConfidenceCardProps> = ({ result }) => {
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
    <div className="bg-gray-800/60 rounded-lg p-5 border border-gray-700/50 shadow-lg relative overflow-hidden">
      {/* Decorative gradient blur based on confidence */}
      <div className={`absolute -top-10 -right-10 w-40 h-40 blur-3xl rounded-full opacity-20 pointer-events-none ${
        result.level === 'HIGH' ? 'bg-emerald-500' :
        result.level === 'MEDIUM' ? 'bg-amber-500' : 'bg-rose-500'
      }`} />

      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-100 flex items-center gap-3">
            Business Confidence
            <span className={`px-2 py-1 rounded text-xs font-semibold uppercase tracking-wider border ${getLevelColor(result.level)}`}>
              {result.level}
            </span>
            {result.mode === "provisional" && (
              <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider">
                PROVISIONAL CONFIDENCE
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-400 mt-1 max-w-lg">
            Business Confidence estimates how trustworthy this analysis is based on available evidence.
          </p>
        </div>
        
        <div className="text-right">
          <div className={`text-4xl font-black ${getScoreColor(result.score)} tracking-tight`}>
            {result.score}
            <span className="text-xl text-gray-500 font-medium ml-1">/100</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3 border-b border-gray-700/50 pb-2">Active Signals</h4>
          <div className="space-y-3">
            {result.signals.length === 0 && (
              <div className="text-sm text-gray-500 italic">No confidence signals available.</div>
            )}
            {result.signals.map(signal => (
              <div key={signal.id} className="flex justify-between items-center bg-gray-900/40 p-3 rounded border border-gray-800">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-200">{signal.label}</span>
                  <span className="text-xs text-gray-500">{signal.explanation}</span>
                </div>
                <div className={`text-lg font-bold ${getScoreColor(signal.score)}`}>
                  {signal.score}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {result.explanation.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-300 mb-3 border-b border-gray-700/50 pb-2">Summary</h4>
              <ul className="space-y-2">
                {result.explanation.map((exp, i) => (
                  <li key={i} className={`text-sm ${i === 0 ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>
                    {exp}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.caveats.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-amber-400 mb-3 border-b border-gray-700/50 pb-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Caveats
              </h4>
              <ul className="space-y-2">
                {result.caveats.map((caveat, i) => (
                  <li key={i} className="text-sm text-amber-300/80 flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500/50 shrink-0" />
                    {caveat}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
