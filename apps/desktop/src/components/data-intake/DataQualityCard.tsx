import React from 'react';
import { Activity, AlertTriangle, ShieldCheck, FileDigit, Link, Layers } from 'lucide-react';
import type { DatasetHealthResult } from '../../lib/dataset-health-engine';

export interface DataQualityCardProps {
  health: DatasetHealthResult;
}

export const DataQualityCard: React.FC<DataQualityCardProps> = ({ health }) => {
  const getColorBand = (score: number) => {
    if (score >= 85) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 60) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-700 rounded-xl shadow-lg overflow-hidden flex flex-col text-slate-300">
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h3 className="text-[15px] font-semibold text-white">Data Quality</h3>
        </div>
        <div className={`px-3 py-1 rounded-full border text-[13px] font-bold ${getColorBand(health.overall)} flex items-center gap-2`}>
           <ShieldCheck className="w-4 h-4" />
           {health.overall} / 100
        </div>
      </div>

      <div className="p-5 flex flex-col gap-6">
        <p className="text-[13px] text-slate-400">
          Data Quality evaluates the technical quality of the imported data. It does not measure whether a business conclusion is trustworthy.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center justify-center">
             <Layers className="w-5 h-5 text-blue-400 mb-2 opacity-80" />
             <div className="text-[18px] font-bold text-white">{health.completeness}</div>
             <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Completeness</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center justify-center">
             <FileDigit className="w-5 h-5 text-teal-400 mb-2 opacity-80" />
             <div className="text-[18px] font-bold text-white">{health.consistency}</div>
             <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Consistency</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center justify-center">
             <Activity className="w-5 h-5 text-fuchsia-400 mb-2 opacity-80" />
             <div className="text-[18px] font-bold text-white">{health.uniqueness}</div>
             <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Uniqueness</div>
          </div>
          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col items-center justify-center">
             <Link className="w-5 h-5 text-amber-400 mb-2 opacity-80" />
             <div className="text-[18px] font-bold text-white">{health.keyQuality}</div>
             <div className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Key Quality</div>
          </div>
        </div>

        {health.warnings.length > 0 && (
           <div className="flex flex-col gap-2">
             <h4 className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider">Warnings</h4>
             {health.warnings.map((w, idx) => (
                <div key={idx} className={`p-3 rounded-lg border flex items-start gap-3 ${
                   w.severity === 'high' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                }`}>
                   <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                   <div className="text-[13px] leading-tight font-medium">
                      {w.message}
                   </div>
                </div>
             ))}
           </div>
        )}
      </div>
    </div>
  );
};
