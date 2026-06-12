// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardKPIWidget } from './DashboardKPIWidget';
import * as displayPreferencesStore from '../../stores/display-preferences-store';

// Mock the store so we can force specific preferences
vi.mock('../../stores/display-preferences-store', () => {
  return {
    useDisplayPreferences: vi.fn(),
  };
});

describe('DashboardKPIWidget formatting', () => {
  const setupMockStore = () => {
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
  };

  it('compacts large numbers if the widget is narrow (colSpan <= 5)', () => {
    setupMockStore();

    render(
      <DashboardKPIWidget 
        title="Test Metric" 
        value={1500000} 
        valueType="number"
        colSpan={5} // Compact trigger
        rowSpan={3}
      />
    );

    // Should render the compact '1.5M'
    expect(screen.getByText('1.5M')).toBeTruthy();
  });

  it('does NOT compact large numbers if the widget is wide (colSpan > 5)', () => {
    setupMockStore();

    render(
      <DashboardKPIWidget 
        title="Test Metric" 
        value={1500000} 
        valueType="number"
        colSpan={6} // Wide trigger
        rowSpan={3}
      />
    );

    // Should render standard notation '1,500,000'
    expect(screen.getByText('1,500,000')).toBeTruthy();
  });

  it('renders a fallback safely for null values', () => {
    setupMockStore();

    render(
      <DashboardKPIWidget 
        title="Test Metric" 
        value={null} 
        valueType="number"
        colSpan={5}
        rowSpan={3}
      />
    );

    // Should fallback to "-"
    expect(screen.getByText('-')).toBeTruthy();
  });
});
