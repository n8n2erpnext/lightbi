import type { VisualizationPatternIdV1 } from './visualization-ontology';
import type { VisualizationSuitabilityInputV1 } from './visualization-suitability';

export const VISUALIZATION_ACCEPTANCE_CASES_VERSION = 'lightbi.visualization-acceptance-cases.v1' as const;

export type VisualizationPatternExpectationV1 = {
  patternId: VisualizationPatternIdV1;
  eligible: boolean;
  requiredBlockingReason?: string;
};

export type VisualizationAcceptanceCaseV1 = {
  id: string;
  domainContext: string;
  question: string;
  suitability: Omit<VisualizationSuitabilityInputV1, 'patternId'>;
  expectations: VisualizationPatternExpectationV1[];
  interpretationRule: string;
};

const oneUnit = { count: 1, compatible: true, explicitLabels: true, normalizedCommonScale: false } as const;
export const VISUALIZATION_ACCEPTANCE_CASES_V1: VisualizationAcceptanceCaseV1[] = [
  {
    id: 'branch-revenue-ranking', domainContext: 'sales_revenue',
    question: 'Compare branch revenue without implying highest means best.',
    suitability: { analyticalIntent: 'ranking', availableRoles: ['category','measure'], cardinality: { categories: 5 }, units: oneUnit, requestedColorSemantics: 'neutral', desirability: 'neutral' },
    expectations: [
      { patternId: 'ranking_bar', eligible: true },
      { patternId: 'trend_line', eligible: false, requiredBlockingReason: 'INTENT_NOT_SUPPORTED' },
    ],
    interpretationRule: 'Rank observed revenue only; do not label high/low as favorable/adverse without desirability evidence.',
  },
  {
    id: 'revenue-six-month-trend', domainContext: 'sales_revenue',
    question: 'Show governed revenue across six ordered months.',
    suitability: { analyticalIntent: 'trend', availableRoles: ['ordered_time','measure'], cardinality: { points: 6, series: 1 }, units: oneUnit, requestedColorSemantics: 'neutral', desirability: 'neutral' },
    expectations: [
      { patternId: 'trend_line', eligible: true },
      { patternId: 'ranking_bar', eligible: false, requiredBlockingReason: 'INTENT_NOT_SUPPORTED' },
    ],
    interpretationRule: 'Preserve ordered time semantics; do not connect unordered categories.',
  },
  {
    id: 'actual-versus-target-by-month', domainContext: 'performance',
    question: 'Compare actual revenue with a governed monthly target.',
    suitability: { analyticalIntent: 'target_attainment', availableRoles: ['ordered_time','measure','target'], cardinality: { points: 12, series: 2 }, units: oneUnit, requestedColorSemantics: 'neutral', desirability: 'higher_is_favorable' },
    expectations: [
      { patternId: 'target_combo', eligible: true },
      { patternId: 'composition_donut', eligible: false, requiredBlockingReason: 'INTENT_NOT_SUPPORTED' },
    ],
    interpretationRule: 'Actual and target must remain explicit evidence; target status comes from governed desirability, not color heuristics.',
  },
  {
    id: 'four-channel-composition', domainContext: 'sales_revenue',
    question: 'Show share across four exhaustive governed channels.',
    suitability: { analyticalIntent: 'composition', availableRoles: ['category','part_measure','denominator'], cardinality: { categories: 4 }, units: oneUnit, requestedColorSemantics: 'categorical', desirability: 'neutral' },
    expectations: [{ patternId: 'composition_donut', eligible: true }],
    interpretationRule: 'The denominator must represent the intended whole; use composition only because cardinality is low and exhaustive.',
  },
  {
    id: 'high-cardinality-composition', domainContext: 'sales_revenue',
    question: 'Review composition across twelve categories.',
    suitability: { analyticalIntent: 'composition', availableRoles: ['category','part_measure','denominator'], cardinality: { categories: 12 }, units: oneUnit, requestedColorSemantics: 'categorical', desirability: 'neutral' },
    expectations: [{ patternId: 'composition_donut', eligible: false, requiredBlockingReason: 'CARDINALITY_CATEGORIES_EXCEEDED' }],
    interpretationRule: 'Reject donut at high cardinality and fall back to a more precise comparison or evidence table.',
  },
  {
    id: 'cost-versus-revenue-relationship', domainContext: 'finance',
    question: 'Explore cost versus revenue at the same entity grain.',
    suitability: { analyticalIntent: 'relationship', availableRoles: ['entity_key','measure','comparison_measure'], cardinality: { points: 200 }, units: { count: 2, compatible: true, explicitLabels: true, normalizedCommonScale: false }, requestedColorSemantics: 'neutral', desirability: 'neutral' },
    expectations: [{ patternId: 'relationship_scatter', eligible: true }],
    interpretationRule: 'Association may be shown; no causal claim is allowed without independent causal evidence.',
  },
  {
    id: 'fresh-waste-rate-ranking', domainContext: 'food_beverage_restaurant',
    question: 'Compare observed waste rates across product groups.',
    suitability: { analyticalIntent: 'ranking', availableRoles: ['category','measure'], cardinality: { categories: 8 }, units: oneUnit, requestedColorSemantics: 'neutral', desirability: 'context_dependent' },
    expectations: [{ patternId: 'ranking_bar', eligible: true }],
    interpretationRule: 'Use highest/lowest observed wording; do not infer favorable/adverse direction from numeric position alone.',
  },
  {
    id: 'inventory-coverage-context', domainContext: 'inventory_warehouse',
    question: 'Compare inventory coverage while preserving context at both extremes.',
    suitability: { analyticalIntent: 'ranking', availableRoles: ['category','measure'], cardinality: { categories: 10 }, units: oneUnit, requestedColorSemantics: 'neutral', desirability: 'context_dependent' },
    expectations: [{ patternId: 'ranking_bar', eligible: true }],
    interpretationRule: 'Both extremes may deserve review; ranking is descriptive and does not define good or bad coverage.',
  },
];
