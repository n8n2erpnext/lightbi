import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Coins, Globe2, HardDrive, KeyRound, Laptop, LogOut, Monitor, Network, Palette, RefreshCw, Search, Settings2, Shield, ShieldCheck, UserRound } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { readNativeRuntime, type NativeLicenseState, type NativeRuntimeConfig } from '../lib/native-runtime';
import { useDisplayPreferences } from '../stores/display-preferences-store';
import { useUiLanguage } from '../lib/ui-language';
import { getAvailableLanguages, getLanguageMetadata } from '../i18n/language-registry';
import {
  activateLightBILicense,
  anonymousPairingEnabled,
  currentLicenseTier,
  setAnonymousPairingEnabled,
} from '../lib/distribution-pairing';
import { useLightBIAccount } from '../hooks/useLightBIAccount';
import { UpdateSettingsPanel } from '../components/settings/UpdateSettingsPanel';
import { InternalGenerationPanel } from '../components/settings/InternalGenerationPanel';
import { BuildIdentityPanel } from '../components/settings/BuildIdentityPanel';
import { ConnectionSettingsPanel } from '../components/settings/ConnectionSettingsPanel';
import { MicroBrainPrivacyPanel } from '../components/settings/MicroBrainPrivacyPanel';
import { lightBIFrontendUrl } from '../lib/lightbi-routing';
import { useUpdateStore } from '../stores/update-store';
import { openExternalUrl } from '../lib/native-capabilities';

