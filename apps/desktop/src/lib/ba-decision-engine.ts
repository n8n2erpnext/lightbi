import type { RuntimeIntent } from './analysis-runtime-contract';
import type { AISafeBriefing } from './ai-briefing-contract';
import type { ChartPreviewModel } from './chart-preview-model';
import type { DuckDBPreviewResult } from './duckdb-preview-sandbox';
import type { RuntimeRowScope } from './runtime-dataset-source';
import { buildPreExecutionRows, clampScore, firstAvailableField, formatNumber, inferColumns, insightPriority, mineBottomInsight, mineCoverageInsight, mineDataQualityInsight, mineKeyRiskInsight, mineOutlierInsight, minePeriodOverPeriodInsight, minePositiveRateInsight, mineRequiredFieldGapInsight, mineSegmentSpreadInsight, mineSemanticCoverageGapInsight, mineTopConcentrationInsight, mineTrendInsight, rowScopeLabel, selectCategoryField, selectNumericField } from './ba-decision-analysis';

export type BAInsightType =
  | 'top_concentration'
  | 'bottom_group'
  | 'segment_spread'
  | 'trend'
  | 'outlier'
  | 'distribution'
  | 'data_quality'
  | 'key_risk'
  | 'field_gap'
  | 'coverage';

export type BAInsightSeverity = 'positive' | 'neutral' | 'warning' | 'critical';
export type BAChartHint = 'bar' | 'line' | 'scatter' | 'table';

export interface BAInsight {
  id: string;
  type: BAInsightType;
  title: string;
  statement: string;
  severity: BAInsightSeverity;
  confidence: number;
  evidence: string[];
  evidenceRows?: BARowEvidence[];
  chartHint: BAChartHint;
}

export interface BARowEvidence {
  rowIndex: number;
  label: string;
  values: Record<string, unknown>;
}

export interface BAScoreBreakdownItem {
  label: string;
  score: number;
  weight: number;
  reason: string;
}

export interface BAChartRecommendation {
  title: string;
  chartType: BAChartHint;
  reason: string;
  fields: string[];
}

export interface BADecisionSuggestion {
  title: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
}

export interface BADecisionBrief {
  dataTrustScore: number;
  decisionReadinessScore: number;
  executiveSummary: string;
  scoreBreakdown: BAScoreBreakdownItem[];
  insights: BAInsight[];
  recommendedCharts: BAChartRecommendation[];
  decisionSuggestions: BADecisionSuggestion[];
  caveats: string[];
}

export interface CreateBADecisionBriefInput {
  datasetId: string;
  previewResult: DuckDBPreviewResult | null;
  chartModel: ChartPreviewModel | null;
  aiBriefing?: AISafeBriefing;
  runtimeIntent: RuntimeIntent;
  governedContext?: {
    metricId: string;
    businessPerspectiveIds: string[];
    evidenceIds: string[];
    limitations: string[];
    restrictions: string[];
    fullFileRowCount: number | null;
    decisionUseAuthorized: boolean;
  };
}

export interface CreatePreExecutionBADecisionBriefInput {
  datasetId: string;
  rows?: Record<string, unknown>[];
  aiBriefing?: AISafeBriefing;
  runtimeIntent: RuntimeIntent;
  rowScope?: RuntimeRowScope;
}

function buildRecommendedCharts(chartModel: ChartPreviewModel | null, insights: BAInsight[]): BAChartRecommendation[] {
  const charts: BAChartRecommendation[] = [];
  if (chartModel && chartModel.status === 'ready' && chartModel.chartType !== 'table') {
    charts.push({
      title: chartModel.title,
      chartType: chartModel.chartType,
      reason: 'Primary chart generated from the executed preview result.',
      fields: [chartModel.xField, chartModel.yField, ...chartModel.seriesFields].filter(Boolean) as string[]
    });
  }

  const rankedInsights = [...insights].sort((a, b) => insightPriority(b) - insightPriority(a));
  for (const insight of rankedInsights) {
    if (charts.length >= 3) break;
    if (charts.some(chart => chart.chartType === insight.chartHint && chart.title === insight.title)) continue;
    charts.push({
      title: insight.title,
      chartType: insight.chartHint,
      reason: insight.statement,
      fields: []
    });
  }

  return charts;
}

