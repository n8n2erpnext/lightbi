import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  activateLightBILicense,
  getOrCreateInstallationId,
  pairLightBIInstallation,
  setAnonymousPairingEnabled,
} from './distribution-pairing';

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  };
}

describe('distribution pairing', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('creates one stable random id per installation', () => {
    const storage = memoryStorage();
    const first = getOrCreateInstallationId(storage);
    expect(first.length).toBeGreaterThan(20);
    expect(getOrCreateInstallationId(storage)).toBe(first);
  });

  it('sends only anonymous product activation metadata', async () => {
    const storage = memoryStorage();
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const payload = JSON.parse(String(init?.body));
      expect(Object.keys(payload).sort()).toEqual(['appVersion', 'environment', 'installationId', 'platform', 'telemetryConsent']);
      expect(payload.environment).toBe('test');
      expect(payload).not.toHaveProperty('file');
      expect(payload).not.toHaveProperty('columns');
      return new Response(JSON.stringify({ tier: 'basic' }), { status: 200 });
    });
    await expect(pairLightBIInstallation({
      endpoint: 'https://distribution.example', storage, fetcher: fetcher as typeof fetch,
      version: '0.9.1-beta.7', platform: 'Windows',
    })).resolves.toBe('basic');
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('does not call home after anonymous pairing is disabled', async () => {
    const storage = memoryStorage();
    const fetcher = vi.fn();
    setAnonymousPairingEnabled(false, storage);
    await expect(pairLightBIInstallation({ endpoint: 'https://distribution.example', storage, fetcher: fetcher as typeof fetch }))
      .resolves.toBe('basic');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('pairs a Pro license with the existing installation id', async () => {
    const storage = memoryStorage();
    const id = getOrCreateInstallationId(storage);
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      expect(JSON.parse(String(init?.body))).toEqual({ installationId: id, licenseKey: 'LBI-PRO-TEST' });
      return new Response(JSON.stringify({ tier: 'pro', active: true }), { status: 200 });
    });
    await expect(activateLightBILicense(' LBI-PRO-TEST ', { endpoint: 'https://distribution.example', storage, fetcher: fetcher as typeof fetch }))
      .resolves.toBe('pro');
  });
});
