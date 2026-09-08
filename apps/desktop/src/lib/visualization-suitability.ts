import {
  VISUALIZATION_ONTOLOGY_POLICY_V1,
  VISUALIZATION_PATTERN_BY_ID_V1,
  type MetricDesirabilityV1,
  type VisualizationAnalyticalIntentV1,
  type VisualizationColorSemanticsV1,
  type VisualizationEvidenceRoleV1,
  type VisualizationPatternIdV1,
  type VisualizationUnitPolicyV1,
} from './visualization-ontology';

export const VISUALIZATION_SUITABILITY_VERSION = 'lightbi.visualization-suitability.v1' as const;

export type VisualizationSuitabilityInputV1 = {
  patternId: VisualizationPatternIdV1;
  analyticalIntent?: VisualizationAnalyticalIntentV1;
  availableRoles: VisualizationEvidenceRoleV1[];
  cardinality?: {
    categories?: number; series?: number; points?: number; facets?: number;
    stages?: number; dimensions?: number; nodes?: number; links?: number;
    matrixRows?: number; matrixColumns?: number;
  };
  units?: { count: number; compatible: boolean; explicitLabels: boolean; normalizedCommonScale: boolean };
  requestedColorSemantics?: VisualizationColorSemanticsV1;
  desirability?: MetricDesirabilityV1;
};

export type VisualizationSuitabilityResultV1 = {
  schemaVersion: typeof VISUALIZATION_SUITABILITY_VERSION;
  patternId: VisualizationPatternIdV1;
  eligible: boolean;
  blockingReasons: string[];
  fallbackPatternIds: VisualizationPatternIdV1[];
};

function hasRequiredRoles(requiredSets: VisualizationEvidenceRoleV1[][], available: Set<VisualizationEvidenceRoleV1>): boolean {
  return requiredSets.some(required => required.every(role => available.has(role)));
}

function exceeds(actual: number | undefined, maximum: number | undefined): boolean {
  return actual !== undefined && maximum !== undefined && actual > maximum;
}

function validateUnits(
  policy: VisualizationUnitPolicyV1,
  units: VisualizationSuitabilityInputV1['units'],
): string | null {
  if (!units || policy === 'none') return null;
  if (policy === 'single_unit' && units.count > 1) return 'UNIT_POLICY_SINGLE_UNIT_REQUIRED';
  if (policy === 'compatible_units' && units.count > 1 && !units.compatible) return 'UNIT_POLICY_COMPATIBLE_UNITS_REQUIRED';
  if (policy === 'explicit_multi_unit' && units.count > 1 && !units.explicitLabels) return 'UNIT_POLICY_EXPLICIT_MULTI_UNIT_LABELS_REQUIRED';
  if (policy === 'normalized_common_scale' && !units.normalizedCommonScale) return 'UNIT_POLICY_NORMALIZED_COMMON_SCALE_REQUIRED';
  return null;
}

const EXPLICIT_STATUS_DESIRABILITY = new Set<MetricDesirabilityV1>([
  'higher_is_favorable', 'lower_is_favorable', 'target_range',
]);

export function evaluateVisualizationSuitability(
  input: VisualizationSuitabilityInputV1,
): VisualizationSuitabilityResultV1 {
  const definition = VISUALIZATION_PATTERN_BY_ID_V1.get(input.patternId);
  if (!definition) throw new Error(`VISUALIZATION_PATTERN_UNKNOWN:${input.patternId}`);
  const reasons: string[] = [];
  if (input.analyticalIntent && !definition.intents.includes(input.analyticalIntent)) {
    reasons.push('INTENT_NOT_SUPPORTED');
  }
  const available = new Set(input.availableRoles);
  if (!hasRequiredRoles(definition.oneOfRequiredRoleSets, available)) reasons.push('REQUIRED_EVIDENCE_ROLES_MISSING');

  const actual = input.cardinality ?? {};
  const limit = definition.cardinality;
  if (exceeds(actual.categories, limit.maxCategories)) reasons.push('CARDINALITY_CATEGORIES_EXCEEDED');
  if (exceeds(actual.series, limit.maxSeries)) reasons.push('CARDINALITY_SERIES_EXCEEDED');
  if (exceeds(actual.points, limit.maxPoints)) reasons.push('CARDINALITY_POINTS_EXCEEDED');
  if (exceeds(actual.facets, limit.maxFacets)) reasons.push('CARDINALITY_FACETS_EXCEEDED');
  if (exceeds(actual.stages, limit.maxStages)) reasons.push('CARDINALITY_STAGES_EXCEEDED');
  if (exceeds(actual.dimensions, limit.maxDimensions)) reasons.push('CARDINALITY_DIMENSIONS_EXCEEDED');
  if (exceeds(actual.nodes, limit.maxNodes)) reasons.push('CARDINALITY_NODES_EXCEEDED');
  if (exceeds(actual.links, limit.maxLinks)) reasons.push('CARDINALITY_LINKS_EXCEEDED');
  if (exceeds(actual.matrixRows, limit.maxMatrixRows)) reasons.push('CARDINALITY_MATRIX_ROWS_EXCEEDED');
  if (exceeds(actual.matrixColumns, limit.maxMatrixColumns)) reasons.push('CARDINALITY_MATRIX_COLUMNS_EXCEEDED');
  const unitReason = validateUnits(definition.unitPolicy, input.units);
  if (unitReason) reasons.push(unitReason);

  const requestedColor = input.requestedColorSemantics;
  if (requestedColor && !definition.colorSemantics.includes(requestedColor)) {
    reasons.push('COLOR_SEMANTICS_NOT_ALLOWED');
  }
  if (
    requestedColor === 'status'
    && VISUALIZATION_ONTOLOGY_POLICY_V1.statusColorRequiresExplicitDesirability
    && !EXPLICIT_STATUS_DESIRABILITY.has(input.desirability ?? 'unknown')
  ) reasons.push('STATUS_COLOR_DESIRABILITY_REQUIRED');

  return {
    schemaVersion: VISUALIZATION_SUITABILITY_VERSION,
    patternId: input.patternId,
    eligible: reasons.length === 0,
    blockingReasons: [...new Set(reasons)],
    fallbackPatternIds: reasons.length > 0 ? [...definition.fallbacks] : [],
  };
}
