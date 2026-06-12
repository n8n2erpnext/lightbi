import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, ChevronRight, Info } from 'lucide-react';
import type { DatasetUnderstanding } from '../../lib/dataset-understanding-contract';
import type { AnalysisAction } from '../../lib/analysis-opportunity-actions';
import { generateAnalysisActions } from '../../lib/analysis-opportunity-actions';
import { AnalysisOpportunityGrid } from './AnalysisOpportunityGrid';

export interface DatasetUnderstandingCardProps {
  understanding: DatasetUnderstanding;
  selectedActionId?: string;
  onSelectAction?: (action: AnalysisAction) => void;
  onMappingAction?: (action: any) => void;
}

export const DatasetUnderstandingCard: React.FC<DatasetUnderstandingCardProps> = ({ understanding, selectedActionId, onSelectAction, onMappingAction }) => {
  const analysisActions = React.useMemo(() => generateAnalysisActions(understanding), [understanding]);
  const getStatusConfig = () => {
    switch (understanding.status) {
      case 'understood': return { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, text: 'Understood' };
      case 'partial': return { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, text: 'Partial understanding' };
      case 'insufficient': return { color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle, text: 'Not enough business meaning detected yet.' };
      default: return { color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200', icon: Info, text: 'Unknown status' };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-[16px] font-semibold text-gray-900 mb-1">Dataset Understanding</h3>
          <p className="text-[13px] text-gray-600 max-w-3xl leading-relaxed">{understanding.narrative}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className={`flex items-center px-2.5 py-1 rounded-md text-[12px] font-medium border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.color}`}>
            <StatusIcon className="w-3.5 h-3.5 mr-1.5" />
            {statusConfig.text}
          </div>
          <span className="text-[11px] text-gray-400 font-medium">Confidence: {Math.round(understanding.confidenceScore)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
        {/* Left Column */}
        <div className="flex flex-col gap-5">
          {/* Detected Concepts & Entities */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Detected Entities</h4>
            <div className="flex flex-wrap gap-2">
              {understanding.inferredEntities.length > 0 ? (
                understanding.inferredEntities.map(entity => (
                  <div key={entity.id} className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-md text-[12px] font-medium text-gray-700 flex flex-col shadow-sm">
                    {entity.label}
                  </div>
                ))
              ) : (
                <span className="text-[13px] text-gray-400">No specific entities detected.</span>
              )}
            </div>
            {understanding.detectedConcepts.length > 0 && (
               <div className="mt-2.5 text-[11px] text-gray-400">
                 Based on {understanding.detectedConcepts.length} signals: {understanding.detectedConcepts.map(c => c.label).join(', ')}
               </div>
            )}
          </div>

          {/* Workflow Hints */}
          {understanding.workflowHints.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Inferred Workflow</h4>
              <div className="flex items-center flex-wrap gap-1.5 text-[12px] text-gray-700 bg-gray-50 px-3 py-2 rounded-md border border-gray-100">
                {understanding.workflowHints.map((hint) => (
                  <React.Fragment key={hint.id}>
                    <span className="font-medium bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">{hint.fromSignal}</span>
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    {hint.toSignal && <span className="font-medium bg-white px-1.5 py-0.5 rounded border border-gray-200 shadow-sm">{hint.toSignal}</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-5">
          {/* Available Analysis */}
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Available Analysis</h4>
            {analysisActions.length > 0 ? (
              <AnalysisOpportunityGrid 
                actions={analysisActions} 
                selectedActionId={selectedActionId} 
                onSelectAction={onSelectAction || (() => {})} 
              />
            ) : (
              <p className="text-[12px] text-gray-400">No reliable analysis patterns found.</p>
            )}
          </div>

          {/* Unavailable Analysis */}
          {understanding.unavailableAnalysis.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Missing / Unavailable Analysis</h4>
              <ul className="space-y-2">
                {understanding.unavailableAnalysis.map(analysis => (
                  <li key={analysis.id} className="text-[12px] text-gray-700 bg-red-50/40 p-2.5 rounded-md border border-red-100/50 flex flex-col gap-1">
                    <div className="flex items-start">
                      <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 mr-1.5 flex-shrink-0" />
                      <span className="font-medium">{analysis.label}</span>
                    </div>
                    <span className="text-[11px] text-gray-500 pl-5">Missing signals: {analysis.missingSignals.join(', ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {understanding.caveats.length > 0 && (
        <div className="mt-1 pt-3 border-t border-gray-100">
           <ul className="space-y-1">
             {understanding.caveats.map((c, i) => (
                <li key={i} className="text-[11px] text-gray-500 flex items-start">
                  <Info className="w-3 h-3 mr-1.5 mt-0.5 flex-shrink-0" /> {c}
                </li>
             ))}
           </ul>
        </div>
      )}

      {understanding.mappingReview && understanding.mappingReview.items.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h4 className="text-[13px] font-bold text-gray-900 mb-3">Truth & Mapping Review</h4>
          <div className="space-y-3">
            {understanding.mappingReview.items.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <span className="text-[13px] font-medium text-gray-700">{item.physicalColumn}</span>
                <div className="flex items-center gap-2">
                  {item.issueType === 'ambiguous' && (
                    <button 
                      onClick={() => onMappingAction?.({ actionType: 'map_temporary', physicalColumn: item.physicalColumn, targetSignal: item.inferredSignal || '' })}
                      className="px-3 py-1 bg-white border border-gray-300 rounded text-[12px] font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Map to {item.inferredSignal}
                    </button>
                  )}
                  <div className="flex items-center gap-2">
                    <select 
                      className="px-2 py-1 text-[12px] border border-gray-300 rounded bg-white"
                      onChange={(e) => {
                        const val = e.target.value;
                        const btn = e.target.nextElementSibling as HTMLButtonElement;
                        btn.disabled = !val;
                      }}
                    >
                      <option value="">Select signal...</option>
                      <option value="revenue">revenue</option>
                      <option value="route">route</option>
                    </select>
                    <button 
                      onClick={(e) => {
                        const select = e.currentTarget.previousElementSibling as HTMLSelectElement;
                        const targetSignal = select.value;
                        if (targetSignal) {
                          onMappingAction?.({ actionType: 'map_temporary', physicalColumn: item.physicalColumn, targetSignal });
                        }
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-[12px] font-medium disabled:opacity-50"
                    >
                      Apply
                    </button>
                  </div>
                  <button 
                    onClick={() => onMappingAction?.({ actionType: 'ignore_mismatch', physicalColumn: item.physicalColumn })}
                    className="px-3 py-1 text-[12px] font-medium text-gray-500 hover:text-gray-700"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Readiness Toast / Alert */}
      {understanding.readiness && understanding.readiness.score > 40 && understanding.opportunities.length > 0 && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-[13px] flex items-center">
          <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
          Readiness improved: 40 -&gt; {understanding.readiness.score}. Unlocked opportunities: 0 -&gt; {understanding.opportunities.length}.
        </div>
      )}

      {/* UX copy for zero questions/views improvement */}
      {understanding.summary.businessViewCount === 0 && understanding.summary.questionCount === 0 && understanding.status !== 'insufficient' && (
        <div className="mt-1 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-md text-[12px] text-blue-800 flex items-start shadow-sm">
           <Info className="w-4 h-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
           <span>LightBI can understand this dataset, but some advanced analysis is unavailable because required signals were not detected.</span>
        </div>
      )}
    </div>
  );
};
