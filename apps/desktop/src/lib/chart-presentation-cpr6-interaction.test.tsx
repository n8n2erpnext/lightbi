// @vitest-environment jsdom
import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ChartPreviewModel } from './chart-preview-model';
import { CHART_PALETTE_PRESETS_V1 } from './visualization-palette';
import { useDisplayPreferences } from '../stores/display-preferences-store';

const chartMock = vi.hoisted(() => ({
  clickHandler: null as null | ((params: any) => void),
  options: [] as any[],
  cursors: [] as string[],
}));

vi.mock('echarts', () => ({
  init: vi.fn(() => ({
    setOption: (option: any) => chartMock.options.push(option),
    getZr: () => ({ setCursorStyle: (cursor: string) => chartMock.cursors.push(cursor) }),
    on: (event: string, handler: (params: any) => void) => { if (event === 'click') chartMock.clickHandler = handler; },
    off: vi.fn(), resize: vi.fn(), dispose: vi.fn(),
  })),
  graphic: { LinearGradient: vi.fn((...args: any[]) => ({ args })) },
}));

import { ChartPreviewRenderer } from '../components/analysis/ChartPreviewRenderer';
import { DisplayPreferencesModal } from '../components/settings/DisplayPreferencesModal';
import { HomeResultView } from '../components/home/HomeResultView';

const model: ChartPreviewModel = {
  id: 'cpr6-chart', sourceResultId: 'cpr6-result', status: 'ready', chartType: 'bar', title: 'Revenue by product',
  xField: 'Product', yField: 'Revenue', seriesFields: ['Revenue'],
  rows: [{ Product: 'A', Revenue: 10 }, { Product: 'B', Revenue: 7 }], warnings: [], source: 'duckdb_preview_result',
};

beforeEach(() => {
  chartMock.clickHandler = null; chartMock.options.length = 0; chartMock.cursors.length = 0;
  useDisplayPreferences.getState().resetPreferences();
});
afterEach(() => cleanup());

describe('CPR-6 C8/C9 owner-visible chart UX', () => {
  it('applies a palette selection immediately to a rendered chart and persists it in display preferences', async () => {
    render(<><DisplayPreferencesModal isOpen onClose={() => {}} /><ChartPreviewRenderer model={model} /></>);
    await waitFor(() => expect(chartMock.options.length).toBeGreaterThan(0));
    expect((chartMock.options.at(-1) as any).series[0].itemStyle.color).toBe(CHART_PALETTE_PRESETS_V1.lightbi.qualitative[0]);
    fireEvent.click(screen.getByTestId('chart-palette-ocean'));
    expect(useDisplayPreferences.getState().preferences.chartPalette).toBe('ocean');
    await waitFor(() => expect((chartMock.options.at(-1) as any).series[0].itemStyle.color).toBe(CHART_PALETTE_PRESETS_V1.ocean.qualitative[0]));
  });

  it('shows the localized drill affordance and emits the exact selected chart evidence point', async () => {
    useDisplayPreferences.getState().updatePreferences({ language: 'vi', locale: 'vi-VN' });
    const onDrillThrough = vi.fn();
    render(<ChartPreviewRenderer model={model} onDrillThrough={onDrillThrough} />);
    expect((await screen.findByTestId('chart-drill-affordance')).textContent).toContain('Nhấp vào điểm hoặc cột trên biểu đồ');
    expect(chartMock.cursors).toContain('pointer');
    expect(chartMock.clickHandler).not.toBeNull();
    act(() => chartMock.clickHandler?.({ dataIndex: 0, seriesName: 'Revenue' }));
    expect(onDrillThrough).toHaveBeenCalledWith(expect.objectContaining({
      dimensionField: 'Product', value: 'A', measureField: 'Revenue', measureValue: 10,
    }));
  });

  it('keeps raw governance codes off the normal blocked business surface', () => {
    useDisplayPreferences.getState().updatePreferences({ language: 'vi', locale: 'vi-VN' });
    render(<HomeResultView result={{ status: 'blocked', message: '', blockedReasons: ['governed_identity_required_for_count'] }} chartOption={{}} onFollowUp={() => {}} />);
    expect(screen.queryByText(/governed_identity_required_for_count/)).toBeNull();
    expect(screen.getByText(/Xác nhận định danh nghiệp vụ/)).toBeDefined();
  });
});
