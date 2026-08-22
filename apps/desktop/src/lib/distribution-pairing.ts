const INSTALLATION_KEY = 'lightbi-installation-id';
const TIER_KEY = 'lightbi-license-tier';
const TELEMETRY_KEY = 'lightbi-anonymous-pairing';
const DEFAULT_DISTRIBUTION_URL = 'https://lightbi.thaiduy.digital/distribution';

function fallbackId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  return `lbi-${[...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

export function getOrCreateInstallationId(storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage): string {
  const existing = storage.getItem(INSTALLATION_KEY);
  if (existing) return existing;
  const created = globalThis.crypto?.randomUUID?.() ?? fallbackId();
  storage.setItem(INSTALLATION_KEY, created);
  return created;
}

export async function pairLightBIInstallation(options?: {
  endpoint?: string;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  fetcher?: typeof fetch;
  version?: string;
  platform?: string;
}): Promise<'basic' | 'pro' | null> {
  if (typeof localStorage === 'undefined' && !options?.storage) return null;
  const storage = options?.storage ?? localStorage;
  if (storage.getItem(TELEMETRY_KEY) === 'disabled') return currentLicenseTier(storage);
  const endpoint = (options?.endpoint ?? import.meta.env.VITE_LIGHTBI_DISTRIBUTION_URL ?? DEFAULT_DISTRIBUTION_URL).replace(/\/$/, '');
  const fetcher = options?.fetcher ?? fetch;
  const installationId = getOrCreateInstallationId(storage);
  try {
    const response = await fetcher(`${endpoint}/api/pair`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        installationId,
        appVersion: options?.version ?? import.meta.env.VITE_LIGHTBI_VERSION ?? '0.9.1-beta.7',
        platform: options?.platform ?? navigator.platform ?? 'unknown',
        telemetryConsent: true,
        environment: import.meta.env.MODE === 'test' ? 'test' : 'production',
      }),
    });
    if (!response.ok) return null;
    const result = await response.json() as { tier?: string };
    const tier = result.tier === 'pro' ? 'pro' : 'basic';
    storage.setItem(TIER_KEY, tier);
    return tier;
  } catch {
    return null;
  }
}

export function anonymousPairingEnabled(storage: Pick<Storage, 'getItem'> = localStorage): boolean {
  return storage.getItem(TELEMETRY_KEY) !== 'disabled';
}

export function setAnonymousPairingEnabled(enabled: boolean, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(TELEMETRY_KEY, enabled ? 'enabled' : 'disabled');
}

export async function activateLightBILicense(licenseKey: string, options?: {
  endpoint?: string;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  fetcher?: typeof fetch;
}): Promise<'pro' | null> {
  if (!licenseKey.trim()) return null;
  const storage = options?.storage ?? localStorage;
  const endpoint = (options?.endpoint ?? import.meta.env.VITE_LIGHTBI_DISTRIBUTION_URL ?? DEFAULT_DISTRIBUTION_URL).replace(/\/$/, '');
  try {
    const response = await (options?.fetcher ?? fetch)(`${endpoint}/api/license/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ installationId: getOrCreateInstallationId(storage), licenseKey: licenseKey.trim() }),
    });
    if (!response.ok) return null;
    storage.setItem(TIER_KEY, 'pro');
    return 'pro';
  } catch {
    return null;
  }
}

export function currentLicenseTier(storage: Pick<Storage, 'getItem'> = localStorage): 'basic' | 'pro' {
  return storage.getItem(TIER_KEY) === 'pro' ? 'pro' : 'basic';
}
