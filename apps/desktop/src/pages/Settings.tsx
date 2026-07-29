import React, { useEffect, useState } from 'react';
import { CheckCircle2, HardDrive, Laptop, ShieldCheck } from 'lucide-react';
import { readNativeRuntime, type NativeLicenseState, type NativeRuntimeConfig } from '../lib/native-runtime';

export const Settings: React.FC = () => {
  const [nativeState, setNativeState] = useState<{
    runtime: NativeRuntimeConfig;
    license: NativeLicenseState;
    backendReady: boolean;
  } | null>(null);

  useEffect(() => {
    void readNativeRuntime().then(setNativeState);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Your LightBI workspace, runtime, and Beta access.</p>
      </div>
      
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-medium text-slate-900">Application</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
              <Laptop className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-slate-800">{nativeState?.runtime.native ? 'Windows native app' : 'Web QA harness'}</div>
                <div className="mt-1 text-sm text-slate-500">LightBI Beta · local-first analysis</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div>
                <div className="font-medium text-emerald-900">{nativeState?.license.edition ?? 'Loading Beta status…'}</div>
                <div className="mt-1 text-sm text-emerald-800/70">No license key or feature restriction during Beta.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-200 p-6">
          <h2 className="mb-4 text-lg font-medium text-slate-900">Appearance</h2>
          <div className="flex items-center justify-between rounded-md border border-slate-200 p-4">
            <div>
              <div className="font-medium text-slate-800">Theme</div>
              <div className="text-sm text-slate-500">Light theme is optimized for the Beta workspace.</div>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">Light</span>
          </div>
        </div>

        <div className="p-6">
          <h2 className="mb-4 text-lg font-medium text-slate-900">Local data boundary</h2>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-md border border-slate-200 p-4">
              <div className="flex items-start gap-3">
                <HardDrive className="mt-0.5 h-5 w-5 text-slate-500" />
                <div>
                  <div className="font-medium text-slate-800">Application data</div>
                  <div className="mt-1 text-sm text-slate-500">
                    Native LightBI stores workspace metadata, vault material, and temporary exports inside the operating system application-data directory.
                  </div>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            </div>
            <div className="flex items-center justify-between rounded-md border border-slate-200 p-4">
              <div>
                <div className="font-medium text-slate-800">Analysis engine</div>
                <div className="text-sm text-slate-500">Private loopback service · not exposed as a hosted web product</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${nativeState?.backendReady === false ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {nativeState?.backendReady === false ? 'Starting' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
