import React from 'react';
import { Target, CheckCircle2, AlertTriangle, Layers, Type, Compass, Activity } from 'lucide-react';
import type { ExpectedResultContract } from '../../lib/expected-result-contract';
import { summarizeExpectedResultContract, validateExpectedResultContract } from '../../lib/expected-result-contract';

export interface ExpectedResultPreviewProps {
  contract: ExpectedResultContract;
  questionText: string;
  onClose: () => void;
}

export const ExpectedResultPreview: React.FC<ExpectedResultPreviewProps> = ({ contract, questionText, onClose }) => {
  const validation = validateExpectedResultContract(contract);
  
  return (
    <div className="w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-300">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-indigo-400" />
          <h3 className="text-[15px] font-semibold text-white">Expected Result Contract</h3>
          
          {validation.valid ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Valid
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Incomplete
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6">
        <div className="bg-slate-800/50 p-4 rounded-lg border border-indigo-500/20">
          <p className="text-[12px] font-medium text-indigo-300 mb-1">Target Question</p>
          <p className="text-[14px] text-white font-semibold">{questionText}</p>
        </div>

        <div className="bg-slate-800/30 p-4 rounded-lg border border-slate-700/50">
          <p className="text-[13px] text-slate-300">{summarizeExpectedResultContract(contract)}</p>
          <p className="text-[11px] text-slate-500 mt-2 italic">
            "LightBI is defining what a successful answer should look like before any query is compiled."
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-3">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span className="text-[12px] font-semibold uppercase tracking-wider">Dimensions</span>
            </div>
            {contract.dimensions.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contract.dimensions.map(d => (
                  <span key={d.id} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[12px] text-slate-300">
                    {d.label}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[12px] text-slate-600 italic">None defined</span>
            )}
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 mb-3">
              <Type className="w-4 h-4 text-cyan-400" />
              <span className="text-[12px] font-semibold uppercase tracking-wider">Measures</span>
            </div>
            {contract.measures.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {contract.measures.map(m => (
                  <span key={m.id} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[12px] text-slate-300">
                    {m.label}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[12px] text-slate-600 italic">None defined</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded border border-slate-700/50">
            <Compass className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Expected Shape</p>
              <p className="text-[13px] font-medium text-slate-300 capitalize">{contract.shape}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded border border-slate-700/50">
            <Activity className="w-4 h-4 text-blue-400" />
            <div>
              <p className="text-[10px] text-slate-500 uppercase font-semibold">Output Type</p>
              <p className="text-[13px] font-medium text-slate-300 capitalize">{contract.outputType}</p>
            </div>
          </div>
        </div>

        {!validation.valid && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200">
            <div className="flex items-center gap-2 font-semibold text-[13px] mb-2">
              <AlertTriangle className="w-4 h-4" /> Contract Warnings
            </div>
            <ul className="list-disc list-inside text-[12px] space-y-1 ml-1 opacity-80">
              {validation.warnings.map((w, i) => (
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
          Close Preview
        </button>
      </div>
    </div>
  );
};
