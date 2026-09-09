import type { VisualizationColorSemanticsV1 } from './visualization-ontology';
import type { VisualizationRendererFamilyV1 } from './visualization-renderer-registry';

export const LIGHTBI_QUALITATIVE_PALETTE_V1 = [
  '#2563eb', // blue
  '#0891b2', // cyan
  '#0f766e', // teal
  '#d97706', // amber
  '#db2777', // pink
  '#7c3aed', // violet - one accent, not the default identity
  '#0284c7', // sky
  '#ea580c', // orange
] as const;

export const LIGHTBI_SEQUENTIAL_PALETTE_V1 = ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'] as const;
export const LIGHTBI_DIVERGING_SIGNED_PALETTE_V1 = ['#db2777', '#cbd5e1', '#2563eb'] as const;

const FAMILY_PRIMARY: Partial<Record<VisualizationRendererFamilyV1, string>> = {
  line: '#2563eb', area: '#0891b2', column: '#2563eb', bar: '#2563eb', row: '#0f766e',
  grouped_bar: '#2563eb', stacked_bar: '#0891b2', normalized_stacked: '#0f766e',
  combo_bar_line: '#2563eb', donut: '#0891b2', waterfall: '#2563eb', histogram: '#0284c7',
  box_plot: '#0f766e', scatter: '#d97706', bubble: '#0891b2', heatmap: '#2563eb',
  funnel: '#0284c7', pareto: '#2563eb', bullet: '#0f766e', diverging_bar: '#2563eb',
  control_chart: '#2563eb', radar: '#0891b2', small_multiples: '#2563eb',
};

export function visualizationPalette(input: {
  family?: VisualizationRendererFamilyV1 | null;
  colorSemantics?: readonly VisualizationColorSemanticsV1[] | null;
} = {}): string[] {
  const semantics = input.colorSemantics ?? [];
  if (semantics.includes('diverging')) return [...LIGHTBI_DIVERGING_SIGNED_PALETTE_V1];
  if (semantics.includes('sequential') && !semantics.includes('categorical')) return [...LIGHTBI_SEQUENTIAL_PALETTE_V1];
  const primary = input.family ? FAMILY_PRIMARY[input.family] : undefined;
  if (!primary) return [...LIGHTBI_QUALITATIVE_PALETTE_V1];
  return [primary, ...LIGHTBI_QUALITATIVE_PALETTE_V1.filter(color => color !== primary)];
}

export function visualizationSeriesColor(index: number, input: Parameters<typeof visualizationPalette>[0] = {}): string {
  const palette = visualizationPalette(input);
  return palette[Math.abs(index) % palette.length];
}
