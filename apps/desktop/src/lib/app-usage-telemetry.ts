import { getOrCreateInstallationId, anonymousPairingEnabled } from './distribution-pairing';
import { isNativeLightBI } from './native-runtime';

export type LightBIFeature = 'easy_mode' | 'advanced_mode' | 'advanced_query' | 'advanced_database_edit' | 'deep_ba' | 'subset_analysis' | 'dashboard' | 'chart' | 'export' | 'data_import' | 'database_connect' | 'google_sheets';
export type LightBIUpdateEvent = 'update_available' | 'update_download_started' | 'update_download_success' | 'update_download_failed' | 'update_install_started';
const DEFAULT_DISTRIBUTION_URL = 'https://lightbi.thaiduy.digital/distribution';
const SESSION_KEY = 'lightbi-usage-session-id';
const START_KEY = 'lightbi-usage-session-start';

function sessionId() {
  let value = sessionStorage.getItem(SESSION_KEY);
  if (!value) {
    value = globalThis.crypto?.randomUUID?.() ?? `usage-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, value);
    sessionStorage.setItem(START_KEY, String(Date.now()));
  }
  return value;
}

async function send(event: 'app_open' | 'app_close' | 'feature_use', feature?: LightBIFeature, durationSeconds?: number) {
  if (!isNativeLightBI() || !anonymousPairingEnabled()) return;
  const endpoint = (import.meta.env.VITE_LIGHTBI_DISTRIBUTION_URL ?? DEFAULT_DISTRIBUTION_URL).replace(/\/$/, '');
  await fetch(`${endpoint}/api/app/event`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, keepalive: event === 'app_close',
    body: JSON.stringify({
      event, feature, durationSeconds, installationId: getOrCreateInstallationId(), sessionId: sessionId(),
      appVersion: import.meta.env.VITE_LIGHTBI_VERSION ?? '0.9.2-beta.7', platform: navigator.platform ?? 'unknown', environment: import.meta.env.MODE === 'test' ? 'test' : 'production',
    }),
  }).catch(() => null);
}

export function startAppUsageTelemetry() {
  if (!isNativeLightBI()) return;
  void send('app_open');
  addEventListener('pagehide', () => {
    const started = Number(sessionStorage.getItem(START_KEY)) || Date.now();
    void send('app_close', undefined, Math.max(0, (Date.now() - started) / 1000));
  }, { once: true });
}

export function trackFeatureUsage(feature: LightBIFeature) {
  void send('feature_use', feature);
}

export function trackUpdateEvent(event: LightBIUpdateEvent) {
  if (!isNativeLightBI() || !anonymousPairingEnabled()) return;
  const endpoint = (import.meta.env.VITE_LIGHTBI_DISTRIBUTION_URL ?? DEFAULT_DISTRIBUTION_URL).replace(/\/$/, '');
  void fetch(`${endpoint}/api/app/event`, { method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({event,installationId:getOrCreateInstallationId(),sessionId:sessionId(),appVersion:import.meta.env.VITE_LIGHTBI_VERSION??'0.9.2-beta.7',platform:navigator.platform??'unknown',environment:import.meta.env.MODE==='test'?'test':'production'}) }).catch(()=>null);
}
