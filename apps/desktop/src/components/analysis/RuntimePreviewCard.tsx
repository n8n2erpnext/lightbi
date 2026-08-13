import React from 'react';
import { AlertCircle, Play, RefreshCw, CheckCircle, Database, Link as LinkIcon, ShieldAlert, AlertTriangle } from 'lucide-react';
import type { RuntimePreview } from '../../lib/runtime-preview';
import { summarizeRuntimePreview, canProceedToExecution } from '../../lib/runtime-preview';

export interface RuntimePreviewCardProps {
  preview: RuntimePreview;
  onReviewAgain?: () => void;
  onAcceptPlan?: () => void;
}

export const RuntimePreviewCard: React.FC<RuntimePreviewCardProps> = ({
  preview,
  onReviewAgain,
  onAcceptPlan
}) => {
  const summary = summarizeRuntimePreview(preview);
  const canProceed = canProceedToExecution(preview, true);

  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <Play className="w-5 h-5 text-indigo-500" />
          <h3 className="text-[15px] font-semibold text-gray-900">Runtime Preview</h3>
          
          {preview.status === 'ready' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Ready
            </span>
          )}
          {preview.status === 'warning' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Warning
            </span>
          )}
          {preview.status === 'blocked' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Blocked
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6">
        <div>
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Business Question</span>
          <p className="text-sm font-medium text-gray-900 bg-gray-50 p-3 rounded-lg border border-gray-100">
            {preview.question}
          </p>
        </div>

        <div>
          <p className="text-[13px] text-gray-600 mb-3">{summary}</p>
          <div className="flex gap-6">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-500 uppercase">
                <Database className="w-4 h-4 text-gray-400" /> Datasets
              </div>
              <ul className="text-[13px] text-gray-700 pl-6 list-disc">
                {preview.datasets.map(d => <li key={d.id}>{d.label}</li>)}
              </ul>
            </div>
            
            {preview.relationships.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-gray-500 uppercase">
                  <LinkIcon className="w-4 h-4 text-gray-400" /> Relationships
                </div>
                <ul className="text-[13px] text-gray-700 pl-6 list-disc">
                  {preview.relationships.map(r => <li key={r.id}>{r.label}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>

        {preview.warnings.length > 0 && (
          <div className={`p-4 rounded-lg border flex flex-col gap-2 ${
            preview.status === 'blocked' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'
          }`}>
            <div className="flex items-center gap-2 font-semibold text-[13px]">
              {preview.status === 'blocked' ? <ShieldAlert className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {preview.status === 'blocked' ? 'Execution Blocked' : 'Attention Needed'}
            </div>
            <ul className="list-disc list-inside text-[12px] space-y-1 ml-1 opacity-90">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h4 className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Planned Operations</h4>
          <div className="flex flex-col gap-2">
            {preview.operations.map((op, idx) => (
              <div key={op.id} className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-600">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-gray-900">{op.title}</div>
                  <div className="text-[12px] text-gray-500">{op.description}</div>
                </div>
                {op.risk && op.risk !== 'LOW' && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    op.risk === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {op.risk} Risk
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-100 text-blue-800 text-[12px] px-4 py-3 rounded-lg flex gap-2 items-start">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{preview.explanation}</span>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
        <button
          onClick={onReviewAgain}
          className="px-4 py-2 text-[13px] font-medium text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Review Again
        </button>
        <button
          onClick={onAcceptPlan}
          disabled={!canProceed}
          className={`px-4 py-2 text-[13px] font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 ${
            !canProceed
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          Accept Plan
        </button>
      </div>
    </div>
  );
}
