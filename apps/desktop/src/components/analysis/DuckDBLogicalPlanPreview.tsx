import React from 'react';
import { Database, Activity, AlertTriangle, ShieldX } from 'lucide-react';
import type { DuckDBLogicalPlan } from '../../lib/duckdb-logical-plan';
import { summarizeDuckDBLogicalPlan } from '../../lib/duckdb-logical-plan';

export interface DuckDBLogicalPlanPreviewProps {
  plan: DuckDBLogicalPlan;
  onClose: () => void;
}

export const DuckDBLogicalPlanPreview: React.FC<DuckDBLogicalPlanPreviewProps> = ({ plan, onClose }) => {
  const isBlocked = plan.status === 'blocked';
  const isDraft = plan.status === 'draft';
  
  return (
    <div className="w-full bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-300">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <Database className="w-5 h-5 text-blue-400" />
          <h3 className="text-[15px] font-semibold text-white">DuckDB Logical Plan</h3>
          
          {!isBlocked && !isDraft && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Ready
            </span>
          )}
          {isDraft && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Draft
            </span>
          )}
          {isBlocked && (
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-500/20 text-red-400 border border-red-500/30">
              Blocked
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6">
        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
          <p className="text-[13px] text-slate-300">{summarizeDuckDBLogicalPlan(plan)}</p>
        </div>

        {plan.warnings.length > 0 && (
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2 text-amber-200">
            <div className="flex items-center gap-2 font-semibold text-[13px]">
              {isBlocked ? <ShieldX className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {isBlocked ? 'Plan Blocked' : 'Plan Warnings'}
            </div>
            <ul className="list-disc list-inside text-[12px] space-y-1 ml-1 opacity-80">
              {plan.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <h4 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider mb-3">Logical Operations</h4>
          <div className="flex flex-col gap-2 font-mono">
            {plan.operations.map((op) => (
              <div key={op.id} className="flex items-start gap-3 p-3 bg-slate-950 border border-slate-800 rounded shadow-sm">
                <div className="flex-shrink-0 pt-0.5">
                  <Activity className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-blue-300 mb-1 flex items-center gap-2">
                    <span className="uppercase text-[11px] tracking-wider text-slate-500">{op.type}</span>
                    <span className="text-slate-400">-</span>
                    <span>{op.description}</span>
                  </div>
                  {op.dependsOn && (
                    <div className="text-[11px] text-slate-600 mt-2">
                      Depends on: {op.dependsOn.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 text-[13px] font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg shadow-sm transition-colors border border-slate-700"
        >
          Close preview
        </button>
      </div>
    </div>
  );
};
