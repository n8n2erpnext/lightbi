import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Cloud, LockKeyhole, Monitor, Network, ShieldCheck } from 'lucide-react';
import { getApiBaseUrl } from '../../lib/api-base';
import { isNativeLightBI } from '../../lib/native-runtime';
import { lightBIDistributionApiBase } from '../../lib/lightbi-routing';
import { useUiLanguage } from '../../lib/ui-language';

type ConnectionState = 'checking' | 'online' | 'unavailable';

export const ConnectionSettingsPanel: React.FC<{ accountConnectionState: ConnectionState }> = ({ accountConnectionState }) => {
  const { t } = useUiLanguage();
  const localTarget = useMemo(() => getApiBaseUrl(), []);
  const controlPlaneTarget = useMemo(() => lightBIDistributionApiBase(), []);
  const [localHealth, setLocalHealth] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    let disposed = false;
    void fetch(`${localTarget}/api/health`).then((response) => { if (!disposed) setLocalHealth(response.ok ? 'online' : 'offline'); }).catch(() => { if (!disposed) setLocalHealth('offline'); });
    return () => { disposed = true; };
  }, [localTarget]);

  const localStatus = localHealth === 'checking' ? t('Checking…') : localHealth === 'online' ? t('Online') : t('Offline');
  const remoteStatus = accountConnectionState === 'checking' ? t('Checking…') : accountConnectionState === 'online' ? t('Online') : t('Unavailable');

  return <div className="space-y-4">
    <div>
      <h2 className="text-lg font-medium text-slate-900">{t('Connection')}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{t('See how LightBI connects locally and to account services. Team and Workspace connection controls can live here after v1.')}</p>
    </div>

    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3"><Monitor className="mt-0.5 h-5 w-5 text-emerald-600"/><div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{t('Local app API')}</div><div className="mt-1 text-sm text-slate-500">{t('Embedded LightBI runtime used by local analysis and connectors.')}</div></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${localHealth === 'online' ? 'bg-emerald-50 text-emerald-700' : localHealth === 'checking' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{localStatus}</span></div>
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 break-all">{localTarget}</div>
        <p className="mt-2 text-xs leading-5 text-slate-500">{isNativeLightBI() ? t('On Windows Desktop this is an embedded Tauri endpoint. The http://lightbi.localhost address stays on this device and is not remote plain-HTTP traffic.') : t('In the web QA harness this endpoint follows the current web origin.')}</p>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3"><Cloud className="mt-0.5 h-5 w-5 text-blue-600"/><div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{t('LightBI account and control plane')}</div><div className="mt-1 text-sm text-slate-500">{t('Account, entitlement, update and distribution services.')}</div></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${accountConnectionState === 'online' ? 'bg-emerald-50 text-emerald-700' : accountConnectionState === 'checking' ? 'bg-slate-100 text-slate-600' : 'bg-amber-50 text-amber-700'}`}>{remoteStatus}</span></div>
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 break-all">{controlPlaneTarget}</div>
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"/><p className="text-xs leading-5 text-emerald-900">{t('Remote service traffic uses HTTPS. Protected native account requests also require device-bound Signed Transport with replay protection and response correlation.')}</p></div>
      </div>
    </div>

    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start gap-3"><Network className="mt-0.5 h-5 w-5 text-violet-600"/><div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{t('Connection mode')}</div><p className="mt-1 text-sm text-slate-500">{t('LightBI 1.0 does not expose a remote plain-HTTP mode. Standard secure transport is the current authority.')}</p></div></div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/50 p-3"><CheckCircle2 className="mt-0.5 h-4 w-4 text-blue-700"/><div><div className="text-sm font-semibold text-slate-900">{t('Standard secure connection')}</div><div className="mt-1 text-xs leading-5 text-slate-500">{t('HTTPS + LightBI application authentication; Signed Transport is required for protected native account traffic.')}</div></div></div>
        <div className="flex items-start gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 opacity-75"><LockKeyhole className="mt-0.5 h-4 w-4 text-slate-500"/><div><div className="text-sm font-semibold text-slate-700">{t('Private Team / Workspace transport')}</div><div className="mt-1 text-xs leading-5 text-slate-500">{t('Planned after v1. The implementation may use WireGuard, QUIC, MASQUE, mTLS or another suitable private transport; it will remain additive to HTTPS and LightBI authorization.')}</div></div></div>
      </div>
    </div>
  </div>;
};
