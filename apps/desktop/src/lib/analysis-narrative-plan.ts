import type { DomainComparisonBrief, NarrativeSection, ReasonCode } from './ba-comparison-engine';
import type { DeepBAFinding, DeepBAInvestigation, SingleSourceBAOverview } from './single-source-ba-overview';
import { adviseMicroBrainPresentation, type MicroBrainPresentationAdviceV1, type MicroBrainPresentationQueryV1 } from './understanding-core/micro-brain/presentation-advisor';

export const ANALYSIS_NARRATIVE_PLAN_VERSION = 'lightbi.analysis-narrative-plan.v1' as const;

export type AnalysisNarrativeRoleV1 =
  | 'primary_answer'
  | 'supporting_observation'
  | 'key_driver'
  | 'risk_exception'
  | 'hypothesis'
  | 'unknown'
  | 'next_action'
  | 'supporting_evidence';

export type NarrativeFindingItemV1 = {
  kind: 'finding';
  role: Exclude<AnalysisNarrativeRoleV1, 'unknown' | 'next_action' | 'supporting_evidence'>;
  finding: DeepBAFinding;
  sourceBucket: 'what_happened' | 'where_it_happened' | 'why_it_may_have_happened' | 'unusual' | 'priorities';
  relevanceScore: number;
  relevanceReasons: string[];
};

export type NarrativeUnknownItemV1 = {
  kind: 'unknown';
  role: 'unknown';
  unknown: DeepBAInvestigation['unknowns'][number];
};

export type NarrativeActionItemV1 = {
  kind: 'action';
  role: 'next_action';
  action: DeepBAInvestigation['actions'][number];
};

export type AnalysisNarrativeSectionV1 = {
  role: Exclude<AnalysisNarrativeRoleV1, 'primary_answer'>;
  priority: number;
  collapsedByDefault: boolean;
  reason: string;
  findingItems: NarrativeFindingItemV1[];
  unknownItems: NarrativeUnknownItemV1[];
  actionItems: NarrativeActionItemV1[];
};

export type NarrativeMbAdviceV1 = {
  conceptIds: string[];
  priorities: string[];
  abstainWhen: string[];
  evidenceRequirements: string[];
  constraints: string[];
  prohibitions: string[];
};

export type SingleSourceAnalysisNarrativePlanV1 = {
  schemaVersion: typeof ANALYSIS_NARRATIVE_PLAN_VERSION;
  sourceKind: 'single_source';
  domainId: string | null;
  primaryAnswer: NarrativeFindingItemV1 | null;
  sections: AnalysisNarrativeSectionV1[];
  supporting: {
    showKpis: boolean;
    showDiagnostics: boolean;
    breakdownIds: string[];
    decompositionIds: string[];
    comparisonKinds: string[];
    followUpQuestionCount: number;
    showLegacyFindings: boolean;
    showLegacyActions: boolean;
    showLimitations: boolean;
  };
  advisory: NarrativeMbAdviceV1;
  policy: {
    answerFirst: true;
    mbMayStrengthenAuthority: false;
    mbMayReorderNarrativeRoles: true;
    preserveFindingIdentity: true;
    preserveEvidenceRows: true;
    retrievalScoreIsConfidence: false;
  };
};

export type ComparisonAnalysisNarrativePlanV1 = {
  schemaVersion: typeof ANALYSIS_NARRATIVE_PLAN_VERSION;
  sourceKind: 'multi_source_comparison';
  domainId: string;
  primaryAnswer: string;
  narrativeSections: NarrativeSection[];
  reasonCodes: ReasonCode[];
  driverPanels: Array<'growth' | 'decline' | 'profit'>;
  advisory: NarrativeMbAdviceV1;
  policy: SingleSourceAnalysisNarrativePlanV1['policy'];
};

export type AnalysisNarrativePlannerOptionsV1 = {
  perspectiveId?: string | null;
  advisor?: (query: MicroBrainPresentationQueryV1) => MicroBrainPresentationAdviceV1;
};

