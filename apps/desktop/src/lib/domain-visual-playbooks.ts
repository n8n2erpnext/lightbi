import type { DomainBAId } from './domain-ba-playbooks';
import type {
  VisualizationAnalyticalIntentV1,
  VisualizationPatternIdV1,
} from './visualization-ontology';
import type { VisualNarrativeStoryRoleV1 } from './visual-narrative-composition';

export const OFFICIAL_DOMAIN_VISUAL_PLAYBOOK_VERSION = 'lightbi.official-domain-visual-playbook.v2' as const;

export type DomainVisualCombinationRecipeV2 = {
  id: string;
  label: string;
  primaryMetricHints: string[];
  companionMetricHints: string[];
  presentation: 'grouped_compare' | 'combo_bar_line';
  allowExplicitMultiUnit: boolean;
  rationale: string;
};

export type OfficialDomainVisualPlaybookV2 = {
  schemaVersion: typeof OFFICIAL_DOMAIN_VISUAL_PLAYBOOK_VERSION;
  domainId: DomainBAId;
  label: string;
  storyOrder: VisualNarrativeStoryRoleV1[];
  intentPatternPreferences: Partial<Record<VisualizationAnalyticalIntentV1, VisualizationPatternIdV1[]>>;
  complementRolesByIntent: Partial<Record<VisualizationAnalyticalIntentV1, VisualNarrativeStoryRoleV1[]>>;
  combinationRecipes: DomainVisualCombinationRecipeV2[];
  abstainRules: string[];
  researchBasis: string[];
  governance: {
    authority: 'presentation_advisory_only';
    mayAuthorizeMetric: false;
    mayAuthorizeFormula: false;
    mayAuthorizeJoin: false;
    mayBypassSuitability: false;
    mayForceAdditionalVisuals: false;
    inferredDomainMayBecomeOfficial: false;
  };
};

const governance = {
  authority: 'presentation_advisory_only',
  mayAuthorizeMetric: false,
  mayAuthorizeFormula: false,
  mayAuthorizeJoin: false,
  mayBypassSuitability: false,
  mayForceAdditionalVisuals: false,
  inferredDomainMayBecomeOfficial: false,
} as const;

