import type { DomainBAId } from './domain-ba-playbooks';
import { OFFICIAL_DOMAIN_VISUAL_PLAYBOOKS_V2, type OfficialDomainVisualPlaybookV2 } from './domain-visual-playbooks';
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
export const OFFICIAL_DOMAIN_CHART_SETS_V1: Readonly<Record<DomainBAId, OfficialDomainChartSetV1>> = Object.freeze(
  Object.fromEntries(
    (Object.entries(OFFICIAL_DOMAIN_VISUAL_PLAYBOOKS_V2) as Array<[DomainBAId, OfficialDomainVisualPlaybookV2]>).map(([domainId, playbook]) => [
      domainId,
      {
        schemaVersion: OFFICIAL_DOMAIN_CHART_SET_VERSION,
        domainId,
        label: playbook.label,
        primaryPatternIds: [...playbook.chartSet.primaryPatternIds],
        supportingPatternIds: [...playbook.chartSet.supportingPatternIds],
        governance: governed,
        researchBasis: [...playbook.researchBasis],
      },
    ]),
  ) as Record<DomainBAId, OfficialDomainChartSetV1>,
);

const OFFICIAL_DOMAIN_IDS = new Set<DomainBAId>(Object.keys(OFFICIAL_DOMAIN_CHART_SETS_V1) as DomainBAId[]);

export function getOfficialDomainChartSet(domainId: string | null | undefined): OfficialDomainChartSetV1 | null {
  if (!domainId || !OFFICIAL_DOMAIN_IDS.has(domainId as DomainBAId)) return null;
  return OFFICIAL_DOMAIN_CHART_SETS_V1[domainId as DomainBAId];
}

export function officialDomainPatternOrder(domainId: string | null | undefined): VisualizationPatternIdV1[] {
  const set = getOfficialDomainChartSet(domainId);
  return set ? [...new Set([...set.primaryPatternIds, ...set.supportingPatternIds])] : [];
}

export function officialDomainPatternOrderForIntent(
  domainId: string | null | undefined,
  intent: VisualizationAnalyticalIntentV1,
): VisualizationPatternIdV1[] {
  const playbook = domainId ? OFFICIAL_DOMAIN_VISUAL_PLAYBOOKS_V2[domainId as DomainBAId] : undefined;
  if (!playbook) return [];
  const preferred = playbook.intentPatternPreferences[intent] ?? [];
  return [...new Set([...preferred, ...officialDomainPatternOrder(domainId)])]
    .filter(patternId => VISUALIZATION_PATTERN_BY_ID_V1.get(patternId)?.intents.includes(intent));
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
