import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { ChartPreviewModel } from './chart-preview-model';
import { createDecisionVisualizationPlan, type DecisionVisualizationPlanV1 } from './decision-visualization-plan';
import { buildDomainVisualProfile } from './domain-visual-profile';
import { analyticalIntentFromRuntimeIntentType } from './visualization-planner';
import type { VisualizationAnalyticalIntentV1, VisualizationEvidenceRoleV1 } from './visualization-ontology';
import { adviseMicroBrainPresentation } from './understanding-core/micro-brain/presentation-advisor';


function semanticText(runtimeIntent: RuntimeIntent, analysisAction: AnalysisAction): string {
  return [
    analysisAction.id, analysisAction.opportunityName, analysisAction.description,
    ...analysisAction.dimensions, ...analysisAction.measures,
    ...runtimeIntent.dimensions, ...runtimeIntent.measures,
  ].filter(Boolean).join(' ').toLowerCase();
}

export function resolveInvestigationVisualizationIntent(
  runtimeIntent: RuntimeIntent,
  analysisAction: AnalysisAction,
): VisualizationAnalyticalIntentV1 {
  const base = analyticalIntentFromRuntimeIntentType(runtimeIntent.type);
  const text = semanticText(runtimeIntent, analysisAction);
  const hasTarget = /\b(target|goal|plan|budget|benchmark|quota|muc tieu|ke hoach)\b/.test(text);
  const hasActual = /\b(actual|achieved|achievement|result|performance|thuc te|dat duoc)\b/.test(text);
  const hasVariance = /\b(delta|variance|gap|change|difference|chênh|chenh|biến động|bien dong)\b/.test(text);
  const hasRank = /\b(rank|ranking|top|bottom|highest|lowest|largest|smallest|most|least|leader|contribute|contributes|contributed|contributing|contributor|contributors)\b/.test(text);
  const hasControlLimit = /\b(control limit|ucl|lcl|upper limit|lower limit|process control)\b/.test(text);
  const hasPareto = /\b(pareto|80\s*\/\s*20|cumulative contribution)\b/.test(text);
  const hasPartToWhole = /\b(mix|share|split|composition|part[- ]?to[- ]?whole|proportion|percentage of|percent of)\b|co cau|ty trong|phan bo/.test(text);

  if ((base === 'relationship' || base === 'category_comparison' || base === 'trend') && hasTarget && hasActual) return 'target_attainment';
  if ((base === 'category_comparison' || base === 'relationship') && hasVariance) return 'variance';
  if ((base === 'category_comparison' || base === 'distribution') && hasPareto) return 'pareto';
  if ((base === 'category_comparison' || base === 'distribution') && /\b(concentration|concentrated|dependency|dependence|exposure|over[- ]?reliance)\b/.test(text)) return 'risk_concentration';
  if ((base === 'category_comparison' || base === 'distribution') && hasPartToWhole) return 'composition';
  if ((base === 'category_comparison' || base === 'distribution') && hasRank) return 'ranking';
  // A categorical distribution such as Status/Channel mix is not a numeric
  // distribution. Without an explicit numeric observation, histogram/boxplot
  // would bin the aggregated counts and answer a different question.
  if (base === 'distribution' && runtimeIntent.dimensions.length > 0 && runtimeIntent.measures.length === 0) return 'category_comparison';
  if (base === 'trend' && hasControlLimit) return 'quality_control';
  return base;
}


function questionIntentHints(runtimeIntent: RuntimeIntent, analysisAction: AnalysisAction): VisualizationAnalyticalIntentV1[] {
  const text = semanticText(runtimeIntent, analysisAction);
  const hints: VisualizationAnalyticalIntentV1[] = [];
  const add = (intent: VisualizationAnalyticalIntentV1, pattern: RegExp) => { if (pattern.test(text)) hints.push(intent); };
  add('risk_concentration', /(concentration|concentrated|dependency|dependence|exposure|over[- ]?reliance)/);
  add('aging', /(aging|ageing|age bucket|days in stock|days outstanding|overdue)/);
  add('process_time', /(lead time|cycle time|processing time|duration|downtime|wait time|turnaround)/);
  add('capacity_utilization', /(capacity|utilization|occupancy|load factor)/);
  add('funnel', /(funnel|conversion|drop[- ]?off|stage progression|pipeline stage)/);
  add('cohort_retention', /(cohort|retention)/);
  add('geospatial', /(geospatial|geographic|on a map|map view)/);
  add('anomaly_scan', /(anomal(?:y|ies)|outlier|unusual|exception|spike|dip)/);
  return [...new Set(hints)];
}