type RoleScore = { role: AnalysisNarrativeSectionV1['role']; base: number; advisory: number };

const EMPTY_ADVICE: NarrativeMbAdviceV1 = { conceptIds: [], priorities: [], abstainWhen: [], evidenceRequirements: [], constraints: [], prohibitions: [] };

function unique(values: readonly string[]): string[] {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function extractAdvice(raw: MicroBrainPresentationAdviceV1): NarrativeMbAdviceV1 {
  const eligible = raw.candidates.filter(candidate => ['domain_profile', 'perspective_profile', 'dashboard_narrative', 'self_charter'].includes(candidate.presentation.advisoryKind));
  return {
    conceptIds: unique(eligible.map(candidate => candidate.hit.conceptId)),
    priorities: unique(eligible.flatMap(candidate => candidate.presentation.priorities ?? [])),
    abstainWhen: unique(eligible.flatMap(candidate => candidate.presentation.abstainWhen ?? [])),
    evidenceRequirements: unique(eligible.flatMap(candidate => candidate.presentation.evidenceRequirements ?? [])),
    constraints: unique(eligible.flatMap(candidate => candidate.presentation.constraints ?? [])),
    prohibitions: unique(eligible.flatMap(candidate => candidate.presentation.mustNot ?? [])),
  };
}

function rolePrior(role: AnalysisNarrativeSectionV1['role'], priorities: string[]): number {
  const text = priorities.map(normalize).join(' ');
  if (role === 'key_driver' && /driver|throughput|bottleneck|performance|profitability|working_capital|stock_health|capacity/.test(text)) return 16;
  if (role === 'risk_exception' && /risk|exception|concentration|aging|control/.test(text)) return 16;
  if (role === 'hypothesis' && /relationship|decomposition|explain|cause/.test(text)) return 12;
  if (role === 'supporting_observation' && /shape|trend|overview|demand|response/.test(text)) return 4;
  if (role === 'unknown' && /evidence|unknown|verify|verification/.test(text)) return 5;
  return 0;
}

function findingScore(finding: DeepBAFinding): number {
  const basis = finding.basis === 'evidence_backed' ? 30 : finding.basis === 'needs_verification' ? 15 : 10;
  const confidence = finding.confidence === 'high' ? 12 : finding.confidence === 'medium' ? 8 : 4;
  return basis + confidence + Math.min(30, Math.max(0, finding.priorityScore ?? 0));
}

function findingItem(role: NarrativeFindingItemV1['role'], finding: DeepBAFinding, sourceBucket: NarrativeFindingItemV1['sourceBucket']): NarrativeFindingItemV1 {
  return { kind: 'finding', role, finding, sourceBucket, relevanceScore: findingScore(finding), relevanceReasons: [`basis:${finding.basis}`, `confidence:${finding.confidence}`, ...(finding.priorityScore !== undefined ? [`priority:${finding.priorityScore}`] : [])] };
}

function dedupeFindingItems(items: NarrativeFindingItemV1[], seen: Set<string>): NarrativeFindingItemV1[] {
  const result: NarrativeFindingItemV1[] = [];
  for (const item of items.sort((left, right) => right.relevanceScore - left.relevanceScore || left.finding.id.localeCompare(right.finding.id))) {
    if (seen.has(item.finding.id)) continue;
    seen.add(item.finding.id);
    result.push(item);
  }
  return result;
}

function emptySection(role: AnalysisNarrativeSectionV1['role'], priority: number, reason: string): AnalysisNarrativeSectionV1 {
  return { role, priority, collapsedByDefault: role !== 'key_driver', reason, findingItems: [], unknownItems: [], actionItems: [] };
}

function publishedPolicy(): SingleSourceAnalysisNarrativePlanV1['policy'] {
  return { answerFirst: true, mbMayStrengthenAuthority: false, mbMayReorderNarrativeRoles: true, preserveFindingIdentity: true, preserveEvidenceRows: true, retrievalScoreIsConfidence: false };
}

function adviceFor(domainId: string | null, perspectiveId: string | null, semanticSignals: string[], userQuestion: string, advisor: AnalysisNarrativePlannerOptionsV1['advisor']): NarrativeMbAdviceV1 {
  if (!domainId && !perspectiveId) return EMPTY_ADVICE;
  const raw = (advisor ?? adviseMicroBrainPresentation)({ domainId: domainId ?? undefined, perspectiveId: perspectiveId ?? undefined, analyticalIntent: 'narrative_analysis', semanticSignals, userQuestion, limit: 8 });
  return extractAdvice(raw);
}

export function buildSingleSourceAnalysisNarrativePlan(overview: SingleSourceBAOverview, options: AnalysisNarrativePlannerOptionsV1 = {}): SingleSourceAnalysisNarrativePlanV1 {
  const investigation = overview.investigation ?? null;
  const domainId = investigation?.domain ?? overview.mode ?? null;
  const advice = adviceFor(domainId, options.perspectiveId ?? null, Object.keys(overview.bindings), overview.analysisLabel, options.advisor);
  if (!investigation) {
    return { schemaVersion: ANALYSIS_NARRATIVE_PLAN_VERSION, sourceKind: 'single_source', domainId, primaryAnswer: null, sections: [], supporting: { showKpis: overview.kpis.length > 0, showDiagnostics: Boolean(overview.concentration || overview.trend.length || overview.outlierCount), breakdownIds: overview.breakdowns.filter(item => item.top.length > 0).map(item => item.id), decompositionIds: [], comparisonKinds: [], followUpQuestionCount: 0, showLegacyFindings: overview.findings.length > 0, showLegacyActions: overview.recommendedActions.length > 0, showLimitations: overview.limitations.length > 0 }, advisory: advice, policy: publishedPolicy() };
  }

  const seen = new Set<string>();
  const first = investigation.whatHappened[0] ?? null;
  const primaryAnswer = first ? findingItem('primary_answer', first, 'what_happened') : null;
  if (first) seen.add(first.id);

  const roleScores: RoleScore[] = [
    { role: 'key_driver', base: 90, advisory: rolePrior('key_driver', advice.priorities) },
    { role: 'risk_exception', base: 80, advisory: rolePrior('risk_exception', advice.priorities) },
    { role: 'hypothesis', base: 70, advisory: rolePrior('hypothesis', advice.priorities) },
    { role: 'supporting_observation', base: 60, advisory: rolePrior('supporting_observation', advice.priorities) },
    { role: 'unknown', base: 40, advisory: rolePrior('unknown', advice.priorities) },
    { role: 'next_action', base: 30, advisory: 0 },
    { role: 'supporting_evidence', base: 20, advisory: 0 },
  ];
  const sectionByRole = new Map<AnalysisNarrativeSectionV1['role'], AnalysisNarrativeSectionV1>(roleScores.map(entry => [entry.role, emptySection(entry.role, entry.base + entry.advisory, entry.advisory ? 'deterministic_base_plus_mb_ordinal_prior' : 'deterministic_base')]));

  const driverCandidates = [
    ...investigation.priorities.filter(item => item.id.startsWith('where_')).map(item => findingItem('key_driver', item, 'priorities')),
    ...investigation.whereItHappened.map(item => findingItem('key_driver', item, 'where_it_happened')),
  ];
  sectionByRole.get('key_driver')!.findingItems = dedupeFindingItems(driverCandidates, seen).slice(0, 3);
  sectionByRole.get('risk_exception')!.findingItems = dedupeFindingItems(investigation.unusual.map(item => findingItem('risk_exception', item, 'unusual')), seen).slice(0, 3);
  sectionByRole.get('hypothesis')!.findingItems = dedupeFindingItems(investigation.whyItMayHaveHappened.map(item => findingItem('hypothesis', item, 'why_it_may_have_happened')), seen).slice(0, 3);
  sectionByRole.get('supporting_observation')!.findingItems = dedupeFindingItems(investigation.whatHappened.slice(1).map(item => findingItem('supporting_observation', item, 'what_happened')), seen).slice(0, 2);
  sectionByRole.get('unknown')!.unknownItems = investigation.unknowns.map(unknown => ({ kind: 'unknown', role: 'unknown', unknown }));
  sectionByRole.get('next_action')!.actionItems = investigation.actions.map(action => ({ kind: 'action', role: 'next_action', action }));

  const hasSupportingEvidence = investigation.decompositions.some(item => item.status !== 'unavailable')
    || investigation.comparisons.some(item => item.status === 'available')
    || investigation.followUpQuestions.length > 0;
  const sections = [...sectionByRole.values()]
    .filter(section => section.findingItems.length || section.unknownItems.length || section.actionItems.length || (section.role === 'supporting_evidence' && hasSupportingEvidence))
    .sort((left, right) => right.priority - left.priority || left.role.localeCompare(right.role));

  return {
    schemaVersion: ANALYSIS_NARRATIVE_PLAN_VERSION,
    sourceKind: 'single_source',
    domainId,
    primaryAnswer,
    sections,
    supporting: {
      showKpis: overview.kpis.length > 0,
      showDiagnostics: Boolean(overview.concentration || overview.trend.length || overview.outlierCount),
      breakdownIds: overview.breakdowns.filter(item => item.top.length > 0).map(item => item.id),
      decompositionIds: investigation.decompositions.filter(item => item.status !== 'unavailable').map(item => item.id),
      comparisonKinds: investigation.comparisons.filter(item => item.status === 'available').map(item => item.kind),
      followUpQuestionCount: investigation.followUpQuestions.length,
      showLegacyFindings: false,
      showLegacyActions: false,
      showLimitations: overview.limitations.length > 0,
    },
    advisory: advice,
    policy: publishedPolicy(),
  };
}

function textKey(value: string): string {
  return normalize(value).replace(/_+/g, ' ');
}

function dedupeNarrativeSections(sections: NarrativeSection[]): NarrativeSection[] {
  const seen = new Set<string>();
  return sections.filter(section => {
    const key = textKey(`${section.title} ${section.summary}`);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function comparisonSectionRole(section: NarrativeSection): AnalysisNarrativeSectionV1['role'] {
  if (section.id === 'where_changed') return 'key_driver';
  if (section.id === 'why_changed') return 'hypothesis';
  if (section.id === 'decision_safety' || section.id === 'profitability_blocked' || section.severity === 'critical') return 'risk_exception';
  return 'supporting_observation';
}

export function buildComparisonAnalysisNarrativePlan(brief: DomainComparisonBrief, options: AnalysisNarrativePlannerOptionsV1 = {}): ComparisonAnalysisNarrativePlanV1 {
  const advice = adviceFor(brief.domainId, options.perspectiveId ?? brief.domainId, [brief.primaryDimension ?? '', ...brief.metricDeltas.map(item => item.metricId)], brief.businessQuestion, options.advisor);
  const narrativeSections = dedupeNarrativeSections(brief.narrativeSections.filter(section => section.id !== 'executive_answer'))
    .map((section, index) => ({ section, index, priority: 100 - index + rolePrior(comparisonSectionRole(section), advice.priorities) }))
    .sort((left, right) => right.priority - left.priority || left.index - right.index)
    .map(item => item.section);
  const narrativeText = textKey(narrativeSections.flatMap(section => [section.summary, ...section.bullets]).join(' '));
  const reasonCodes = brief.reasonCodes.filter(reason => !narrativeText.includes(textKey(reason.statement)));
  const driverPanels: ComparisonAnalysisNarrativePlanV1['driverPanels'] = [];
  if (brief.topGrowthDrivers.length) driverPanels.push('growth');
  if (brief.topDeclineDrivers.length) driverPanels.push('decline');
  if (brief.topProfitDrivers.length) driverPanels.push('profit');
  return { schemaVersion: ANALYSIS_NARRATIVE_PLAN_VERSION, sourceKind: 'multi_source_comparison', domainId: brief.domainId, primaryAnswer: brief.headline, narrativeSections, reasonCodes, driverPanels, advisory: advice, policy: publishedPolicy() };
}
