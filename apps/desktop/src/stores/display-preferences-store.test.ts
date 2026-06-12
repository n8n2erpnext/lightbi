import { describe, it, expect, beforeEach } from 'vitest';
import { useDisplayPreferences, DEFAULT_PREFERENCES } from './display-preferences-store';

describe('display-preferences-store', () => {
  beforeEach(() => {
    useDisplayPreferences.getState().resetPreferences();
  });

  it('initializes with default preferences', () => {
    const state = useDisplayPreferences.getState();
    expect(state.preferences).toEqual(DEFAULT_PREFERENCES);
    expect(state.preferences.locale).toBe('en-US');
  });

  it('updates preferences partially', () => {
    useDisplayPreferences.getState().updatePreferences({ locale: 'vi-VN', numberStyle: 'accounting' });
    
    const state = useDisplayPreferences.getState();
    expect(state.preferences.locale).toBe('vi-VN');
    expect(state.preferences.numberStyle).toBe('accounting');
    
    // Other fields remain untouched
    expect(state.preferences.timezone).toBe('auto');
  });

  it('resets to defaults', () => {
    useDisplayPreferences.getState().updatePreferences({ locale: 'vi-VN', numberStyle: 'accounting' });
    useDisplayPreferences.getState().resetPreferences();
    
    const state = useDisplayPreferences.getState();
    expect(state.preferences).toEqual(DEFAULT_PREFERENCES);
  });
});
