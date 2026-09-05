import { getOrCreateInstallationId, lightBIDistributionEndpoint, setCurrentLicenseTier } from './distribution-pairing';
import { invalidateNativeInstallationTrust, isNativeLightBI, requireNativeInstallationTrust } from './native-runtime';
import { externalFetch, openExternalUrl } from './native-capabilities';
import { lightBIFrontendUrl } from './lightbi-routing';

export type LightBIAccountSummary = {
  authenticated: true;
  account: { id: string; email: string; display_name?: string | null; avatar_url?: string | null; provider: string; created_at: string };
  entitlement: { id?: string; tier: 'basic' | 'pro'; status: string; max_devices: number; expires_at?: string | null };
  devices: Array<{ id: string; display_name?: string | null; platform?: string | null; app_version?: string | null; status: string; created_at: string; last_seen_at: string; revoked_at?: string | null }>;
};

export type LightBIAccountMfaChallenge = {
  challengeId: string;
  methods: Array<'totp' | 'recovery'>;
  expiresIn: number;
  nativeLoginId?: string;
};

export type LightBIEmailLoginResult =
  | { status: 'authenticated'; account: LightBIAccountSummary | null }
  | ({ status: 'mfa_required' } & LightBIAccountMfaChallenge)
  | { status: 'passkey_required'; challengeId: string; fallbackTotp: boolean; expiresIn: number; nativeLoginId?: string };

const version = () => import.meta.env.VITE_LIGHTBI_VERSION ?? '0.9.2-beta.7';
const platform = () => navigator.platform || 'unknown';
const ENTITLEMENT_CHECK_KEY = 'lightbi-account-entitlement-checked-at';
const OFFLINE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
const accountLoadInFlight = new Map<string, Promise<LightBIAccountSummary | null>>();

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

function accountFailureMessage(cause: unknown): string {
  if (cause instanceof Error && cause.message.trim()) return cause.message.trim();
  if (typeof cause === 'string' && cause.trim()) return cause.trim();
  return 'Unknown account transport error.';
}

function recoverableLocalTrustFailure(cause: unknown): boolean {
  const message = accountFailureMessage(cause).toLowerCase();
  return message.includes('installation certificate device-key binding mismatch')
    || message.includes('installation certificate is not available yet')
    || message.includes('stored installation certificate is invalid')
    || message.includes('stored installation certificate authority is invalid')
    || message.includes('stored installation certificate identity is invalid')
    || message.includes('stored installation certificate envelope is invalid');
}

function normalizedAccountFailure(cause: unknown): Error {
  const message = accountFailureMessage(cause);
  if (message.startsWith('LightBI secure account connection is not ready.') || message.startsWith('LightBI account service is unreachable.')) {
    return cause instanceof Error ? cause : new Error(message);
  }
  const lower = message.toLowerCase();
  if (lower.includes('installation trust') || lower.includes('installation certificate') || lower.includes('signed transport')) {
    return new Error(`LightBI secure account connection is not ready. ${message}`);
  }
  if (/(timed out|timeout|connect|connection|dns|tls|network|failed to fetch|unreachable|proxy|firewall)/i.test(message)) {
    return new Error(`LightBI account service is unreachable. Local analysis remains available. Check internet, DNS, firewall, proxy or VPN access, then retry. ${message}`);
  }
  return cause instanceof Error ? cause : new Error(message);
}

async function accountFetch(path: string, options: RequestInit = {}, endpoint?: string) {
  const native = isNativeLightBI();
  const installationId = native ? getOrCreateInstallationId() : null;
  const send = async () => {
    const token = await nativeToken();
    const headers = new Headers(options.headers);
    if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    if (token) headers.set('authorization', `Bearer ${token}`);
    return externalFetch(`${lightBIDistributionEndpoint(endpoint)}${path}`, {
      ...options,
      headers,
      credentials: native ? 'omit' : 'include',
    });
  };

  try {
    if (installationId) await requireNativeInstallationTrust(installationId);
    return await send();
  } catch (cause) {
    if (installationId && recoverableLocalTrustFailure(cause)) {
      invalidateNativeInstallationTrust();
      try {
        await requireNativeInstallationTrust(installationId);
        return await send();
      } catch (retryCause) {
        throw normalizedAccountFailure(retryCause);
      }
    }
    throw normalizedAccountFailure(cause);
  }
}

