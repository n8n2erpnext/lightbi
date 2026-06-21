import React from 'react';
import { AlertTriangle, Layers, CheckCircle2, XCircle, FileText } from 'lucide-react';
import type { DatasetUnderstandingResult } from '../../lib/understanding-next/contracts';
import { adaptNextActionsToLegacy } from '../../lib/understanding-next/action-adapter';
import { AnalysisOpportunityGrid } from './AnalysisOpportunityGrid';
import type { AnalysisAction } from '../../lib/analysis-opportunity-actions';

export interface UnderstandingNextCardProps {
  understanding: DatasetUnderstandingResult;
  selectedActionId?: string;
  onSelectAction?: (action: AnalysisAction) => void;
}

export const UnderstandingNextCard: React.FC<UnderstandingNextCardProps> = ({ 
  understanding, 
  selectedActionId, 
  onSelectAction 
}) => {
  const getHeaderStatus = () => {
    if (understanding.quality.headerStatus === 'failed') return { text: 'BLOCKED (Schema Empty)', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle };
    if (understanding.quality.headerStatus === 'recovered') return { text: 'Recovered Schema', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle };
    if (understanding.quality.headerStatus === 'clean') return { text: 'Clean Schema', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2 };
    return { text: 'Ambiguous Schema', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle };
  };

  const statusConfig = getHeaderStatus();
  const StatusIcon = statusConfig.icon;



  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-[16px] font-semibold text-gray-900">Dataset Profile (Local File)</h3>
            <div className={`flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
              <StatusIcon className="w-3.5 h-3.5 mr-1" />
              {statusConfig.text}
            </div>
          </div>
          <div className="flex items-center gap-4 text-[13px] text-gray-600">
             <div className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-gray-400"/> {understanding.profile.documentType}</div>
             <div className="flex items-center gap-1.5"><Layers className="w-4 h-4 text-gray-400"/> Grain: {understanding.profile.grain}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="text-[11px] font-medium px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-slate-600 flex flex-col items-end">
            <div><span className="text-slate-400">Source Rows:</span> <span className="font-semibold text-slate-700">{understanding.source.sourceRowCount > 0 ? understanding.source.sourceRowCount.toLocaleString() : 'Unknown'}</span></div>
            <div><span className="text-slate-400">Sample Rows:</span> <span className="font-semibold text-slate-700">{understanding.source.sampleRowCount.toLocaleString()}</span></div>
            <div><span className="text-slate-400">Parsed Rows:</span> <span className="font-semibold text-slate-700">{understanding.source.parsedRowCount.toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      {/* Dirty Signals Banner */}
      {understanding.quality.dirtySignals.length > 0 && (
        <div className="flex flex-col gap-2">
          {understanding.quality.dirtySignals.map((sig, i) => (
             <div key={i} className={`flex items-start p-3 rounded-lg border ${sig.severity === 'blocking' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold">{sig.kind} <span className="text-[11px] opacity-75 font-normal ml-2">Needs review</span></span>
                  <span className="text-[12px] opacity-90 mt-0.5">{sig.message}</span>
                  {sig.evidence.length > 0 && <span className="text-[11px] mt-1 font-mono bg-white/50 px-1.5 py-0.5 rounded">{sig.evidence[0]}</span>}
                </div>
             </div>
          ))}
        </div>
      )}

      {understanding.quality.blockedReasons.length > 0 && (
        <div className="flex flex-col gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
           <span className="text-[13px] font-semibold flex items-center"><XCircle className="w-4 h-4 mr-2" /> Blocked Analysis</span>
           <ul className="list-disc pl-6 text-[12px]">
              {understanding.quality.blockedReasons.map((r, i) => <li key={i}>{r}</li>)}
           </ul>
        </div>
      )}

      {/* Lens-first orientation */}
      <div className="pt-4 border-t border-gray-100">
        <div className="mb-3">
          <h4 className="text-[15px] font-semibold text-gray-900">What do you want to understand?</h4>
          <p className="text-[12px] text-gray-500 mt-0.5">
            Choose a business lens first. LightBI will only offer runtime actions when the needed signals are present.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {understanding.lenses.map(lens => {
            const statusClass =
              lens.availability === 'ready'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : lens.availability === 'partial'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : lens.availability === 'not_implemented'
                    ? 'bg-slate-50 text-slate-500 border-slate-200'
                    : 'bg-red-50 text-red-700 border-red-200';

            return (
              <div key={lens.id} className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-semibold text-gray-900">{lens.label}</div>
                    <div className="text-[12px] text-gray-500 mt-0.5">{lens.description}</div>
                  </div>
                  <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${statusClass}`}>
                    {lens.availability.replace('_', ' ')}
                  </span>
                </div>

                {lens.reasons.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {lens.reasons.slice(0, 3).map((reason, idx) => (
                      <li key={idx} className="text-[11px] text-gray-500 flex gap-1.5">
                        <span className="text-gray-300">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 space-y-2">
                  {lens.questions.map(question => (
                    <div key={question.id} className="rounded-md border border-gray-100 bg-gray-50 p-2">
                      <div className="text-[12px] font-medium text-gray-800">{question.label}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{question.userPrompt}</div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wide text-gray-400">{question.intent}</span>
                        {question.defaultAction ? (
                          <button
                            type="button"
                            onClick={() => onSelectAction?.(adaptNextActionsToLegacy([question.defaultAction!])[0])}
                            className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-100"
                          >
                            Investigate
                          </button>
                        ) : question.blockedReasons.length > 0 ? (
                          <span className="text-[11px] text-gray-400">Needs more signals</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <details className="pt-3 border-t border-gray-100 mt-1 group">
        <summary className="cursor-pointer select-none text-[12px] font-semibold text-gray-500 hover:text-gray-800">
          Show technical understanding details
        </summary>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          {/* Left Column: Domains & Perspectives */}
          <div className="flex flex-col gap-5">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Detected Domains</h4>
              <div className="flex flex-wrap gap-2">
                {understanding.profile.detectedDomains.length > 0 ? (
                  understanding.profile.detectedDomains.map((dom, i) => (
                    <div key={i} className="px-2.5 py-1 bg-indigo-50 border border-indigo-200 rounded-md text-[12px] font-medium text-indigo-700 flex flex-col shadow-sm">
                      {dom}
                    </div>
                  ))
                ) : (
                  <span className="text-[13px] text-gray-400">No domains detected.</span>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Perspectives</h4>
              <div className="flex flex-col gap-2">
                  {understanding.perspectives.map((p, i) => (
                    <div key={i} className="text-[12px] p-2 bg-gray-50 border border-gray-100 rounded-lg">
                        <div className="font-semibold text-gray-800">{p.label}</div>
                        <div className="text-gray-500 mt-0.5">{p.reason}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Right Column: Actions */}
          <div className="flex flex-col gap-5">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Runtime action candidates</h4>
              {understanding.availableActions.length > 0 ? (
                <AnalysisOpportunityGrid 
                  actions={adaptNextActionsToLegacy(understanding.availableActions)}
                  selectedActionId={selectedActionId} 
                  onSelectAction={onSelectAction || (() => {})} 
                />
              ) : (
                <p className="text-[12px] text-gray-400">No reliable analysis patterns found or dataset blocked.</p>
              )}
            </div>

            {understanding.unavailableActions.length > 0 && (
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-2.5">Missing / Unavailable Analysis</h4>
                <ul className="space-y-2">
                  {understanding.unavailableActions.map(analysis => (
                    <li key={analysis.id} className="text-[12px] text-gray-700 bg-slate-50 p-2.5 rounded-md border border-slate-200 flex flex-col gap-1">
                      <div className="flex items-start">
                        <XCircle className="w-3.5 h-3.5 text-slate-400 mt-0.5 mr-1.5 flex-shrink-0" />
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
      </details>
    </div>
  );
};
