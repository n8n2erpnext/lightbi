import type { VisualizationColorSemanticsV1 } from './visualization-ontology';
import type { VisualizationRendererFamilyV1 } from './visualization-renderer-registry';

export type ChartPalettePresetIdV1 = 'lightbi' | 'ocean' | 'forest' | 'ember' | 'graphite';

export type ChartPalettePresetV1 = {
  id: ChartPalettePresetIdV1;
  label: string;
  qualitative: readonly string[];
  sequential: readonly string[];
  diverging: readonly string[];
};

export const CHART_PALETTE_PRESETS_V1: Record<ChartPalettePresetIdV1, ChartPalettePresetV1> = {
  lightbi: {
    id: 'lightbi', label: 'LightBI Blue',
    qualitative: ['#2563eb', '#0891b2', '#0f766e', '#d97706', '#db2777', '#7c3aed', '#0284c7', '#ea580c'],
    sequential: ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'],
    diverging: ['#db2777', '#cbd5e1', '#2563eb'],
  },
  ocean: {
    id: 'ocean', label: 'Ocean',
    qualitative: ['#0369a1', '#0e7490', '#0f766e', '#4338ca', '#2563eb', '#0891b2', '#4f46e5', '#0284c7'],
    sequential: ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#075985'],
    diverging: ['#be123c', '#cbd5e1', '#0369a1'],
  },
  forest: {
    id: 'forest', label: 'Forest',
    qualitative: ['#166534', '#0f766e', '#4d7c0f', '#a16207', '#0369a1', '#7c3aed', '#15803d', '#65a30d'],
    sequential: ['#dcfce7', '#86efac', '#22c55e', '#166534'],
    diverging: ['#be123c', '#d1d5db', '#166534'],
  },
  ember: {
    id: 'ember', label: 'Ember',
    qualitative: ['#c2410c', '#d97706', '#be123c', '#7c3aed', '#0369a1', '#0f766e', '#ea580c', '#a16207'],
    sequential: ['#ffedd5', '#fdba74', '#f97316', '#9a3412'],
    diverging: ['#be123c', '#d1d5db', '#0369a1'],
  },
  graphite: {
    id: 'graphite', label: 'Graphite',
    qualitative: ['#334155', '#475569', '#2563eb', '#0f766e', '#7c3aed', '#b45309', '#0369a1', '#64748b'],
    sequential: ['#f1f5f9', '#cbd5e1', '#64748b', '#334155'],
    diverging: ['#be123c', '#cbd5e1', '#334155'],
  },
};

export const CHART_PALETTE_PRESET_IDS_V1 = Object.freeze(Object.keys(CHART_PALETTE_PRESETS_V1) as ChartPalettePresetIdV1[]);
export const LIGHTBI_QUALITATIVE_PALETTE_V1 = CHART_PALETTE_PRESETS_V1.lightbi.qualitative;
export const LIGHTBI_SEQUENTIAL_PALETTE_V1 = CHART_PALETTE_PRESETS_V1.lightbi.sequential;
export const LIGHTBI_DIVERGING_SIGNED_PALETTE_V1 = CHART_PALETTE_PRESETS_V1.lightbi.diverging;

export function isChartPalettePresetIdV1(value: unknown): value is ChartPalettePresetIdV1 {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CHART_PALETTE_PRESETS_V1, value);
}

export function visualizationPalette(input: {
  family?: VisualizationRendererFamilyV1 | null;
  colorSemantics?: readonly VisualizationColorSemanticsV1[] | null;
  presetId?: ChartPalettePresetIdV1 | null;
} = {}): string[] {
  const semantics = input.colorSemantics ?? [];
  const preset = CHART_PALETTE_PRESETS_V1[input.presetId ?? 'lightbi'] ?? CHART_PALETTE_PRESETS_V1.lightbi;
  if (semantics.includes('diverging')) return [...preset.diverging];
  if (semantics.includes('sequential') && !semantics.includes('categorical')) return [...preset.sequential];
  // Ordinary single-series charts deliberately share preset[0] across line,
  // column and horizontal ranking families. Renderer geometry must not invent
  // a disconnected visual identity.
  return [...preset.qualitative];
}

export function visualizationSeriesColor(index: number, input: Parameters<typeof visualizationPalette>[0] = {}): string {
  const palette = visualizationPalette(input);
  return palette[Math.abs(index) % palette.length];
}
