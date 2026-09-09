import React from 'react';
import { X } from 'lucide-react';
import { useDisplayPreferences } from '../../stores/display-preferences-store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type PreferenceFieldProps = {
  label: string;
  children: React.ReactNode;
};

const PreferenceField: React.FC<PreferenceFieldProps> = ({ label, children }) => (
  <label className="block min-w-0 py-4">
    <span className="block text-[12px] font-semibold text-black/60">{label}</span>
    <span className="mt-2 block">{children}</span>
  </label>
);

export const DisplayPreferencesModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { preferences, updatePreferences, resetPreferences } = useDisplayPreferences();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm md:px-8" role="dialog" aria-modal="true" aria-labelledby="display-preferences-title">
      <div className="flex max-h-[90vh] w-full max-w-[var(--lb-dialog-width)] flex-col overflow-hidden rounded-[var(--lb-radius-strong)] border border-[var(--lb-divider)] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--lb-divider)] px-6 py-5">
          <div>
            <h2 id="display-preferences-title" className="text-[18px] font-semibold text-[var(--lb-ink)]">Display Preferences</h2>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-black/45 transition-colors hover:bg-black/[0.035] hover:text-black" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="grid border-b border-[var(--lb-divider)] md:grid-cols-2 md:divide-x md:divide-[var(--lb-divider)]">
            <PreferenceField label="Locale">
              <select value={preferences.locale} onChange={(e) => updatePreferences({ locale: e.target.value })} className="lb-control w-full px-3 py-2">
                <option value="en-US">English (US)</option>
                <option value="vi-VN">Vietnamese</option>
                <option value="ar-SA">Arabic (Saudi Arabia)</option>
              </select>
            </PreferenceField>
            <div className="md:pl-5"><PreferenceField label="Timezone">
              <select value={preferences.timezone} onChange={(e) => updatePreferences({ timezone: e.target.value })} className="lb-control w-full px-3 py-2">
                <option value="auto">Auto</option>
                <option value="UTC">UTC</option>
                <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh</option>
              </select>
            </PreferenceField></div>
          </div>

          <div className="grid border-b border-[var(--lb-divider)] md:grid-cols-2 md:divide-x md:divide-[var(--lb-divider)]">
            <PreferenceField label="Number Style">
              <select value={preferences.numberStyle} onChange={(e) => updatePreferences({ numberStyle: e.target.value as any })} className="lb-control w-full px-3 py-2">
                <option value="plain">Plain</option>
                <option value="accounting">Accounting</option>
              </select>
            </PreferenceField>
            <div className="md:pl-5"><PreferenceField label="Currency Display">
              <select value={preferences.currencyDisplay} onChange={(e) => updatePreferences({ currencyDisplay: e.target.value as any })} className="lb-control w-full px-3 py-2">
                <option value="none">None</option>
                <option value="symbol">Symbol</option>
                <option value="code">Code</option>
              </select>
            </PreferenceField></div>
          </div>

          <div className="grid border-b border-[var(--lb-divider)] md:grid-cols-2 md:divide-x md:divide-[var(--lb-divider)]">
            <PreferenceField label="Decimal Places">
              <select value={preferences.decimalPlaces} onChange={(e) => updatePreferences({ decimalPlaces: e.target.value === 'auto' ? 'auto' : Number(e.target.value) as any })} className="lb-control w-full px-3 py-2">
                <option value="auto">Auto</option><option value="0">0</option><option value="2">2</option><option value="4">4</option>
              </select>
            </PreferenceField>
            <div className="md:pl-5"><PreferenceField label="Thousands Separator">
              <select value={preferences.thousandsSeparator} onChange={(e) => updatePreferences({ thousandsSeparator: e.target.value as any })} className="lb-control w-full px-3 py-2">
                <option value="locale">Locale Default</option><option value="comma">Comma (,)</option><option value="dot">Dot (.)</option><option value="space">Space</option>
              </select>
            </PreferenceField></div>
          </div>

          <div className="grid border-b border-[var(--lb-divider)] md:grid-cols-2 md:divide-x md:divide-[var(--lb-divider)]">
            <PreferenceField label="Negative Style">
              <select value={preferences.negativeStyle} onChange={(e) => updatePreferences({ negativeStyle: e.target.value as any })} className="lb-control w-full px-3 py-2">
                <option value="minus">Minus Sign (-)</option><option value="parentheses">Parentheses ()</option>
              </select>
            </PreferenceField>
            <div className="md:pl-5"><PreferenceField label="Date Format">
              <select value={preferences.dateFormat} onChange={(e) => updatePreferences({ dateFormat: e.target.value as any })} className="lb-control w-full px-3 py-2">
                <option value="locale">Locale Default</option><option value="short">Short</option><option value="long">Long</option><option value="iso">ISO-like</option>
              </select>
            </PreferenceField></div>
          </div>

          <div className="grid md:grid-cols-2 md:divide-x md:divide-[var(--lb-divider)]">
            <PreferenceField label="Time Format">
              <select value={preferences.timeFormat} onChange={(e) => updatePreferences({ timeFormat: e.target.value as any })} className="lb-control w-full px-3 py-2">
                <option value="locale">Locale Default</option><option value="12h">12-hour (AM/PM)</option><option value="24h">24-hour</option>
              </select>
            </PreferenceField>
            <div className="md:pl-5"><PreferenceField label="Datetime Format">
              <select value={preferences.datetimeFormat} onChange={(e) => updatePreferences({ datetimeFormat: e.target.value as any })} className="lb-control w-full px-3 py-2">
                <option value="locale">Locale Default</option><option value="compact">Compact</option><option value="detailed">Detailed</option>
              </select>
            </PreferenceField></div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[var(--lb-divider)] bg-[var(--lb-surface-subtle)] px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" className="min-h-9 px-4 text-sm font-semibold text-black/55 transition-colors hover:bg-black/[0.035]" onClick={resetPreferences}>Reset to Default</button>
          <button type="button" className="lb-action-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
};
