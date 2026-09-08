import type { ChartType } from '@lightbi/core-types';
import type { VisualizationPatternIdV1 } from './visualization-ontology';

export const VISUALIZATION_RENDERER_REGISTRY_VERSION = 'lightbi.visualization-renderer-registry.v1' as const;

export type VisualizationRendererSurfaceV1 = 'preview' | 'persistence' | 'dashboard';
export type VisualizationRendererFamilyV1 =
  | 'number' | 'sparkline' | 'line' | 'area' | 'column' | 'bar'
  | 'grouped_bar' | 'stacked_bar' | 'normalized_stacked' | 'combo_bar_line'
  | 'donut' | 'waterfall' | 'histogram' | 'box_plot' | 'scatter' | 'bubble'
  | 'heatmap' | 'cohort_heatmap' | 'funnel' | 'pareto' | 'bullet'
  | 'diverging_bar' | 'calendar_heatmap' | 'map' | 'sankey' | 'table'
  | 'timeline' | 'control_chart' | 'small_multiples' | 'radar';

export type VisualizationRendererCapabilityV1 = {
  family: VisualizationRendererFamilyV1;
  persistedChartType: ChartType | null;
  surfaces: Record<VisualizationRendererSurfaceV1, boolean>;
};

const cap = (
  family: VisualizationRendererFamilyV1,
  persistedChartType: ChartType | null,
  preview: boolean,
  persistence: boolean,
  dashboard: boolean,
): VisualizationRendererCapabilityV1 => ({ family, persistedChartType, surfaces: { preview, persistence, dashboard } });
export const VISUALIZATION_RENDERER_CAPABILITIES_V1: Readonly<Record<VisualizationRendererFamilyV1, VisualizationRendererCapabilityV1>> = {
  number: cap('number', 'Number', false, true, true),
  sparkline: cap('sparkline', null, false, false, false),
  line: cap('line', 'Line', true, true, true),
  area: cap('area', null, false, false, false),
  column: cap('column', 'Bar', true, true, true),
  bar: cap('bar', 'Bar', true, true, true),
  grouped_bar: cap('grouped_bar', null, false, false, false),
  stacked_bar: cap('stacked_bar', null, false, false, false),
  normalized_stacked: cap('normalized_stacked', null, false, false, false),
  combo_bar_line: cap('combo_bar_line', null, false, false, false),
  donut: cap('donut', 'Donut', false, true, true),
  waterfall: cap('waterfall', null, false, false, false),
  histogram: cap('histogram', null, false, false, false),
  box_plot: cap('box_plot', null, false, false, false),
  scatter: cap('scatter', 'Scatter', true, true, true),
  bubble: cap('bubble', 'Bubble', false, true, false),
  heatmap: cap('heatmap', null, false, false, false),
  cohort_heatmap: cap('cohort_heatmap', null, false, false, false),
  funnel: cap('funnel', 'Funnel', false, true, false),
  pareto: cap('pareto', null, false, false, false),
  bullet: cap('bullet', null, false, false, false),
  diverging_bar: cap('diverging_bar', null, false, false, false),
  calendar_heatmap: cap('calendar_heatmap', null, false, false, false),
  map: cap('map', null, false, false, false),
  sankey: cap('sankey', null, false, false, false),
  table: cap('table', 'Table', true, true, true),
  timeline: cap('timeline', null, false, false, false),
  control_chart: cap('control_chart', null, false, false, false),
  small_multiples: cap('small_multiples', null, false, false, false),
  radar: cap('radar', null, false, false, false),
};

export const VISUALIZATION_PATTERN_RENDERER_FAMILY_V1: Readonly<Record<VisualizationPatternIdV1, VisualizationRendererFamilyV1>> = {
  kpi_summary: 'number', sparkline: 'sparkline', trend_line: 'line', trend_area: 'area',
  category_compare: 'bar', ranking_bar: 'bar', grouped_compare: 'grouped_bar',
  composition_stack: 'stacked_bar', composition_100: 'normalized_stacked', target_combo: 'combo_bar_line',
  composition_donut: 'donut', variance_waterfall: 'waterfall', distribution_histogram: 'histogram',
  distribution_box: 'box_plot', relationship_scatter: 'scatter', relationship_bubble: 'bubble',
  matrix_heatmap: 'heatmap', cohort_retention: 'cohort_heatmap', process_funnel: 'funnel',
  concentration_pareto: 'pareto', target_bullet: 'bullet', variance_diverging: 'diverging_bar',
  calendar_intensity: 'calendar_heatmap', geospatial_map: 'map', flow_sankey: 'sankey',
  evidence_table: 'table', event_timeline: 'timeline', process_control: 'control_chart',
  small_multiples: 'small_multiples', profile_radar: 'radar',
};
export function rendererCapabilityForPattern(
  patternId: VisualizationPatternIdV1,
): VisualizationRendererCapabilityV1 {
  return VISUALIZATION_RENDERER_CAPABILITIES_V1[VISUALIZATION_PATTERN_RENDERER_FAMILY_V1[patternId]];
}

export function rendererSupportsSurfaces(
  patternId: VisualizationPatternIdV1,
  requiredSurfaces: readonly VisualizationRendererSurfaceV1[],
): boolean {
  const capability = rendererCapabilityForPattern(patternId);
  return requiredSurfaces.every(surface => capability.surfaces[surface]);
}
