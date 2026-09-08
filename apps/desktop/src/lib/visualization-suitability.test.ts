import { describe, expect, it } from 'vitest';
import { evaluateVisualizationSuitability } from './visualization-suitability';

describe('DPR-5 deterministic visualization suitability', () => {
  it('accepts a supported trend shape without choosing a renderer', () => {
    const result = evaluateVisualizationSuitability({
      patternId: 'trend_line', analyticalIntent: 'trend', availableRoles: ['ordered_time','measure'],
      cardinality: { points: 24, series: 1 },
      units: { count: 1, compatible: true, explicitLabels: true, normalizedCommonScale: false },
      requestedColorSemantics: 'neutral', desirability: 'unknown',
    });
    expect(result.eligible).toBe(true);
    expect(result.blockingReasons).toEqual([]);
    expect(result.fallbackPatternIds).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('renderer');
  });

  it('rejects a pattern when its analytical intent does not match the question', () => {
    const result = evaluateVisualizationSuitability({
      patternId: 'composition_donut', analyticalIntent: 'ranking',
      availableRoles: ['category','part_measure','denominator'], cardinality: { categories: 4 },
    });
    expect(result.eligible).toBe(false);
    expect(result.blockingReasons).toEqual(['INTENT_NOT_SUPPORTED']);
    expect(result.fallbackPatternIds).toEqual(['ranking_bar','composition_stack','evidence_table']);
  });

  it('rejects donut when denominator is absent or category count exceeds policy', () => {
    const result = evaluateVisualizationSuitability({
      patternId: 'composition_donut', availableRoles: ['category','part_measure'],
      cardinality: { categories: 9 },
    });
    expect(result.eligible).toBe(false);
    expect(result.blockingReasons).toEqual(expect.arrayContaining([
      'REQUIRED_EVIDENCE_ROLES_MISSING', 'CARDINALITY_CATEGORIES_EXCEEDED',
    ]));
    expect(result.fallbackPatternIds).toEqual(['ranking_bar','composition_stack','evidence_table']);
  });

  it('rejects status coloring when desirability is not explicitly governed', () => {
    const unknown = evaluateVisualizationSuitability({
      patternId: 'target_bullet', availableRoles: ['measure','target'],
      requestedColorSemantics: 'status', desirability: 'unknown',
    });
    expect(unknown.eligible).toBe(false);
    expect(unknown.blockingReasons).toContain('STATUS_COLOR_DESIRABILITY_REQUIRED');

    const governed = evaluateVisualizationSuitability({
      patternId: 'target_bullet', availableRoles: ['measure','target'],
      requestedColorSemantics: 'status', desirability: 'higher_is_favorable',
    });
    expect(governed.eligible).toBe(true);
  });

  it('rejects same-pattern evidence with incompatible units or unnormalized radar scales', () => {
    const trend = evaluateVisualizationSuitability({
      patternId: 'trend_line', availableRoles: ['ordered_time','measure'],
      units: { count: 2, compatible: false, explicitLabels: true, normalizedCommonScale: false },
    });
    expect(trend.blockingReasons).toContain('UNIT_POLICY_COMPATIBLE_UNITS_REQUIRED');
    const radar = evaluateVisualizationSuitability({
      patternId: 'profile_radar', availableRoles: ['entity_key','profile_dimension','measure'],
      units: { count: 1, compatible: true, explicitLabels: true, normalizedCommonScale: false },
      cardinality: { dimensions: 9 },
    });
    expect(radar.blockingReasons).toEqual(expect.arrayContaining([
      'UNIT_POLICY_NORMALIZED_COMMON_SCALE_REQUIRED', 'CARDINALITY_DIMENSIONS_EXCEEDED',
    ]));
  });

  it('rejects map, flow and control patterns when their defining evidence roles are absent', () => {
    const map = evaluateVisualizationSuitability({
      patternId: 'geospatial_map', availableRoles: ['category','measure'],
    });
    expect(map.eligible).toBe(false);
    expect(map.blockingReasons).toContain('REQUIRED_EVIDENCE_ROLES_MISSING');
    expect(map.fallbackPatternIds).toEqual(['ranking_bar','evidence_table']);

    const flow = evaluateVisualizationSuitability({
      patternId: 'flow_sankey', availableRoles: ['source_node','flow_measure'],
    });
    expect(flow.eligible).toBe(false);
    expect(flow.blockingReasons).toContain('REQUIRED_EVIDENCE_ROLES_MISSING');
    expect(flow.fallbackPatternIds).toEqual(['evidence_table']);

    const control = evaluateVisualizationSuitability({
      patternId: 'process_control', availableRoles: ['ordered_time','measure'],
    });
    expect(control.eligible).toBe(false);
    expect(control.blockingReasons).toContain('REQUIRED_EVIDENCE_ROLES_MISSING');
    expect(control.fallbackPatternIds).toEqual(['trend_line','evidence_table']);
  });
});