async function accountResult(response: Response, fallback: string) {
  const result = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : fallback);
  return result;
}

async function loadLightBIAccountRequest(endpoint?: string): Promise<LightBIAccountSummary | null> {
  try {
    const response = await accountFetch('/api/account/session', {}, endpoint);
    const result = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (response.status === 401 && result.authenticated === false && typeof result.error !== 'string') {
      setCurrentLicenseTier('basic');
      localStorage.removeItem(ENTITLEMENT_CHECK_KEY);
      return null;
    }
    if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : `Account service returned HTTP ${response.status}.`);
    const account = result as unknown as LightBIAccountSummary;
    setCurrentLicenseTier(account.entitlement?.tier === 'pro' ? 'pro' : 'basic');
    localStorage.setItem(ENTITLEMENT_CHECK_KEY, String(Date.now()));
    return account;
  } catch (error) {
    const checkedAt = Number(localStorage.getItem(ENTITLEMENT_CHECK_KEY) || 0);
    if (!checkedAt || Date.now() - checkedAt > OFFLINE_GRACE_MS) setCurrentLicenseTier('basic');
    throw normalizedAccountFailure(error);
  }
}

export function loadLightBIAccount(endpoint?: string): Promise<LightBIAccountSummary | null> {
  const key = endpoint ?? '__default__';
  const existing = accountLoadInFlight.get(key);
  if (existing) return existing;
  let pending: Promise<LightBIAccountSummary | null>;
  pending = loadLightBIAccountRequest(endpoint).finally(() => {
    if (accountLoadInFlight.get(key) === pending) accountLoadInFlight.delete(key);
  });
  accountLoadInFlight.set(key, pending);
  return pending;
}

async function finishNativeLoginPolling(base: string, loginId: string, installationId: string, expiresIn = 600): Promise<string> {
  const deadline = Date.now() + Math.min(600, expiresIn || 600) * 1000;
  let consecutiveTransportFailures = 0;
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, Math.min(5000, 1500 * Math.max(1, consecutiveTransportFailures))));
    let statusResponse: Response;
    try {
      statusResponse = await accountFetch('/api/account/device-login/status', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ loginId, installationId }),
      }, base);
    } catch (cause) {
      consecutiveTransportFailures += 1;
      if (consecutiveTransportFailures >= 3) throw normalizedAccountFailure(cause);
      continue;
    }
    if (!statusResponse.ok) {
      const failure = await statusResponse.json().catch(() => ({})) as { error?: string };
      if (statusResponse.status === 429 || statusResponse.status >= 500) {
        consecutiveTransportFailures += 1;
        if (consecutiveTransportFailures >= 3) throw new Error(failure.error || `Account service returned HTTP ${statusResponse.status}.`);
        continue;
      }
      throw new Error(failure.error || 'Strong sign-in expired or was denied.');
    }
    consecutiveTransportFailures = 0;
    const status = await statusResponse.json() as { status: string; token?: string };
    if (status.status === 'pending' || status.status === 'mfa_required') continue;
    if (status.status !== 'complete' || !status.token) throw new Error('Strong sign-in expired or was denied.');
    return status.token;
  }
  throw new Error('Strong sign-in timed out.');
}