function buildDecisionSuggestions(
  dataTrustScore: number,
  decisionReadinessScore: number,
  insights: BAInsight[],
  runtimeIntent: RuntimeIntent
): BADecisionSuggestion[] {
  const suggestions: BADecisionSuggestion[] = [];
  const hasKeyRisk = insights.some(insight => insight.type === 'key_risk');
  const hasOutlierRisk = insights.some(insight => insight.type === 'outlier');
  const hasFieldGap = insights.some(insight => insight.type === 'field_gap');
  const hasSemanticCoverageGap = insights.some(insight => insight.id === 'ba_semantic_coverage_gap');

  if (decisionReadinessScore >= 80) {
    suggestions.push({
      title: 'Use as decision support',
      action: 'Use the highlighted insight and chart as a decision-support view, then validate the top/bottom groups with raw rows before acting.',
      priority: 'high'
    });
  } else {
    suggestions.push({
      title: 'Validate before deciding',
      action: 'Treat this as an exploration result. Review caveats and raw rows before using it for an operational or financial decision.',
      priority: 'high'
    });
  }

  if (insights.some(insight => insight.severity === 'warning' || insight.severity === 'critical')) {
    suggestions.push({
      title: 'Investigate risk drivers',
      action: hasSemanticCoverageGap
        ? 'Review the unmapped business-like columns before trusting the BA answer; the data exists but LightBI has not safely understood those fields yet.'
        : hasFieldGap
        ? 'Confirm the missing business fields before using this result as a decision answer.'
        : hasKeyRisk
        ? 'Check duplicate or empty key values before trusting grouped totals, joins, or record counts.'
        : hasOutlierRisk
          ? 'Inspect unusual values before using totals or averages for business decisions.'
          : 'Start with the warning insight, then filter by the affected group/time period to identify the root cause.',
      priority: 'medium'
    });
  }

  if (runtimeIntent.type !== 'trend' && runtimeIntent.dimensions.length > 0) {
    suggestions.push({
      title: 'Compare over time if possible',
      action: 'If the source contains a date column, run a trend view to confirm whether this pattern is stable or only a one-time snapshot.',
      priority: dataTrustScore >= 70 ? 'medium' : 'low'
    });
  }

  return suggestions.slice(0, 3);
}

function buildExecutiveSummary(
  datasetId: string,
  dataTrustScore: number,
  decisionReadinessScore: number,
  insights: BAInsight[]
): string {
  const lead = insights.find(insight => insight.type !== 'coverage' && insight.type !== 'data_quality');
  const trustLabel = dataTrustScore >= 85 ? 'high' : dataTrustScore >= 65 ? 'moderate' : 'low';
  const decisionLabel = decisionReadinessScore >= 80 ? 'ready for decision support' : decisionReadinessScore >= 60 ? 'usable with review' : 'exploratory only';

  if (lead) {
    return `${datasetId} has ${trustLabel} data trust and is ${decisionLabel}. Main finding: ${lead.statement}`;
  }

  return `${datasetId} has ${trustLabel} data trust and is ${decisionLabel}. Run or refine the preview to expose stronger business insights.`;
}

