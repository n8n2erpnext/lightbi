import { useCallback, useEffect, useState } from 'react';
import { beginLightBIGoogleLogin, loadLightBIAccount, loginLightBIEmailAccount, logoutLightBIAccount, redeemLightBIAccountLicense, registerLightBIEmailAccount, requestLightBIPasswordReset, revokeLightBIDevice, type LightBIAccountSummary } from '../lib/account-api';

export function useLightBIAccount() {
  const [account, setAccount] = useState<LightBIAccountSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setAccount(await loadLightBIAccount()); } catch { setAccount(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    const changed = () => void refresh();
    window.addEventListener('lightbi-account-changed', changed);
    return () => window.removeEventListener('lightbi-account-changed', changed);
  }, [refresh]);
  const login = async () => { setError(''); setLoading(true); try { setAccount(await beginLightBIGoogleLogin()); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign-in failed.'); } finally { setLoading(false); } };
  const loginEmail = async (email: string, password: string) => { setError(''); setLoading(true); try { setAccount(await loginLightBIEmailAccount(email, password)); return true; } catch (cause) { setError(cause instanceof Error ? cause.message : 'Email sign-in failed.'); return false; } finally { setLoading(false); } };
  const registerEmail = async (email: string, password: string, displayName?: string) => { setError(''); setLoading(true); try { await registerLightBIEmailAccount({ email, password, displayName }); return true; } catch (cause) { setError(cause instanceof Error ? cause.message : 'Registration failed.'); return false; } finally { setLoading(false); } };
  const requestPasswordReset = async (email: string) => { setError(''); setLoading(true); try { await requestLightBIPasswordReset(email); return true; } catch (cause) { setError(cause instanceof Error ? cause.message : 'Reset email could not be sent.'); return false; } finally { setLoading(false); } };
  const logout = async () => { await logoutLightBIAccount(); setAccount(null); };
  const redeem = async (key: string) => { setError(''); try { setAccount(await redeemLightBIAccountLicense(key)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Key redemption failed.'); } };
  const revokeDevice = async (id: string) => { setError(''); try { await revokeLightBIDevice(id); await refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Device revocation failed.'); } };
  return { account, loading, error, login, loginEmail, registerEmail, requestPasswordReset, logout, redeem, revokeDevice, refresh };
}
