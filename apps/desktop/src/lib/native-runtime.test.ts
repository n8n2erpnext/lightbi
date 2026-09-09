// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { invalidateNativeInstallationTrust, readNativeOsPublisherEvidence, startNativeInstallationTrustRecovery, stopNativeInstallationTrustRecovery } from './native-runtime';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));

describe('native OS publisher evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('marks browser preview as not applicable without invoking native authority', async () => {
    await expect(readNativeOsPublisherEvidence()).resolves.toMatchObject({ status: 'not_applicable', platform: 'web' });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('returns the packaged native Authenticode result unchanged', async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(invoke).mockResolvedValue({
      status: 'not_verified', platform: 'windows', signerThumbprint: null,
      expectedPublisherConfigured: false, reason: 'winverifytrust_failed:0x800B0100',
    });
    await expect(readNativeOsPublisherEvidence()).resolves.toMatchObject({
      status: 'not_verified', platform: 'windows', reason: 'winverifytrust_failed:0x800B0100',
    });
    expect(invoke).toHaveBeenCalledWith('os_publisher_evidence');
  });

  it('fails closed when native publisher evidence cannot be read', async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(invoke).mockRejectedValue(new Error('native command unavailable'));
    await expect(readNativeOsPublisherEvidence()).resolves.toMatchObject({ status: 'unavailable' });
  });

  it('fails closed on an unknown native status', async () => {
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    vi.mocked(invoke).mockResolvedValue({ status: 'trusted-ish' });
    await expect(readNativeOsPublisherEvidence()).resolves.toMatchObject({
      status: 'unavailable', reason: 'native_publisher_evidence_invalid',
    });
  });
});


describe('native installation trust recovery', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.useFakeTimers();
    vi.stubEnv('VITE_LIGHTBI_CHANNEL', 'internal');
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ = {};
    invalidateNativeInstallationTrust();
    stopNativeInstallationTrustRecovery();
  });

  afterEach(() => {
    stopNativeInstallationTrustRecovery();
    invalidateNativeInstallationTrust();
    vi.unstubAllEnvs();
    vi.useRealTimers();
    delete (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__;
  });

  it('retries one bounded native trust watcher and hot-wakes account consumers when trust appears', async () => {
    const installationId = 'install-native-recovery-01';
    const ready = vi.fn();
    window.addEventListener('lightbi-account-changed', ready);
    vi.mocked(invoke)
      .mockRejectedValueOnce(new Error('REL catalog is not available yet'))
      .mockResolvedValueOnce({
        status: 'issued', installationId, releaseId: 'release:test', certificateId: 'cert:test',
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(), runtimeSha256: 'a'.repeat(64),
        runtimeSize: 123, productionAuthority: false,
      });

    startNativeInstallationTrustRecovery(installationId);
    startNativeInstallationTrustRecovery(installationId);
    await vi.advanceTimersByTimeAsync(0);
    expect(invoke).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5_000);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(invoke).toHaveBeenLastCalledWith('ensure_installation_trust', { installationId });
    expect(ready).toHaveBeenCalledTimes(1);
    window.removeEventListener('lightbi-account-changed', ready);
  });

  it('does not start recovery outside Internal native builds', async () => {
    vi.stubEnv('VITE_LIGHTBI_CHANNEL', 'production');
    startNativeInstallationTrustRecovery('install-production');
    await Promise.resolve();
    expect(invoke).not.toHaveBeenCalled();
  });
});
