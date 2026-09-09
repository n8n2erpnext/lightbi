import {
  adviseMicroBrainPresentation,
  type MicroBrainPresentationAdviceV1,
  type MicroBrainPresentationQueryV1,
} from './understanding-core/micro-brain/presentation-advisor';
import type {
  VisualizationAnalyticalIntentV1,
  VisualizationPatternIdV1,
} from './visualization-ontology';
import { officialDomainPatternOrder } from './domain-chart-sets';

export const DOMAIN_VISUAL_PROFILE_VERSION = 'lightbi.domain-visual-profile.v1' as const;

export type DomainVisualProfileV1 = {
  schemaVersion: typeof DOMAIN_VISUAL_PROFILE_VERSION;
  domainId: string;
  authority: 'advisory_only';
  selectionSource?: 'official_domain_prior' | 'inferred_domain_advice';
  candidateLibraryScope?: 'canonical_30_patterns';
  analyticalIntents: VisualizationAnalyticalIntentV1[];
  preferredPatternIds: VisualizationPatternIdV1[];
  conceptIds: string[];
  evidenceRequirements: string[];
  constraints: string[];
  priorities: string[];
  abstainWhen: string[];
  unmappedChartFamilies: string[];
  policy: {
    mayAuthorizeMetric: false;
    mayAuthorizeFormula: false;
    mayAuthorizeJoin: false;
    mayChooseRenderer: false;
    retrievalRankIsConfidence: false;
  };
};

export const MB_CHART_FAMILY_TO_PATTERN_IDS_V1: Readonly<Record<string, readonly VisualizationPatternIdV1[]>> = {
  number: ['kpi_summary'],
  sparkline: ['sparkline'],
  line: ['trend_line'],
  area: ['trend_area'],
  column: ['category_compare'],
  bar: ['ranking_bar', 'category_compare'],
  grouped_bar: ['grouped_compare'],
  stacked_bar: ['composition_stack'],
  stacked_column: ['composition_stack'],
  normalized_stacked: ['composition_100'],
  combo_bar_line: ['target_combo'],
  donut: ['composition_donut'],
  waterfall: ['variance_waterfall'],
  histogram: ['distribution_histogram'],
  box_plot: ['distribution_box'],
  scatter: ['relationship_scatter'],
  bubble: ['relationship_bubble'],
  heatmap: ['matrix_heatmap'],
  cohort_heatmap: ['cohort_retention'],
  funnel: ['process_funnel'],
  pareto: ['concentration_pareto'],
  bullet: ['target_bullet'],
  diverging_bar: ['variance_diverging'],
  calendar_heatmap: ['calendar_intensity'],
  map: ['geospatial_map'],
  sankey: ['flow_sankey'],
  table: ['evidence_table'],
  timeline: ['event_timeline'],
  control_chart: ['process_control'],
  small_multiples: ['small_multiples'],
  radar: ['profile_radar'],
};

const KNOWN_INTENTS = new Set<VisualizationAnalyticalIntentV1>([
  'single_value','target_attainment','trend','period_comparison','balance_flow',
  'category_comparison','ranking','composition','composition_over_time',
  'relationship','contribution','variance','aging','process_time','distribution',
  'quality_control','risk_concentration','anomaly_scan','capacity_utilization',
  'cohort_retention','funnel','pareto','geospatial','flow','evidence_detail','schedule',
]);

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
}

function knownIntents(values: readonly string[]): VisualizationAnalyticalIntentV1[] {
  return unique(values).filter((value): value is VisualizationAnalyticalIntentV1 =>
    KNOWN_INTENTS.has(value as VisualizationAnalyticalIntentV1));
}

export function projectDomainVisualProfileFromAdvice(
  domainId: string,
  advice: MicroBrainPresentationAdviceV1,
): DomainVisualProfileV1 {
  const eligible = advice.candidates.filter(candidate =>
    candidate.presentation.advisoryKind === 'domain_profile');
  const families = unique(eligible.flatMap(candidate => candidate.presentation.chartFamilies ?? []));
  const mapped = families.flatMap(family => MB_CHART_FAMILY_TO_PATTERN_IDS_V1[family] ?? []);
  const unmapped = families.filter(family => !MB_CHART_FAMILY_TO_PATTERN_IDS_V1[family]);
  const officialPrior = officialDomainPatternOrder(domainId);
  return {
    schemaVersion: DOMAIN_VISUAL_PROFILE_VERSION,
    domainId,
    authority: 'advisory_only',
    selectionSource: officialPrior.length > 0 ? 'official_domain_prior' : 'inferred_domain_advice',
    candidateLibraryScope: 'canonical_30_patterns',
    analyticalIntents: knownIntents(eligible.flatMap(candidate => candidate.presentation.analyticalIntents ?? [])),
    // Exact official-domain priors are presentation-only and are merged ahead of
    // MB advice. Inferred/open-world domains never enter this list. Suitability
    // and renderer capability remain the final gates.
    preferredPatternIds: [...new Set([...officialPrior, ...mapped])],
    conceptIds: unique(eligible.map(candidate => candidate.hit.conceptId)),
    evidenceRequirements: unique(eligible.flatMap(candidate => candidate.presentation.evidenceRequirements ?? [])),
    constraints: unique(eligible.flatMap(candidate => candidate.presentation.constraints ?? [])),
    priorities: unique(eligible.flatMap(candidate => candidate.presentation.priorities ?? [])),
    abstainWhen: unique(eligible.flatMap(candidate => candidate.presentation.abstainWhen ?? [])),
    unmappedChartFamilies: unmapped,
    policy: {
      mayAuthorizeMetric: false, mayAuthorizeFormula: false, mayAuthorizeJoin: false,
      mayChooseRenderer: false, retrievalRankIsConfidence: false,
    },
  };
}

export type DomainVisualProfileOptionsV1 = {
  perspectiveId?: string;
  semanticSignals?: string[];
  advisor?: (query: MicroBrainPresentationQueryV1) => MicroBrainPresentationAdviceV1;
};

export function buildDomainVisualProfile(
  domainId: string,
  options: DomainVisualProfileOptionsV1 = {},
): DomainVisualProfileV1 {
  const advisor = options.advisor ?? adviseMicroBrainPresentation;
  const advice = advisor({
    domainId,
    perspectiveId: options.perspectiveId,
    analyticalIntent: 'domain_visual_profile',
    semanticSignals: options.semanticSignals,
    limit: 12,
  });
  return projectDomainVisualProfileFromAdvice(domainId, advice);
}
