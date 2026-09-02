import React from 'react';
import { CheckCircle2, Download, RefreshCw, X } from 'lucide-react';
import { useUpdateStore } from '../../stores/update-store';
import { useSmoothedUpdateProgress } from '../../hooks/useSmoothedUpdateProgress';

export const UpdateStatusBar: React.FC = () => {
  const updater = useUpdateStore();
  const progress = useSmoothedUpdateProgress(
    updater.progress,
    updater.status === 'verifying' || updater.status === 'ready',
  );
  const progressLabel = Math.floor(progress);
  const version = updater.manifest?.version ?? null;
  const hidden = Boolean(version && updater.dismissedVersion === version);
  const visible = ['available','downloading','verifying','ready','failed'].includes(updater.status) && !hidden;
  if (!visible) return null;
  const ready = updater.status === 'ready';
  const failed = updater.status === 'failed';
  return <section data-testid="global-update-status" className={`shrink-0 border-b px-4 py-2.5 ${failed?'border-red-200 bg-red-50':ready?'border-emerald-200 bg-emerald-50':'border-blue-200 bg-blue-50'}`}>
    <div className="mx-auto flex max-w-[1440px] items-center gap-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${failed?'bg-red-100 text-red-700':ready?'bg-emerald-100 text-emerald-700':'bg-blue-100 text-blue-700'}`}>
        {failed?<RefreshCw className="h-4 w-4"/>:ready?<CheckCircle2 className="h-4 w-4"/>:<Download className="h-4 w-4"/>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-800">
          <span>{failed?'Update download failed':ready?(updater.qaSimulation?'Update UX test ready':`LightBI ${version} is ready to install`):updater.status==='verifying'?'Checking downloaded update integrity…':`Downloading LightBI ${version} in the background`}</span>
          {!failed && <span data-testid="global-update-percent" className="tabular-nums text-slate-500">{progressLabel}%</span>}
        </div>
        {!failed && <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5"><div className={`h-full rounded-full transition-[width] duration-300 ${ready?'bg-emerald-600':'bg-blue-600'}`} style={{width:`${progress}%`}}/></div>}
        {failed && <div className="mt-0.5 truncate text-xs text-red-700">{updater.error}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {ready && !updater.qaSimulation && <button type="button" onClick={()=>void updater.install()} className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">Update & Restart</button>}
        {failed && <button type="button" onClick={()=>void (updater.manifest&&updater.artifact?updater.prepare():updater.check(true))} className="rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white">Retry</button>}
        <button type="button" onClick={updater.dismiss} className="rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600" title="Keep working and hide this update bar">{ready?'Later':'Hide'}</button>
        <button type="button" onClick={updater.dismiss} className="rounded-md p-1 text-slate-400 hover:bg-white/80" aria-label="Dismiss update bar"><X className="h-4 w-4"/></button>
      </div>
    </div>
  </section>;
};
