import { describe, it, expect, beforeEach } from 'vitest';
import { useDisplayPreferences, DEFAULT_PREFERENCES, migrateDisplayPreferences } from './display-preferences-store';

describe('display-preferences-store', () => {
  beforeEach(() => {
    useDisplayPreferences.getState().resetPreferences();
  });

  it('initializes with default preferences', () => {
    const state = useDisplayPreferences.getState();
    expect(state.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(state.preferences.locale).toBe('en-US');
    expect(state.preferences.language).toBe('en');
    expect(state.preferences.currencyCode).toBe('USD');
  });

  it('updates preferences partially', () => {
    useDisplayPreferences.getState().updatePreferences({ locale: 'vi-VN', numberStyle: 'accounting' });
    
    const state = useDisplayPreferences.getState();
    expect(state.preferences.locale).toBe('vi-VN');
    expect(state.preferences.numberStyle).toBe('accounting');
    
    // Other fields remain untouched
    expect(state.preferences.timezone).toBe('auto');
  });

  it('stores language and reporting currency as independent global preferences', () => {
    useDisplayPreferences.getState().updatePreferences({ language: 'vi', locale: 'vi-VN', currencyCode: 'USD' });
    const state = useDisplayPreferences.getState();
    expect(state.preferences.language).toBe('vi');
    expect(state.preferences.locale).toBe('vi-VN');
    expect(state.preferences.currencyCode).toBe('USD');
  });

  it('migrates legacy locale-only preferences to safe language and currency defaults', () => {
    const migrated = migrateDisplayPreferences({ locale: 'vi-VN' });
    expect(migrated.language).toBe('vi');
    expect(migrated.currencyCode).toBe('VND');
  });

  it('resets to defaults', () => {
    useDisplayPreferences.getState().updatePreferences({ locale: 'vi-VN', numberStyle: 'accounting' });
    useDisplayPreferences.getState().resetPreferences();
    
    const state = useDisplayPreferences.getState();
    expect(state.preferences).toEqual(DEFAULT_PREFERENCES);
  });
});
