import React from 'react';
import { CheckCircle2, ChevronRight, Download, RefreshCw, ShieldCheck } from 'lucide-react';
import { useUpdateStore } from '../../stores/update-store';
import { buildGenerationManifest } from '../../lib/generation-manifest';
import { useSmoothedUpdateProgress } from '../../hooks/useSmoothedUpdateProgress';

const friendlyFailure = (detail: string) => {
  if (/HTTP\s+\d+/i.test(detail) || /unavailable/i.test(detail)) return "LightBI couldn't reach the update service. Your current version keeps working.";
  if (/checksum|sha-?256|integrity/i.test(detail)) return 'The downloaded update did not pass its integrity check. LightBI will not install it.';
  return 'LightBI could not prepare this update. Your current version keeps working.';
};

export const UpdateSettingsPanel: React.FC = () => {
  const updater = useUpdateStore();
  const progress = useSmoothedUpdateProgress(updater.progress, updater.status === 'verifying' || updater.status === 'ready');
  const progressLabel = Math.floor(progress);
  const internal = buildGenerationManifest().channel === 'internal';
  const busy = ['checking', 'downloading', 'verifying', 'installing'].includes(updater.status);
  const linux = updater.artifact?.kind === 'deb';

  const statusLabel = updater.status === 'ready'
    ? `Version ${updater.manifest?.version} is ready to install`
    : updater.status === 'available'
      ? `Version ${updater.manifest?.version} is available`
      : updater.status === 'downloading'
        ? `Downloading the update artifact · ${progressLabel}%`
        : updater.status === 'verifying'
          ? 'Checking downloaded update integrity…'
          : updater.status === 'checking'
            ? 'Checking for updates…'
            : updater.status === 'installing'
              ? 'Waiting for operating-system permission…'
              : updater.status === 'failed'
                ? friendlyFailure(updater.error)
                : 'LightBI is up to date.';
  return <div className="p-6">
    <div className="mb-5 flex items-center gap-3">
      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white"><RefreshCw className="h-5 w-5" /></div>
      <div><h2 className="text-lg font-semibold text-slate-900">LightBI Desktop</h2><p className="text-sm text-slate-500">Updates install only when you choose to apply them.</p></div>
    </div>

    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ShieldCheck className="h-4 w-4 text-emerald-600" />Update status</div>
          <p className={`mt-1 text-sm leading-6 ${updater.status === 'failed' ? 'text-amber-700' : 'text-slate-500'}`}>{statusLabel}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {updater.status === 'available' && !updater.autoDownload && <button type="button" onClick={() => void updater.prepare()} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"><Download className="h-4 w-4" />Download</button>}
          {updater.status === 'ready' && !updater.qaSimulation && <button type="button" onClick={() => void updater.install()} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white">{linux ? 'Open .deb installer' : 'Update & Restart'}</button>}
          <button type="button" disabled={busy} onClick={() => void updater.check(true)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">Check now</button>
        </div>
      </div>

      {(updater.status === 'downloading' || updater.status === 'verifying') && <div className="border-b border-slate-100 px-5 py-4"><div className="h-2 overflow-hidden rounded-full bg-blue-100"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${updater.status === 'verifying' ? 100 : Math.max(progress, 4)}%` }} /></div></div>}
      <label className="flex cursor-pointer items-center justify-between gap-5 border-b border-slate-100 p-5">
        <span><span className="block text-sm font-semibold text-slate-900">Automatically download updates</span><span className="mt-1 block text-sm text-slate-500">LightBI may download and integrity-check an update in the background. Installation still requires your action.</span></span>
        <input type="checkbox" checked={updater.autoDownload} onChange={(event) => updater.setAutoDownload(event.target.checked)} className="h-5 w-5 shrink-0 accent-blue-600" />
      </label>

      <div className="flex items-center justify-between gap-4 p-5">
        <span><span className="block text-sm font-semibold text-slate-900">Current release</span><span className="mt-1 block text-sm text-slate-500">{updater.manifest?.version ? `Latest checked: ${updater.manifest.version}` : 'Public Beta channel'}</span></span>
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      </div>
    </div>

    {internal && <button type="button" disabled={busy} onClick={() => void updater.simulateForQa()} className="mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-semibold text-violet-700 disabled:opacity-50">Test update progress</button>}

    <details className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-500">
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-slate-700">Technical details <ChevronRight className="h-4 w-4" /></summary>
      <div className="mt-3 space-y-2 text-xs leading-5"><p>SHA-256 protects download/staging integrity only. Official LightBI identity additionally requires the independent REL/ATT evidence and applicable OS publisher identity.</p>{updater.error && <code className="block overflow-x-auto rounded-lg bg-white p-3 text-[11px] text-slate-600">{updater.error}</code>}</div>
    </details>
  </div>;
};
