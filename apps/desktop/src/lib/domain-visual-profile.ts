import {
  adviseMicroBrainPresentation,
  type MicroBrainPresentationAdviceV1,
  type MicroBrainPresentationQueryV1,
} from './understanding-core/micro-brain/presentation-advisor';
import type {
  VisualizationAnalyticalIntentV1,
  VisualizationPatternIdV1,
} from './visualization-ontology';
import type { MicroBrainPresentationAdvisoryKindV1 } from './understanding-core/micro-brain/contracts';
import { officialDomainVisualPatternOrder } from './domain-visual-playbooks';

export const DOMAIN_VISUAL_PROFILE_VERSION = 'lightbi.domain-visual-profile.v1' as const;

export type DomainVisualPatternAdviceV1 = {
  patternId: VisualizationPatternIdV1;
  conceptId: string;
  advisoryKind: Extract<MicroBrainPresentationAdvisoryKindV1, 'domain_profile' | 'perspective_profile' | 'chart_pattern'>;
  fusedRank: number;
  rrfScore: number;
};

export type DomainVisualProfileV1 = {
  schemaVersion: typeof DOMAIN_VISUAL_PROFILE_VERSION;
  domainId: string;
  authority: 'advisory_only';
  selectionSource?: 'official_domain_prior' | 'inferred_domain_advice';
  candidateLibraryScope?: 'canonical_30_patterns';
  analyticalIntents: VisualizationAnalyticalIntentV1[];
  preferredPatternIds: VisualizationPatternIdV1[];
  rankedPatternAdvice: DomainVisualPatternAdviceV1[];
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
  const acceptedKinds = new Set(['domain_profile', 'perspective_profile', 'chart_pattern']);
  const eligible = advice.candidates
    .filter(candidate => acceptedKinds.has(candidate.presentation.advisoryKind))
    .sort((left, right) => left.hit.fusedRank - right.hit.fusedRank || left.hit.conceptId.localeCompare(right.hit.conceptId));
  const rankedPatternAdvice: DomainVisualPatternAdviceV1[] = [];
  const seenPatterns = new Set<VisualizationPatternIdV1>();
  const unmappedFamilies: string[] = [];
  for (const candidate of eligible) {
    for (const family of candidate.presentation.chartFamilies ?? []) {
      const mapped = MB_CHART_FAMILY_TO_PATTERN_IDS_V1[family] ?? [];
      if (mapped.length === 0) { unmappedFamilies.push(family); continue; }
      for (const patternId of mapped) {
        if (seenPatterns.has(patternId)) continue;
        seenPatterns.add(patternId);
        rankedPatternAdvice.push({
          patternId, conceptId: candidate.hit.conceptId,
          advisoryKind: candidate.presentation.advisoryKind as DomainVisualPatternAdviceV1['advisoryKind'],
          fusedRank: candidate.hit.fusedRank, rrfScore: candidate.hit.rrfScore,
        });
      }
    }
  }
  const officialPrior = officialDomainVisualPatternOrder(domainId);
  return {
    schemaVersion: DOMAIN_VISUAL_PROFILE_VERSION, domainId, authority: 'advisory_only',
    selectionSource: officialPrior.length > 0 ? 'official_domain_prior' : 'inferred_domain_advice',
    candidateLibraryScope: 'canonical_30_patterns',
    analyticalIntents: knownIntents(eligible.flatMap(candidate => candidate.presentation.analyticalIntents ?? [])),
    preferredPatternIds: rankedPatternAdvice.map(item => item.patternId),
    rankedPatternAdvice,
    conceptIds: unique(eligible.map(candidate => candidate.hit.conceptId)),
    evidenceRequirements: unique(eligible.flatMap(candidate => candidate.presentation.evidenceRequirements ?? [])),
    constraints: unique(eligible.flatMap(candidate => candidate.presentation.constraints ?? [])),
    priorities: unique(eligible.flatMap(candidate => candidate.presentation.priorities ?? [])),
    abstainWhen: unique(eligible.flatMap(candidate => candidate.presentation.abstainWhen ?? [])),
    unmappedChartFamilies: unique(unmappedFamilies),
    policy: { mayAuthorizeMetric: false, mayAuthorizeFormula: false, mayAuthorizeJoin: false, mayChooseRenderer: false, retrievalRankIsConfidence: false },
  };
}

export type DomainVisualProfileOptionsV1 = {
  perspectiveId?: string;
  analyticalIntent?: VisualizationAnalyticalIntentV1;
  userQuestion?: string;
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
    analyticalIntent: options.analyticalIntent ?? 'domain_visual_profile',
    userQuestion: options.userQuestion,
    semanticSignals: options.semanticSignals,
    limit: 12,
  });
  return projectDomainVisualProfileFromAdvice(domainId, advice);
}
