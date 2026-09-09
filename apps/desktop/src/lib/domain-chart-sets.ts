import type { DomainBAId } from './domain-ba-playbooks';
import {
  VISUALIZATION_PATTERN_BY_ID_V1,
  type VisualizationAnalyticalIntentV1,
  type VisualizationPatternIdV1,
} from './visualization-ontology';

export const OFFICIAL_DOMAIN_CHART_SET_VERSION = 'lightbi.official-domain-chart-set.v1' as const;

export type OfficialDomainChartSetV1 = {
  schemaVersion: typeof OFFICIAL_DOMAIN_CHART_SET_VERSION;
  domainId: DomainBAId;
  label: string;
  primaryPatternIds: VisualizationPatternIdV1[];
  supportingPatternIds: VisualizationPatternIdV1[];
  governance: {
    authority: 'presentation_advisory_only';
    mayAuthorizeMetric: false;
    mayAuthorizeFormula: false;
    mayAuthorizeJoin: false;
    mayBypassSuitability: false;
    inferredDomainMayBecomeOfficial: false;
  };
  researchBasis: string[];
};

const governed = {
  authority: 'presentation_advisory_only',
  mayAuthorizeMetric: false,
  mayAuthorizeFormula: false,
  mayAuthorizeJoin: false,
  mayBypassSuitability: false,
  inferredDomainMayBecomeOfficial: false,
} as const;

/**
 * Presentation priors for the six domains that LightBI already declares in its
 * canonical BA playbooks. These sets never make a pattern eligible; the
 * deterministic suitability + renderer capability gates remain final.
 *
 * Research basis was cross-checked against Microsoft Power BI business samples
 * (Retail/Store Sales, Customer Profitability, Supplier Quality, KPI and
 * financial/variance examples) and the existing LightBI domain playbooks.
 */
export const OFFICIAL_DOMAIN_CHART_SETS_V1: Readonly<Record<DomainBAId, OfficialDomainChartSetV1>> = {
  revenue: {
    schemaVersion: OFFICIAL_DOMAIN_CHART_SET_VERSION,
    domainId: 'revenue', label: 'Revenue / Sales',
    primaryPatternIds: ['trend_line', 'category_compare', 'target_combo'],
    supportingPatternIds: ['ranking_bar', 'composition_stack', 'composition_100', 'composition_donut', 'variance_waterfall'],
    governance: governed,
    researchBasis: ['Power BI Store Sales / Retail Analysis', 'LightBI revenue BA playbook'],
  },
  finance: {
    schemaVersion: OFFICIAL_DOMAIN_CHART_SET_VERSION,
    domainId: 'finance', label: 'Finance',
    primaryPatternIds: ['variance_waterfall', 'trend_line', 'kpi_summary'],
    supportingPatternIds: ['variance_diverging', 'composition_stack', 'target_combo', 'relationship_scatter', 'evidence_table'],
    governance: governed,
    researchBasis: ['Power BI financial/KPI/variance patterns', 'Customer Profitability sample', 'LightBI finance BA playbook'],
  },
  inventory: {
    schemaVersion: OFFICIAL_DOMAIN_CHART_SET_VERSION,
    domainId: 'inventory', label: 'Inventory',
    primaryPatternIds: ['ranking_bar', 'trend_line', 'distribution_histogram'],
    supportingPatternIds: ['distribution_box', 'matrix_heatmap', 'concentration_pareto', 'evidence_table'],
    governance: governed,
    researchBasis: ['Power BI Retail Analysis inventory context', 'inventory-management dashboard practice', 'LightBI inventory BA playbook'],
  },
  operations: {
    schemaVersion: OFFICIAL_DOMAIN_CHART_SET_VERSION,
    domainId: 'operations', label: 'Operations',
    primaryPatternIds: ['trend_line', 'process_control', 'ranking_bar'],
    supportingPatternIds: ['distribution_histogram', 'distribution_box', 'concentration_pareto', 'matrix_heatmap', 'process_funnel'],
    governance: governed,
    researchBasis: ['Power BI Supplier Quality Analysis', 'operational quality/process monitoring practice', 'LightBI operations BA playbook'],
  },
  customer: {
    schemaVersion: OFFICIAL_DOMAIN_CHART_SET_VERSION,
    domainId: 'customer', label: 'Customer',
    primaryPatternIds: ['ranking_bar', 'trend_line', 'relationship_scatter'],
    supportingPatternIds: ['cohort_retention', 'composition_donut', 'process_funnel', 'relationship_bubble', 'evidence_table'],
    governance: governed,
    researchBasis: ['Power BI Customer Profitability sample', 'cohort/retention analysis practice', 'LightBI customer BA playbook'],
  },
  performance: {
    schemaVersion: OFFICIAL_DOMAIN_CHART_SET_VERSION,
    domainId: 'performance', label: 'Performance',
    primaryPatternIds: ['target_combo', 'target_bullet', 'kpi_summary'],
    supportingPatternIds: ['trend_line', 'variance_diverging', 'ranking_bar', 'small_multiples', 'profile_radar'],
    governance: governed,
    researchBasis: ['Power BI KPI target guidance', 'scorecard/performance dashboard practice', 'LightBI performance BA playbook'],
  },
};

const OFFICIAL_DOMAIN_IDS = new Set<DomainBAId>(Object.keys(OFFICIAL_DOMAIN_CHART_SETS_V1) as DomainBAId[]);

export function getOfficialDomainChartSet(domainId: string | null | undefined): OfficialDomainChartSetV1 | null {
  if (!domainId || !OFFICIAL_DOMAIN_IDS.has(domainId as DomainBAId)) return null;
  return OFFICIAL_DOMAIN_CHART_SETS_V1[domainId as DomainBAId];
}

export function officialDomainPatternOrder(domainId: string | null | undefined): VisualizationPatternIdV1[] {
  const set = getOfficialDomainChartSet(domainId);
  return set ? [...new Set([...set.primaryPatternIds, ...set.supportingPatternIds])] : [];
}

export function officialDomainIntentPriority(
  domainId: string | null | undefined,
  intent: VisualizationAnalyticalIntentV1,
): number {
  const ordered = officialDomainPatternOrder(domainId);
  const index = ordered.findIndex(patternId => VISUALIZATION_PATTERN_BY_ID_V1.get(patternId)?.intents.includes(intent));
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

/** Select one primary + up to two supporting patterns from an already-eligible set. */
export function selectOfficialDomainChartTrio(input: {
  domainId: string | null | undefined;
  eligiblePatternIds: readonly VisualizationPatternIdV1[];
}): VisualizationPatternIdV1[] {
  const set = getOfficialDomainChartSet(input.domainId);
  if (!set) return [];
  const eligible = new Set(input.eligiblePatternIds);
  const primary = set.primaryPatternIds.find(patternId => eligible.has(patternId));
  const supporting = set.supportingPatternIds.filter(patternId => eligible.has(patternId) && patternId !== primary).slice(0, 2);
  return primary ? [primary, ...supporting] : supporting.slice(0, 2);
}
