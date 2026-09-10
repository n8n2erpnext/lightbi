import type { AnalysisAction } from './analysis-opportunity-actions';
import type { RuntimeIntent } from './analysis-runtime-contract';
import type { ChartPreviewModel } from './chart-preview-model';
import type { DecisionVisualizationPlanV1 } from './decision-visualization-plan';
import { inferSemanticType } from './display-formatter';
import {
  matchOfficialDomainCombinationRecipe,
  officialDomainComplementRoles,
} from './domain-visual-playbooks';
import { resolveInvestigationVisualizationIntent } from './investigation-visualization-plan';
import { visualNarrativeModelsCanAlign } from './visual-narrative-runtime';
import {
  adviseMicroBrainPresentation,
  type MicroBrainPresentationAdviceV1,
  type MicroBrainPresentationQueryV1,
} from './understanding-core/micro-brain/presentation-advisor';
import {
  createVisualNarrativeCompositionPlan,
  type VisualNarrativeCandidateV1,
  type VisualNarrativeCompositionPlanV1,
  type VisualNarrativeStoryRoleV1,
} from './visual-narrative-composition';

export type InvestigationVisualNarrativeInputItemV1 = {
  id: string;
  isPrimary: boolean;
  managementQuestion: string;
  analysisAction: AnalysisAction;
  runtimeIntent: RuntimeIntent;
  chartModel: ChartPreviewModel;
  decisionVisualizationPlan: DecisionVisualizationPlanV1 | null;
  sourceScopeKey: string;
};
function storyRoleForIntent(intent: string, isPrimary: boolean): VisualNarrativeStoryRoleV1 {
  if (isPrimary) return 'answer';
  if (['target_attainment','period_comparison'].includes(intent)) return 'comparison';
  if (['trend','variance','contribution'].includes(intent)) return 'change';
  if (['ranking','category_comparison','pareto'].includes(intent)) return 'driver';
  if (['composition','composition_over_time'].includes(intent)) return 'composition';
  if (['distribution','aging','process_time'].includes(intent)) return 'distribution';
  if (intent === 'relationship') return 'relationship';
  if (['risk_concentration','anomaly_scan','quality_control','capacity_utilization'].includes(intent)) return 'risk';
  return 'evidence';
}

function metricIds(item: InvestigationVisualNarrativeInputItemV1): string[] {
  return [...new Set(item.decisionVisualizationPlan?.result.metricIds
    ?? item.chartModel.seriesFields
    ?? [])].filter(Boolean);
}

function unitFamily(item: InvestigationVisualNarrativeInputItemV1): string {
  const metric = metricIds(item)[0] ?? item.chartModel.yField ?? '';
  const sample = metric ? item.chartModel.rows.find(row => row[metric] != null)?.[metric] : undefined;
  const semantic = inferSemanticType(metric, sample);
  if (semantic === 'currency') return 'currency';
  if (/\b(rate|ratio|percent|percentage|margin|achievement|sla|%|pct)\b/i.test(metric)) return 'percent';
  if (/\b(count|qty|quantity|units?|volume|records?|shipments?|deliveries)\b/i.test(metric)) return 'count';
  return 'number';
}

function textForRecipe(item: InvestigationVisualNarrativeInputItemV1): string {
  return [item.managementQuestion, item.analysisAction.opportunityName, item.analysisAction.description, ...metricIds(item)]
    .filter(Boolean).join(' ');
}
function baseCandidate(
  item: InvestigationVisualNarrativeInputItemV1,
  primaryDomain: string | null,
): VisualNarrativeCandidateV1 {
  const intent = resolveInvestigationVisualizationIntent(item.runtimeIntent, item.analysisAction);
  const plan = item.decisionVisualizationPlan;
  const role = storyRoleForIntent(intent, item.isPrimary);
  const allowedComplements = primaryDomain ? officialDomainComplementRoles(primaryDomain, intent) : [];
  return {
    id: item.id,
    isPrimary: item.isPrimary,
    managementQuestion: item.managementQuestion,
    storyRole: role,
    analyticalIntent: intent,
    dimensionField: plan?.result.dimensionField ?? item.chartModel.xField ?? null,
    metricIds: metricIds(item),
    unitFamily: unitFamily(item),
    grainId: plan?.result.dimensionField ?? item.chartModel.xField ?? null,
    sourceScopeKey: item.sourceScopeKey,
    evidenceBacked: item.chartModel.status === 'ready' && item.chartModel.rows.length > 0 && Boolean(plan),
    evidenceRefs: plan ? [`decision-visualization:${plan.planId}`] : [],
    decisionImportance: item.isPrimary ? 100 : Math.max(10, Math.min(95, item.analysisAction.confidenceScore || 70)),
    visualizationPlanId: plan?.visualizationPlan.planId ?? null,
    rendererFamily: plan?.visualizationPlan.rendererFamily ?? null,
    pointCount: item.chartModel.rows.length,
    combination: null,
    ...(allowedComplements.length > 0 ? { } : {}),
  };
}

