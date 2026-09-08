import type { DeepBABasis, DeepBAConfidence, SingleSourceBAOverview } from './single-source-ba-overview';
import {
  buildSingleSourceAnalysisNarrativePlan,
  type AnalysisNarrativePlannerOptionsV1,
  type SingleSourceAnalysisNarrativePlanV1,
} from './analysis-narrative-plan';

export const SELECTED_SUBJECT_INVESTIGATION_VERSION = 'lightbi.selected-subject-investigation.v1' as const;

export type SelectedSubjectScopeV1 = {
  dimensionField: string;
  label: string;
  metricId?: string | null;
  period?: string | null;
  focusLabel?: string | null;
  filters?: string[];
};

export type SelectedSubjectSourceInputV1 = {
  sourceKey: string;
  sourceName: string;
  role: string | null;
  selectedRowCount: number;
  matchedRowCount: number;
  referenceRowCount: number;
  referenceScope: 'source_rows' | 'chart_group_rows';
  isTruncated?: boolean;
  overview: SingleSourceBAOverview;
};

export type SelectedSubjectFindingSummaryV1 = {
  sourceKey: string;
  sourceName: string;
  role: string | null;
  findingId: string;
  title: string;
  statement: string;
  basis: DeepBABasis;
  confidence: DeepBAConfidence;
  evidenceRowCount: number;
  relevanceScore: number;
};

export type SelectedSubjectSourceSummaryV1 = {
  sourceKey: string;
  sourceName: string;
  role: string | null;
  selectedRowCount: number;
  matchedRowCount: number;
  referenceRowCount: number;
  referenceScope: SelectedSubjectSourceInputV1['referenceScope'];
  selectedOfMatchedRatio: number | null;
  selectedOfReferenceRatio: number | null;
  analysisRowCount: number;
  representativeSample: boolean;
  truncated: boolean;
  primaryAnswer: SelectedSubjectFindingSummaryV1 | null;
  keyDrivers: SelectedSubjectFindingSummaryV1[];
  contextDecomposition: Array<{
    id: string;
    label: string;
    status: 'supported' | 'partial' | 'unavailable';
    observedComponents: string[];
    missingComponents: string[];
    caveat?: string;
  }>;
  comparisons: Array<{ kind: 'period' | 'peer' | 'baseline' | 'target'; label: string; statement: string }>;
  narrativePlan: SingleSourceAnalysisNarrativePlanV1;
};

export type SelectedSubjectNextActionV1 = {
  title: string;
  action: string;
  verification: string;
  basis: DeepBABasis;
  priority: 'high' | 'medium' | 'low';
  sourceKeys: string[];
  sourceNames: string[];
};

export type SelectedSubjectUnknownV1 = {
  label: string;
  missingSignals: string[];
  impact: string;
  sourceKeys: string[];
  sourceNames: string[];
};

export type SelectedSubjectInvestigationPlanV1 = {
  schemaVersion: typeof SELECTED_SUBJECT_INVESTIGATION_VERSION;
  subject: SelectedSubjectScopeV1;
  sourceMode: 'single_source' | 'parallel_sources';
  sourceCount: number;
  primaryAnswer: SelectedSubjectFindingSummaryV1 | null;
  sources: SelectedSubjectSourceSummaryV1[];
  nextActions: SelectedSubjectNextActionV1[];
  unknowns: SelectedSubjectUnknownV1[];
  followUpQuestions: Array<{ question: string; rationale: string; sourceNames: string[] }>;
  policy: {
    answerFirst: true;
    selectedScopeOnly: true;
    preserveSourceSeparation: true;
    crossSourceJoinAllowed: false;
    governedSummaryUnchanged: true;
    benchmarkIsContextNotAuthority: true;
    mbMayStrengthenAuthority: false;
  };
};

export type SelectedSubjectInvestigationOptionsV1 = Pick<AnalysisNarrativePlannerOptionsV1, 'advisor'> & {
  perspectiveId?: string | null;
};

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function boundedRatio(value: number, denominator: number): number | null {
  if (!Number.isFinite(value) || !Number.isFinite(denominator) || denominator <= 0) return null;
  return Math.max(0, Math.min(1, value / denominator));
}

function findingSummary(source: SelectedSubjectSourceInputV1, item: NonNullable<SingleSourceAnalysisNarrativePlanV1['primaryAnswer']>): SelectedSubjectFindingSummaryV1 {
  return {
    sourceKey: source.sourceKey,
    sourceName: source.sourceName,
    role: source.role,
    findingId: item.finding.id,
    title: item.finding.title,
    statement: item.finding.statement,
    basis: item.finding.basis,
    confidence: item.finding.confidence,
    evidenceRowCount: item.finding.evidenceRows.length,
    relevanceScore: item.relevanceScore,
  };
}

function priorityRank(value: SelectedSubjectNextActionV1['priority']): number {
  return value === 'high' ? 3 : value === 'medium' ? 2 : 1;
}