const commonAbstain = [
  'Do not add a visual only to increase chart count or renderer diversity.',
  'Do not combine layers unless source scope, grain and dimension are compatible.',
  'Do not use domain priors to authorize a metric, formula, join or causal claim.',
];
export const OFFICIAL_DOMAIN_VISUAL_PLAYBOOKS_V2: Readonly<Record<DomainBAId, OfficialDomainVisualPlaybookV2>> = {
  revenue: {
    schemaVersion: OFFICIAL_DOMAIN_VISUAL_PLAYBOOK_VERSION,
    domainId: 'revenue', label: 'Revenue / Sales',
    storyOrder: ['answer','change','driver','composition','comparison','risk','evidence'],
    intentPatternPreferences: {
      trend: ['trend_line','trend_area','small_multiples'],
      period_comparison: ['category_compare','grouped_compare','variance_diverging','trend_line'],
      ranking: ['ranking_bar','concentration_pareto'],
      composition: ['composition_stack','composition_100','composition_donut'],
      contribution: ['variance_waterfall','variance_diverging','ranking_bar'],
      variance: ['variance_waterfall','variance_diverging','grouped_compare'],
      relationship: ['relationship_scatter','relationship_bubble'],
    },
    complementRolesByIntent: {
      trend: ['change','driver','composition','risk','evidence'],
      period_comparison: ['change','driver','composition','evidence'],
      ranking: ['composition','change','evidence'],
      composition: ['driver','change','evidence'],
      contribution: ['change','driver','evidence'],
    },
    combinationRecipes: [
      {
        id: 'revenue-volume-shared-grain', label: 'Revenue and volume in one governed comparison',
        primaryMetricHints: ['revenue','sales','amount'], companionMetricHints: ['quantity','qty','units','volume'],
        presentation: 'combo_bar_line', allowExplicitMultiUnit: true,
        rationale: 'Use only when value and volume share the same governed grain and the question needs the value-volume relationship.',
      },
    ],
    abstainRules: [...commonAbstain, 'Do not add a revenue trend beside a revenue ranking unless time context materially answers the selected question.'],
    researchBasis: [
      'Microsoft Power BI Retail Analysis / Store Sales: sales, units, gross margin, variance and year-over-year comparison.',
      'Microsoft Power BI combo-chart guidance: combine measures on a shared X axis when the comparison is the analytical point.',
      'LightBI Revenue BA playbook and canonical 30-pattern ontology.',
    ],
    governance,
  },
  finance: {
    schemaVersion: OFFICIAL_DOMAIN_VISUAL_PLAYBOOK_VERSION,
    domainId: 'finance', label: 'Finance / Profitability',
    storyOrder: ['answer','comparison','change','driver','risk','composition','evidence'],
    intentPatternPreferences: {
      trend: ['trend_line','trend_area'],
      period_comparison: ['variance_diverging','grouped_compare','category_compare'],
      variance: ['variance_waterfall','variance_diverging','target_bullet'],
      contribution: ['variance_waterfall','ranking_bar'],
      target_attainment: ['target_combo','target_bullet','kpi_summary'],
      relationship: ['relationship_scatter','relationship_bubble'],
      composition: ['composition_stack','composition_100','composition_donut'],
    },
    complementRolesByIntent: {
      trend: ['comparison','change','driver','risk','evidence'],
      period_comparison: ['comparison','change','driver','risk','evidence'],
      variance: ['driver','risk','evidence'],
      target_attainment: ['comparison','risk','evidence'],
      relationship: ['risk','driver','evidence'],
    },
    combinationRecipes: [
      {
        id: 'finance-revenue-cost-shared-grain', label: 'Revenue and cost on one governed financial story',
        primaryMetricHints: ['revenue','sales'], companionMetricHints: ['cost','cogs','expense'],
        presentation: 'combo_bar_line', allowExplicitMultiUnit: false,
        rationale: 'Revenue and cost can share a visual when both use the same currency, source scope and grain.',
      },
      {
        id: 'finance-profit-margin-shared-grain', label: 'Profit and margin context',
        primaryMetricHints: ['profit'], companionMetricHints: ['margin','margin rate','gm%'],
        presentation: 'combo_bar_line', allowExplicitMultiUnit: true,
        rationale: 'A currency result and a percentage margin may share one visual only with explicit axis units and a common grain.',
      },
    ],
    abstainRules: [...commonAbstain, 'Do not claim profitability or margin when cost/profit evidence is unavailable.'],
    researchBasis: [
      'Microsoft Power BI Customer Profitability: Revenue vs COGS, GM%, variance-to-budget and industry comparison.',
      'Microsoft Power BI waterfall guidance: signed contributions explain movement from a governed start to end value.',
      'Microsoft Business Central Income Statement by Month: monthly revenue/expense movement with drill-through to ledger evidence.',
      'LightBI Finance BA playbook and canonical 30-pattern ontology.',
    ],
    governance,
  },
  inventory: {
    schemaVersion: OFFICIAL_DOMAIN_VISUAL_PLAYBOOK_VERSION,
    domainId: 'inventory', label: 'Inventory / Stock',
    storyOrder: ['answer','risk','comparison','change','distribution','driver','evidence'],
    intentPatternPreferences: {
      single_value: ['kpi_summary','target_bullet'],
      period_comparison: ['grouped_compare','variance_diverging','category_compare'],
      ranking: ['ranking_bar','concentration_pareto'],
      risk_concentration: ['concentration_pareto','ranking_bar','matrix_heatmap'],
      aging: ['distribution_histogram','distribution_box','composition_stack'],
      distribution: ['distribution_histogram','distribution_box'],
      composition: ['composition_stack','composition_100'],
      trend: ['trend_line','trend_area'],
      capacity_utilization: ['matrix_heatmap','target_bullet','ranking_bar'],
    },
    complementRolesByIntent: {
      ranking: ['risk','distribution','evidence'],
      risk_concentration: ['distribution','driver','evidence'],
      aging: ['risk','driver','evidence'],
      period_comparison: ['change','risk','driver','evidence'],
      capacity_utilization: ['risk','comparison','evidence'],
    },
    combinationRecipes: [
      {
        id: 'inventory-supply-demand-shared-grain', label: 'Availability: on-hand versus demand or receipts',
        primaryMetricHints: ['inventory','stock','on hand','available'], companionMetricHints: ['demand','requirement','receipt','supply'],
        presentation: 'grouped_compare', allowExplicitMultiUnit: false,
        rationale: 'Quantities can be compared in one visual when item/location grain and unit are compatible.',
      },
      {
        id: 'inventory-value-quantity-shared-grain', label: 'Inventory value and quantity context',
        primaryMetricHints: ['inventory value','stock value','ending balance value'], companionMetricHints: ['quantity','qty','on hand'],
        presentation: 'combo_bar_line', allowExplicitMultiUnit: true,
        rationale: 'Value and quantity may share a visual only when the grain matches and both axes are explicitly labeled.',
      },
    ],
    abstainRules: [...commonAbstain, 'Do not infer stock-out or overstock without supply/demand, threshold or policy evidence.'],
    researchBasis: [
      'Microsoft Business Central Inventory Overview: inventory quantity, scheduled receipts, gross requirements and projected available balance.',
      'Microsoft Business Central Inventory Valuation: beginning balance, increases/decreases, ending balance and location exposure.',
      'Microsoft Business Central ABC Analysis: rank items by share of sales into concentration classes.',
      'Microsoft inventory aging guidance: quantity/value split into age buckets for slow-moving and obsolete stock review.',
      'LightBI Inventory BA playbook and canonical 30-pattern ontology.',
    ],
    governance,
  },
  operations: {
    schemaVersion: OFFICIAL_DOMAIN_VISUAL_PLAYBOOK_VERSION,
    domainId: 'operations', label: 'Operations / Logistics',
    storyOrder: ['answer','risk','change','driver','comparison','distribution','evidence'],
    intentPatternPreferences: {
      single_value: ['kpi_summary'],
      trend: ['trend_line','process_control','calendar_intensity'],
      period_comparison: ['grouped_compare','variance_diverging','category_compare'],
      ranking: ['ranking_bar','concentration_pareto'],
      category_comparison: ['ranking_bar','category_compare','grouped_compare'],
      distribution: ['distribution_histogram','distribution_box'],
      quality_control: ['process_control','matrix_heatmap','distribution_box'],
      process_time: ['distribution_histogram','distribution_box','event_timeline'],
      funnel: ['process_funnel'],
      capacity_utilization: ['matrix_heatmap','target_bullet','ranking_bar'],
    },
    complementRolesByIntent: {
      trend: ['risk','driver','comparison','evidence'],
      ranking: ['risk','comparison','evidence'],
      category_comparison: ['risk','change','evidence'],
      quality_control: ['risk','driver','evidence'],
      process_time: ['risk','driver','evidence'],
    },
    combinationRecipes: [
      {
        id: 'operations-volume-delay-shared-grain', label: 'Volume and delay/downtime in one operational story',
        primaryMetricHints: ['delivery count','shipment count','volume','defect quantity','count'], companionMetricHints: ['delay','downtime','minutes','duration'],
        presentation: 'combo_bar_line', allowExplicitMultiUnit: true,
        rationale: 'Volume and service-time impact may share one visual when the same route/material/period grain is governed and axes are explicit.',
      },
      {
        id: 'operations-volume-service-rate-shared-grain', label: 'Volume and SLA/service rate',
        primaryMetricHints: ['delivery count','shipment count','volume','count'], companionMetricHints: ['sla','on time','rate','breach'],
        presentation: 'combo_bar_line', allowExplicitMultiUnit: true,
        rationale: 'Throughput and service rate may be combined only when they share the governed grain and the question asks for the trade-off.',
      },
    ],
    abstainRules: [...commonAbstain, 'Do not label a busy route, carrier or warehouse as poor performance without delay/SLA/quality evidence.'],
    researchBasis: [
      'Microsoft Power BI Supplier Quality Analysis: Defects and Downtime share a combo chart; supplier/plant views explain operational impact.',
      'Microsoft Power BI Procurement Analysis: spend trend, category, geography and vendor concentration are separated by analytical role.',
      'LightBI Operations BA playbook and canonical 30-pattern ontology.',
    ],
    governance,
  },
  customer: {
    schemaVersion: OFFICIAL_DOMAIN_VISUAL_PLAYBOOK_VERSION,
    domainId: 'customer', label: 'Customer',
    storyOrder: ['answer','driver','risk','comparison','change','composition','relationship','evidence'],
    intentPatternPreferences: {
      ranking: ['ranking_bar','concentration_pareto'],
      composition: ['composition_stack','composition_100','composition_donut'],
      trend: ['trend_line','small_multiples'],
      period_comparison: ['grouped_compare','variance_diverging','category_compare'],
      relationship: ['relationship_scatter','relationship_bubble'],
      cohort_retention: ['cohort_retention','matrix_heatmap'],
      risk_concentration: ['concentration_pareto','ranking_bar','relationship_bubble'],
      funnel: ['process_funnel'],
    },
    complementRolesByIntent: {
      ranking: ['risk','composition','change','evidence'],
      composition: ['driver','risk','evidence'],
      trend: ['driver','risk','evidence'],
      relationship: ['risk','driver','evidence'],
      cohort_retention: ['risk','driver','evidence'],
    },
    combinationRecipes: [
      {
        id: 'customer-value-frequency-shared-grain', label: 'Customer value and purchase frequency',
        primaryMetricHints: ['revenue','value','sales'], companionMetricHints: ['order count','frequency','orders'],
        presentation: 'combo_bar_line', allowExplicitMultiUnit: true,
        rationale: 'Value and frequency can share one customer-grain visual only when both are governed and the question asks how value relates to activity.',
      },
    ],
    abstainRules: [...commonAbstain, 'Do not infer retention, churn or customer profitability without the corresponding governed evidence.'],
    researchBasis: [
      'Microsoft Power BI Customer Profitability: customer/product contribution, GM%, variance-to-budget and industry context are separate but connected stories.',
      'Microsoft Power BI Opportunity/Customer samples: value, segment, region and pipeline context are used to explain concentration and performance.',
      'LightBI Customer BA playbook and canonical 30-pattern ontology.',
    ],
    governance,
  },
  performance: {
    schemaVersion: OFFICIAL_DOMAIN_VISUAL_PLAYBOOK_VERSION,
    domainId: 'performance', label: 'Performance / KPI',
    storyOrder: ['answer','comparison','risk','change','driver','evidence'],
    intentPatternPreferences: {
      single_value: ['kpi_summary','target_bullet'],
      target_attainment: ['target_combo','target_bullet','kpi_summary'],
      period_comparison: ['variance_diverging','grouped_compare','category_compare'],
      variance: ['variance_diverging','target_bullet','variance_waterfall'],
      ranking: ['ranking_bar','target_bullet'],
      trend: ['trend_line','small_multiples','process_control'],
      category_comparison: ['grouped_compare','ranking_bar','category_compare'],
    },
    complementRolesByIntent: {
      target_attainment: ['comparison','risk','change','evidence'],
      variance: ['risk','driver','evidence'],
      ranking: ['comparison','risk','evidence'],
      trend: ['comparison','risk','evidence'],
    },
    combinationRecipes: [
      {
        id: 'performance-actual-target-shared-grain', label: 'Actual and target',
        primaryMetricHints: ['actual','achieved','result'], companionMetricHints: ['target','goal','budget','quota'],
        presentation: 'combo_bar_line', allowExplicitMultiUnit: false,
        rationale: 'Actual and target belong in one visual when they share the same KPI, unit and grain.',
      },
      {
        id: 'performance-actual-achievement-rate-shared-grain', label: 'Actual value and achievement rate',
        primaryMetricHints: ['actual','result','output'], companionMetricHints: ['achievement','rate','percent','%'],
        presentation: 'combo_bar_line', allowExplicitMultiUnit: true,
        rationale: 'Value and rate may share one KPI story only with explicit axes and a common grain.',
      },
    ],
    abstainRules: [...commonAbstain, 'Do not color a KPI as good/bad when target direction or desirability is unknown.'],
    researchBasis: [
      'Microsoft Power BI KPI guidance: KPI visuals require a governed goal/target value.',
      'Microsoft Power BI Retail/Store Sales: current vs prior period, variance and gross-margin context.',
      'Tableau bullet-graph guidance: compare a primary measure with a governed target/reference without a separate chart.',
      'LightBI Performance BA playbook and canonical 30-pattern ontology.',
    ],
    governance,
  },
};

