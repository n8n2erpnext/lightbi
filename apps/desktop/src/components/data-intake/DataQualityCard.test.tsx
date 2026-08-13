// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataQualityCard } from './DataQualityCard';
import * as displayPreferencesStore from '../../stores/display-preferences-store';

// Mock the store so we can force specific preferences
vi.mock('../../stores/display-preferences-store', () => {
  return {
    useDisplayPreferences: vi.fn(),
  };
});

describe('DataQualityCard formatting', () => {
  it('formats large numbers compactly safely', () => {
    // Setup mock preferences with en-US to ensure "M" notation
    vi.mocked(displayPreferencesStore.useDisplayPreferences).mockReturnValue({
      preferences: {
        locale: 'en-US',
        timezone: 'UTC',
        numberStyle: 'plain',
        currencyDisplay: 'symbol',
        decimalPlaces: 'auto',
        thousandsSeparator: 'comma',
        negativeStyle: 'minus',
        dateFormat: 'short',
        timeFormat: '24h',
        datetimeFormat: 'compact',
      },
      updatePreferences: vi.fn(),
      resetPreferences: vi.fn(),
    });

    const healthMock = {
      overall: 95,
      completeness: 1500000, // Large number to test compact formatting
      consistency: 85,
      uniqueness: 90,
      keyQuality: 92,
      warnings: [],
    };

    render(<DataQualityCard health={healthMock} />);

    // The completeness grid item should render as "1.5M"
    expect(screen.getByText('1.5M')).toBeTruthy();
  });

  it('renders a fallback safely for null values', () => {
    vi.mocked(displayPreferencesStore.useDisplayPreferences).mockReturnValue({
      preferences: {
        locale: 'en-US',
        timezone: 'UTC',
        numberStyle: 'plain',
        currencyDisplay: 'symbol',
        decimalPlaces: 'auto',
        thousandsSeparator: 'comma',
        negativeStyle: 'minus',
        dateFormat: 'short',
        timeFormat: '24h',
        datetimeFormat: 'compact',
      },
      updatePreferences: vi.fn(),
      resetPreferences: vi.fn(),
    });

    const healthMock = {
      overall: null as any,
      completeness: null as any,
      consistency: null as any,
      uniqueness: undefined as any,
      keyQuality: null as any,
      warnings: [],
    };

    render(<DataQualityCard health={healthMock} />);

    // Our formatValue helper returns "-" for nulls
    const dashElements = screen.getAllByText('-');
    expect(dashElements.length).toBeGreaterThan(0);
  });
});
