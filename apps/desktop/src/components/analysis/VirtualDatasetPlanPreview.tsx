import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Clock, Play, ListTree, Database, Link as LinkIcon } from 'lucide-react';
import type { VirtualDatasetPlan } from '../../lib/virtual-dataset-planner';
import { summarizeVirtualDatasetPlan } from '../../lib/virtual-dataset-planner';

export interface VirtualDatasetPlanPreviewProps {
  plan: VirtualDatasetPlan;
  onClose?: () => void;
  onReviewEvidence?: () => void;
  onPrepare?: () => void;
}

export const VirtualDatasetPlanPreview: React.FC<VirtualDatasetPlanPreviewProps> = ({
  plan,
  onClose,
  onReviewEvidence,
  onPrepare
}) => {
  const summary = summarizeVirtualDatasetPlan(plan);
  
  return (
    <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <ListTree className="w-5 h-5 text-indigo-500" />
          <h3 className="text-[15px] font-semibold text-gray-900">{plan.title}</h3>
          
          {plan.status === 'ready' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Ready
            </span>
          )}
          {plan.status === 'draft' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Draft
            </span>
          )}
          {plan.status === 'blocked' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Blocked
            </span>
          )}

          {plan.confidence && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
              plan.confidence === 'HIGH' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
              plan.confidence === 'MEDIUM' ? 'bg-amber-50 text-amber-600 border-amber-200' :
              'bg-red-50 text-red-600 border-red-200'
            }`}>
              {plan.confidence} Confidence
            </span>
          )}
        </div>
        
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm font-medium">Close</button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4">
        <p className="text-[13px] text-gray-600">{summary}</p>
        
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-400" />
            <span className="text-[13px] text-gray-700 font-medium">{plan.datasets.length} Datasets</span>
          </div>
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-gray-400" />
            <span className="text-[13px] text-gray-700 font-medium">{plan.relationshipIds.length} Relationships</span>
          </div>
        </div>

        {plan.warnings.length > 0 && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-800 font-medium text-[13px]">
              <AlertTriangle className="w-4 h-4" /> Attention Needed
            </div>
            <ul className="list-disc list-inside text-[12px] text-amber-700 space-y-1">
              {plan.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
            {onReviewEvidence && plan.status === 'draft' && (
              <button 
                onClick={onReviewEvidence}
                className="self-start mt-1 text-[12px] font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2"
              >
                Review Evidence
              </button>
            )}
          </div>
        )}

        <div className="mt-2">
          <h4 className="text-[12px] font-semibold text-gray-900 uppercase tracking-wider mb-2">Planned Analysis Steps</h4>
          <div className="flex flex-col gap-2">
            {plan.steps.map((step, idx) => (
              <div key={step.id} className="flex items-start gap-3 p-2 bg-gray-50 border border-gray-100 rounded-md">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 mt-0.5">
                  {idx + 1}
                </div>
                <div>
                  <div className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
                    {step.type.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-[12px] text-gray-500">{step.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
        <div className="text-[12px] text-gray-500">
          {plan.status === 'blocked' ? "This plan cannot be executed until blocking issues are resolved." :
           plan.status === 'draft' ? "This is a draft plan. Review warnings before preparing." :
           "Ready to prepare analysis."}
        </div>
        <button
          onClick={onPrepare}
          disabled={plan.status === 'blocked'}
          className={`px-4 py-2 text-[13px] font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 ${
            plan.status === 'blocked' 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          <Play className="w-4 h-4" />
          Preview plan
        </button>
      </div>
    </div>
  );
}
