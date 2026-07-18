import type { AdvancedQueryResult } from './advanced-api';
import type { AnalysisAction } from './analysis-opportunity-actions';
import { createRuntimeIntentFromAnalysisAction } from './analysis-runtime-contract';
import { generateCanonicalAIBriefing } from './canonical-ai-briefing';
import type { InvestigationSession } from './investigation-session';
import { createRuntimePlanPreview } from './runtime-planner-preview';
import {
  getOrBuildCanonicalConsumerArtifact,
  prepareCanonicalInvestigationHandoff,
  type CanonicalConsumerBuildResultV1,
  type CanonicalInvestigationHandoffV1,
} from './understanding-core/canonical-consumer-boundary';

export type AdvancedGovernedSelectionRequest = {
  actionCandidateId?: string;
  metricId?: string;
  operator?: string;
};

export type AdvancedResultConfiguration = {
  resultView?: 'grid' | 'chart' | 'json' | 'structure' | 'plan';
  visibleColumns?: string[];
  filters?: Array<{ column: string; operator: string; value?: string }>;
  filterCombinator?: 'and' | 'or';
  sort?: { column: string; direction: 'asc' | 'desc' } | null;
  tableContext?: { schema: string; table: string } | null;
};

export type AdvancedResultSource = {
  datasetId: string;
  title: string;
  provider: string;
  sql: string;
  configuration?: AdvancedResultConfiguration;
  governedSelection?: AdvancedGovernedSelectionRequest;
};

export type AdvancedResultHandoff = Pick<
  InvestigationSession,
  'datasetId' | 'analysisAction' | 'runtimeIntent' | 'runtimePlanPreview' | 'rows' | 'aiBriefing' | 'rowScope'
> & {
  source: AdvancedResultSource;
  canonicalArtifact: CanonicalConsumerBuildResultV1;
  canonicalHandoff: CanonicalInvestigationHandoffV1;
  blockers: string[];
  decisionUseAuthorized: false;
  completeness: {
    state: 'complete' | 'bounded' | 'paginated' | 'truncated' | 'unknown';
    blocker: string | null;
    returnedRows: number;
    estimatedTotal: number | null;
  };
};

function rowsAsObjects(result: AdvancedQueryResult): Record<string, unknown>[] {
  return result.rows.map(row => Object.fromEntries(result.columns.map((column, index) => [column.name, row[index] ?? null])));
}

function sourceKind(provider: string): 'local_file' | 'database_table' | 'unknown' {
  if (provider === 'duckdb') return 'local_file';
  if (['postgresql', 'mysql', 'mariadb', 'sqlite', 'mongodb'].includes(provider)) return 'database_table';
  return 'unknown';
}

export function classifyAdvancedResultCompleteness(result: AdvancedQueryResult): AdvancedResultHandoff['completeness'] {
  const state = result.truncated
    ? 'truncated'
    : result.page.offset > 0
      ? 'paginated'
      : result.page.hasMore
        ? 'bounded'
        : result.page.estimatedTotal == null && result.rows.length >= result.page.limit
          ? 'unknown'
          : 'complete';
  return {
    state,
    blocker: state === 'complete' ? null : `advanced_result_${state}`,
    returnedRows: result.rows.length,
    estimatedTotal: result.page.estimatedTotal ?? null,
  };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort();
}

function defaultActionCandidateId(artifact: CanonicalConsumerBuildResultV1): string {
  if (artifact.status !== 'valid') return '__advanced_invalid_canonical_artifact__';
  const defaultQuestion = artifact.questionGeneration.defaultQuestions.find(question => question.actionCandidateId);
  if (defaultQuestion?.actionCandidateId) return defaultQuestion.actionCandidateId;
  return artifact.questionGeneration.actionCandidates.find(action => action.actionCandidateState !== 'blocked')?.actionCandidateId
    ?? '__advanced_no_governed_action__';
}

function blockForAdvancedSelection(
  artifact: CanonicalConsumerBuildResultV1,
  handoff: CanonicalInvestigationHandoffV1,
  selection: AdvancedGovernedSelectionRequest | undefined,
): string[] {
  const blockers: string[] = [];
  if (!selection) return blockers;
  if (selection.operator !== undefined) blockers.push('advanced_operator_override_prohibited');
  if (selection.metricId !== undefined && selection.metricId !== handoff.runtimePreflight.metricId) blockers.push('advanced_metric_not_governed_for_selected_action');
  if (selection.actionCandidateId && (
    artifact.status !== 'valid'
    || !artifact.questionGeneration.actionCandidates.some(action => action.actionCandidateId === selection.actionCandidateId)
  )) blockers.push('advanced_action_candidate_not_governed');
  return blockers;
}