function perspectiveRankedIntentCandidates(input: {
  runtimeIntent: RuntimeIntent;
  analysisAction: AnalysisAction;
  primaryDomain?: string | null;
  selectedPerspectiveId?: string | null;
}): VisualizationAnalyticalIntentV1[] {
  const base = resolveInvestigationVisualizationIntent(input.runtimeIntent, input.analysisAction);
  const rawBase = analyticalIntentFromRuntimeIntentType(input.runtimeIntent.type);
  const hints = questionIntentHints(input.runtimeIntent, input.analysisAction).filter(intent => intent !== base);
  if (hints.length === 0) return [...new Set([base, rawBase])];
  const advice = adviseMicroBrainPresentation({
    domainId: input.primaryDomain ?? undefined,
    perspectiveId: input.selectedPerspectiveId ?? undefined,
    userQuestion: input.analysisAction.description || input.analysisAction.opportunityName,
    semanticSignals: [...input.analysisAction.dimensions, ...input.analysisAction.measures],
    limit: 12,
  });
  const rank = (intent: VisualizationAnalyticalIntentV1) => {
    for (let index = 0; index < advice.candidates.length; index += 1) {
      if ((advice.candidates[index].presentation.analyticalIntents ?? []).includes(intent)) return index;
    }
    return Number.MAX_SAFE_INTEGER;
  };
  return [...new Set([...hints].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).concat(base, rawBase))];
}

function evidenceRolesForIntent(input: {
  intent: VisualizationAnalyticalIntentV1;
  runtimeIntent: RuntimeIntent;
  metricCount: number;
  hasDimension: boolean;
  partToWholeValidated?: boolean;
}): VisualizationEvidenceRoleV1[] {
  const { intent, metricCount, hasDimension } = input;
  if (intent === 'trend') return ['ordered_time','measure', ...(metricCount > 1 ? ['series' as const] : [])];
  if (intent === 'quality_control') return ['ordered_time','measure','control_limit'];
  if (intent === 'relationship') return ['entity_key','measure','comparison_measure', ...(metricCount > 2 ? ['size_measure' as const] : [])];
  if (intent === 'distribution') return ['numeric_observation', ...(hasDimension ? ['category' as const] : [])];
  if (intent === 'composition') return input.partToWholeValidated && hasDimension
    ? ['category','part_measure','denominator']
    : ['category','measure'];
  if (intent === 'target_attainment') {
    return input.runtimeIntent.type === 'trend'
      ? ['ordered_time','measure','target']
      : hasDimension ? ['category','measure','target'] : ['measure','target'];
  }
  if (intent === 'variance') return hasDimension ? ['category','signed_measure'] : ['measure','benchmark'];
  if (intent === 'risk_concentration') return hasDimension ? ['category','measure'] : ['measure'];
  if (intent === 'funnel') return hasDimension ? ['ordered_stage','measure'] : ['measure'];
  if (intent === 'evidence_detail') return ['entity_key'];
  return ['category','measure', ...(metricCount > 1 ? ['series' as const] : [])];
}

export type InvestigationVisualizationPlanInput = {
  chartModel: ChartPreviewModel | null;
  runtimeIntent: RuntimeIntent;
  analysisAction: AnalysisAction;
  primaryDomain?: string | null;
  selectedPerspectiveId?: string | null;
};