export function buildSelectedSubjectInvestigationPlan(
  subject: SelectedSubjectScopeV1,
  inputs: SelectedSubjectSourceInputV1[],
  options: SelectedSubjectInvestigationOptionsV1 = {},
): SelectedSubjectInvestigationPlanV1 {
  const sources = inputs.map(input => {
    const narrativePlan = buildSingleSourceAnalysisNarrativePlan(input.overview, {
      perspectiveId: options.perspectiveId ?? null,
      advisor: options.advisor,
    });
    const primaryAnswer = narrativePlan.primaryAnswer ? findingSummary(input, narrativePlan.primaryAnswer) : null;
    const keyDrivers = (narrativePlan.sections.find(section => section.role === 'key_driver')?.findingItems ?? [])
      .map(item => findingSummary(input, item));
    const investigation = input.overview.investigation;
    const decompositionIds = new Set(narrativePlan.supporting.decompositionIds);
    const comparisonKinds = new Set(narrativePlan.supporting.comparisonKinds);
    return {
      sourceKey: input.sourceKey,
      sourceName: input.sourceName,
      role: input.role,
      selectedRowCount: input.selectedRowCount,
      matchedRowCount: input.matchedRowCount,
      referenceRowCount: input.referenceRowCount,
      referenceScope: input.referenceScope,
      selectedOfMatchedRatio: boundedRatio(input.selectedRowCount, input.matchedRowCount),
      selectedOfReferenceRatio: boundedRatio(input.selectedRowCount, input.referenceRowCount),
      analysisRowCount: input.overview.rowCount,
      representativeSample: input.overview.isRepresentativeSample,
      truncated: Boolean(input.isTruncated),
      primaryAnswer,
      keyDrivers,
      contextDecomposition: (investigation?.decompositions ?? [])
        .filter(item => decompositionIds.has(item.id))
        .map(item => ({
          id: item.id,
          label: item.label,
          status: item.status,
          observedComponents: item.components.filter(component => component.status === 'observed').map(component => component.label),
          missingComponents: item.components.filter(component => component.status === 'missing').map(component => component.label),
          caveat: item.caveat,
        })),
      comparisons: (investigation?.comparisons ?? [])
        .filter(item => item.status === 'available' && comparisonKinds.has(item.kind))
        .map(item => ({ kind: item.kind, label: item.label, statement: item.statement })),
      narrativePlan,
    } satisfies SelectedSubjectSourceSummaryV1;
  });

  const primaryAnswer = sources
    .flatMap(source => source.primaryAnswer ? [source.primaryAnswer] : [])
    .sort((left, right) => right.relevanceScore - left.relevanceScore || left.sourceName.localeCompare(right.sourceName))[0] ?? null;

  const actionMap = new Map<string, SelectedSubjectNextActionV1>();
  const unknownMap = new Map<string, SelectedSubjectUnknownV1>();
  const questionMap = new Map<string, { question: string; rationale: string; sourceNames: string[] }>();
  inputs.forEach((input, index) => {
    const investigation = input.overview.investigation;
    if (!investigation) return;
    for (const action of investigation.actions) {
      const key = normalize(`${action.title} ${action.action}`);
      const existing = actionMap.get(key);
      if (existing) {
        if (!existing.sourceKeys.includes(input.sourceKey)) existing.sourceKeys.push(input.sourceKey);
        if (!existing.sourceNames.includes(input.sourceName)) existing.sourceNames.push(input.sourceName);
        if (priorityRank(action.priority) > priorityRank(existing.priority)) existing.priority = action.priority;
        continue;
      }
      actionMap.set(key, { ...action, sourceKeys: [input.sourceKey], sourceNames: [input.sourceName] });
    }
    for (const unknown of investigation.unknowns) {
      const key = normalize(`${unknown.label} ${unknown.missingSignals.join(' ')}`);
      const existing = unknownMap.get(key);
      if (existing) {
        if (!existing.sourceKeys.includes(input.sourceKey)) existing.sourceKeys.push(input.sourceKey);
        if (!existing.sourceNames.includes(input.sourceName)) existing.sourceNames.push(input.sourceName);
        continue;
      }
      unknownMap.set(key, { ...unknown, sourceKeys: [input.sourceKey], sourceNames: [input.sourceName] });
    }
    for (const question of investigation.followUpQuestions) {
      const key = normalize(question.question);
      const existing = questionMap.get(key);
      if (existing) {
        if (!existing.sourceNames.includes(input.sourceName)) existing.sourceNames.push(input.sourceName);
      } else {
        questionMap.set(key, { question: question.question, rationale: question.rationale, sourceNames: [input.sourceName] });
      }
    }
    void index;
  });

  return {
    schemaVersion: SELECTED_SUBJECT_INVESTIGATION_VERSION,
    subject,
    sourceMode: sources.length > 1 ? 'parallel_sources' : 'single_source',
    sourceCount: sources.length,
    primaryAnswer,
    sources,
    nextActions: [...actionMap.values()].sort((left, right) => priorityRank(right.priority) - priorityRank(left.priority) || left.title.localeCompare(right.title)).slice(0, 3),
    unknowns: [...unknownMap.values()].slice(0, 4),
    followUpQuestions: [...questionMap.values()].slice(0, 4),
    policy: {
      answerFirst: true,
      selectedScopeOnly: true,
      preserveSourceSeparation: true,
      crossSourceJoinAllowed: false,
      governedSummaryUnchanged: true,
      benchmarkIsContextNotAuthority: true,
      mbMayStrengthenAuthority: false,
    },
  };
}
