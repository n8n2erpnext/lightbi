import React from 'react';
import { Database, AlertTriangle, TerminalSquare, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { CompiledQueryContract } from '../../lib/safe-sql-compiler';
import { summarizeCompiledQuery } from '../../lib/safe-sql-compiler';

export interface CompiledQueryPreviewProps {
  contract: CompiledQueryContract;
  onClose: () => void;
}

export const CompiledQueryPreview: React.FC<CompiledQueryPreviewProps> = ({ contract, onClose }) => {
  const isBlocked = contract.status === 'blocked';

  
  return (
    <div className="w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-300">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <TerminalSquare className="w-5 h-5 text-indigo-400" />
          <h3 className="text-[15px] font-semibold text-white">Compiled Query Contract</h3>
          
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
          <p className="text-[13px] text-slate-300">{summarizeCompiledQuery(contract)}</p>
          <p className="text-[11px] text-slate-500 mt-2 italic">
            "Preview only. No query executed."
          </p>
        </div>

        {contract.warnings.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <div className="flex items-center gap-2 font-semibold text-[13px] mb-2">
              <AlertTriangle className="w-4 h-4" /> Compiler Warnings
            </div>
            <ul className="list-disc list-inside text-[12px] space-y-1 ml-1 opacity-80">
              {contract.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {contract.sql && (
          <div>
            <div className="flex items-center gap-2 text-slate-400 mb-3">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-[12px] font-semibold uppercase tracking-wider">Placeholder SQL Preview</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-[12px] text-blue-300 whitespace-pre overflow-x-auto shadow-inner">
              {contract.sql}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-[13px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg shadow-sm transition-colors border border-slate-700"
        >
          Close Preview
        </button>
      </div>
    </div>
  );
};
