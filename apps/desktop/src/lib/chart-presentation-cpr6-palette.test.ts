import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from '../stores/display-preferences-store';
import { generateDashboardChartOptions } from '../components/dashboards/DashboardChartWidget';
import {
  CHART_PALETTE_PRESET_IDS_V1,
  CHART_PALETTE_PRESETS_V1,
  visualizationPalette,
} from './visualization-palette';

describe('CPR-6 C8 palette/theme contract', () => {
  it('keeps ordinary line, column, row and combo families on one coherent preset identity', () => {
    for (const presetId of CHART_PALETTE_PRESET_IDS_V1) {
      const expected = CHART_PALETTE_PRESETS_V1[presetId].qualitative[0];
      for (const family of ['line', 'column', 'row', 'combo_bar_line'] as const) {
        expect(visualizationPalette({ family, presetId })[0], `${presetId}:${family}`).toBe(expected);
      }
    }
  });

  it('changes compatible renderer colors by preference without changing chart data', () => {
    const props = {
      title: 'Revenue by product', chartType: 'row' as const, rendererFamily: 'row' as const,
      data: [{ Product: 'A', Revenue: 10 }, { Product: 'B', Revenue: 7 }],
      xAxisKey: 'Product', seriesKey: 'Revenue', seriesKeys: ['Revenue'], valueType: 'currency' as const, colSpan: 20,
    };
    const lightbi = generateDashboardChartOptions(props, { ...DEFAULT_PREFERENCES, chartPalette: 'lightbi' }, false) as any;
    const ocean = generateDashboardChartOptions(props, { ...DEFAULT_PREFERENCES, chartPalette: 'ocean' }, false) as any;
    expect(lightbi.series[0].data).toEqual(ocean.series[0].data);
    expect(lightbi.series[0].itemStyle.color).toBe(CHART_PALETTE_PRESETS_V1.lightbi.qualitative[0]);
    expect(ocean.series[0].itemStyle.color).toBe(CHART_PALETTE_PRESETS_V1.ocean.qualitative[0]);
    expect(ocean.series[0].itemStyle.color).not.toBe(lightbi.series[0].itemStyle.color);
  });

  it('keeps sequential and diverging semantics inside the selected preset', () => {
    for (const presetId of CHART_PALETTE_PRESET_IDS_V1) {
      expect(visualizationPalette({ presetId, colorSemantics: ['sequential'] }))
        .toEqual([...CHART_PALETTE_PRESETS_V1[presetId].sequential]);
      expect(visualizationPalette({ presetId, colorSemantics: ['diverging'] }))
        .toEqual([...CHART_PALETTE_PRESETS_V1[presetId].diverging]);
    }
  });
});
