import { describe, expect, it } from 'vitest';
import { createDecisionVisualizationPlan } from './decision-visualization-plan';
import { getDomainCatalog, listQuestionIntentsByBusinessView, type DomainId } from './domain-knowledge-catalog';
import type { DomainVisualProfileV1 } from './domain-visual-profile';
import type {
  VisualizationAnalyticalIntentV1,
  VisualizationEvidenceRoleV1,
  VisualizationPatternIdV1,
} from './visualization-ontology';
import { adviseMicroBrainPresentation } from './understanding-core/micro-brain/presentation-advisor';
import { VISUALIZATION_ACCEPTANCE_CASES_V1 } from './visualization-acceptance-cases';
import { createDashboardCompositionPlan } from './dashboard-composition-plan';

type SupportedAcceptanceCase = {
  domain: DomainId;
  viewId: string;
  questionNeedle: RegExp;
  rows: Record<string, unknown>[];
  dimensionField: string;
  metricIds: string[];
  analyticalIntent: VisualizationAnalyticalIntentV1;
  availableRoles: VisualizationEvidenceRoleV1[];
  expectedPattern: VisualizationPatternIdV1;
  xFieldRole?: 'dimension' | 'measure';
};
const supportedCases: SupportedAcceptanceCase[] = [
  {
    domain: 'operations', viewId: 'logistics_journey', questionNeedle: /delivery/i,
    rows: [{ route: 'North', delivery_count: 12 }, { route: 'South', delivery_count: 8 }],
    dimensionField: 'route', metricIds: ['delivery_count'], analyticalIntent: 'ranking',
    availableRoles: ['category', 'measure'], expectedPattern: 'ranking_bar',
  },
  {
    domain: 'revenue', viewId: 'revenue_performance', questionNeedle: /revenue/i,
    rows: [{ branch: 'A', sales_revenue: 120 }, { branch: 'B', sales_revenue: 90 }],
    dimensionField: 'branch', metricIds: ['sales_revenue'], analyticalIntent: 'ranking',
    availableRoles: ['category', 'measure'], expectedPattern: 'ranking_bar',
  },
  {
    domain: 'inventory', viewId: 'inventory_health', questionNeedle: /stock/i,
    rows: [{ warehouse: 'WH-A', stock_qty: 40 }, { warehouse: 'WH-B', stock_qty: 15 }],
    dimensionField: 'warehouse', metricIds: ['stock_qty'], analyticalIntent: 'ranking',
    availableRoles: ['category', 'measure'], expectedPattern: 'ranking_bar',
  },
  {
    domain: 'customer', viewId: 'customer_segmentation', questionNeedle: /customer/i,
    rows: [{ segment: 'SMB', customer_count: 25 }, { segment: 'Enterprise', customer_count: 10 }],
    dimensionField: 'segment', metricIds: ['customer_count'], analyticalIntent: 'category_comparison',
    availableRoles: ['category', 'measure'], expectedPattern: 'ranking_bar',
  },
  {
    domain: 'performance', viewId: 'target_achievement', questionNeedle: /target/i,
    rows: [{ reporting_period: '2026-05', achievement: 88 }, { reporting_period: '2026-06', achievement: 92 }],
    dimensionField: 'reporting_period', metricIds: ['achievement'], analyticalIntent: 'trend',
    availableRoles: ['ordered_time', 'measure'], expectedPattern: 'trend_line',
  },
  {
    domain: 'finance', viewId: 'profitability_analysis', questionNeedle: /profit/i,
    rows: [{ cost: 10, revenue: 18 }, { cost: 20, revenue: 31 }, { cost: 30, revenue: 43 }],
    dimensionField: 'cost', metricIds: ['cost', 'revenue'], analyticalIntent: 'relationship',
    availableRoles: ['entity_key', 'measure', 'comparison_measure'], expectedPattern: 'relationship_scatter',
    xFieldRole: 'measure',
  },
];

