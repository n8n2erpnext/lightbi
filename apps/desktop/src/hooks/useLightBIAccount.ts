import { useCallback, useEffect, useState } from 'react';
import { beginLightBIGoogleLogin, completeLightBIAccountMfa, loadLightBIAccount, loginLightBIEmailAccount, logoutLightBIAccount, redeemLightBIAccountLicense, registerLightBIEmailAccount, requestLightBIPasswordReset, revokeLightBIDevice, type LightBIAccountMfaChallenge, type LightBIAccountSummary } from '../lib/account-api';

type AccountConnectionState = 'checking' | 'online' | 'unavailable';

function failureMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message.trim() ? cause.message : fallback;
}

function isConnectionFailure(message: string): boolean {
  return /secure account connection|account service is unreachable|signed transport|installation trust|installation certificate|timed out|timeout|network|connect|dns|tls|proxy|firewall/i.test(message);
}

export function useLightBIAccount() {
  const [account, setAccount] = useState<LightBIAccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connectionState, setConnectionState] = useState<AccountConnectionState>('checking');
  const [mfaChallenge, setMfaChallenge] = useState<LightBIAccountMfaChallenge | null>(null);

  const recordFailure = useCallback((cause: unknown, fallback: string) => {
    const message = failureMessage(cause, fallback);
    setError(message);
    if (isConnectionFailure(message)) setConnectionState('unavailable');
    return message;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    setConnectionState('checking');
    try {
      setAccount(await loadLightBIAccount());
      setConnectionState('online');
    } catch (cause) {
      recordFailure(cause, 'Account service could not be reached.');
    } finally {
      setLoading(false);
    }
  }, [recordFailure]);

  useEffect(() => {
    void refresh();
    const changed = () => void refresh();
    window.addEventListener('lightbi-account-changed', changed);
    window.addEventListener('online', changed);
    return () => {
      window.removeEventListener('lightbi-account-changed', changed);
      window.removeEventListener('online', changed);
    };
  }, [refresh]);

  const login = async () => {
    setError('');
    setLoading(true);
    try {
      setAccount(await beginLightBIGoogleLogin());
      setConnectionState('online');
    } catch (cause) {
      recordFailure(cause, 'Sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const loginEmail = async (email: string, password: string) => {
    setError('');
    setMfaChallenge(null);
    setLoading(true);
    try {
      const result = await loginLightBIEmailAccount(email, password);
      setConnectionState('online');
      if (result.status === 'mfa_required') { setMfaChallenge(result); return 'mfa_required' as const; }
      if (result.status === 'passkey_required') return 'passkey_required' as const;
      setAccount(result.account);
      return 'authenticated' as const;
    } catch (cause) {
      recordFailure(cause, 'Email sign-in failed.');
      return 'failed' as const;
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async (method: 'totp' | 'recovery', code: string) => {
    if (!mfaChallenge) return false;
    setError('');
    setLoading(true);
    try {
      setAccount(await completeLightBIAccountMfa(mfaChallenge.challengeId, method, code, undefined, mfaChallenge.nativeLoginId));
      setMfaChallenge(null);
      setConnectionState('online');
      return true;
    } catch (cause) {
      recordFailure(cause, 'Strong authentication failed.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const cancelMfa = () => { setMfaChallenge(null); setError(''); };
  const registerEmail = async (email: string, password: string, displayName?: string) => { setError(''); setLoading(true); try { await registerLightBIEmailAccount({ email, password, displayName }); setConnectionState('online'); return true; } catch (cause) { recordFailure(cause, 'Registration failed.'); return false; } finally { setLoading(false); } };
  const requestPasswordReset = async (email: string) => { setError(''); setLoading(true); try { await requestLightBIPasswordReset(email); setConnectionState('online'); return true; } catch (cause) { recordFailure(cause, 'Reset email could not be sent.'); return false; } finally { setLoading(false); } };
  const logout = async () => { await logoutLightBIAccount(); setAccount(null); setMfaChallenge(null); setConnectionState('online'); };
  const redeem = async (key: string) => { setError(''); try { setAccount(await redeemLightBIAccountLicense(key)); setConnectionState('online'); } catch (cause) { recordFailure(cause, 'Key redemption failed.'); } };
  const revokeDevice = async (id: string) => { setError(''); try { await revokeLightBIDevice(id); await refresh(); } catch (cause) { recordFailure(cause, 'Device revocation failed.'); } };

  return { account, loading, error, connectionState, mfaChallenge, login, loginEmail, verifyMfa, cancelMfa, registerEmail, requestPasswordReset, logout, redeem, revokeDevice, refresh };
}