const AccountAccess: React.FC<{ account: ReturnType<typeof useLightBIAccount> }> = ({ account }) => {
  const { t } = useUiLanguage();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [formError, setFormError] = useState('');
  const [mfaMethod, setMfaMethod] = useState<'totp' | 'recovery'>('totp');
  const [mfaCode, setMfaCode] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    setFormError('');
    if (mode === 'register') {
      if (password !== passwordConfirm) { setFormError('Passwords do not match.'); return; }
      const accepted = await account.registerEmail(email, password, displayName);
      if (accepted) {
        setMessage('Check your email to verify the account, then sign in here.');
        setMode('login');
        setPassword('');
        setPasswordConfirm('');
      }
      return;
    }
    await account.loginEmail(email, password);
  };

  if (account.deviceLimit) return <div className="border-y border-amber-200 py-5">
    <div className="flex items-start gap-3"><Monitor className="mt-0.5 h-5 w-5 text-amber-700" /><div><div className="font-semibold text-slate-900">{t('Device limit reached')}</div><p className="mt-1 text-sm leading-6 text-slate-600">{t('Your plan has no free device slot. LightBI will never sign out another active device without your approval.')}</p></div></div>
    <div className="mt-4 border-l-2 border-amber-300 bg-amber-50/35 px-4 py-3 text-sm text-slate-700">{account.deviceLimit.maxDevices ? <>{t('This account allows')} {account.deviceLimit.maxDevices} {t('active device slots. Choose exactly which existing device to replace, or manage devices manually in the browser.')}</> : t('Choose exactly which existing device to replace, or manage devices manually in the browser.')}</div>
    <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={account.loading} onClick={() => void account.replaceDevice()} className="lb-action-primary text-sm disabled:opacity-50">{account.loading ? t('Waiting for replacement…') : t('Replace a device')}</button><button type="button" disabled={account.loading} onClick={() => void account.manageDevices()} className="border border-[var(--lb-divider)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">{t('Manage devices')}</button><button type="button" disabled={account.loading} onClick={() => void account.retryDeviceSlot()} className="border border-[var(--lb-divider)] bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">{t('Retry')}</button><button type="button" disabled={account.loading} onClick={() => account.cancelDeviceLimit()} className="px-2 py-2.5 text-sm font-semibold text-slate-500 disabled:opacity-50">{t('Back')}</button></div>
    <p className="mt-3 text-xs leading-5 text-slate-500">{t('Replacing a device revokes only its LightBI account session. It does not delete files or analysis stored on that computer.')}</p>
    {account.error && <div className="mt-3 border-l-2 border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">{account.error}</div>}
  </div>;

  if (account.mfaChallenge) return <div className="border-y border-amber-200 py-5">
    <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-amber-700" /><div><div className="font-semibold text-slate-900">Strong authentication required</div><p className="mt-1 text-sm leading-6 text-slate-600">Your password is correct. Complete the enabled second factor before LightBI creates a native account session.</p></div></div>
    <div className="mt-4 flex border-y border-[var(--lb-divider)] text-sm">
      {account.mfaChallenge.methods.includes('totp') && <button type="button" onClick={() => { setMfaMethod('totp'); setMfaCode(''); }} className={`flex-1 border-b-2 px-3 py-2 font-semibold ${mfaMethod === 'totp' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Authenticator code</button>}
      {account.mfaChallenge.methods.includes('recovery') && <button type="button" onClick={() => { setMfaMethod('recovery'); setMfaCode(''); }} className={`flex-1 border-b-2 px-3 py-2 font-semibold ${mfaMethod === 'recovery' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Recovery code</button>}
    </div>
    <form className="mt-4 space-y-3" onSubmit={async event => { event.preventDefault(); if (await account.verifyMfa(mfaMethod, mfaCode)) { setMfaCode(''); setPassword(''); } }}>
      <input autoFocus aria-label={mfaMethod === 'totp' ? 'Authenticator code' : 'Recovery code'} value={mfaCode} onChange={event => setMfaCode(event.target.value)} inputMode={mfaMethod === 'totp' ? 'numeric' : 'text'} autoComplete="one-time-code" placeholder={mfaMethod === 'totp' ? '6-digit code' : 'Recovery code'} required className="lb-control w-full px-3 py-2.5 focus:border-amber-500" />
      <div className="flex items-center justify-between gap-3"><button type="submit" disabled={account.loading || !mfaCode.trim()} className="lb-action-primary text-sm disabled:opacity-50">Verify and sign in</button><button type="button" onClick={() => { account.cancelMfa(); setMfaCode(''); }} className="text-sm font-semibold text-slate-600">Back</button></div>
      <p className="text-xs text-slate-500">Challenge expires in about {Math.max(1, Math.ceil(account.mfaChallenge.expiresIn / 60))} minutes.</p>
    </form>
    {account.error && <div className="mt-3 border-l-2 border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">{account.error}</div>}
  </div>;

  return <div className="border-y border-slate-200 py-5">
    <div className="flex items-start gap-3"><UserRound className="mt-0.5 h-5 w-5 text-blue-600" /><div><div className="font-semibold text-slate-900">Sign in to LightBI</div><p className="mt-1 text-sm leading-6 text-slate-500">Use Google or email and password to manage Pro access and devices. Files, SQL and analysis results stay local.</p></div></div>
    <button type="button" disabled={account.loading} onClick={() => void account.login()} className="lb-action-primary mt-4 w-full text-sm disabled:opacity-50">{account.loading ? 'Checking account…' : 'Continue with Google'}</button>
    <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use email<span className="h-px flex-1 bg-slate-200" /></div>
    <div className="mb-3 flex border-y border-[var(--lb-divider)] text-sm"><button type="button" onClick={() => { setMode('login'); setMessage(''); setFormError(''); setPasswordConfirm(''); }} className={`flex-1 border-b-2 px-3 py-2 font-semibold ${mode === 'login' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Sign in</button><button type="button" onClick={() => { setMode('register'); setMessage(''); setFormError(''); }} className={`flex-1 border-b-2 px-3 py-2 font-semibold ${mode === 'register' ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500'}`}>Create account</button></div>
    <form onSubmit={submit} className="space-y-3">
      {mode === 'register' && <input aria-label="Display name" value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="name" placeholder="Display name" maxLength={120} className="lb-control w-full px-3 py-2.5" />}
      <input aria-label="Email" value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="Email" required className="lb-control w-full px-3 py-2.5" />
      <input aria-label="Password" value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'Password (12+ characters)' : 'Password'} minLength={mode === 'register' ? 12 : undefined} required className="lb-control w-full px-3 py-2.5" />
      {mode === 'register' && <input aria-label="Confirm password" value={passwordConfirm} onChange={event => setPasswordConfirm(event.target.value)} type="password" autoComplete="new-password" placeholder="Confirm password" minLength={12} required className="lb-control w-full px-3 py-2.5" />}
      {formError && <div className="border-l-2 border-red-400 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
      <div className="flex flex-wrap items-center justify-between gap-2"><button type="submit" disabled={account.loading} className="lb-action-primary text-sm disabled:opacity-50">{mode === 'register' ? 'Create account' : 'Sign in with email'}</button>{mode === 'login' && <button type="button" disabled={!email || account.loading} onClick={async () => { setMessage(''); if (await account.requestPasswordReset(email)) setMessage('If this email has a password account, a reset link has been sent.'); }} className="text-sm font-semibold text-blue-700 disabled:text-slate-400">Forgot password?</button>}</div>
    </form>
    {message && <div className="mt-3 border-l-2 border-emerald-400 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>}
  </div>;
};

export const Settings: React.FC = () => {
  const location = useLocation();
  const { preferences, updatePreferences } = useDisplayPreferences();
  const { t } = useUiLanguage();
  const [nativeState, setNativeState] = useState<{
    runtime: NativeRuntimeConfig;
    license: NativeLicenseState;
    backendReady: boolean;
  } | null>(null);
  const availableLanguages = getAvailableLanguages();
  const [pairingEnabled, setPairingEnabled] = useState(() => anonymousPairingEnabled());
  const [licenseTier, setLicenseTier] = useState(() => currentLicenseTier());
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseMessage, setLicenseMessage] = useState('');
  const [accountLicenseKey, setAccountLicenseKey] = useState('');
  const lightbiAccount = useLightBIAccount();
  const updater = useUpdateStore();
  const updateNotificationCount = updater.hasUnreadNotification() ? 1 : 0;
  const requestedSection = new URLSearchParams(location.search).get('section');
  const validRequestedSection = ['general', 'account', 'connection', 'appearance', 'privacy', 'updates'].includes(requestedSection || '')
    ? requestedSection as 'general' | 'account' | 'connection' | 'appearance' | 'privacy' | 'updates'
    : 'general';
  const [settingsSection, setSettingsSection] = useState<'general' | 'account' | 'connection' | 'appearance' | 'privacy' | 'updates'>(validRequestedSection);
  const [settingsSearch, setSettingsSearch] = useState('');
  const settingsItems = [
    { id: 'general' as const, label: t('General'), icon: Settings2 },
    { id: 'account' as const, label: t('Account'), icon: UserRound },
    { id: 'connection' as const, label: t('Connection'), icon: Network },
    { id: 'appearance' as const, label: t('Appearance'), icon: Palette },
    { id: 'privacy' as const, label: t('Privacy and local data'), icon: Shield },
    { id: 'updates' as const, label: t('Updates'), icon: RefreshCw },
  ].filter(item => item.label.toLowerCase().includes(settingsSearch.trim().toLowerCase()));

  useEffect(() => {
    void readNativeRuntime().then(setNativeState);
  }, []);

  useEffect(() => {
    setSettingsSection(validRequestedSection);
    if (validRequestedSection === 'updates') updater.markNotificationRead();
  }, [validRequestedSection]);

  return (
    <div data-testid="settings-canvas" className="flex h-full w-full overflow-hidden bg-[var(--lb-canvas)]">
      <aside className="flex w-[var(--lb-sidebar-width)] shrink-0 flex-col border-r border-[var(--lb-divider)] bg-[var(--lb-sidebar)] px-3 py-4">
        <NavLink to="/" className="mb-4 flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-black/55 hover:bg-white/70 hover:text-black"><ArrowLeft className="h-4 w-4" />{t('Back to app')}</NavLink>
        <label className="relative mb-5 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35"/><input value={settingsSearch} onChange={event=>setSettingsSearch(event.target.value)} placeholder={t('Search settings…')} className="h-10 w-full rounded-lg border border-black/10 bg-white/65 pl-10 pr-3 text-sm outline-none transition focus:border-black/25 focus:bg-white"/></label>
        <div className="px-3 pb-2 text-xs font-semibold text-black/35">{t('Personal')}</div>
        <nav className="space-y-0.5">{settingsItems.map(item=><button key={item.id} type="button" onClick={()=>{setSettingsSection(item.id);if(item.id==='updates')updater.markNotificationRead();}} className={`relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition ${settingsSection===item.id?'bg-white font-semibold text-black shadow-[0_1px_0_rgba(15,23,42,0.04)]':'text-black/65 hover:bg-white/60 hover:text-black'}`}>{settingsSection===item.id&&<span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-slate-900"/>}<item.icon className="h-4 w-4"/><span className="flex-1">{item.label}</span>{item.id==='updates'&&updateNotificationCount>0&&<span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{updateNotificationCount}</span>}</button>)}</nav>
        {lightbiAccount.account&&<div className="mt-auto border-t border-black/8 px-3 pt-4"><div className="truncate text-sm font-semibold">{lightbiAccount.account.account.display_name||lightbiAccount.account.account.email}</div><div className="truncate text-xs text-black/45">{lightbiAccount.account.account.email}</div></div>}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="lb-inline-gutter shrink-0 border-b border-[var(--lb-divider)] bg-[var(--lb-canvas)] py-6"><div className="lb-reading-column"><h1 className="text-[26px] font-semibold tracking-[-0.02em] text-slate-950">{settingsItems.find(item=>item.id===settingsSection)?.label||t('Settings')}</h1><p className="mt-1 text-sm text-slate-500">{t('Your LightBI workspace, display, analysis defaults, and Beta access.')}</p></div></header>
        <div className="lb-inline-gutter flex-1 overflow-y-auto py-2">
        <div data-testid="settings-document" className="lb-reading-column w-full">
        {settingsSection === 'account' && <div className="py-6">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-medium text-slate-900">{t('Account')}</h2><p className="mt-1 text-sm text-slate-500">Your Google or verified email identity anchors entitlement and device slots. Business data stays local.</p></div>{lightbiAccount.account && <button type="button" onClick={() => void lightbiAccount.logout()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" />{t('Log out')}</button>}</div>
          {!lightbiAccount.account ? <AccountAccess account={lightbiAccount} /> : <div className="space-y-4"><div className="flex flex-col gap-4 border-y border-slate-200 py-5 sm:flex-row sm:items-center"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-amber-400 font-semibold text-slate-900">{lightbiAccount.account.account.avatar_url ? <img src={lightbiAccount.account.account.avatar_url} alt="" className="h-full w-full object-cover" /> : (lightbiAccount.account.account.display_name || lightbiAccount.account.account.email).slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="truncate font-semibold text-slate-900">{lightbiAccount.account.account.display_name || lightbiAccount.account.account.email}</div><div className="truncate text-sm text-slate-500">{lightbiAccount.account.account.email}</div></div><div className="border-l-2 border-slate-300 pl-4 text-slate-800"><div className="text-[10px] uppercase tracking-wider text-slate-400">Plan</div><div className="font-semibold uppercase">{lightbiAccount.account.entitlement.tier}</div><div className="text-xs text-slate-500">{lightbiAccount.account.entitlement.max_devices} device slots</div></div></div><div className="grid border-b border-slate-200 lg:grid-cols-2 lg:divide-x lg:divide-slate-200"><div className="py-4 pr-5"><div className="flex items-center gap-2 font-semibold text-slate-900"><KeyRound className="h-4 w-4 text-violet-600" />Redeem Pro key</div><div className="mt-3 flex gap-2"><input type="password" value={accountLicenseKey} onChange={event=>setAccountLicenseKey(event.target.value)} placeholder="LBI-PRO-…" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"/><button type="button" onClick={async()=>{await lightbiAccount.redeem(accountLicenseKey);setAccountLicenseKey('');}} className="rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white">Redeem</button></div></div><div className="py-4 lg:pl-5"><div className="flex items-center gap-2 font-semibold text-slate-900"><Monitor className="h-4 w-4 text-emerald-600" />Devices</div><div className="mt-2 divide-y divide-slate-100 border-y border-slate-100">{lightbiAccount.account.devices.length ? lightbiAccount.account.devices.map(device=><div key={device.id} className="flex items-center justify-between gap-2 py-2 text-xs"><span className="min-w-0 truncate">{device.display_name || device.platform || 'LightBI device'} · {device.status}</span>{device.status==='active'&&<button type="button" onClick={()=>void lightbiAccount.revokeDevice(device.id)} className="font-semibold text-red-600">Revoke</button>}</div>) : <div className="text-sm text-slate-500">No native devices connected.</div>}</div></div></div></div>}
          {lightbiAccount.error && <div className="mt-3 flex items-start justify-between gap-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"><span className="min-w-0 flex-1">{lightbiAccount.error}</span>{lightbiAccount.connectionState === 'unavailable' && <button type="button" disabled={lightbiAccount.loading} onClick={() => void lightbiAccount.refresh()} className="shrink-0 font-semibold underline decoration-red-300 underline-offset-2 disabled:opacity-50">Retry connection</button>}</div>}
        </div>}
        {settingsSection === 'general' && <div className="py-6">
          <InternalGenerationPanel />
          <BuildIdentityPanel />
          <h2 className="mb-4 text-lg font-medium text-slate-900">{t('Application')}</h2>
          <div className="grid border-y border-[var(--lb-divider)] md:grid-cols-2 md:divide-x md:divide-[var(--lb-divider)]">
            <div className="flex items-start gap-3 px-1 py-4 pr-5">
              <Laptop className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-slate-800">{nativeState?.runtime.native ? t('Windows native app') : t('Web QA harness')}</div>
                <div className="mt-1 text-sm text-slate-500">{t('LightBI Beta · local-first analysis')}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 px-1 py-4 md:pl-5">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div>
                <div className="font-medium text-emerald-900">{nativeState?.license.edition ?? 'Loading Beta status…'}</div>
                <div className="mt-1 text-sm text-emerald-800/70">{t('No license key or feature restriction during Beta.')}</div>
              </div>
            </div>
          </div>
          <div className="grid border-b border-[var(--lb-divider)] md:grid-cols-2 md:divide-x md:divide-[var(--lb-divider)]">
            <label className="flex items-start justify-between gap-4 px-1 py-4 pr-5">
              <span>
                <span className="block font-medium text-slate-800">{t('Anonymous installation pairing')}</span>
                <span className="mt-1 block text-sm text-slate-500">{t('Sends only a random installation ID, app version, platform, and license tier.')}</span>
              </span>
              <input
                type="checkbox"
                checked={pairingEnabled}
                onChange={(event) => {
                  setPairingEnabled(event.target.checked);
                  setAnonymousPairingEnabled(event.target.checked);
                }}
                className="mt-1 h-4 w-4"
              />
            </label>
            <div className="px-1 py-4 md:pl-5">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium text-slate-800">{t('License tier')}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase text-slate-700">{licenseTier}</span>
              </div>
              <div className="mt-3 flex gap-2">
                <input
                  value={licenseKey}
                  onChange={(event) => setLicenseKey(event.target.value)}
                  placeholder={t('Enter a Pro license key')}
                  className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const tier = await activateLightBILicense(licenseKey);
                    if (tier) {
                      setLicenseTier(tier);
                      setLicenseKey('');
                      setLicenseMessage(t('Pro license activated.'));
                    } else setLicenseMessage(t('License activation failed.'));
                  }}
                  className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                >
                  {t('Activate')}
                </button>
              </div>
              {licenseMessage && <div className="mt-2 text-xs text-slate-500">{licenseMessage}</div>}
              <button type="button" onClick={()=>void openExternalUrl(lightBIFrontendUrl('plans'))} className="mt-2 inline-block text-xs font-semibold text-blue-700">{t('View Basic and Pro plans')}</button>
            </div>
          </div>
        </div>}

        {settingsSection === 'connection' && <div className="py-6"><ConnectionSettingsPanel accountConnectionState={lightbiAccount.connectionState} /></div>}

        {settingsSection === 'appearance' && <div className="py-6">
          <h2 className="mb-4 text-lg font-medium text-slate-900">{t('Language and reporting defaults')}</h2>
          <p className="mb-4 text-sm leading-6 text-slate-500">
            {t(
              'Easy Mode uses these defaults automatically. LightBI asks again only when a source contains conflicting evidence.',
            )}
          </p>
          <div className="grid border-y border-[var(--lb-divider)] md:grid-cols-2 md:divide-x md:divide-[var(--lb-divider)]">
            <label className="flex items-start gap-3 px-1 py-4 pr-5">
              <Globe2 className="mt-1 h-5 w-5 text-blue-600" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-800">{t('Display language')}</span>
                <select
                  aria-label="Display language"
                  value={preferences.language}
                  onChange={(event) => {
                    const language = event.target.value;
                    updatePreferences({
                      language,
                      locale: getLanguageMetadata(language).locale,
                    });
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {availableLanguages.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.nativeLabel}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className="flex items-start gap-3 px-1 py-4 md:pl-5">
              <Coins className="mt-1 h-5 w-5 text-emerald-600" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-800">{t('Reporting currency')}</span>
                <select
                  aria-label="Reporting currency"
                  value={preferences.currencyCode}
                  onChange={(event) => updatePreferences({ currencyCode: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  <option value="VND">VND — Việt Nam đồng</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="JPY">JPY — Japanese Yen</option>
                  <option value="SGD">SGD — Singapore Dollar</option>
                  <option value="THB">THB — Thai Baht</option>
                  <option value="CNY">CNY — Chinese Yuan</option>
                  <option value="KRW">KRW — Korean Won</option>
                  <option value="AUD">AUD — Australian Dollar</option>
                  <option value="CAD">CAD — Canadian Dollar</option>
                </select>
              </span>
            </label>
          </div>
          <div className="flex items-center justify-between border-b border-[var(--lb-divider)] px-1 py-4">
            <div>
              <div className="font-medium text-slate-800">{t('Theme')}</div>
              <div className="text-sm text-slate-500">{t('Light theme is optimized for the Beta workspace.')}</div>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">{t('Light')}</span>
          </div>
        </div>}

        {settingsSection === 'privacy' && <div className="py-6">
          <h2 className="mb-4 text-lg font-medium text-slate-900">{t('Local data boundary')}</h2>
          <div className="divide-y divide-[var(--lb-divider)] border-y border-[var(--lb-divider)]">
            <div className="flex items-start justify-between gap-4 px-1 py-4">
              <div className="flex items-start gap-3">
                <HardDrive className="mt-0.5 h-5 w-5 text-slate-500" />
                <div>
                  <div className="font-medium text-slate-800">{t('Application data')}</div>
                  <div className="mt-1 text-sm text-slate-500">
                    {t(
                      'Native LightBI stores workspace metadata, vault material, and temporary exports inside the operating system application-data directory.',
                    )}
                  </div>
                </div>
              </div>
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            </div>
            <MicroBrainPrivacyPanel />
            <div className="flex items-center justify-between px-1 py-4">
              <div>
                <div className="font-medium text-slate-800">{t('Embedded analysis core')}</div>
                <div className="text-sm text-slate-500">{t('Runs inside LightBI · no separate server application')}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${nativeState?.backendReady === false ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {nativeState?.backendReady === false ? t('Starting') : t('Ready')}
              </span>
            </div>
          </div>
        </div>}
        {settingsSection === 'updates' && <UpdateSettingsPanel />}
        </div></div>
      </section>
    </div>
  );
};
