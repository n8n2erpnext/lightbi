import type { AdvancedQueryResult } from './advanced-api';
import type { AnalysisAction } from './analysis-opportunity-actions';
import { createRuntimeIntentFromAnalysisAction } from './analysis-runtime-contract';
import type { AISafeBriefing } from './ai-briefing-contract';
import type { InvestigationSession } from './investigation-session';
import { createRuntimePlanPreview } from './runtime-planner-preview';

export type AdvancedResultSource = {
  datasetId: string;
  title: string;
  provider: string;
  sql: string;
};

export type AdvancedResultHandoff = Pick<
  InvestigationSession,
  'datasetId' | 'analysisAction' | 'runtimeIntent' | 'runtimePlanPreview' | 'rows' | 'aiBriefing' | 'rowScope'
> & {
  source: AdvancedResultSource;
};

const COUNT_FIELD_NAMES = new Set(['row_count', 'record_count', 'count', 'cnt']);

function rowsAsObjects(result: AdvancedQueryResult): Record<string, unknown>[] {
  return result.rows.map(row => Object.fromEntries(result.columns.map((column, index) => [column.name, row[index] ?? null])));
}

function isIdentifierColumn(name: string): boolean {
  return /(^id$|_id$|id$|uuid|guid|code|mã|ma\s)/i.test(name.trim());
}

function chooseDimension(result: AdvancedQueryResult): string | null {
  const categorical = result.columns.find(column => (
    (column.logicalType === 'string' || column.logicalType === 'boolean' || column.logicalType === 'date')
    && !isIdentifierColumn(column.name)
  ));
  return categorical?.name ?? result.columns.find(column => column.logicalType === 'string' || column.logicalType === 'date')?.name ?? null;
}

function chooseMeasure(result: AdvancedQueryResult): string | null {
  const namedCount = result.columns.find(column => COUNT_FIELD_NAMES.has(column.name.toLowerCase()));
  if (namedCount) return namedCount.name;
  const numberColumn = result.columns.find(column => column.logicalType === 'number' && !isIdentifierColumn(column.name));
  return numberColumn?.name ?? null;
}

function chooseTimeDimension(result: AdvancedQueryResult): string | null {
  return result.columns.find(column => column.logicalType === 'date')?.name ?? null;
}

function buildAnalysisAction(source: AdvancedResultSource, result: AdvancedQueryResult): AnalysisAction {
  const timeDimension = chooseTimeDimension(result);
  const dimension = chooseDimension(result);
  const measure = chooseMeasure(result);
  const title = source.title.trim() || 'Advanced result';

  if (timeDimension && measure) {
    return {
      id: `advanced_result_${result.runId}`,
      opportunityName: `Decision brief: ${title}`,
      label: 'Analyze Advanced result',
      description: `Create a Simple BA decision brief from Advanced result "${title}".`,
      actionType: 'trend',
      dimensions: [timeDimension],
      measures: [measure],
      measureAggregations: { [measure]: COUNT_FIELD_NAMES.has(measure.toLowerCase()) ? 'COUNT' : 'SUM' },
      confidenceScore: 78,
      source: 'dataset_understanding',
    };
  }

  if (dimension && measure) {
    return {
      id: `advanced_result_${result.runId}`,
      opportunityName: `Decision brief: ${title}`,
      label: 'Analyze Advanced result',
      description: `Create a Simple BA decision brief from Advanced result "${title}".`,
      actionType: 'group_by',
      dimensions: [dimension],
      measures: [measure],
      measureAggregations: { [measure]: COUNT_FIELD_NAMES.has(measure.toLowerCase()) ? 'COUNT' : 'SUM' },
      confidenceScore: 78,
      source: 'dataset_understanding',
    };
  }

  if (dimension) {
    return {
      id: `advanced_result_${result.runId}`,
      opportunityName: `Decision brief: ${title}`,
      label: 'Analyze Advanced result',
      description: `Create a Simple BA decision brief from Advanced result "${title}".`,
      actionType: 'distribution',
      dimensions: [dimension],
      measures: ['row_count'],
      measureAggregations: { row_count: 'COUNT' },
      confidenceScore: 70,
      source: 'dataset_understanding',
    };
  }

  return {
    id: `advanced_result_${result.runId}`,
    opportunityName: `Decision brief: ${title}`,
    label: 'Analyze Advanced result',
    description: `Create a Simple BA decision brief from Advanced result "${title}".`,
    actionType: 'table_preview',
    dimensions: [],
    measures: [],
    confidenceScore: 60,
    source: 'dataset_understanding',
  };
}

function buildBriefing(source: AdvancedResultSource, result: AdvancedQueryResult, action: AnalysisAction): AISafeBriefing {
  const isPartial = result.truncated || result.page.hasMore || result.page.offset > 0;
  const readinessScore = Math.max(50, Math.min(85, action.confidenceScore - (isPartial ? 10 : 0)));
  return {
    datasetId: source.datasetId,
    generatedAt: new Date().toISOString(),
    grain: 'summary',
    grainEvidence: `Advanced result buffer from ${source.provider}.`,
    readinessTier: readinessScore >= 75 ? 'decision_support' : 'exploratory_only',
    readinessScore,
    semanticFields: result.columns.map(column => ({
      canonicalId: column.name,
      label: column.name,
      domain: 'advanced_result',
      role: action.dimensions.includes(column.name)
        ? 'dimension'
        : action.measures.includes(column.name)
          ? 'measure'
          : column.logicalType === 'date'
            ? 'time'
            : 'unknown',
      confidence: 0.7,
    })),
    caveats: [
      `Advanced result handoff from ${source.provider}.`,
      ...(isPartial ? ['This BA brief uses the current bounded result buffer, not every row behind the query.'] : []),
      ...(result.warnings ?? []),
    ],
    safeActionHints: ['Review result lineage before using this decision brief operationally.'],
  };
}

export function createAdvancedResultHandoff(source: AdvancedResultSource, result: AdvancedQueryResult): AdvancedResultHandoff {
  const rows = rowsAsObjects(result);
  const analysisAction = buildAnalysisAction(source, result);
  const runtimeIntent = createRuntimeIntentFromAnalysisAction(analysisAction);
  const runtimePlanPreview = createRuntimePlanPreview(runtimeIntent);
  return {
    source,
    datasetId: source.datasetId,
    analysisAction,
    runtimeIntent,
    runtimePlanPreview,
    rows,
    aiBriefing: buildBriefing(source, result, analysisAction),
    rowScope: 'retained_rows',
  };
}
