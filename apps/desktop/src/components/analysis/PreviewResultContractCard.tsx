import React from 'react';
import { Table, Columns, Target, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { PreviewResultContract } from '../../lib/preview-result-contract';
import { summarizePreviewResultContract, validatePreviewResultContract } from '../../lib/preview-result-contract';
import type { ExpectedResultContract } from '../../lib/expected-result-contract';

export interface PreviewResultContractCardProps {
  contract: PreviewResultContract;
  expectedResult: ExpectedResultContract;
  onClose: () => void;
  onContinue: () => void;
}

export const PreviewResultContractCard: React.FC<PreviewResultContractCardProps> = ({ 
  contract, 
  expectedResult, 
  onClose,
  onContinue
}) => {
  const isBlocked = contract.status === 'blocked';
  const validation = validatePreviewResultContract(contract, expectedResult);

  const dimensions = contract.columns.filter(c => c.role === 'dimension');
  const measures = contract.columns.filter(c => c.role === 'measure');

  return (
    <div className="w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-300">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <Table className="w-5 h-5 text-indigo-400" />
          <h3 className="text-[15px] font-semibold text-white">Expected Result Structure</h3>
          
          {contract.status === 'ready' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ready
            </span>
          )}
          {contract.status === 'warning' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Warning
            </span>
          )}
          {isBlocked && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3" /> Blocked
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6">
        <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
          <p className="text-[13px] text-slate-300">{summarizePreviewResultContract(contract)}</p>
          <p className="text-[11px] text-slate-500 mt-2 italic">
            "This is the expected result structure before runtime execution."
          </p>
        </div>

        {!validation.valid && (
           <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-200">
             <div className="flex items-center gap-2 font-semibold text-[13px] mb-2">
               <ShieldAlert className="w-4 h-4" /> Validation Errors
             </div>
             <ul className="list-disc list-inside text-[12px] space-y-1 ml-1 opacity-80">
               {validation.errors.map((e, i) => (
                 <li key={i}>{e}</li>
               ))}
             </ul>
           </div>
        )}

        {contract.warnings.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <div className="flex items-center gap-2 font-semibold text-[13px] mb-2">
              <AlertTriangle className="w-4 h-4" /> Contract Warnings
            </div>
            <ul className="list-disc list-inside text-[12px] space-y-1 ml-1 opacity-80">
              {contract.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {!isBlocked && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-3">
                <Columns className="w-4 h-4 text-blue-400" />
                <span className="text-[12px] font-semibold uppercase tracking-wider">Dimensions</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {dimensions.length === 0 ? (
                  <span className="text-[12px] text-slate-600 italic">No dimensions expected</span>
                ) : (
                  dimensions.map(d => (
                    <span key={d.id} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[12px] font-mono text-slate-300">
                      {d.label}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2 text-slate-400 mb-3">
                <Target className="w-4 h-4 text-rose-400" />
                <span className="text-[12px] font-semibold uppercase tracking-wider">Measures</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {measures.length === 0 ? (
                  <span className="text-[12px] text-slate-600 italic">No measures expected</span>
                ) : (
                  measures.map(m => (
                    <span key={m.id} className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-[12px] font-mono text-slate-300">
                      {m.label}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {!isBlocked && (
           <div className="bg-slate-950 p-8 rounded-lg border border-slate-800 border-dashed flex items-center justify-center">
              <span className="text-[13px] text-slate-500 font-medium">No rows yet. Runtime has not executed.</span>
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
        {!isBlocked && validation.valid && (
          <button
             onClick={onContinue}
             className="px-4 py-2 text-[13px] font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
          >
             Execute Query
          </button>
        )}
      </div>
    </div>
  );
};