export async function beginLightBIGoogleLogin(endpoint?: string): Promise<LightBIAccountSummary | null> {
  const base = lightBIDistributionEndpoint(endpoint);
  if (!isNativeLightBI()) {
    window.location.href = `${base}/api/auth/google/start?return_to=${encodeURIComponent('/app/settings')}`;
    return null;
  }
  const installationId = getOrCreateInstallationId();
  const response = await accountFetch('/api/account/device-login/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ installationId, deviceName: `LightBI on ${platform()}`, platform: platform(), appVersion: version() }) }, base);
  const started = await accountResult(response, 'Could not start Google sign-in.') as unknown as { loginId: string; authorizationUrl: string; expiresIn: number };
  await openExternalUrl(started.authorizationUrl);
  const token = await finishNativeLoginPolling(base, started.loginId, installationId, started.expiresIn);
  await storeNativeToken(token);
  const account = await loadLightBIAccount(endpoint);
  window.dispatchEvent(new CustomEvent('lightbi-account-changed'));
  return account;
}

export async function registerLightBIEmailAccount(input: { email: string; password: string; displayName?: string }, endpoint?: string): Promise<void> {
  const response = await accountFetch('/api/account/register', { method: 'POST', body: JSON.stringify(input) }, endpoint);
  await accountResult(response, 'Registration could not be completed.');
}

export async function loginLightBIEmailAccount(email: string, password: string, endpoint?: string): Promise<LightBIEmailLoginResult> {
  const native = isNativeLightBI();
  const response = await accountFetch('/api/account/login', { method: 'POST', body: JSON.stringify({
    email, password,
    ...(native ? { installationId: getOrCreateInstallationId(), deviceName: `LightBI on ${platform()}`, platform: platform(), appVersion: version() } : {}),
  }) }, endpoint);
  const result = await accountResult(response, 'Email or password is incorrect.') as {
    token?: string; authenticated?: boolean; mfaRequired?: boolean; passkeyRequired?: boolean; challengeId?: string; methods?: Array<'totp' | 'recovery'>; fallbackTotp?: boolean; expiresIn?: number; nativeLoginId?: string;
  };
  if (result.passkeyRequired) {
    if (!result.challengeId) throw new Error('The passkey challenge could not be created.');
    if (native) {
      if (!result.nativeLoginId) throw new Error('The native passkey handoff could not be created.');
      const installationId = getOrCreateInstallationId();
      await openExternalUrl(`${lightBIFrontendUrl('account')}?strong=${encodeURIComponent(result.challengeId)}`);
      const token = await finishNativeLoginPolling(lightBIDistributionEndpoint(endpoint), result.nativeLoginId, installationId, result.expiresIn ?? 300);
      await storeNativeToken(token);
      const account = await loadLightBIAccount(endpoint);
      window.dispatchEvent(new CustomEvent('lightbi-account-changed'));
      return { status: 'authenticated', account };
    }
    window.location.href = `${lightBIFrontendUrl('account')}?strong=${encodeURIComponent(result.challengeId)}`;
    return { status: 'passkey_required', challengeId: result.challengeId, fallbackTotp: result.fallbackTotp === true, expiresIn: result.expiresIn ?? 300 };
  }
  if (result.mfaRequired) {
    if (!result.challengeId) throw new Error('The strong-authentication challenge could not be created.');
    return { status: 'mfa_required', challengeId: result.challengeId, methods: result.methods ?? ['totp', 'recovery'], expiresIn: result.expiresIn ?? 300, nativeLoginId: result.nativeLoginId };
  }
  if (native) {
    if (!result.token) throw new Error('The account session could not be created.');
    await storeNativeToken(result.token);
  }
  const account = await loadLightBIAccount(endpoint);
  window.dispatchEvent(new CustomEvent('lightbi-account-changed'));
  return { status: 'authenticated', account };
}

export async function completeLightBIAccountMfa(
  challengeId: string, method: 'totp' | 'recovery', code: string, endpoint?: string, nativeLoginId?: string,
): Promise<LightBIAccountSummary | null> {
  const response = await accountFetch('/api/v1/account/mfa/verify', {
    method: 'POST', body: JSON.stringify({ challengeId, method, code: code.trim() }),
  }, endpoint);
  const envelope = await response.json().catch(() => ({})) as {
    ok?: boolean; data?: { status?: string; sessionKind?: string; token?: string }; error?: { code?: string; message?: string };
  };
  if (!response.ok || !envelope.ok) throw new Error(envelope.error?.message || envelope.error?.code || 'Strong authentication failed.');
  if (isNativeLightBI() && envelope.data?.status === 'native_login_verified') {
    if (!nativeLoginId) throw new Error('The native strong-authentication handoff is missing.');
    const token = await finishNativeLoginPolling(lightBIDistributionEndpoint(endpoint), nativeLoginId, getOrCreateInstallationId(), 300);
    await storeNativeToken(token);
  } else {
    if (envelope.data?.status !== 'authenticated') throw new Error('Strong authentication did not create an account session.');
    if (isNativeLightBI()) {
      if (!envelope.data.token) throw new Error('The native account session could not be created after strong authentication.');
      await storeNativeToken(envelope.data.token);
    }
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