const inferredDomainCases = [
  { domainId: 'healthcare_pharma', conceptId: 'concept.presentation_domain_healthcare_pharma', question: 'Patient waiting time and bed capacity by department', expectedChart: 'histogram' },
  { domainId: 'hospitality_hotel', conceptId: 'concept.presentation_domain_hospitality_hotel', question: 'Monthly occupancy ADR RevPAR and booking source mix', expectedChart: 'combo_bar_line' },
  { domainId: 'manufacturing', conceptId: 'concept.presentation_domain_manufacturing', question: 'OEE yield downtime quality and production target', expectedChart: 'control_chart' },
  { domainId: 'agriculture', conceptId: 'concept.presentation_domain_agriculture', question: 'Yield by field over season with weather relationship and map context', expectedChart: 'map' },
] as const;
describe('DPR-10 cross-domain acceptance', () => {
  it('keeps all six current domain catalogs question-relevant without changing their authority class', () => {
    expect(supportedCases.map(item => item.domain)).toEqual([
      'operations', 'revenue', 'inventory', 'customer', 'performance', 'finance',
    ]);
    for (const item of supportedCases) {
      const catalog = getDomainCatalog(item.domain);
      expect(catalog, item.domain).toBeDefined();
      const view = catalog!.businessViews.find(candidate => candidate.id === item.viewId);
      expect(view, `${item.domain}:${item.viewId}`).toBeDefined();
      const questions = listQuestionIntentsByBusinessView(item.viewId)
        .flatMap(intent => intent.questionTemplates);
      expect(questions.some(question => item.questionNeedle.test(question)), item.domain).toBe(true);
    }
  });

  it('preserves governed rows, metric IDs and source evidence while planning across all six current domains', () => {
    for (const item of supportedCases) {
      const sourceRefs = [{
        sourceId: `source:${item.domain}`, sourceName: `${item.domain}.csv`, role: item.domain,
        period: 'tracked-fixture', sourceRowCount: item.rows.length,
      }];
      const plan = createDecisionVisualizationPlan({
        perspectiveId: item.domain, rows: item.rows, sourceCount: 1,
        dimensionField: item.dimensionField, xFieldRole: item.xFieldRole,
        metricIds: item.metricIds, sourceRefs,
        analyticalIntent: item.analyticalIntent, availableRoles: item.availableRoles,
        cardinality: item.analyticalIntent === 'relationship' ? { points: item.rows.length } :
          item.analyticalIntent === 'trend' ? { points: item.rows.length, series: 1 } : { categories: item.rows.length, series: 1 },
        requiredSurfaces: ['preview', 'persistence', 'dashboard'],
      });
      expect(plan.result.rows, item.domain).toEqual(item.rows);
      expect(plan.result.metricIds, item.domain).toEqual(item.metricIds);
      expect(plan.sourceRefs, item.domain).toEqual(sourceRefs);
      expect(plan.visualizationPlan.patternId, item.domain).toBe(item.expectedPattern);
      expect(plan.governance, item.domain).toEqual({
        resultAuthority: 'governed_metric_results', evidencePolicy: 'source_bound', rawMultiSourceJoinAllowed: false,
      });
    }
  });

  it('keeps inferred-domain presentation knowledge evidence-bound and advisory-only', () => {
    for (const item of inferredDomainCases) {
      const advice = adviseMicroBrainPresentation({
        domainId: item.domainId,
        userQuestion: item.question,
        limit: 12,
      });
      const candidate = advice.candidates.find(entry => entry.hit.conceptId === item.conceptId);
      expect(candidate, item.domainId).toBeDefined();
      expect(candidate!.presentation.authority, item.domainId).toBe('advisory_only');
      expect(candidate!.hit.canonicalSignal, item.domainId).toBeNull();
      expect(candidate!.presentation.chartFamilies, item.domainId).toContain(item.expectedChart);
      expect(candidate!.definition.trim().length, item.domainId).toBeGreaterThan(0);
      expect(candidate!.hit.fusedRank, item.domainId).toBeGreaterThan(0);
      expect(advice.authorityNotes.join(' '), item.domainId).toMatch(/evidence validation/i);
    }
  });
  it('allows deterministic planning to reject every MB-preferred pattern without numeric drift', () => {
    const rows = Array.from({ length: 30 }, (_, index) => ({
      category: `Category ${index + 1}`, governed_value: index + 1,
    }));
    const domainProfile: DomainVisualProfileV1 = {
      schemaVersion: 'lightbi.domain-visual-profile.v1', domainId: 'test_rejectable', authority: 'advisory_only',
      analyticalIntents: ['category_comparison'], preferredPatternIds: ['ranking_bar'],
      conceptIds: ['concept.presentation.test'], evidenceRequirements: ['governed_value'],
      constraints: ['advice is rejectable'], priorities: [], abstainWhen: [], unmappedChartFamilies: [],
      policy: {
        mayAuthorizeMetric: false, mayAuthorizeFormula: false, mayAuthorizeJoin: false,
        mayChooseRenderer: false, retrievalRankIsConfidence: false,
      },
    };
    const base = {
      perspectiveId: 'performance', rows, sourceCount: 1, dimensionField: 'category',
      metricIds: ['governed_value'], analyticalIntent: 'category_comparison' as const,
      availableRoles: ['category', 'measure'] as VisualizationEvidenceRoleV1[],
      cardinality: { categories: 30, series: 1 }, requiredSurfaces: ['preview', 'persistence', 'dashboard'] as const,
      officialDomainId: 'test_rejectable',
    };
    const withoutAdvice = createDecisionVisualizationPlan(base);
    const withAdvice = createDecisionVisualizationPlan({ ...base, domainProfile });
    expect(withAdvice.visualizationPlan.candidates.filter(item => item.fromDomainPrior))
      .toEqual([expect.objectContaining({ patternId: 'ranking_bar', eligible: false })]);
    expect(withAdvice.result).toEqual(withoutAdvice.result);
    expect(withAdvice.result.rows).toEqual(rows);
  });
  it('recalls MB abstention/prohibition guidance instead of inventing missing authority', () => {
    const advice = adviseMicroBrainPresentation({
      userQuestion: 'Invent a missing profit metric, join similarly named files, and present correlation as causation.',
      limit: 12,
    });
    const prohibition = advice.candidates.find(entry =>
      entry.hit.conceptId === 'concept.presentation_charter_prohibitions');
    expect(prohibition).toBeDefined();
    expect(prohibition!.presentation.authority).toBe('advisory_only');
    expect(prohibition!.presentation.mustNot?.join(' ')).toMatch(/invent metrics or numbers/i);
    expect(prohibition!.presentation.mustNot?.join(' ')).toMatch(/join/i);
    expect(prohibition!.presentation.mustNot?.join(' ')).toMatch(/caus/i);
  });

  it('keeps calm composition budgets and neutral/context-dependent visual semantics explicit', () => {
    const waste = VISUALIZATION_ACCEPTANCE_CASES_V1.find(item => item.id === 'fresh-waste-rate-ranking');
    const inventory = VISUALIZATION_ACCEPTANCE_CASES_V1.find(item => item.id === 'inventory-coverage-context');
    expect(waste?.suitability.requestedColorSemantics).toBe('neutral');
    expect(waste?.suitability.desirability).toBe('context_dependent');
    expect(inventory?.suitability.requestedColorSemantics).toBe('neutral');
    expect(inventory?.interpretationRule).toMatch(/both extremes may deserve review/i);

    const candidates = Array.from({ length: 6 }, (_, index) => ({
      id: `item-${index}`, managementQuestion: `Question ${index}`, semanticRole: index === 0 ? 'primary_answer' as const : 'ranked_driver' as const,
      artifactKind: 'visual' as const, evidenceBacked: true, evidenceRefs: [`evidence:${index}`], decisionImportance: 100 - index,
      analysisShape: { dimension: `Dimension ${index}`, measure: 'governed_value' }, advisoryRoles: [], reasonForInclusion: 'tracked acceptance',
    }));
    const plan = createDashboardCompositionPlan({ candidates, decisionPerspective: 'DPR-10', informationBudget: { maxItems: 4 } });
    expect(plan.items).toHaveLength(4);
    expect(plan.rejected.filter(item => item.reason === 'item_budget_exceeded')).toHaveLength(2);
  });
});