function normalizeAdviceToken(value: string | null | undefined): string {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const STORY_ROLE_ADVICE_ALIASES: Readonly<Record<VisualNarrativeStoryRoleV1, readonly string[]>> = {
  answer: ['overview','answer','primary_answer','performance'],
  comparison: ['comparison','variance','target','performance'],
  change: ['change','trend','variance','movement','drivers'],
  driver: ['driver','drivers','contribution','ranking','concentration'],
  composition: ['composition','mix','share'],
  distribution: ['distribution','shape','aging'],
  relationship: ['relationship','correlation'],
  risk: ['risk','exposure','exceptions','concentration','control'],
  evidence: ['evidence','detail','control'],
};

function adviceRoleMatch(tokens: Set<string>, role: VisualNarrativeStoryRoleV1): boolean {
  return STORY_ROLE_ADVICE_ALIASES[role].some(alias => tokens.has(normalizeAdviceToken(alias)));
}

/**
 * Preserve the advisor's ordinal signal instead of flattening many weak matches
 * into the same saturated score. The best high-ranked relevant card wins;
 * retrieval rank remains advisory relevance and never becomes confidence.
 */
function presentationAdvisoryPrior(advice: MicroBrainPresentationAdviceV1, candidate: VisualNarrativeCandidateV1): number {
  let best = 0;
  advice.candidates.slice(0, 12).forEach((item, index) => {
    const intents = new Set((item.presentation.analyticalIntents ?? []).map(normalizeAdviceToken));
    const roles = new Set([...(item.presentation.dashboardRoles ?? []), ...(item.presentation.priorities ?? [])].map(normalizeAdviceToken));
    const families = new Set((item.presentation.chartFamilies ?? []).map(normalizeAdviceToken));
    const intentMatch = intents.has(normalizeAdviceToken(candidate.analyticalIntent));
    const roleMatch = adviceRoleMatch(roles, candidate.storyRole);
    const familyMatch = Boolean(candidate.rendererFamily && families.has(normalizeAdviceToken(candidate.rendererFamily)));
    const localWeight = (intentMatch ? 4 : 0) + (roleMatch ? 2 : 0) + (familyMatch ? 1 : 0);
    if (localWeight === 0) return;
    const rankWeight = Math.max(1, 12 - index);
    best = Math.max(best, rankWeight * 8 + localWeight);
  });
  return best;
}

export function buildInvestigationVisualNarrativePlan(input: {
  primaryDomain: string | null;
  selectedPerspectiveId?: string | null;
  items: InvestigationVisualNarrativeInputItemV1[];
  advisor?: (query: MicroBrainPresentationQueryV1) => MicroBrainPresentationAdviceV1;
}): { candidates: VisualNarrativeCandidateV1[]; plan: VisualNarrativeCompositionPlanV1; advice: MicroBrainPresentationAdviceV1 } {
  const primaryItem = input.items.find(item => item.isPrimary);
  if (!primaryItem) throw new Error('INVESTIGATION_VISUAL_NARRATIVE_PRIMARY_REQUIRED');
  const candidates = input.items.map(item => baseCandidate(item, input.primaryDomain));
  const primary = candidates.find(candidate => candidate.isPrimary)!;
  const primaryText = textForRecipe(primaryItem);

  for (const item of input.items.filter(candidate => !candidate.isPrimary)) {
    const candidate = candidates.find(value => value.id === item.id)!;
    const recipe = matchOfficialDomainCombinationRecipe({
      domainId: input.primaryDomain,
      primaryText,
      companionText: textForRecipe(item),
    });
    if (!recipe || !visualNarrativeModelsCanAlign(primaryItem.chartModel, item.chartModel)) continue;
    const groupId = `${recipe.id}:${String(primary.grainId ?? '')}:${primary.sourceScopeKey}`;
    const explicitUnitLabel = recipe.allowExplicitMultiUnit || primary.unitFamily === candidate.unitFamily;
    primary.combination = {
      groupId,
      mark: recipe.presentation === 'combo_bar_line' ? 'bar' : 'bar',
      explicitUnitLabel,
    };
    candidate.combination = {
      groupId,
      mark: recipe.presentation === 'combo_bar_line' ? 'line' : 'bar',
      explicitUnitLabel,
    };
  }

  const primaryIntent = primary.analyticalIntent as Parameters<typeof officialDomainComplementRoles>[1];
  const advisedRoles = new Set(officialDomainComplementRoles(input.primaryDomain, primaryIntent));
  for (const candidate of candidates) {
    if (candidate.isPrimary || advisedRoles.size === 0) continue;
    if (advisedRoles.has(candidate.storyRole)) {
      candidate.officialComplementToPrimary = true;
      candidate.decisionImportance = Math.min(95, candidate.decisionImportance + 4);
    }
  }

  const advisor = input.advisor ?? adviseMicroBrainPresentation;
  const advice = advisor({
    domainId: input.primaryDomain ?? undefined,
    perspectiveId: input.selectedPerspectiveId ?? undefined,
    analyticalIntent: primary.analyticalIntent,
    userQuestion: primary.managementQuestion,
    semanticSignals: [...new Set(candidates.flatMap(candidate => [candidate.dimensionField ?? '', ...candidate.metricIds]).filter(Boolean))],
    availableRoles: [...new Set(candidates.map(candidate => candidate.storyRole))],
    limit: 12,
  });
  for (const candidate of candidates) {
    if (candidate.isPrimary) continue;
    candidate.advisoryRankPrior = presentationAdvisoryPrior(advice, candidate);
  }

  return { candidates, plan: createVisualNarrativeCompositionPlan({ candidates }), advice };
}
