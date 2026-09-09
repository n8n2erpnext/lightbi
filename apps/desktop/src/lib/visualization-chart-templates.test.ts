import { describe, expect, it } from 'vitest';
import { VISUALIZATION_CHART_TEMPLATE_LIBRARY_V1 } from './visualization-chart-templates';
import { VISUALIZATION_PATTERN_LIBRARY_V1 } from './visualization-ontology';

it('publishes all 30 canonical visualization patterns in the Chart Library', () => {
  const templateIds = VISUALIZATION_CHART_TEMPLATE_LIBRARY_V1.map(item => item.patternId);
  const ontologyIds = VISUALIZATION_PATTERN_LIBRARY_V1.map(item => item.id);
  expect(templateIds).toHaveLength(30);
  expect(new Set(templateIds).size).toBe(30);
  expect(templateIds).toEqual(ontologyIds);
  expect(VISUALIZATION_CHART_TEMPLATE_LIBRARY_V1.every(item => item.name && item.intent && item.bestFor)).toBe(true);
});

describe('renderer visibility is truthful', () => {
  it('keeps unsupported templates visible rather than fabricating a bar fallback', () => {
    const map = VISUALIZATION_CHART_TEMPLATE_LIBRARY_V1.find(item => item.patternId === 'geospatial_map');
    expect(map?.rendererReady).toBe(false);
    expect(map?.persistedChartType).toBeNull();
  });

  it('marks implemented rich families ready on persistence/dashboard surfaces', () => {
    for (const id of ['sparkline','trend_area','grouped_compare','composition_stack','composition_100','target_combo','variance_waterfall','distribution_histogram','distribution_box','relationship_bubble','matrix_heatmap','cohort_retention','process_funnel','concentration_pareto','target_bullet','variance_diverging','calendar_intensity','flow_sankey','event_timeline','process_control','small_multiples','profile_radar'] as const) {
      expect(VISUALIZATION_CHART_TEMPLATE_LIBRARY_V1.find(item => item.patternId === id)?.rendererReady, id).toBe(true);
    }
  });
});