function buildScoreBreakdown(input: {
  dataTrustScore: number;
  hasBusinessInsight: boolean;
  hasChart: boolean;
  executionScope?: RuntimeRowScope;
  warningPenalty: number;
  decisionReadinessScore: number;
}): BAScoreBreakdownItem[] {
  const baseContribution = clampScore(input.dataTrustScore * 0.55);
  return [
    {
      label: 'Data trust',
      score: baseContribution,
      weight: 55,
      reason: `Data trust contributes ${baseContribution} points from score ${input.dataTrustScore}.`
    },
    {
      label: 'Business evidence',
      score: input.hasBusinessInsight ? 12 : 0,
      weight: 12,
      reason: input.hasBusinessInsight ? 'At least one business insight is supported by evidence.' : 'No strong business insight is available yet.'
    },
    {
      label: 'Chart support',
      score: input.hasChart ? 8 : 0,
      weight: 8,
      reason: input.hasChart ? 'A primary chart is available for decision review.' : 'No validated chart is available yet.'
    },
    {
      label: 'Execution coverage',
      score: input.executionScope === 'full_file' ? 8 : input.executionScope ? 3 : 0,
      weight: 8,
      reason: input.executionScope === 'full_file'
        ? 'The result is based on full-file execution.'
        : input.executionScope
          ? `The result is based on ${rowScopeLabel(input.executionScope)}.`
          : 'Execution scope is not available.'
    },
    {
      label: 'Risk penalty',
      score: -input.warningPenalty,
      weight: 0,
      reason: input.warningPenalty > 0 ? 'Warnings, critical risks, outliers, key risks, or field gaps reduce readiness.' : 'No major risk penalty was applied.'
    },
    {
      label: 'Final readiness',
      score: input.decisionReadinessScore,
      weight: 100,
      reason: 'Final Decision Readiness Score after bonuses and penalties.'
    }
  ];
}