export function buildInvestigationDecisionVisualizationPlan(
  input: InvestigationVisualizationPlanInput,
): DecisionVisualizationPlanV1 | null {
  const { chartModel, runtimeIntent, analysisAction } = input;
  if (!chartModel || chartModel.status !== 'ready' || chartModel.rows.length === 0) return null;
  let intentCandidates = perspectiveRankedIntentCandidates({
    runtimeIntent, analysisAction,
    primaryDomain: input.primaryDomain,
    selectedPerspectiveId: input.selectedPerspectiveId,
  });
  if (runtimeIntent.type === 'trend' && chartModel.rows.length === 2) {
    intentCandidates = [...new Set<VisualizationAnalyticalIntentV1>(['period_comparison', ...intentCandidates.filter(intent => intent !== 'trend'), 'trend'])];
  }
  for (const analyticalIntent of intentCandidates) {
    const hasDimension = runtimeIntent.dimensions.length > 0 && Boolean(chartModel.xField);
    const measureAsAxis = analyticalIntent === 'relationship' || (analyticalIntent === 'distribution' && !hasDimension);
    const xFieldRole = measureAsAxis ? 'measure' as const : 'dimension' as const;
    const xField = measureAsAxis
      ? (analyticalIntent === 'relationship' ? chartModel.seriesFields[0] : chartModel.yField || chartModel.seriesFields[0])
      : chartModel.xField;
    if (!xField) continue;
    let metricIds = [...new Set([...(chartModel.seriesFields ?? []), chartModel.yField]
      .filter((value): value is string => Boolean(value && (xFieldRole === 'measure' || value !== xField))))];
    if (analyticalIntent === 'composition') {
      const basePartMeasure = runtimeIntent.measures.find(measure =>
        measure !== xField && chartModel.rows.some(row => row[measure] != null)
      );
      if (basePartMeasure) metricIds = [basePartMeasure];
      else if (chartModel.yField && chartModel.yField !== xField) metricIds = [chartModel.yField];
    }
    if (metricIds.length === 0) continue;
    const partToWholeValidated = analyticalIntent === 'composition' && hasDimension && metricIds.length === 1
      && chartModel.rows.length > 0
      && chartModel.rows.every(row => {
        const value = Number(row[metricIds[0]]);
        return Number.isFinite(value) && value >= 0;
      })
      && chartModel.rows.some(row => Number(row[metricIds[0]]) > 0);
    const availableRoles = evidenceRolesForIntent({
      intent: analyticalIntent, runtimeIntent, metricCount: metricIds.length, hasDimension, partToWholeValidated,
    });
    const categoryCount = xFieldRole === 'dimension'
      ? new Set(chartModel.rows.map(row => String(row[xField] ?? ''))).size
      : undefined;
    const presentationShaping = analyticalIntent === 'ranking' && xFieldRole === 'dimension'
      && metricIds.length >= 1 && (categoryCount ?? 0) > 25
      ? {
          kind: 'top_n' as const, limit: 15, sourceCategoryCount: categoryCount!,
          omittedCategoryCount: categoryCount! - 15, sortMetricId: metricIds[0],
          sortDirection: 'desc' as const, reason: 'high_cardinality_ranking' as const,
        }
      : null;
    const domainProfile = input.primaryDomain ? buildDomainVisualProfile(input.primaryDomain, {
      perspectiveId: input.selectedPerspectiveId ?? undefined,
      analyticalIntent,
      userQuestion: analysisAction.description || analysisAction.opportunityName,
      semanticSignals: [analysisAction.id, analysisAction.opportunityName, ...analysisAction.dimensions, ...analysisAction.measures],
    }) : null;
    try {
      return createDecisionVisualizationPlan({
        perspectiveId: input.selectedPerspectiveId?.trim() || analysisAction.id, rows: chartModel.rows, sourceCount: 1,
        dimensionField: xField, xFieldRole, metricIds, analyticalIntent,
        availableRoles: [...availableRoles],
        cardinality: {
          points: chartModel.rows.length,
          categories: categoryCount,
          series: metricIds.length,
        },
        requiredSurfaces: ['preview','persistence','dashboard'], domainProfile, presentationShaping,
      });
    } catch {
      // A presentation hint never overrides deterministic suitability. Try the
      // next question-compatible intent, ending at the original runtime base.
    }
  }
  return null;
}
