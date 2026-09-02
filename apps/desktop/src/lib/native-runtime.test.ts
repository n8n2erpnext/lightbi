// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import { readNativeOsPublisherEvidence } from './native-runtime';

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
