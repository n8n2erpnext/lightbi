import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, Database, GitMerge, Settings } from 'lucide-react';
import type { SandboxExecutionRequest, SandboxEvaluationResult } from '../../lib/runtime-sandbox-policy';
import { summarizeSandboxEvaluation } from '../../lib/runtime-sandbox-policy';

export interface SandboxPolicyPreviewProps {
  request: SandboxExecutionRequest;
  evaluation: SandboxEvaluationResult;
  onClose: () => void;
  onContinue: () => void;
}

export const SandboxPolicyPreview: React.FC<SandboxPolicyPreviewProps> = ({ request, evaluation, onClose, onContinue }) => {
  const { decision, reasons, warnings, canExecute } = evaluation;

  return (
    <div className="w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-300">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          {decision === 'allow' ? (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          ) : decision === 'warn' ? (
            <Shield className="w-5 h-5 text-amber-400" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-red-400" />
          )}
          <h3 className="text-[15px] font-semibold text-white">Sandbox Validation Policy</h3>
          
          <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wider flex items-center gap-1
            ${decision === 'allow' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 
              decision === 'warn' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 
              'bg-red-500/20 text-red-400 border-red-500/30'}`}
          >
            {decision}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6">
        <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
          <p className="text-[13px] text-slate-300">{summarizeSandboxEvaluation(evaluation)}</p>
          <p className="text-[11px] text-slate-500 mt-2 italic">
            "No data has been executed. Sandbox validation only."
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
             <div className="flex items-center justify-between text-slate-400 mb-2">
               <div className="flex items-center gap-2">
                 <Database className="w-4 h-4 text-indigo-400" />
                 <span className="text-[12px] font-semibold uppercase tracking-wider">Datasets</span>
               </div>
               <span className={`text-[12px] font-mono ${request.datasetCount > request.policy.maxDatasets ? 'text-amber-400' : 'text-slate-300'}`}>
                 {request.datasetCount} / {request.policy.maxDatasets}
               </span>
             </div>
             <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className={`h-1.5 rounded-full ${request.datasetCount > request.policy.maxDatasets ? 'bg-amber-400' : 'bg-indigo-400'}`} style={{ width: `${Math.min(100, (request.datasetCount / request.policy.maxDatasets) * 100)}%` }}></div>
             </div>
          </div>
          
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
             <div className="flex items-center justify-between text-slate-400 mb-2">
               <div className="flex items-center gap-2">
                 <GitMerge className="w-4 h-4 text-fuchsia-400" />
                 <span className="text-[12px] font-semibold uppercase tracking-wider">Relationships</span>
               </div>
               <span className={`text-[12px] font-mono ${request.relationshipCount > request.policy.maxRelationships ? 'text-amber-400' : 'text-slate-300'}`}>
                 {request.relationshipCount} / {request.policy.maxRelationships}
               </span>
             </div>
             <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div className={`h-1.5 rounded-full ${request.relationshipCount > request.policy.maxRelationships ? 'bg-amber-400' : 'bg-fuchsia-400'}`} style={{ width: `${Math.min(100, (request.relationshipCount / request.policy.maxRelationships) * 100)}%` }}></div>
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-400 mb-1">
             <Settings className="w-4 h-4" />
             <span className="text-[12px] font-semibold uppercase tracking-wider">Policy Limits</span>
          </div>
          <div className="flex flex-wrap gap-2">
             <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300">Max Execution: {request.policy.maxExecutionMs}ms</span>
             <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300">Max Memory: {request.policy.maxMemoryMB}MB</span>
             <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-300">Max Preview Rows: {request.policy.maxRowsPreview}</span>
          </div>
        </div>

        {reasons.length > 0 && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200">
            <div className="flex items-center gap-2 font-semibold text-[13px] mb-2">
              <ShieldAlert className="w-4 h-4" /> Block Reasons
            </div>
            <ul className="list-disc list-inside text-[12px] space-y-1 ml-1 opacity-80">
              {reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <div className="flex items-center gap-2 font-semibold text-[13px] mb-2">
              <Shield className="w-4 h-4" /> Policy Warnings
            </div>
            <ul className="list-disc list-inside text-[12px] space-y-1 ml-1 opacity-80">
              {warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-[13px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg shadow-sm transition-colors border border-slate-700"
        >
          Cancel
        </button>
        {canExecute && (
          <button
            onClick={onContinue}
            className="px-4 py-2 text-[13px] font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
          >
            Acknowledge & Continue
          </button>
        )}
      </div>
    </div>
  );
};
