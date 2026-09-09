import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Cloud, Monitor, Network, ShieldCheck } from 'lucide-react';
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

  const statusTone = (state: 'checking' | 'online' | 'offline' | 'unavailable') => state === 'online' ? 'text-emerald-700' : state === 'checking' ? 'text-slate-500' : 'text-amber-700';
  return <div className="space-y-6">
    <div>
      <h2 className="text-lg font-medium text-slate-900">{t('Connection')}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{t('See how LightBI connects locally and how remote traffic is protected.')}</p>
    </div>

    <div className="grid border-y border-[var(--lb-divider)] lg:grid-cols-2 lg:divide-x lg:divide-[var(--lb-divider)]">
      <section className="py-5 lg:pr-7">
        <div className="flex items-start gap-3"><Monitor className="mt-0.5 h-5 w-5 text-emerald-600"/><div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{t('Local app API')}</div><div className="mt-1 text-sm text-slate-500">{t('Embedded LightBI runtime used by local analysis and connectors.')}</div></div><span className={`shrink-0 text-xs font-semibold ${statusTone(localHealth)}`}>● {localStatus}</span></div>
        <div className="mt-4 border-l-2 border-slate-200 pl-3 font-mono text-xs text-slate-600 break-all">{localTarget}</div>
        <p className="mt-3 text-xs leading-5 text-slate-500">{isNativeLightBI() ? t('On Windows Desktop this is an embedded Tauri endpoint. The http://lightbi.localhost address stays on this device and is not remote plain-HTTP traffic.') : t('In the web QA harness this endpoint follows the current web origin.')}</p>
      </section>

      <section className="border-t border-[var(--lb-divider)] py-5 lg:border-t-0 lg:pl-7">
        <div className="flex items-start gap-3"><Cloud className="mt-0.5 h-5 w-5 text-blue-600"/><div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{t('LightBI account and control plane')}</div><div className="mt-1 text-sm text-slate-500">{t('Account, entitlement, update and distribution services.')}</div></div><span className={`shrink-0 text-xs font-semibold ${statusTone(accountConnectionState)}`}>● {remoteStatus}</span></div>
        <div className="mt-4 border-l-2 border-slate-200 pl-3 font-mono text-xs text-slate-600 break-all">{controlPlaneTarget}</div>
        <div className="mt-4 flex items-start gap-2 border-l-2 border-emerald-300 pl-3"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"/><p className="text-xs leading-5 text-emerald-900">{t('Remote service traffic uses HTTPS. Protected native account requests also require device-bound Signed Transport with replay protection and response correlation.')}</p></div>
      </section>
    </div>

    <section>
      <div className="flex items-start gap-3"><Network className="mt-0.5 h-5 w-5 text-violet-600"/><div className="min-w-0 flex-1"><div className="font-semibold text-slate-900">{t('Connection security')}</div><p className="mt-1 text-sm text-slate-500">{t('Protected native routes do not expose an HTTPS-only downgrade switch.')}</p></div></div>
      <div className="mt-4 grid border-y border-[var(--lb-divider)] md:grid-cols-2 md:divide-x md:divide-[var(--lb-divider)]">
        <div className="py-4 md:pr-6">
          <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-blue-700"/><div className="text-sm font-semibold text-slate-900">{t('LightBI Secure Connection')}</div><span className="text-[10px] font-semibold text-blue-700">{t('Recommended / Default')}</span></div>
          <p className="mt-2 text-xs leading-5 text-slate-600">{t('HTTPS plus device-bound Signed Transport protects native routes with replay protection and response correlation.')}</p>
        </div>
        <div className="border-t border-[var(--lb-divider)] py-4 md:border-t-0 md:pl-6">
          <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-slate-600"/><div className="text-sm font-semibold text-slate-900">{t('Enterprise network compatibility')}</div></div>
          <p className="mt-2 text-xs leading-5 text-slate-600">{t('Native LightBI uses the system proxy and native certificate roots. Enterprise CA or TLS inspection can work through those OS settings; Signed Transport remains required, and a proxy that changes a signed query or request body is rejected.')}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{t('Private Authenticated Transport is future Team / Workspace scope, not a current selectable mode. It may later add a private data path without replacing LightBI authorization or Signed Transport.')}</p>
    </section>
  </div>;
};
