import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DisplayPreferences {
  language: 'en' | 'vi';
  locale: string; // e.g., 'en-US', 'vi-VN', 'ar-SA'
  currencyCode: string; // ISO 4217 reporting currency selected by the user
  timezone: string; // e.g., 'auto', 'UTC', 'Asia/Ho_Chi_Minh'
  numberStyle: 'plain' | 'accounting';
  currencyDisplay: 'none' | 'symbol' | 'code';
  decimalPlaces: 'auto' | 0 | 2 | 4;
  thousandsSeparator: 'locale' | 'comma' | 'dot' | 'space';
  negativeStyle: 'minus' | 'parentheses';
  dateFormat: 'locale' | 'short' | 'long' | 'iso';
  timeFormat: 'locale' | '12h' | '24h';
  datetimeFormat: 'locale' | 'compact' | 'detailed';
}

interface DisplayPreferencesState {
  preferences: DisplayPreferences;
  updatePreferences: (updates: Partial<DisplayPreferences>) => void;
  resetPreferences: () => void;
}

export const DEFAULT_PREFERENCES: DisplayPreferences = {
  language: 'en',
  locale: 'en-US',
  currencyCode: 'USD',
  timezone: 'auto',
  numberStyle: 'plain',
  currencyDisplay: 'symbol',
  decimalPlaces: 'auto',
  thousandsSeparator: 'locale',
  negativeStyle: 'minus',
  dateFormat: 'locale',
  timeFormat: 'locale',
  datetimeFormat: 'locale'
};

export const useDisplayPreferences = create<DisplayPreferencesState>()(
  persist(
    (set) => ({
      preferences: DEFAULT_PREFERENCES,
      updatePreferences: (updates) => set((state) => ({ preferences: { ...state.preferences, ...updates } })),
      resetPreferences: () => set({ preferences: DEFAULT_PREFERENCES }),
    }),
    {
      name: 'lightbi-display-preferences',
      version: 2,
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<DisplayPreferencesState> | undefined;
        const persistedPreferences = persistedState?.preferences ?? {};
        const locale = persistedPreferences.locale ?? current.preferences.locale;
        return {
          ...current,
          ...persistedState,
          preferences: {
            ...current.preferences,
            ...persistedPreferences,
            language: persistedPreferences.language ?? (locale === 'vi-VN' ? 'vi' : 'en'),
            currencyCode: persistedPreferences.currencyCode
              ?? (locale === 'vi-VN' ? 'VND' : locale === 'ar-SA' ? 'SAR' : 'USD'),
          },
        };
      },
    }
  )
);
