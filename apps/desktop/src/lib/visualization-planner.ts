import type { DomainVisualProfileV1 } from './domain-visual-profile';
import type { RuntimeIntentType } from './analysis-runtime-contract';
import {
  VISUALIZATION_PATTERN_BY_ID_V1,
  VISUALIZATION_PATTERN_LIBRARY_V1,
  type MetricDesirabilityV1,
  type VisualizationAnalyticalIntentV1,
  type VisualizationColorSemanticsV1,
  type VisualizationEvidenceRoleV1,
  type VisualizationPatternIdV1,
} from './visualization-ontology';
import { evaluateVisualizationSuitability, type VisualizationSuitabilityInputV1 } from './visualization-suitability';
import {
  rendererCapabilityForPattern,
  rendererSupportsSurfaces,
  type VisualizationRendererFamilyV1,
  type VisualizationRendererSurfaceV1,
} from './visualization-renderer-registry';

export const GOVERNED_VISUALIZATION_PLAN_VERSION = 'lightbi.visualization-plan.v1' as const;

export type GovernedVisualizationPlanInputV1 = {
  analyticalIntent: VisualizationAnalyticalIntentV1;
  availableRoles: VisualizationEvidenceRoleV1[];
  cardinality?: VisualizationSuitabilityInputV1['cardinality'];
  units?: VisualizationSuitabilityInputV1['units'];
  requestedColorSemantics?: VisualizationColorSemanticsV1;
  desirability?: MetricDesirabilityV1;
  requiredSurfaces?: VisualizationRendererSurfaceV1[];
  domainProfile?: DomainVisualProfileV1 | null;
};
export type GovernedVisualizationCandidateV1 = {
  patternId: VisualizationPatternIdV1;
  rendererFamily: VisualizationRendererFamilyV1;
  eligible: boolean;
  suitabilityReasons: string[];
  rendererAvailable: boolean;
  fromDomainPrior: boolean;
};

export type GovernedVisualizationPlanV1 = {
  schemaVersion: typeof GOVERNED_VISUALIZATION_PLAN_VERSION;
  planId: string;
  analyticalIntent: VisualizationAnalyticalIntentV1;
  patternId: VisualizationPatternIdV1 | null;
  rendererFamily: VisualizationRendererFamilyV1 | null;
  status: 'planned' | 'abstained';
  candidates: GovernedVisualizationCandidateV1[];
  requiredSurfaces: VisualizationRendererSurfaceV1[];
  patternRules: null | {
    colorSemantics: VisualizationColorSemanticsV1[];
    labelRules: string[];
    axisRules: string[];
    tooltipRules: string[];
    negativeRules: string[];
    fallbacks: VisualizationPatternIdV1[];
  };
  governance: {
    metricAuthority: 'upstream_only';
    evidenceAuthority: 'upstream_only';
    mbAuthority: 'advisory_only';
    deterministicSuitabilityFinal: true;
    retrievalRankIsConfidence: false;
  };
};
const DEFAULT_PATTERN_ORDER: Partial<Record<VisualizationAnalyticalIntentV1, VisualizationPatternIdV1[]>> = {
  single_value: ['kpi_summary'],
  target_attainment: ['target_combo','target_bullet','kpi_summary'],
  trend: ['trend_line','trend_area','sparkline','calendar_intensity'],
  category_comparison: ['category_compare','ranking_bar','grouped_compare'],
  ranking: ['ranking_bar','concentration_pareto','evidence_table'],
  composition: ['composition_donut','composition_stack','composition_100'],
  relationship: ['relationship_scatter','relationship_bubble'],
  distribution: ['distribution_histogram','distribution_box'],
  evidence_detail: ['evidence_table'],
  funnel: ['process_funnel'],
  geospatial: ['geospatial_map'],
  flow: ['flow_sankey'],
};