const OFFICIAL_DOMAIN_IDS = new Set<DomainBAId>(Object.keys(OFFICIAL_DOMAIN_VISUAL_PLAYBOOKS_V2) as DomainBAId[]);
function normalize(value: string | null | undefined): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function hasHint(text: string, hints: readonly string[]): boolean {
  const normalized = normalize(text);
  return hints.some(hint => normalized.includes(normalize(hint)));
}

export function getOfficialDomainVisualPlaybook(domainId: string | null | undefined): OfficialDomainVisualPlaybookV2 | null {
  if (!domainId || !OFFICIAL_DOMAIN_IDS.has(domainId as DomainBAId)) return null;
  return OFFICIAL_DOMAIN_VISUAL_PLAYBOOKS_V2[domainId as DomainBAId];
}

export function officialDomainVisualPatternOrder(
  domainId: string | null | undefined,
  intent?: VisualizationAnalyticalIntentV1 | null,
): VisualizationPatternIdV1[] {
  const playbook = getOfficialDomainVisualPlaybook(domainId);
  if (!playbook) return [];
  const preferred = intent ? playbook.intentPatternPreferences[intent] ?? [] : [];
  const all = Object.values(playbook.intentPatternPreferences).flatMap(patterns => patterns ?? []);
  return [...new Set([...preferred, ...all])];
}

export function officialDomainComplementRoles(
  domainId: string | null | undefined,
  intent: VisualizationAnalyticalIntentV1,
): VisualNarrativeStoryRoleV1[] {
  return [...(getOfficialDomainVisualPlaybook(domainId)?.complementRolesByIntent[intent] ?? [])];
}
export function matchOfficialDomainCombinationRecipe(input: {
  domainId: string | null | undefined;
  primaryText: string;
  companionText: string;
}): DomainVisualCombinationRecipeV2 | null {
  const playbook = getOfficialDomainVisualPlaybook(input.domainId);
  if (!playbook) return null;
  return playbook.combinationRecipes.find(recipe =>
    hasHint(input.primaryText, recipe.primaryMetricHints)
    && hasHint(input.companionText, recipe.companionMetricHints))
    ?? playbook.combinationRecipes.find(recipe =>
      hasHint(input.companionText, recipe.primaryMetricHints)
      && hasHint(input.primaryText, recipe.companionMetricHints))
    ?? null;
}
