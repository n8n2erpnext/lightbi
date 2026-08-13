import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';
import type { ExecutionGuardResult } from '../../lib/execution-guard';
import { summarizeExecutionGuard } from '../../lib/execution-guard';

export interface ExecutionGuardNoticeProps {
  result: ExecutionGuardResult;
  onReviewPlan?: () => void;
  onContinue?: () => void;
}

export const ExecutionGuardNotice: React.FC<ExecutionGuardNoticeProps> = ({
  result,
  onReviewPlan,
  onContinue
}) => {
  const isBlock = result.decision === 'block';
  const isWarn = result.decision === 'warn';
  const isAllow = result.decision === 'allow';

  const summary = summarizeExecutionGuard(result);

  return (
    <div className={`w-full rounded-xl border p-5 flex flex-col gap-4 shadow-sm ${
      isBlock ? 'bg-red-50 border-red-100' :
      isWarn ? 'bg-amber-50 border-amber-100' :
      'bg-emerald-50 border-emerald-100'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {isBlock && <ShieldAlert className="w-6 h-6 text-red-600 flex-shrink-0" />}
          {isWarn && <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />}
          {isAllow && <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />}
          <div>
            <h3 className={`text-[15px] font-semibold ${
              isBlock ? 'text-red-900' : isWarn ? 'text-amber-900' : 'text-emerald-900'
            }`}>
              Execution Guard: {result.decision.toUpperCase()}
            </h3>
            <p className={`text-[13px] mt-0.5 ${
              isBlock ? 'text-red-700' : isWarn ? 'text-amber-700' : 'text-emerald-700'
            }`}>
              {summary}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 bg-white/60 p-3 rounded-lg border border-white/20">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Guard Reasons</span>
        <ul className="text-[13px] text-gray-800 space-y-1">
          {result.reasons.map((r, idx) => (
            <li key={idx} className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                r.severity === 'error' ? 'bg-red-500' :
                r.severity === 'warning' ? 'bg-amber-500' :
                'bg-emerald-500'
              }`} />
              {r.message}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end mt-2">
        {isBlock && (
          <button
            onClick={onReviewPlan}
            className="px-4 py-2 text-[13px] font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition-colors"
          >
            Review plan
          </button>
        )}
        {(isWarn || isAllow) && (
          <button
            onClick={onContinue}
            className={`px-4 py-2 text-[13px] font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 text-white ${
              isWarn ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {isWarn ? 'Continue with caution' : 'Ready for runtime'}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