export function createBADecisionBrief(input: CreateBADecisionBriefInput): BADecisionBrief {
  const { datasetId, previewResult, chartModel, aiBriefing, runtimeIntent, governedContext } = input;
  const dataTrustScore = clampScore(aiBriefing?.readinessScore ?? 50);

  if (!previewResult || previewResult.status === 'failed' || previewResult.status === 'blocked') {
    const caveats = [
      ...(aiBriefing?.caveats ?? []),
      previewResult?.errorMessage,
      ...(previewResult?.blockedReasons ?? [])
    ].filter(Boolean) as string[];
    const decisionReadinessScore = clampScore(Math.min(dataTrustScore, previewResult ? 35 : 45));

    return {
      dataTrustScore,
      decisionReadinessScore,
      executiveSummary: `${datasetId} is not ready for BA decision support until the preview can execute successfully.`,
      scoreBreakdown: buildScoreBreakdown({
        dataTrustScore,
        hasBusinessInsight: false,
        hasChart: false,
        warningPenalty: Math.max(10, dataTrustScore - decisionReadinessScore),
        decisionReadinessScore
      }),
      insights: [
        {
          id: 'ba_preview_blocked',
          type: 'data_quality',
          title: 'Decision brief blocked',
          statement: 'LightBI cannot produce a reliable BA brief because execution did not return a usable result.',
          severity: 'critical',
          confidence: 90,
          evidence: caveats.slice(0, 3),
          chartHint: 'table'
        }
      ],
      recommendedCharts: [],
      decisionSuggestions: [
        {
          title: 'Fix execution or data quality first',
          action: 'Resolve the preview failure, then rerun the analysis before using the data for decisions.',
          priority: 'high'
        }
      ],
      caveats
    };
  }

  const rows = previewResult.rows;
  const columns = previewResult.columns;
  const numericField = selectNumericField(rows, columns, chartModel);
  const categoryField = selectCategoryField(rows, columns, numericField, chartModel);

  const insights = [
    governedContext ? {
      id: 'ba_governed_scope',
      type: 'coverage' as const,
      title: 'Governed analysis scope',
      statement: `${governedContext.metricId} was calculated${governedContext.fullFileRowCount !== null ? ` from ${formatNumber(governedContext.fullFileRowCount)} full-source rows` : ' from the governed runtime source'}.`,
      severity: 'neutral' as const,
      confidence: 100,
      evidence: [
        ...(governedContext.businessPerspectiveIds.length > 0 ? [`Perspective: ${governedContext.businessPerspectiveIds.join(', ')}`] : []),
        ...governedContext.evidenceIds.slice(0, 3),
      ],
      chartHint: 'table' as const,
    } : null,
    minePositiveRateInsight(rows, columns, categoryField, runtimeIntent),
    mineTopConcentrationInsight(rows, categoryField, numericField),
    mineBottomInsight(rows, categoryField, numericField),
    mineSegmentSpreadInsight(rows, categoryField, numericField),
    mineTrendInsight(rows, chartModel?.xField ?? categoryField, numericField, runtimeIntent, chartModel),
    minePeriodOverPeriodInsight(rows, chartModel?.xField ?? categoryField, numericField, runtimeIntent, chartModel),
    mineOutlierInsight(rows, categoryField, numericField),
    mineKeyRiskInsight(rows, columns, categoryField),
    mineRequiredFieldGapInsight(columns, aiBriefing, runtimeIntent),
    mineCoverageInsight(previewResult),
    mineSemanticCoverageGapInsight(aiBriefing),
    mineDataQualityInsight(aiBriefing)
  ].filter((insight): insight is BAInsight => Boolean(insight));

  const hasBusinessInsight = insights.some(insight => !['coverage', 'data_quality'].includes(insight.type));
  const hasChart = Boolean(chartModel && chartModel.status === 'ready' && chartModel.chartType !== 'table');
  const warningPenalty = insights.filter(insight => insight.severity === 'warning').length * 6
    + insights.filter(insight => insight.severity === 'critical').length * 15
    + insights.filter(insight => insight.type === 'outlier' || insight.type === 'key_risk').length * 6
    + insights.filter(insight => insight.type === 'field_gap').length * 10;
  const evidenceBonus = hasBusinessInsight ? 12 : 0;
  const chartBonus = hasChart ? 8 : 0;
  const executionBonus = previewResult.executionScope === 'full_file' ? 8 : previewResult.executionScope ? 3 : 0;
  const rawDecisionReadinessScore = clampScore(dataTrustScore * 0.55 + evidenceBonus + chartBonus + executionBonus - warningPenalty);
  const decisionReadinessScore = governedContext && !governedContext.decisionUseAuthorized
    ? Math.min(79, rawDecisionReadinessScore)
    : rawDecisionReadinessScore;
  const governedCaveats = governedContext ? [
    ...governedContext.limitations.map(item => `Governed limitation: ${item}`),
    ...governedContext.restrictions.map(item => `Governed restriction: ${item}`),
  ] : [];
  let decisionSuggestions = buildDecisionSuggestions(dataTrustScore, decisionReadinessScore, insights, runtimeIntent);
  if (governedContext && !governedContext.decisionUseAuthorized) {
    decisionSuggestions = decisionSuggestions.filter(item => item.title !== 'Validate before deciding');
    decisionSuggestions.unshift({
      title: 'Validate before operational action',
      action: 'Use this brief as analytical evidence. A business owner must review the governed limitations and approve any operational or financial decision.',
      priority: 'high',
    });
  }

  return {
    dataTrustScore,
    decisionReadinessScore,
    executiveSummary: buildExecutiveSummary(datasetId, dataTrustScore, decisionReadinessScore, insights),
    scoreBreakdown: buildScoreBreakdown({
      dataTrustScore,
      hasBusinessInsight,
      hasChart,
      executionScope: previewResult.executionScope,
      warningPenalty,
      decisionReadinessScore
    }),
    insights,
    recommendedCharts: buildRecommendedCharts(chartModel, insights),
    decisionSuggestions,
    caveats: [...new Set([
      ...governedCaveats,
      ...(aiBriefing?.caveats ?? []),
      ...previewResult.warnings,
    ])].slice(0, 10)
  };
}

