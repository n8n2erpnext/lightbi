import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Coins, Globe2, HardDrive, KeyRound, Laptop, LogOut, Monitor, Palette, RefreshCw, Search, Settings2, Shield, ShieldCheck, UserRound } from 'lucide-react';
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

const AccountAccess: React.FC<{ account: ReturnType<typeof useLightBIAccount> }> = ({ account }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (mode === 'register') {
      const accepted = await account.registerEmail(email, password, displayName);
      if (accepted) {
        setMessage('Check your email to verify the account, then sign in here.');
        setMode('login');
        setPassword('');
      }
      return;
    }
    await account.loginEmail(email, password);
  };

  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
    <div className="flex items-start gap-3"><UserRound className="mt-0.5 h-5 w-5 text-blue-600" /><div><div className="font-semibold text-slate-900">Sign in to LightBI</div><p className="mt-1 text-sm leading-6 text-slate-500">Use Google or email and password to manage Pro access and devices. Files, SQL and analysis results stay local.</p></div></div>
    <button type="button" disabled={account.loading} onClick={() => void account.login()} className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{account.loading ? 'Checking account…' : 'Continue with Google'}</button>
    <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400"><span className="h-px flex-1 bg-slate-200" />or use email<span className="h-px flex-1 bg-slate-200" /></div>
    <div className="mb-3 flex rounded-lg bg-slate-200/70 p-1 text-sm"><button type="button" onClick={() => { setMode('login'); setMessage(''); }} className={`flex-1 rounded-md px-3 py-2 font-semibold ${mode === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Sign in</button><button type="button" onClick={() => { setMode('register'); setMessage(''); }} className={`flex-1 rounded-md px-3 py-2 font-semibold ${mode === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Create account</button></div>
    <form onSubmit={submit} className="space-y-3">
      {mode === 'register' && <input aria-label="Display name" value={displayName} onChange={event => setDisplayName(event.target.value)} autoComplete="name" placeholder="Display name" maxLength={120} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" />}
      <input aria-label="Email" value={email} onChange={event => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="Email" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" />
      <input aria-label="Password" value={password} onChange={event => setPassword(event.target.value)} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'register' ? 'Password (12+ characters)' : 'Password'} minLength={mode === 'register' ? 12 : undefined} required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm" />
      <div className="flex flex-wrap items-center justify-between gap-2"><button type="submit" disabled={account.loading} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{mode === 'register' ? 'Create account' : 'Sign in with email'}</button>{mode === 'login' && <button type="button" disabled={!email || account.loading} onClick={async () => { setMessage(''); if (await account.requestPasswordReset(email)) setMessage('If this email has a password account, a reset link has been sent.'); }} className="text-sm font-semibold text-blue-700 disabled:text-slate-400">Forgot password?</button>}</div>
    </form>
    {message && <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</div>}
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
  const requestedSection = new URLSearchParams(location.search).get('section');
  const [settingsSection, setSettingsSection] = useState<'general' | 'account' | 'appearance' | 'privacy' | 'updates'>(requestedSection === 'account' ? 'account' : 'general');
  const [settingsSearch, setSettingsSearch] = useState('');
  const settingsItems = [
    { id: 'general' as const, label: t('General'), icon: Settings2 },
    { id: 'account' as const, label: t('Account'), icon: UserRound },
    { id: 'appearance' as const, label: t('Appearance'), icon: Palette },
    { id: 'privacy' as const, label: t('Privacy and local data'), icon: Shield },
    { id: 'updates' as const, label: t('Updates'), icon: RefreshCw },
  ].filter(item => item.label.toLowerCase().includes(settingsSearch.trim().toLowerCase()));

  useEffect(() => {
    void readNativeRuntime().then(setNativeState);
  }, []);

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#fbfbfa]">
      <aside className="flex w-[260px] shrink-0 flex-col border-r border-black/10 bg-[#f4f4f3] p-3">
        <NavLink to="/" className="mb-4 flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-medium text-black/55 hover:bg-white/70 hover:text-black"><ArrowLeft className="h-4 w-4" />{t('Back to app')}</NavLink>
        <label className="relative mb-5 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40"/><input value={settingsSearch} onChange={event=>setSettingsSearch(event.target.value)} placeholder={t('Search settings…')} className="h-11 w-full rounded-2xl border border-black/10 bg-white/80 pl-10 pr-3 text-sm outline-none focus:border-blue-400"/></label>
        <div className="px-3 pb-2 text-xs font-semibold text-black/35">{t('Personal')}</div>
        <nav className="space-y-1">{settingsItems.map(item=><button key={item.id} type="button" onClick={()=>setSettingsSection(item.id)} className={`flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm ${settingsSection===item.id?'bg-black/[0.06] font-semibold text-black':'text-black/70 hover:bg-white/70'}`}><item.icon className="h-4 w-4"/><span>{item.label}</span></button>)}</nav>
        {lightbiAccount.account&&<div className="mt-auto rounded-2xl border border-black/10 bg-white/80 p-3"><div className="truncate text-sm font-semibold">{lightbiAccount.account.account.display_name||lightbiAccount.account.account.email}</div><div className="truncate text-xs text-black/45">{lightbiAccount.account.account.email}</div></div>}
      </aside>
      <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-black/8 px-10 py-6"><h1 className="text-3xl font-semibold text-slate-900">{settingsItems.find(item=>item.id===settingsSection)?.label||t('Settings')}</h1><p className="mt-1 text-sm text-slate-500">{t('Your LightBI workspace, display, analysis defaults, and Beta access.')}</p></header>
        <div className="flex-1 overflow-y-auto px-10 py-8">
        <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {settingsSection === 'account' && <div className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-medium text-slate-900">{t('Account')}</h2><p className="mt-1 text-sm text-slate-500">Your Google or verified email identity anchors entitlement and device slots. Business data stays local.</p></div>{lightbiAccount.account && <button type="button" onClick={() => void lightbiAccount.logout()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" />{t('Log out')}</button>}</div>
          {!lightbiAccount.account ? <AccountAccess account={lightbiAccount} /> : <div className="space-y-4"><div className="flex flex-col gap-4 rounded-xl border border-slate-200 p-5 sm:flex-row sm:items-center"><div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-amber-400 font-semibold text-slate-900">{lightbiAccount.account.account.avatar_url ? <img src={lightbiAccount.account.account.avatar_url} alt="" className="h-full w-full object-cover" /> : (lightbiAccount.account.account.display_name || lightbiAccount.account.account.email).slice(0,2).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="truncate font-semibold text-slate-900">{lightbiAccount.account.account.display_name || lightbiAccount.account.account.email}</div><div className="truncate text-sm text-slate-500">{lightbiAccount.account.account.email}</div></div><div className="rounded-lg bg-slate-900 px-4 py-3 text-white"><div className="text-[10px] uppercase tracking-wider text-slate-400">Plan</div><div className="font-semibold uppercase">{lightbiAccount.account.entitlement.tier}</div><div className="text-xs text-slate-400">{lightbiAccount.account.entitlement.max_devices} device slots</div></div></div><div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 font-semibold text-slate-900"><KeyRound className="h-4 w-4 text-violet-600" />Redeem Pro key</div><div className="mt-3 flex gap-2"><input type="password" value={accountLicenseKey} onChange={event=>setAccountLicenseKey(event.target.value)} placeholder="LBI-PRO-…" className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm"/><button type="button" onClick={async()=>{await lightbiAccount.redeem(accountLicenseKey);setAccountLicenseKey('');}} className="rounded-md bg-violet-600 px-3 py-2 text-sm font-semibold text-white">Redeem</button></div></div><div className="rounded-xl border border-slate-200 p-4"><div className="flex items-center gap-2 font-semibold text-slate-900"><Monitor className="h-4 w-4 text-emerald-600" />Devices</div><div className="mt-2 space-y-2">{lightbiAccount.account.devices.length ? lightbiAccount.account.devices.map(device=><div key={device.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2 text-xs"><span className="min-w-0 truncate">{device.display_name || device.platform || 'LightBI device'} · {device.status}</span>{device.status==='active'&&<button type="button" onClick={()=>void lightbiAccount.revokeDevice(device.id)} className="font-semibold text-red-600">Revoke</button>}</div>) : <div className="text-sm text-slate-500">No native devices connected.</div>}</div></div></div></div>}
          {lightbiAccount.error && <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{lightbiAccount.error}</div>}
        </div>}
        {settingsSection === 'general' && <div className="p-6">
          <h2 className="mb-4 text-lg font-medium text-slate-900">{t('Application')}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
              <Laptop className="mt-0.5 h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-slate-800">{nativeState?.runtime.native ? t('Windows native app') : t('Web QA harness')}</div>
                <div className="mt-1 text-sm text-slate-500">{t('LightBI Beta · local-first analysis')}</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-700" />
              <div>
                <div className="font-medium text-emerald-900">{nativeState?.license.edition ?? 'Loading Beta status…'}</div>
                <div className="mt-1 text-sm text-emerald-800/70">{t('No license key or feature restriction during Beta.')}</div>
              </div>
            </div>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <label className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4">
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
            <div className="rounded-lg border border-slate-200 p-4">
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
              <a href="https://lightbi.thaiduy.digital/distribution/#plans" className="mt-2 inline-block text-xs font-semibold text-blue-700">{t('View Basic and Pro plans')}</a>
            </div>
          </div>
        </div>}

        {settingsSection === 'appearance' && <div className="p-6">
          <h2 className="mb-4 text-lg font-medium text-slate-900">{t('Language and reporting defaults')}</h2>
          <p className="mb-4 text-sm leading-6 text-slate-500">
            {t(
              'Easy Mode uses these defaults automatically. LightBI asks again only when a source contains conflicting evidence.',
            )}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
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
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
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
          <div className="mt-3 flex items-center justify-between rounded-md border border-slate-200 p-4">
            <div>
              <div className="font-medium text-slate-800">{t('Theme')}</div>
              <div className="text-sm text-slate-500">{t('Light theme is optimized for the Beta workspace.')}</div>
            </div>
            <span className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">{t('Light')}</span>
          </div>
        </div>}

        {settingsSection === 'privacy' && <div className="p-6">
          <h2 className="mb-4 text-lg font-medium text-slate-900">{t('Local data boundary')}</h2>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-md border border-slate-200 p-4">
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
            <div className="flex items-center justify-between rounded-md border border-slate-200 p-4">
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
