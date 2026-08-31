import { getOrCreateInstallationId, lightBIDistributionEndpoint, setCurrentLicenseTier } from './distribution-pairing';
import { isNativeLightBI } from './native-runtime';

export type LightBIAccountSummary = {
  authenticated: true;
  account: { id: string; email: string; display_name?: string | null; avatar_url?: string | null; provider: string; created_at: string };
  entitlement: { id?: string; tier: 'basic' | 'pro'; status: string; max_devices: number; expires_at?: string | null };
  devices: Array<{ id: string; display_name?: string | null; platform?: string | null; app_version?: string | null; status: string; created_at: string; last_seen_at: string; revoked_at?: string | null }>;
};

const version = () => import.meta.env.VITE_LIGHTBI_VERSION ?? '0.9.2-beta.7';
const platform = () => navigator.platform || 'unknown';
const ENTITLEMENT_CHECK_KEY = 'lightbi-account-entitlement-checked-at';
const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

async function nativeToken(): Promise<string | null> {
  if (!isNativeLightBI()) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string | null>('account_session_token');
}

async function storeNativeToken(token: string | null): Promise<void> {
  if (!isNativeLightBI()) return;
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('store_account_session_token', { token });
}

async function accountFetch(path: string, options: RequestInit = {}, endpoint?: string) {
  const token = await nativeToken();
  const headers = new Headers(options.headers);
  if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);
  return fetch(`${lightBIDistributionEndpoint(endpoint)}${path}`, {
    ...options,
    headers,
    credentials: isNativeLightBI() ? 'omit' : 'include',
  });
}

async function accountResult(response: Response, fallback: string) {
  const result = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : fallback);
  return result;
}

export async function loadLightBIAccount(endpoint?: string): Promise<LightBIAccountSummary | null> {
  try {
    const response = await accountFetch('/api/account/session', {}, endpoint);
    if (!response.ok) { setCurrentLicenseTier('basic'); localStorage.removeItem(ENTITLEMENT_CHECK_KEY); return null; }
    const result = await response.json() as LightBIAccountSummary;
    setCurrentLicenseTier(result.entitlement?.tier === 'pro' ? 'pro' : 'basic');
    localStorage.setItem(ENTITLEMENT_CHECK_KEY, String(Date.now()));
    return result;
  } catch (error) {
    const checkedAt = Number(localStorage.getItem(ENTITLEMENT_CHECK_KEY) || 0);
    if (!checkedAt || Date.now() - checkedAt > OFFLINE_GRACE_MS) setCurrentLicenseTier('basic');
    throw error;
  }
}

export async function beginLightBIGoogleLogin(endpoint?: string): Promise<LightBIAccountSummary | null> {
  const base = lightBIDistributionEndpoint(endpoint);
  if (!isNativeLightBI()) {
    window.location.href = `${base}/api/auth/google/start?return_to=${encodeURIComponent('/app/settings')}`;
    return null;
  }
  const installationId = getOrCreateInstallationId();
  const response = await fetch(`${base}/api/account/device-login/start`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ installationId, deviceName: `LightBI on ${platform()}`, platform: platform(), appVersion: version() }) });
  if (!response.ok) throw new Error('Could not start Google sign-in.');
  const started = await response.json() as { loginId: string; authorizationUrl: string; expiresIn: number };
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  await openUrl(started.authorizationUrl);
  const deadline = Date.now() + Math.min(600, started.expiresIn || 600) * 1000;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const statusResponse = await fetch(`${base}/api/account/device-login/status`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ loginId: started.loginId, installationId }) });
    if (!statusResponse.ok) continue;
    const status = await statusResponse.json() as { status: string; token?: string };
    if (status.status === 'pending') continue;
    if (status.status !== 'complete' || !status.token) throw new Error('Google sign-in expired or was denied.');
    await storeNativeToken(status.token);
    const account = await loadLightBIAccount(endpoint);
    window.dispatchEvent(new CustomEvent('lightbi-account-changed'));
    return account;
  }
  throw new Error('Google sign-in timed out.');
}

export async function registerLightBIEmailAccount(input: { email: string; password: string; displayName?: string }, endpoint?: string): Promise<void> {
  const response = await accountFetch('/api/account/register', { method: 'POST', body: JSON.stringify(input) }, endpoint);
  await accountResult(response, 'Registration could not be completed.');
}

export async function loginLightBIEmailAccount(email: string, password: string, endpoint?: string): Promise<LightBIAccountSummary | null> {
  const native = isNativeLightBI();
  const response = await accountFetch('/api/account/login', { method: 'POST', body: JSON.stringify({
    email, password,
    ...(native ? { installationId: getOrCreateInstallationId(), deviceName: `LightBI on ${platform()}`, platform: platform(), appVersion: version() } : {}),
  }) }, endpoint);
  const result = await accountResult(response, 'Email or password is incorrect.') as { token?: string };
  if (native) {
    if (!result.token) throw new Error('The account session could not be created.');
    await storeNativeToken(result.token);
  }
  const account = await loadLightBIAccount(endpoint);
  window.dispatchEvent(new CustomEvent('lightbi-account-changed'));
  return account;
}

export async function requestLightBIPasswordReset(email: string, endpoint?: string): Promise<void> {
  const response = await accountFetch('/api/account/password/request', { method: 'POST', body: JSON.stringify({ email }) }, endpoint);
  await accountResult(response, 'Password reset email could not be sent.');
}

export async function redeemLightBIAccountLicense(licenseKey: string, endpoint?: string): Promise<LightBIAccountSummary> {
  const response = await accountFetch('/api/account/redeem', { method: 'POST', body: JSON.stringify({ licenseKey: licenseKey.trim(), installationId: getOrCreateInstallationId(), deviceName: `LightBI on ${platform()}`, platform: platform(), appVersion: version() }) }, endpoint);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || 'License key could not be redeemed.');
  setCurrentLicenseTier(result.entitlement?.tier === 'pro' ? 'pro' : 'basic');
  window.dispatchEvent(new CustomEvent('lightbi-account-changed'));
  return result;
}

export async function revokeLightBIDevice(deviceId: string, endpoint?: string): Promise<void> {
  const response = await accountFetch(`/api/account/devices/${encodeURIComponent(deviceId)}/revoke`, { method: 'POST' }, endpoint);
  if (!response.ok) throw new Error('Device could not be revoked.');
  window.dispatchEvent(new CustomEvent('lightbi-account-changed'));
}

export async function logoutLightBIAccount(endpoint?: string): Promise<void> {
  await accountFetch('/api/account/logout', { method: 'POST' }, endpoint).catch(() => null);
  await storeNativeToken(null);
  setCurrentLicenseTier('basic');
  localStorage.removeItem(ENTITLEMENT_CHECK_KEY);
  window.dispatchEvent(new CustomEvent('lightbi-account-changed'));
}