function withAdvancedBlockers(handoff: CanonicalInvestigationHandoffV1, blockers: string[]): CanonicalInvestigationHandoffV1 {
  if (blockers.length === 0) return handoff;
  const combined = unique([...handoff.blockers, ...blockers]);
  return {
    ...handoff,
    queryPlanning: { state: 'blocked', plan: null, blockers: combined },
    blockers: combined,
    decisionUseAuthorized: false,
  };
}

function projectGovernedAction(source: AdvancedResultSource, handoff: CanonicalInvestigationHandoffV1): AnalysisAction {
  const runtimeAction = handoff.runtimePreflight.action;
  const candidate = handoff.actionCandidate;
  if (!runtimeAction || !candidate || handoff.queryPlanning.state !== 'planned') {
    return {
      id: `canonical-blocked:${handoff.artifactIdentity}`,
      opportunityName: `Canonical analysis blocked: ${source.title}`,
      label: 'Canonical analysis blocked',
      description: handoff.blockers.join(', ') || 'No governed Advanced action is available.',
      actionType: 'table_preview',
      dimensions: [],
      measures: [],
      confidenceScore: 0,
      source: 'dataset_understanding',
    };
  }
  const actionType: AnalysisAction['actionType'] = candidate.actionKind === 'trend_candidate'
    ? 'trend'
    : candidate.actionKind === 'status_breakdown_candidate'
      ? 'distribution'
      : 'group_by';
  const dimensions = [
    ...runtimeAction.groupingBindings.map(binding => binding.semanticId),
    ...(runtimeAction.timeBinding ? [runtimeAction.timeBinding.semanticId] : []),
  ].filter((value, index, values) => values.indexOf(value) === index);
  const aggregation = runtimeAction.operator === 'governed_identity_count'
    ? 'COUNT' as const
    : runtimeAction.operator === 'governed_sum' || runtimeAction.operator === 'governed_point_in_time_snapshot_sum'
      ? 'SUM' as const
      : null;
  return {
    id: candidate.actionCandidateId,
    opportunityName: candidate.title,
    label: candidate.title,
    description: candidate.businessPurpose,
    actionType,
    dimensions,
    measures: [runtimeAction.metricId],
    measureAggregations: aggregation ? { [runtimeAction.metricId]: aggregation } : undefined,
    confidenceScore: candidate.actionCandidateState === 'available' ? 100 : 80,
    source: 'dataset_understanding',
  };
}

export function createAdvancedResultHandoff(source: AdvancedResultSource, result: AdvancedQueryResult): AdvancedResultHandoff {
  const rows = rowsAsObjects(result);
  const completeness = classifyAdvancedResultCompleteness(result);
  const partial = completeness.state !== 'complete';
  const declaredRowCount = partial
    ? Math.max(rows.length + 1, result.page.estimatedTotal ?? 0)
    : rows.length;
  const stateQualifier = JSON.stringify({
    provider: source.provider,
    sql: source.sql,
    configuration: source.configuration ?? null,
  });
  const canonicalArtifact = getOrBuildCanonicalConsumerArtifact({
    datasetId: source.datasetId,
    sourceKind: sourceKind(source.provider),
    sourceLabel: source.title,
    columns: result.columns.map(column => column.name),
    rows,
    sourceRowCount: declaredRowCount,
    stateQualifier,
  });
  const selectedActionCandidateId = source.governedSelection?.actionCandidateId ?? defaultActionCandidateId(canonicalArtifact);
  const initialHandoff = prepareCanonicalInvestigationHandoff(canonicalArtifact, selectedActionCandidateId);
  const selectionBlockers = [
    ...blockForAdvancedSelection(canonicalArtifact, initialHandoff, source.governedSelection),
    ...(completeness.blocker ? [completeness.blocker] : []),
  ];
  const canonicalHandoff = withAdvancedBlockers(initialHandoff, selectionBlockers);
  const analysisAction = projectGovernedAction(source, canonicalHandoff);
  const runtimeIntent = createRuntimeIntentFromAnalysisAction(analysisAction);
  const runtimePlanPreview = createRuntimePlanPreview(runtimeIntent);
  return {
    source,
    datasetId: source.datasetId,
    analysisAction,
    runtimeIntent,
    runtimePlanPreview,
    rows,
    aiBriefing: generateCanonicalAIBriefing(canonicalArtifact),
    rowScope: canonicalArtifact.status === 'valid' && completeness.state === 'complete' ? 'full_file' : 'retained_rows',
    canonicalArtifact,
    canonicalHandoff,
    blockers: canonicalHandoff.blockers,
    decisionUseAuthorized: false,
    completeness,
  };
}
