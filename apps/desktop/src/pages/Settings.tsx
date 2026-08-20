import React, { useEffect, useState } from 'react';
import { CheckCircle2, Coins, Globe2, HardDrive, Laptop, ShieldCheck } from 'lucide-react';
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

export const Settings: React.FC = () => {
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

  useEffect(() => {
    void readNativeRuntime().then(setNativeState);
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{t('Settings')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('Your LightBI workspace, display, analysis defaults, and Beta access.')}</p>
      </div>
      
      <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
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
        </div>

        <div className="border-b border-slate-200 p-6">
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
        </div>

        <div className="p-6">
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
        </div>
      </div>
    </div>
  );
};
