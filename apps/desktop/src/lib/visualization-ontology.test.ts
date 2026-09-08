import { describe, expect, it } from 'vitest';
import {
  VISUALIZATION_ONTOLOGY_POLICY_V1,
  VISUALIZATION_PATTERN_BY_ID_V1,
  VISUALIZATION_PATTERN_LIBRARY_V1,
  VISUALIZATION_ONTOLOGY_VERSION,
  type VisualizationPatternIdV1,
} from './visualization-ontology';

const get = (id: VisualizationPatternIdV1) => {
  const found = VISUALIZATION_PATTERN_BY_ID_V1.get(id);
  if (!found) throw new Error(`missing pattern: ${id}`);
  return found;
};

describe('DPR-5 visualization ontology', () => {
  it('publishes exactly 30 semantic patterns without renderer bindings', () => {
    expect(VISUALIZATION_ONTOLOGY_VERSION).toBe('lightbi.visualization-ontology.v1');
    expect(VISUALIZATION_PATTERN_LIBRARY_V1).toHaveLength(30);
    expect(new Set(VISUALIZATION_PATTERN_LIBRARY_V1.map(item => item.id)).size).toBe(30);
    const serialized = JSON.stringify(VISUALIZATION_PATTERN_LIBRARY_V1);
    expect(serialized).not.toContain('chartType');
    expect(serialized).not.toContain('renderer');
    expect(VISUALIZATION_ONTOLOGY_POLICY_V1.rendererBindingAllowed).toBe(false);
    expect(VISUALIZATION_ONTOLOGY_POLICY_V1.mbMayAuthorizePattern).toBe(false);
  });

  it('requires evidence, presentation rules and only valid fallbacks for every pattern', () => {
    const ids = new Set(VISUALIZATION_PATTERN_LIBRARY_V1.map(item => item.id));
    for (const item of VISUALIZATION_PATTERN_LIBRARY_V1) {
      expect(item.intents.length, item.id).toBeGreaterThan(0);
      expect(item.oneOfRequiredRoleSets.length, item.id).toBeGreaterThan(0);
      expect(item.oneOfRequiredRoleSets.every(set => set.length > 0), item.id).toBe(true);
      expect(item.labelRules.length, item.id).toBeGreaterThan(0);
      expect(item.axisRules.length, item.id).toBeGreaterThan(0);
      expect(item.tooltipRules.length, item.id).toBeGreaterThan(0);
      expect(item.negativeRules.length, item.id).toBeGreaterThan(0);
      expect(item.fallbacks.every(fallback => ids.has(fallback)), item.id).toBe(true);
      expect(item.fallbacks).not.toContain(item.id);
    }
  });

  it('encodes the high-risk visual negative rules explicitly', () => {
    expect(get('composition_donut').cardinality.maxCategories).toBeLessThanOrEqual(6);
    expect(get('composition_donut').oneOfRequiredRoleSets[0]).toContain('denominator');
    expect(get('profile_radar').cardinality.maxDimensions).toBeLessThanOrEqual(8);
    expect(get('profile_radar').unitPolicy).toBe('normalized_common_scale');
    expect(get('geospatial_map').oneOfRequiredRoleSets[0]).toContain('geo_key');
    expect(get('flow_sankey').oneOfRequiredRoleSets[0]).toEqual(expect.arrayContaining(['source_node','target_node','flow_measure']));
  });

  it('keeps causality, control limits and desirability outside visual inference', () => {
    expect(get('relationship_scatter').negativeRules.join(' ')).toMatch(/same entity grain/i);
    expect(get('relationship_scatter').negativeRules.join(' ')).toMatch(/causation/i);
    expect(get('process_control').oneOfRequiredRoleSets[0]).toContain('control_limit');
    expect(get('process_control').negativeRules.join(' ')).toMatch(/governed/i);
    expect(VISUALIZATION_ONTOLOGY_POLICY_V1.highLowImpliesGoodBad).toBe(false);
    expect(VISUALIZATION_ONTOLOGY_POLICY_V1.statusColorRequiresExplicitDesirability).toBe(true);
    expect(VISUALIZATION_ONTOLOGY_POLICY_V1.defaultDesirability).toBe('unknown');
    expect(get('ranking_bar').negativeRules.join(' ')).toMatch(/desirability evidence/i);
    expect(get('target_bullet').negativeRules.join(' ')).toMatch(/desirability is unknown/i);
  });
});
