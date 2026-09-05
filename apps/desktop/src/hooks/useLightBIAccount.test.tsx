// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLightBIAccount } from './useLightBIAccount';
import { loadLightBIAccount } from '../lib/account-api';

vi.mock('../lib/account-api', () => ({
  loadLightBIAccount: vi.fn(),
  beginLightBIGoogleLogin: vi.fn(),
  completeLightBIAccountMfa: vi.fn(),
  loginLightBIEmailAccount: vi.fn(),
  logoutLightBIAccount: vi.fn(),
  redeemLightBIAccountLicense: vi.fn(),
  registerLightBIEmailAccount: vi.fn(),
  requestLightBIPasswordReset: vi.fn(),
  revokeLightBIDevice: vi.fn(),
}));

const summary = {
  authenticated: true,
  account: { id: 'account-1', email: 'owner@example.com', provider: 'google', created_at: '' },
  entitlement: { tier: 'pro', status: 'active', max_devices: 2 },
  devices: [],
} as const;

describe('useLightBIAccount connection lifecycle', () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('surfaces a secure transport outage without pretending the user logged out', async () => {
    vi.mocked(loadLightBIAccount).mockRejectedValueOnce(new Error('LightBI account service is unreachable. Local analysis remains available.'));
    const { result } = renderHook(() => useLightBIAccount());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.account).toBeNull();
    expect(result.current.connectionState).toBe('unavailable');
    expect(result.current.error).toContain('Local analysis remains available');
  });

  it('preserves the last authenticated account when a later refresh loses connectivity', async () => {
    vi.mocked(loadLightBIAccount)
      .mockResolvedValueOnce(summary as any)
      .mockRejectedValueOnce(new Error('LightBI secure account connection is not ready. firewall blocked'));
    const { result } = renderHook(() => useLightBIAccount());
    await waitFor(() => expect(result.current.connectionState).toBe('online'));
    expect(result.current.account?.account.email).toBe('owner@example.com');

    await act(async () => { await result.current.refresh(); });

    expect(result.current.account?.account.email).toBe('owner@example.com');
    expect(result.current.connectionState).toBe('unavailable');
    expect(result.current.error).toContain('firewall blocked');
  });

  it('rechecks the account when connectivity returns', async () => {
    vi.mocked(loadLightBIAccount)
      .mockRejectedValueOnce(new Error('LightBI account service is unreachable.'))
      .mockResolvedValue(summary as any);
    const { result } = renderHook(() => useLightBIAccount());
    await waitFor(() => expect(result.current.connectionState).toBe('unavailable'));

    act(() => { window.dispatchEvent(new Event('online')); });

    await waitFor(() => expect(result.current.connectionState).toBe('online'));
    expect(result.current.account?.account.email).toBe('owner@example.com');
  });
});