export function createPreExecutionBADecisionBrief(input: CreatePreExecutionBADecisionBriefInput): BADecisionBrief | null {
  const { datasetId, rows = [], aiBriefing, runtimeIntent, rowScope } = input;
  if (rows.length === 0 && !aiBriefing) return null;

  if (rows.length === 0) {
    const dataTrustScore = clampScore(aiBriefing?.readinessScore ?? 35);
    return {
      dataTrustScore,
      decisionReadinessScore: clampScore(Math.min(40, dataTrustScore)),
      executiveSummary: `${datasetId} has been profiled, but LightBI needs executable rows before it can produce decision-grade insights.`,
      scoreBreakdown: buildScoreBreakdown({
        dataTrustScore,
        hasBusinessInsight: false,
        hasChart: false,
        warningPenalty: Math.max(10, dataTrustScore - clampScore(Math.min(40, dataTrustScore))),
        decisionReadinessScore: clampScore(Math.min(40, dataTrustScore))
      }),
      insights: [
        {
          id: 'ba_pre_execution_no_rows',
          type: 'coverage',
          title: 'Rows not available yet',
          statement: 'Pre-execution BA briefing is limited because no retained rows are available in the current session.',
          severity: 'warning',
          confidence: 75,
          evidence: aiBriefing?.caveats?.slice(0, 3) ?? [],
          chartHint: 'table'
        }
      ],
      recommendedCharts: [],
      decisionSuggestions: [
        {
          title: 'Run preview',
          action: 'Execute the preview so LightBI can validate the business signal against actual result rows.',
          priority: 'high'
        }
      ],
      caveats: [
        'Pre-execution estimate only. Run preview to validate result rows.',
        ...(aiBriefing?.caveats ?? [])
      ].slice(0, 6)
    };
  }

  const estimated = buildPreExecutionRows(rows, runtimeIntent);
  const sourceScope = rowScopeLabel(rowScope);
  const estimatedPreview: DuckDBPreviewResult = {
    id: `pre_execution_${runtimeIntent.id}`,
    sourceSqlPreviewId: 'pre_execution_profile',
    status: 'executed',
    columns: estimated.columns,
    rows: estimated.rows,
    rowCount: rows.length,
    maxRows: estimated.rows.length,
    warnings: [
      `Pre-execution estimate based on ${sourceScope}. Run preview to validate with the execution engine.`
    ],
    blockedReasons: [],
    executionScope: rowScope ?? 'preview',
    source: 'duckdb_preview_sandbox'
  };

  const brief = createBADecisionBrief({
    datasetId,
    previewResult: estimatedPreview,
    chartModel: null,
    aiBriefing,
    runtimeIntent
  });
  const rawColumns = inferColumns(rows);
  const rawKeyRisk = mineKeyRiskInsight(
    rows.slice(0, 1000),
    rawColumns,
    firstAvailableField(rows.slice(0, 1000), runtimeIntent.dimensions)
  );
  const insights = rawKeyRisk && !brief.insights.some(insight => insight.type === 'key_risk')
    ? [...brief.insights, rawKeyRisk]
    : brief.insights;
  const extraRiskPenalty = rawKeyRisk ? (rawKeyRisk.severity === 'critical' ? 15 : 8) : 0;
  const decisionReadinessScore = clampScore(
    Math.min(brief.decisionReadinessScore - extraRiskPenalty, brief.dataTrustScore - 5)
  );
  const preExecutionWarningPenalty = insights.filter(insight => insight.severity === 'warning').length * 6
    + insights.filter(insight => insight.severity === 'critical').length * 15
    + insights.filter(insight => insight.type === 'outlier' || insight.type === 'key_risk').length * 6
    + insights.filter(insight => insight.type === 'field_gap').length * 10
    + extraRiskPenalty;
  const riskAwareSuggestions: BADecisionSuggestion[] = buildDecisionSuggestions(
    brief.dataTrustScore,
    decisionReadinessScore,
    insights,
    runtimeIntent
  );

  return {
    ...brief,
    insights,
    decisionReadinessScore,
    scoreBreakdown: buildScoreBreakdown({
      dataTrustScore: brief.dataTrustScore,
      hasBusinessInsight: insights.some(insight => !['coverage', 'data_quality'].includes(insight.type)),
      hasChart: false,
      executionScope: rowScope ?? 'preview',
      warningPenalty: preExecutionWarningPenalty,
      decisionReadinessScore
    }),
    executiveSummary: `Pre-execution estimate: ${brief.executiveSummary}`,
    caveats: [
      `Pre-execution estimate based on ${sourceScope}. Run preview to validate result rows.`,
      ...brief.caveats
    ].slice(0, 6),
    decisionSuggestions: ([
      {
        title: 'Run preview to validate',
        action: 'Use this pre-execution brief to orient the analysis, then run preview before making a decision.',
        priority: 'high' as const
      },
      ...riskAwareSuggestions
    ] satisfies BADecisionSuggestion[]).slice(0, 3)
  };
}
