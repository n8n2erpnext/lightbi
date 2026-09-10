import { describe, expect, it } from 'vitest';
import {
  VISUALIZATION_PATTERN_RENDERER_FAMILY_V1,
  VISUALIZATION_RENDERER_CAPABILITIES_V1,
  rendererSupportsSurfaces,
} from './visualization-renderer-registry';
import { VISUALIZATION_PATTERN_LIBRARY_V1 } from './visualization-ontology';

describe('DPR-6 renderer registry', () => {
  it('binds every DPR-5 pattern to exactly one renderer family outside the ontology', () => {
    const patternIds = VISUALIZATION_PATTERN_LIBRARY_V1.map(pattern => pattern.id).sort();
    expect(Object.keys(VISUALIZATION_PATTERN_RENDERER_FAMILY_V1).sort()).toEqual(patternIds);
    expect(JSON.stringify(VISUALIZATION_PATTERN_LIBRARY_V1)).not.toContain('rendererFamily');
  });

  it('marks only actually implemented surfaces available', () => {
    expect(rendererSupportsSurfaces('trend_line', ['preview','persistence','dashboard'])).toBe(true);
    expect(rendererSupportsSurfaces('relationship_scatter', ['preview','persistence','dashboard'])).toBe(true);
    expect(rendererSupportsSurfaces('composition_donut', ['preview','persistence','dashboard'])).toBe(true);
    expect(rendererSupportsSurfaces('distribution_histogram', ['preview','persistence','dashboard'])).toBe(true);
    expect(rendererSupportsSurfaces('distribution_box', ['preview','persistence','dashboard'])).toBe(true);
    expect(rendererSupportsSurfaces('matrix_heatmap', ['preview','persistence','dashboard'])).toBe(true);
    expect(rendererSupportsSurfaces('flow_sankey', ['preview','persistence','dashboard'])).toBe(true);
    expect(rendererSupportsSurfaces('geospatial_map', ['preview','persistence','dashboard'])).toBe(false);
    expect(VISUALIZATION_RENDERER_CAPABILITIES_V1.scatter.persistedChartType).toBe('Scatter');
  });
});