function stableId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `visualization-plan:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function uniquePatterns(values: readonly VisualizationPatternIdV1[]): VisualizationPatternIdV1[] {
  return [...new Set(values)];
}

function candidateOrder(input: GovernedVisualizationPlanInputV1): VisualizationPatternIdV1[] {
  const intentPatterns = VISUALIZATION_PATTERN_LIBRARY_V1
    .filter(pattern => pattern.intents.includes(input.analyticalIntent))
    .map(pattern => pattern.id);
  const defaults = DEFAULT_PATTERN_ORDER[input.analyticalIntent] ?? intentPatterns;
  const domain = (input.domainProfile?.preferredPatternIds ?? [])
    .filter(patternId => VISUALIZATION_PATTERN_BY_ID_V1.get(patternId)?.intents.includes(input.analyticalIntent));
  return uniquePatterns([...domain, ...defaults, ...intentPatterns]);
}
export function createGovernedVisualizationPlan(
  input: GovernedVisualizationPlanInputV1,
): GovernedVisualizationPlanV1 {
  const requiredSurfaces = input.requiredSurfaces ?? ['preview','persistence','dashboard'];
  const domainPrior = new Set(input.domainProfile?.preferredPatternIds ?? []);
  const queue = candidateOrder(input).map(patternId => ({ patternId, fallback: false }));
  const visited = new Set<VisualizationPatternIdV1>();
  const candidates: GovernedVisualizationCandidateV1[] = [];
  let selected: VisualizationPatternIdV1 | null = null;

  while (queue.length > 0 && !selected) {
    const next = queue.shift()!;
    if (visited.has(next.patternId)) continue;
    visited.add(next.patternId);
    const definition = VISUALIZATION_PATTERN_BY_ID_V1.get(next.patternId);
    if (!definition) continue;
    const suitability = evaluateVisualizationSuitability({
      patternId: next.patternId,
      analyticalIntent: next.fallback ? undefined : input.analyticalIntent,
      availableRoles: input.availableRoles,
      cardinality: input.cardinality,
      units: input.units,
      requestedColorSemantics: input.requestedColorSemantics,
      desirability: input.desirability,
    });
    const rendererAvailable = rendererSupportsSurfaces(next.patternId, requiredSurfaces);
    candidates.push({
      patternId: next.patternId,
      rendererFamily: rendererCapabilityForPattern(next.patternId).family,
      eligible: suitability.eligible,
      suitabilityReasons: suitability.blockingReasons,
      rendererAvailable,
      fromDomainPrior: domainPrior.has(next.patternId),
    });
    if (suitability.eligible && rendererAvailable) selected = next.patternId;
    else definition.fallbacks.forEach(patternId => queue.push({ patternId, fallback: true }));
  }

  const definition = selected ? VISUALIZATION_PATTERN_BY_ID_V1.get(selected)! : null;
  const renderer = selected ? rendererCapabilityForPattern(selected) : null;
  const seed = JSON.stringify({
    analyticalIntent: input.analyticalIntent,
    availableRoles: [...input.availableRoles].sort(),
    cardinality: input.cardinality ?? null,
    units: input.units ?? null,
    requestedColorSemantics: input.requestedColorSemantics ?? null,
    desirability: input.desirability ?? 'unknown',
    requiredSurfaces,
    domainConceptIds: input.domainProfile?.conceptIds ?? [],
    selected,
  });
  return {
    schemaVersion: GOVERNED_VISUALIZATION_PLAN_VERSION,
    planId: stableId(seed),
    analyticalIntent: input.analyticalIntent,
    patternId: selected,
    rendererFamily: renderer?.family ?? null,
    status: selected ? 'planned' : 'abstained',
    candidates,
    requiredSurfaces: [...requiredSurfaces],
    patternRules: definition ? {
      colorSemantics: [...definition.colorSemantics],
      labelRules: [...definition.labelRules],
      axisRules: [...definition.axisRules],
      tooltipRules: [...definition.tooltipRules],
      negativeRules: [...definition.negativeRules],
      fallbacks: [...definition.fallbacks],
    } : null,
    governance: {
      metricAuthority: 'upstream_only', evidenceAuthority: 'upstream_only',
      mbAuthority: 'advisory_only', deterministicSuitabilityFinal: true,
      retrievalRankIsConfidence: false,
    },
  };
}

export function analyticalIntentFromRuntimeIntentType(
  type: RuntimeIntentType,
): VisualizationAnalyticalIntentV1 {
  if (type === 'trend') return 'trend';
  if (type === 'relationship') return 'relationship';
  if (type === 'table_preview') return 'evidence_detail';
  return 'category_comparison';
}
