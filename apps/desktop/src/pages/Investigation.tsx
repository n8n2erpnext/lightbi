import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Database, BarChart3, ChevronDown, ChevronRight, Activity, Code2, AlertTriangle, CheckCircle2, ClipboardCheck, Download, FileSpreadsheet, X } from 'lucide-react';
import { getCurrentInvestigationSession } from '../lib/investigation-session';
import type { SafeSqlPreview } from '../lib/safe-sql-preview';
import type { DuckDBPreviewResult } from '../lib/duckdb-preview-sandbox';
import { createChartPreviewModel, type ChartPreviewModel } from '../lib/chart-preview-model';
import { ChartPreviewRenderer } from '../components/analysis/ChartPreviewRenderer';
import { validatePreviewAgainstIntent, type ResultValidationResult } from '../lib/result-validator-contract';
import { useDisplayPreferences, type DisplayPreferences } from '../stores/display-preferences-store';
import { formatValue, inferSemanticType } from '../lib/display-formatter';
import { Settings2 } from 'lucide-react';
import { DisplayPreferencesModal } from '../components/settings/DisplayPreferencesModal';
import { DatasetInsightSummary } from '../components/analysis/DatasetInsightSummary';
import { BADecisionBriefPanel } from '../components/analysis/BADecisionBriefPanel';
import { BusinessBrainBriefPanel } from '../components/analysis/BusinessBrainBriefPanel';
import { BusinessFusionOverviewCard } from '../components/analysis/BusinessFusionOverviewCard';
import { createBADecisionBrief, createPreExecutionBADecisionBrief, type BADecisionBrief } from '../lib/ba-decision-engine';
import { createBusinessBrainBrief } from '../lib/business-brain-brief';
import type { AnalysisAction } from '../lib/analysis-opportunity-actions';
import type { BusinessFusionOverview, FusionMetricDelta } from '../lib/business-fusion-overview';
import { useAppRuntime } from '@lightbi/runtime';
import { ExecutionRunCoordinator } from '@lightbi/runtime';
import {
  executeDrillThrough,
  exportRowsAsCsv,
  exportRowsAsXlsx,
  type DrillThroughPoint,
  type DrillThroughResult,
} from '../lib/drill-through-export';
import { saveWorkspaceSession, type SaveWorkspaceSessionRequest } from '../lib/workspace-session-api';
import { advancedSourceId, useAdvancedSourceStore } from '../stores/advanced-source-store';
import { profileColumns } from '../lib/column-profiler';
import { executeGovernedMetricRequest } from '../lib/understanding-core/governed-metric-executor';
import { createGovernedLocalDuckDBBoundary } from '../lib/understanding-core/governed-local-duckdb-boundary';
import { sourceBindingsMatch } from '../lib/understanding-core/canonical-source-boundary';

const INVESTIGATION_SESSION_ROW_LIMIT = 250;

function limitInvestigationRows(rows: Record<string, unknown>[] | undefined): Record<string, unknown>[] {
  return Array.isArray(rows) ? rows.slice(0, INVESTIGATION_SESSION_ROW_LIMIT) : [];
}

function safeFileStem(value: string): string {
  return value.trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'lightbi-session';
}

function normalizeText(value: string | undefined): string {
  return (value || '').toLowerCase().replace(/[_-]+/g, ' ');
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const direct = Number(value);
    if (Number.isFinite(direct)) return direct;
    const cleaned = value.replace(/[^0-9,.-]/g, '').replace(/,/g, '');
    if (cleaned && cleaned !== '-' && cleaned !== '.' && Number.isFinite(Number(cleaned))) return Number(cleaned);
  }
  return null;
}

function metricIntent(action: AnalysisAction, chartModel: ChartPreviewModel | null): 'money' | 'profitability' | 'product' | 'operations' | 'general' {
  const text = normalizeText([
    action.opportunityName,
    action.label,
    action.description,
    ...action.dimensions,
    ...action.measures,
    chartModel?.title,
    chartModel?.xField,
    chartModel?.yField,
    ...(chartModel?.seriesFields || [])
  ].filter(Boolean).join(' '));

  if (/(profit|margin|gross profit|loi nhuan|lợi nhuận|cash|receivable|payable|dòng tiền|dong tien)/.test(text)) return 'profitability';
  if (/(product|item|sku|hang hoa|hàng hoá|hàng hóa|san pham|sản phẩm)/.test(text)) return 'product';
  if (/(quantity|stock|inventory|delivery|shipment|logistics|operation|status|warehouse)/.test(text)) return 'operations';
  if (/(money|revenue|sales|amount|invoice|trend|doanh thu|total)/.test(text)) return 'money';
  return 'general';
}

function findOverviewMetric(overview: BusinessFusionOverview | undefined, candidates: string[]): FusionMetricDelta | undefined {
  if (!overview) return undefined;
  return overview.metrics.find(metric => candidates.some(candidate => normalizeText(metric.metricId).includes(candidate) || normalizeText(metric.label).includes(candidate)));
}

function formatMetricDelta(metric: FusionMetricDelta | undefined, preferences: DisplayPreferences): string {
  if (!metric) return 'Not enough evidence in the current files.';
  const direction = metric.delta >= 0 ? 'increased' : 'decreased';
  return `${metric.label} ${direction} ${formatValue(Math.abs(metric.delta), 'currency', preferences, { compact: true })} (${metric.deltaPercent === null ? 'n/a' : `${Math.round(metric.deltaPercent * 100)}%`}) versus the previous period.`;
}

function buildChartTrendStatement(chartModel: ChartPreviewModel | null, preferences: DisplayPreferences): string | null {
  if (!chartModel?.xField || !chartModel.yField || chartModel.rows.length < 2) return null;
  const first = chartModel.rows[0];
  const last = chartModel.rows[chartModel.rows.length - 1];
  const firstValue = numberValue(first[chartModel.yField]);
  const lastValue = numberValue(last[chartModel.yField]);
  if (firstValue === null || lastValue === null) return null;
  const delta = lastValue - firstValue;
  const direction = delta >= 0 ? 'increased' : 'decreased';
  const percent = firstValue === 0 ? null : delta / Math.abs(firstValue);
  return `${chartModel.yField} ${direction} from ${formatValue(firstValue, 'currency', preferences, { compact: true })} at ${String(first[chartModel.xField])} to ${formatValue(lastValue, 'currency', preferences, { compact: true })} at ${String(last[chartModel.xField])}${percent === null ? '' : ` (${Math.round(percent * 100)}%)`}.`;
}

function topChartRows(chartModel: ChartPreviewModel | null, limit = 5): Array<{ label: string; value: number; field: string }> {
  if (!chartModel?.xField || !chartModel.yField) return [];
  const candidateFields = [
    chartModel.yField,
    ...chartModel.seriesFields,
    ...Object.keys(chartModel.rows[0] || {}).filter(field => field !== chartModel.xField)
  ].filter((field, index, fields) => Boolean(field) && fields.indexOf(field) === index);
  const valueField = candidateFields.find(field => chartModel.rows.some(row => numberValue(row[field]) !== null));
  if (!valueField) return [];
  return chartModel.rows
    .map(row => ({ label: String(row[chartModel.xField!] ?? '(empty)'), value: numberValue(row[valueField]), field: valueField }))
    .filter((item): item is { label: string; value: number; field: string } => item.value !== null)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

const BusinessFusionAngleReadout: React.FC<{
  action: AnalysisAction;
  chartModel: ChartPreviewModel | null;
  overview?: BusinessFusionOverview;
  preferences: DisplayPreferences;
}> = ({ action, chartModel, overview, preferences }) => {
  const intent = metricIntent(action, chartModel);
  const revenue = findOverviewMetric(overview, ['revenue', 'sales']);
  const profit = findOverviewMetric(overview, ['profit', 'gross profit', 'margin']);
  const quantity = findOverviewMetric(overview, ['quantity']);
  const delivery = findOverviewMetric(overview, ['delivery']);
  const trendStatement = buildChartTrendStatement(chartModel, preferences);
  const rankedRows = topChartRows(chartModel);
  const topRow = rankedRows[0];
  const bottomRow = [...rankedRows].sort((a, b) => a.value - b.value)[0];
  const productFallback = overview?.topGrowthDrivers[0] || overview?.topProfitDrivers[0];

  const focusTitle = intent === 'profitability'
    ? 'Profit and cash-flow focus'
    : intent === 'product'
      ? 'Product performance focus'
      : intent === 'operations'
        ? 'Operational movement focus'
        : intent === 'money'
          ? 'Money trend focus'
          : 'Selected decision angle focus';

  const mainAnswer = intent === 'product' && (topRow || productFallback)
    ? topRow
      ? `${topRow.label} is the strongest item in this chart for ${topRow.field}, contributing ${formatValue(topRow.value, 'currency', preferences, { compact: true })}.`
      : `${productFallback!.key} is the strongest product signal LightBI could safely rank for this angle, moving ${formatValue(productFallback!.delta, 'currency', preferences, { compact: true })}.`
    : intent === 'profitability'
      ? formatMetricDelta(profit || revenue, preferences)
      : trendStatement || formatMetricDelta(revenue || profit, preferences);

  const overviewLines = intent === 'profitability'
    ? [
        formatMetricDelta(profit, preferences),
        formatMetricDelta(revenue, preferences),
        quantity ? formatMetricDelta(quantity, preferences) : null,
      ].filter(Boolean) as string[]
    : intent === 'product'
      ? [
          topRow ? `Top chart item: ${topRow.label} at ${formatValue(topRow.value, 'currency', preferences, { compact: true })} for ${topRow.field}.` : 'Top product signal is ranked from the fused Sales, Accounting, and Logistics evidence for this same angle.',
          bottomRow && bottomRow.label !== topRow?.label ? `Weakest visible item: ${bottomRow.label} at ${formatValue(bottomRow.value, 'currency', preferences, { compact: true })}.` : null,
          productFallback && !topRow ? `Fallback product driver: ${productFallback.key} moved ${formatValue(productFallback.delta, 'currency', preferences, { compact: true })}.` : null,
          overview?.topProfitDrivers[0] ? `Profit leader for context: ${overview.topProfitDrivers[0].key} at ${formatValue(overview.topProfitDrivers[0].currentValue, 'currency', preferences, { compact: true })}.` : null,
        ].filter(Boolean) as string[]
      : [
          trendStatement || formatMetricDelta(revenue, preferences),
          profit ? formatMetricDelta(profit, preferences) : null,
          delivery ? formatMetricDelta(delivery, preferences) : null,
        ].filter(Boolean) as string[];

  const detailDrivers = intent === 'product'
    ? (rankedRows.length > 0
        ? rankedRows.map((row, index) => `#${index + 1} ${row.label}: ${formatValue(row.value, 'currency', preferences, { compact: true })} (${row.field}).`)
        : (overview?.topGrowthDrivers || []).slice(0, 5).map((driver, index) => `Product driver #${index + 1}: ${driver.key}, movement ${formatValue(driver.delta, 'currency', preferences, { compact: true })}.`))
    : intent === 'profitability'
      ? (overview?.topProfitDrivers || []).slice(0, 5).map((driver, index) => `Profit #${index + 1}: ${driver.key} at ${formatValue(driver.currentValue, 'currency', preferences, { compact: true })}, movement ${formatValue(driver.delta, 'currency', preferences, { compact: true })}.`)
      : [
          ...(overview?.topGrowthDrivers || []).slice(0, 3).map((driver, index) => `Growth #${index + 1}: ${driver.key}, ${formatValue(driver.delta, 'currency', preferences, { compact: true })}.`),
          ...(overview?.topDeclineDrivers || []).slice(0, 3).map((driver, index) => `Decline #${index + 1}: ${driver.key}, ${formatValue(driver.delta, 'currency', preferences, { compact: true })}.`),
        ];

  const riskLines = [
    ...(overview?.caveats || []).slice(0, 2),
    ...(overview?.crossChecks || []).slice(0, 1),
    chartModel?.warnings[0],
  ].filter(Boolean);

  return (
    <section className="mb-5 rounded-xl border border-violet-100 bg-white shadow-sm">
      <div className="border-b border-violet-100 bg-violet-50/60 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">Selected angle BA readout</p>
        <h3 className="mt-1 text-lg font-semibold text-[#202123]">{focusTitle}</h3>
        <p className="mt-1 text-[12px] leading-5 text-black/55">
          Angle: {action.opportunityName} · Chart: {chartModel?.title || action.label} · Main measure: {chartModel?.yField || action.measures[0] || 'detected metric'}
        </p>
      </div>
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-emerald-950">
          <p className="text-[13px] font-semibold">Main answer</p>
          <p className="mt-1 text-[13px] leading-6">{mainAnswer}</p>
        </div>
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-blue-950">
          <p className="text-[13px] font-semibold">Why this chart exists</p>
          <p className="mt-1 text-[13px] leading-6">
            LightBI selected {chartModel?.chartType || 'this chart'} because the active angle combines {action.dimensions.join(', ') || chartModel?.xField || 'a business dimension'} with {action.measures.join(', ') || chartModel?.yField || 'a measurable outcome'}.
          </p>
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-3">
          <p className="text-[13px] font-semibold text-[#202123]">Overview analysis</p>
          <ul className="mt-2 space-y-1 text-[12px] leading-5 text-black/65">
            {overviewLines.length > 0 ? overviewLines.map(line => <li key={line}>- {line}</li>) : <li>No overview line could be safely generated for this angle.</li>}
          </ul>
        </div>
        <div className="rounded-lg border border-black/10 bg-white p-3">
          <p className="text-[13px] font-semibold text-[#202123]">Details and drivers</p>
          <ul className="mt-2 space-y-1 text-[12px] leading-5 text-black/65">
            {detailDrivers.length > 0 ? detailDrivers.slice(0, 6).map(line => <li key={line}>- {line}</li>) : <li>No ranked driver was available for this chart.</li>}
          </ul>
        </div>
        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-amber-950 lg:col-span-2">
          <p className="text-[13px] font-semibold">Risk and caveat</p>
          <ul className="mt-2 space-y-1 text-[12px] leading-5 opacity-80">
            {riskLines.length > 0 ? riskLines.map(line => <li key={line}>- {line}</li>) : <li>Use this as directional analysis until reconciliation, margin, and source-quality checks are reviewed.</li>}
          </ul>
        </div>
      </div>
    </section>
  );
};

const BasicBAAnswerCard: React.FC<{
  brief: BADecisionBrief;
  onAnalyzeDeeper: () => void;
}> = ({ brief, onAnalyzeDeeper }) => {
  const primaryInsights = brief.insights.slice(0, 2);
  const trustClass = brief.decisionReadinessScore >= 70
    ? 'border-emerald-100 bg-emerald-50 text-emerald-800'
    : brief.decisionReadinessScore >= 45
      ? 'border-amber-100 bg-amber-50 text-amber-800'
      : 'border-red-100 bg-red-50 text-red-800';

  return (
    <section className="mt-5 rounded-[16px] border border-black/10 bg-white shadow-sm">
      <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-violet-50 text-violet-600">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#202123]">BA answer</h3>
              <p className="text-xs text-black/45">Basic answer for this selected decision angle.</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-700">{brief.executiveSummary}</p>
        </div>

        <div className="grid min-w-[220px] grid-cols-2 gap-2">
          <div className="rounded-[12px] border border-black/10 bg-[#f7f7f6] p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-black/45">Data trust</div>
            <div className="mt-1 text-xl font-semibold text-[#202123]">{brief.dataTrustScore}</div>
          </div>
          <div className={`rounded-[12px] border p-3 ${trustClass}`}>
            <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">Readiness</div>
            <div className="mt-1 text-xl font-semibold">{brief.decisionReadinessScore}</div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 border-t border-black/5 px-5 py-4 md:grid-cols-[1fr_220px]">
        <div className="grid gap-3 md:grid-cols-2">
          {primaryInsights.length > 0 ? primaryInsights.map(insight => (
            <div key={insight.id} className="rounded-[12px] border border-amber-100 bg-amber-50 p-3 text-amber-900">
              <div className="mb-1 text-xs font-semibold">{insight.title}</div>
              <p className="text-xs leading-5 opacity-90">{insight.statement}</p>
            </div>
          )) : (
            <div className="rounded-[12px] border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
              No immediate insight was produced. Open the deeper analysis panel for caveats and diagnostics.
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-3 rounded-[12px] border border-black/5 bg-[#fbfbfa] p-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-black/45">Decision caveat</div>
            <p className="mt-1 line-clamp-3 text-xs leading-5 text-black/60">
              {brief.caveats[0] ?? 'Review the chart and evidence rows before using this result for an operational decision.'}
            </p>
          </div>
          <button
            onClick={onAnalyzeDeeper}
            className="rounded-[10px] bg-[#202123] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-black"
          >
            Analyze deeper
          </button>
        </div>
      </div>
    </section>
  );
};

export const Investigation: React.FC = () => {
  const navigate = useNavigate();
  const session = getCurrentInvestigationSession();
  const { preferences } = useDisplayPreferences();
  const registerAdvancedSource = useAdvancedSourceStore(state => state.registerSource);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState<DuckDBPreviewResult | null>(null);
  const [chartModel, setChartModel] = useState<ChartPreviewModel | null>(null);
  const [validationResult, setValidationResult] = useState<ResultValidationResult | null>(null);
  const [drillResult, setDrillResult] = useState<DrillThroughResult | null>(null);
  const [selectedDrillRows, setSelectedDrillRows] = useState<Set<number>>(new Set());
  const [isDrilling, setIsDrilling] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showAiContext, setShowAiContext] = useState(false);
  const [showDeepAnalysis, setShowDeepAnalysis] = useState(false);
  const [savedChartNotice, setSavedChartNotice] = useState<string | null>(null);
  const executionRuns = useRef(new ExecutionRunCoordinator('simple-preview'));
  const drillRuns = useRef(new ExecutionRunCoordinator('simple-drill-through'));
  const autoPreviewStarted = useRef(false);
  const workspaceSessionPersisted = useRef(false);
  const createChart = useAppRuntime(state => state.createChart);

  useEffect(() => () => {
    executionRuns.current.cancel();
    drillRuns.current.cancel();
  }, []);

  useEffect(() => {
    if (!session || workspaceSessionPersisted.current) return;
    workspaceSessionPersisted.current = true;
    void persistWorkspaceSession();
  }, [session]);

  useEffect(() => {
    if (!session?.rows?.length) return;
    const columns = Object.keys(session.rows[0] || {});
    if (columns.length === 0) return;
    const rows = session.rows;
    const sourceName = session.datasetId || session.analysisAction.opportunityName || 'Investigation dataset';
    const tableName = sourceName.length > 80 ? 'analysis_rows' : sourceName;
    const file = new File([JSON.stringify(rows)], `${safeFileStem(sourceName)}.json`, { type: 'application/json' });
    registerAdvancedSource({
      id: advancedSourceId('investigation', sourceName),
      name: sourceName,
      sourceType: 'investigation',
      sourceKind: 'local_file',
      tables: [{
        id: '0:analysis_rows',
        name: tableName,
        rowCount: rows.length,
        columns,
        profiles: profileColumns(columns, rows, rows.length),
        file,
      }],
      semanticSample: {
        strategy: 'investigation_rows',
        sourceRowCount: rows.length,
        sampleRowCount: rows.length,
      },
      registeredAt: new Date().toISOString(),
    });
  }, [registerAdvancedSource, session]);

  useEffect(() => {
    if (!session || !session.canonicalHandoff || autoPreviewStarted.current) return;
    const hasPreviewInput = (session.rows?.length ?? 0) > 0;
    if (!hasPreviewInput) return;
    autoPreviewStarted.current = true;
    const timer = window.setTimeout(() => {
      const button = document.querySelector<HTMLButtonElement>('[data-run-preview="true"]');
      button?.click();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center max-w-md w-full">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No Active Session</h2>
          <p className="text-sm text-gray-500 mb-4">Please select an analysis from the Home page.</p>
          <button 
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const { analysisAction, runtimeIntent, runtimePlanPreview, rows, aiBriefing, runtimeDatasetSource, rowScope, businessFusionOverview, canonicalHandoff } = session;
  const canonicalSourceBoundary = canonicalHandoff?.sourceBoundary;
  const fullFileSourceReady = Boolean(
    canonicalSourceBoundary
    && sourceBindingsMatch(canonicalSourceBoundary, runtimeDatasetSource)
    && canonicalHandoff?.sourceFingerprint === canonicalSourceBoundary.sourceFingerprint
  );
  const fallbackWorkspaceSessionPayload = (): SaveWorkspaceSessionRequest => {
    const columns = rows?.[0] ? Object.keys(rows[0]) : [];
    const retainedRows = limitInvestigationRows(rows);
    return {
      title: session.datasetId || analysisAction.opportunityName || 'Untitled session',
      sourceType: businessFusionOverview ? 'business_fusion_view' : 'investigation',
      rowCount: rows?.length ?? 0,
      columnCount: columns.length,
      sourceSummary: [],
      snapshot: {
        version: 1,
        savedAt: new Date().toISOString(),
        currentDataset: {
          status: 'ready',
          file_name: session.datasetId,
          rows_count: rows?.length ?? 0,
          columns,
          profiles: {},
          sourceType: businessFusionOverview ? 'business_fusion_view' : 'investigation',
          sourceFiles: [],
          analysisRows: retainedRows,
          previewRows: retainedRows.slice(0, 100),
          businessFusionOverview,
          analysisRowScope: rows && rows.length > INVESTIGATION_SESSION_ROW_LIMIT ? 'retained_sample' : rowScope,
        },
      },
    };
  };

  const persistWorkspaceSession = async () => {
    const payload = session.workspaceSessionPayload || fallbackWorkspaceSessionPayload();
    try {
      const saved = await saveWorkspaceSession(payload);
      session.workspaceSessionPayload = { ...payload, id: saved.id };
      return saved;
    } catch (error) {
      console.error('Could not save workspace session', error);
      return null;
    }
  };

  const readinessTier = aiBriefing?.readinessTier ?? 'exploratory_only';
  const isHighReadiness = readinessTier === 'production_ready' || readinessTier === 'decision_support';
  const isLowReadiness = readinessTier === 'exploratory_only';
  const readinessLabel = isHighReadiness
    ? 'High Readiness'
    : isLowReadiness
      ? 'Low Readiness (Exploratory Only)'
      : 'Moderate Readiness (Caution)';
  const readinessClass = isHighReadiness
    ? 'text-emerald-600'
    : isLowReadiness
      ? 'text-red-600'
      : 'text-amber-600';
  const readinessBannerClass = isLowReadiness
    ? 'bg-red-50 border-red-200 text-red-800'
    : 'bg-amber-50 border-amber-200 text-amber-800';
  const readinessIconClass = isLowReadiness ? 'text-red-500' : 'text-amber-500';
  const briefingRationale = aiBriefing?.caveats?.length
    ? aiBriefing.caveats.join(' ')
    : `Readiness score: ${aiBriefing?.readinessScore ?? 0}`;
  const safeActionHints = aiBriefing?.safeActionHints ?? [];
  const safeSqlPreview: SafeSqlPreview = canonicalHandoff?.queryPlanning.state === 'planned'
    ? {
      id: `sql_${canonicalHandoff.queryPlanning.plan.planId}`,
      sourcePlanId: canonicalHandoff.queryPlanning.plan.planId,
      status: 'ready',
      dialect: 'duckdb',
      sql: canonicalHandoff.queryPlanning.plan.sql,
      parameters: Object.fromEntries(canonicalHandoff.queryPlanning.plan.parameters.map((value, index) => [`parameter_${index + 1}`, value])),
      referencedColumns: [...new Set([
        ...canonicalHandoff.queryPlanning.plan.metricBindings.map(binding => binding.physicalColumn),
        ...canonicalHandoff.queryPlanning.plan.groupingBindings.map(binding => binding.physicalColumn),
        ...(canonicalHandoff.queryPlanning.plan.timeBinding ? [canonicalHandoff.queryPlanning.plan.timeBinding.physicalColumn] : []),
      ])],
      warnings: canonicalHandoff.queryPlanning.plan.restrictions.map(item => item.code),
      blockedReasons: [],
      source: 'runtime_plan_preview',
    }
    : {
      id: `sql_blocked_${canonicalHandoff?.artifactIdentity ?? 'canonical_handoff_required'}`,
      sourcePlanId: canonicalHandoff?.artifactIdentity ?? 'canonical_handoff_required',
      status: 'blocked',
      dialect: 'duckdb',
      sql: null,
      parameters: {},
      referencedColumns: [],
      warnings: [],
      blockedReasons: canonicalHandoff?.blockers.length ? [...canonicalHandoff.blockers] : ['canonical_handoff_required'],
      source: 'runtime_plan_preview',
    };
  const baDecisionBrief = previewResult
    ? createBADecisionBrief({
      datasetId: session.datasetId,
      previewResult,
      chartModel,
      aiBriefing,
      runtimeIntent
    })
    : createPreExecutionBADecisionBrief({
      datasetId: session.datasetId,
      rows,
      aiBriefing,
      runtimeIntent,
      rowScope
    });

  const saveChartToLibrary = async () => {
    if (!chartModel || chartModel.status !== 'ready') return;
    await persistWorkspaceSession();
    const chartType = chartModel.chartType === 'line'
      ? 'Line'
      : chartModel.chartType === 'table'
        ? 'Table'
        : 'Bar';
    const chartId = createChart({
      projectId: 'proj-1',
      datasetId: session.datasetId,
      name: chartModel.title || analysisAction.opportunityName,
      type: chartType,
      xAxis: chartModel.xField ? [{ columnName: chartModel.xField }] : [],
      yAxis: chartModel.seriesFields.map(columnName => ({ columnName, aggregation: 'None' })),
      filters: {},
      formatting: {
        lightbiData: {
          source: 'simple_ba_preview',
          datasetName: session.datasetId,
          title: chartModel.title,
          chartType: chartModel.chartType,
          xField: chartModel.xField,
          yField: chartModel.yField,
          seriesFields: chartModel.seriesFields,
          rows: chartModel.rows.slice(0, 500),
          rowCount: previewResult?.rowCount ?? chartModel.rows.length,
          savedAt: new Date().toISOString(),
        },
      },
    });
    setSavedChartNotice(`Saved to Chart Library: ${chartId}`);
  };

  const handleRunPreview = async () => {
    await persistWorkspaceSession();
    const run = executionRuns.current.begin();
    setIsExecuting(true);
    setPreviewResult(null);
    setChartModel(null);
    setValidationResult(null);
    setDrillResult(null);
    setSelectedDrillRows(new Set());
    setDrillError(null);
    try {
      if (!canonicalHandoff || canonicalHandoff.queryPlanning.state !== 'planned') {
          const planningBlockers = canonicalHandoff?.queryPlanning.state === 'blocked'
            ? canonicalHandoff.queryPlanning.blockers
            : [];
          const blockedReasons = [...new Set([
            ...(canonicalHandoff?.blockers ?? []),
            ...planningBlockers,
            ...(!canonicalHandoff ? ['canonical_handoff_required'] : []),
            ...(!fullFileSourceReady ? ['canonical_full_file_runtime_source_required'] : []),
          ])];
          const blocked: DuckDBPreviewResult = {
            id: `canonical-blocked:${canonicalHandoff?.artifactIdentity ?? 'canonical_handoff_required'}`,
            sourceSqlPreviewId: 'canonical-governed-preflight',
            status: 'blocked',
            columns: [], rows: [], rowCount: 0, maxRows: 100,
            warnings: [
              ...(canonicalHandoff?.runtimePreflight.restrictions.map(item => item.code) ?? []),
              ...(canonicalHandoff?.runtimePreflight.evidence.map(item => item.evidenceId) ?? []),
            ],
            blockedReasons,
            errorMessage: blockedReasons.join(', '),
            source: 'governed_duckdb_execution',
          };
          setPreviewResult(blocked);
          setValidationResult(validatePreviewAgainstIntent(runtimeIntent, blocked));
          setChartModel(null);
          return;
      }
      if (!canonicalSourceBoundary || !runtimeDatasetSource || !fullFileSourceReady) {
          const blocked: DuckDBPreviewResult = {
            id: `canonical-blocked:${canonicalHandoff.artifactIdentity}`,
            sourceSqlPreviewId: 'canonical-governed-preflight',
            status: 'blocked',
            columns: [], rows: [], rowCount: 0, maxRows: 100,
            warnings: [
              ...canonicalHandoff.runtimePreflight.restrictions.map(item => item.code),
              ...canonicalHandoff.runtimePreflight.evidence.map(item => item.evidenceId),
            ],
            blockedReasons: ['canonical_full_file_runtime_source_required'],
            errorMessage: 'canonical_full_file_runtime_source_required',
            source: 'governed_duckdb_execution',
          };
          setPreviewResult(blocked);
          setValidationResult(validatePreviewAgainstIntent(runtimeIntent, blocked));
          setChartModel(null);
          return;
      }
      const governed = await executeGovernedMetricRequest({
          schemaVersion: 'lightbi.governed-metric-execution-request.v1',
          requestId: `consumer:${canonicalHandoff.queryPlanning.plan.planId}`,
          plan: canonicalHandoff.queryPlanning.plan,
          rows: [],
          runtimeSource: runtimeDatasetSource,
          expectedRuntimeBinding: runtimeDatasetSource.binding,
          artifactIdentity: canonicalHandoff.artifactIdentity,
          expectedSourceRowCount: canonicalSourceBoundary.sourceRowCount,
          groundTruth: { state: 'unavailable', value: null, tolerance: null, provenance: 'production_consumer_no_ground_truth' },
        }, createGovernedLocalDuckDBBoundary({
          runtimeSource: runtimeDatasetSource,
          expectedRuntimeBinding: runtimeDatasetSource.binding,
        }));
        session.canonicalExecutionResult = governed;
        const canonicalResult: DuckDBPreviewResult = {
          id: governed.resultId,
          sourceSqlPreviewId: governed.queryPlanIdentity,
          status: governed.status,
          columns: governed.columns,
          rows: governed.rows,
          rowCount: governed.rowCount,
          maxRows: 100,
          warnings: [
            ...governed.limitations,
            ...governed.restrictions.map(item => item.code),
            ...governed.evidence.map(item => item.evidenceId),
          ],
          blockedReasons: governed.status === 'blocked' ? governed.limitations : [],
          errorMessage: governed.error ?? undefined,
          executionScope: governed.fullFileExecution?.executionScope ?? rowScope,
          source: 'governed_duckdb_execution',
        };
        if (!executionRuns.current.isCurrent(run)) return;
        const validation = validatePreviewAgainstIntent(runtimeIntent, canonicalResult);
        const result = canonicalResult.status === 'executed' && canonicalResult.rowCount === 0
          ? {
              ...canonicalResult,
              status: 'failed' as const,
              errorMessage: 'Execution completed but returned an empty dataset. Analysis unavailable.',
            }
          : canonicalResult.status === 'executed' && validation.status === 'failed'
            ? {
                ...canonicalResult,
                status: 'failed' as const,
                warnings: [...new Set([...canonicalResult.warnings, ...validation.warnings])],
                errorMessage: 'Validation boundary rejected the preview result due to insufficient quality or missing required data.',
              }
            : canonicalResult;
        setPreviewResult(result);
        setValidationResult(validation);
        setChartModel(result.status === 'executed'
          ? createChartPreviewModel({ previewResult: result, runtimePlan: runtimePlanPreview, analysisLabel: analysisAction.opportunityName })
          : null);
      return;
    } catch (error) {
      if (executionRuns.current.isCurrent(run) && !(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Preview execution failed', error);
        const failed: DuckDBPreviewResult = {
          id: `canonical-failed:${canonicalHandoff?.artifactIdentity ?? 'canonical_handoff_required'}`,
          sourceSqlPreviewId: canonicalHandoff?.queryPlanning.state === 'planned'
            ? canonicalHandoff.queryPlanning.plan.planId
            : 'canonical-governed-preflight',
          status: 'failed',
          columns: [],
          rows: [],
          rowCount: 0,
          maxRows: 100,
          warnings: [
            ...(canonicalHandoff?.runtimePreflight.restrictions.map(item => item.code) ?? []),
            ...(canonicalHandoff?.runtimePreflight.evidence.map(item => item.evidenceId) ?? []),
          ],
          blockedReasons: [],
          errorMessage: error instanceof Error ? error.message : 'Canonical preview execution failed.',
          executionScope: rowScope,
          source: 'governed_duckdb_execution',
        };
        setPreviewResult(failed);
        setValidationResult(validatePreviewAgainstIntent(runtimeIntent, failed));
        setChartModel(null);
      }
    } finally {
      if (executionRuns.current.finish(run)) {
        setIsExecuting(false);
      }
    }
  };

  const handleDrillThrough = async (point: DrillThroughPoint) => {
    const run = drillRuns.current.begin();
    setIsDrilling(true);
    setDrillError(null);
    setDrillResult(null);
    setSelectedDrillRows(new Set());
    try {
      const result = await executeDrillThrough({
        runtimePlan: runtimePlanPreview,
        point,
        rows: rows || [],
        runtimeDatasetSource,
        rowScope,
        limit: 50_000,
        signal: run.signal,
      });
      if (!drillRuns.current.isCurrent(run)) return;
      if (result.status === 'failed') {
        setDrillError(result.errorMessage || 'Unable to load matching rows.');
        return;
      }
      setDrillResult(result);
      setSelectedDrillRows(new Set(result.rows.map((_, index) => index)));
    } catch (error) {
      if (drillRuns.current.isCurrent(run) && !(error instanceof DOMException && error.name === 'AbortError')) {
        setDrillError(error instanceof Error ? error.message : 'Unable to load matching rows.');
      }
    } finally {
      if (drillRuns.current.finish(run)) {
        setIsDrilling(false);
      }
    }
  };

  const selectedRows = drillResult
    ? drillResult.rows.filter((_, index) => selectedDrillRows.has(index))
    : [];
  const drillExportBaseName = drillResult
    ? `${session.datasetId}_${drillResult.point.dimensionField}_${drillResult.point.label}`
      .replace(/[^a-z0-9_-]+/gi, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 90) || 'lightbi_filtered_rows'
    : 'lightbi_filtered_rows';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#fbfbfa]">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-black/10 bg-[#fbfbfa]/95 px-5 py-3 backdrop-blur">
        <button 
          onClick={() => navigate('/')}
          className="rounded-lg p-1.5 text-black/45 transition-colors hover:bg-black/[0.04] hover:text-[#202123]"
          title="Back to Home"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[15px] font-semibold leading-tight text-[#202123]">
            {analysisAction.opportunityName}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium text-black/45">Dataset: {session.datasetId}</span>
            <span className="text-black/20">•</span>
            <span className="rounded border border-black/10 bg-white px-1.5 py-0.5 text-[11px] font-medium text-black/60">
              {analysisAction.actionType}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-5 p-5 pb-24 md:p-8">
        
        {/* Readiness Banner */}
        {aiBriefing && !isHighReadiness && (
          <div className={`flex items-start gap-3 rounded-lg border p-4 ${readinessBannerClass}`}>
            <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${readinessIconClass}`} />
            <div>
              <h3 className="font-semibold text-sm">
                {readinessLabel}
              </h3>
              <p className="text-xs mt-1 opacity-90">{briefingRationale}</p>
            </div>
          </div>
        )}

        {/* AI Context Panel */}
        {aiBriefing && (
          <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition-all duration-300">
            <button 
              onClick={() => setShowAiContext(!showAiContext)}
              className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-black/[0.025]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/[0.04] text-black/60">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="mb-0.5 text-sm font-semibold text-[#202123]">AI Semantic Briefing</h3>
                  <p className="text-xs text-black/45">Context, grain, and safe actions for execution</p>
                </div>
              </div>
              <div className="text-gray-400">
                {showAiContext ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </button>
            
            {showAiContext && (
              <div className="border-t border-black/5 bg-[#f7f7f6] p-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Grain & Trust</h4>
                    <div className="bg-white p-3 rounded border border-gray-200 text-sm mb-3">
                      <span className="font-semibold block mb-1">Grain: {aiBriefing.grain}</span>
                      <span className="text-gray-600">{aiBriefing.grainEvidence || 'No grain evidence recorded.'}</span>
                    </div>
                    <div className="bg-white p-3 rounded border border-gray-200 text-sm">
                      <span className="font-semibold block mb-1">Readiness: <span className={readinessClass}>{readinessTier.toUpperCase()}</span></span>
                      <span className="text-gray-600">{briefingRationale}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Safe Actions</h4>
                    <ul className="space-y-2 mb-4">
                      {safeActionHints.length > 0 ? (
                        safeActionHints.map((action, i) => (
                          <li key={i} className="flex items-center text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
                            <code className="bg-gray-100 px-1 rounded">{action}</code>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-gray-500 bg-white p-2 rounded border border-gray-200">
                          No safe action hints recorded.
                        </li>
                      )}
                    </ul>
                    
                    {aiBriefing.caveats.length > 0 && (
                      <>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 mt-4">Caveats</h4>
                        <ul className="space-y-1">
                          {aiBriefing.caveats.map((c, i) => (
                            <li key={i} className="flex items-start text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-100">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mr-2 shrink-0 mt-0.5" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Primary Analysis Surface */}
        <div className="flex flex-col overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-black/5 bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="mb-1 text-[16px] font-semibold text-[#202123]">Decision workspace</h2>
              <p className="text-[13px] text-black/45">Chart preview, BA brief, and raw evidence stay together for review.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-black/10 bg-[#fbfbfa] px-3 py-2 text-xs font-medium text-black/65 shadow-sm">
                <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
                Expected chart: {runtimeIntent.expectedShape.replace('_', ' ')}
              </span>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-black/10 bg-[#fbfbfa] px-3 py-2 text-xs font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035] hover:text-[#202123]"
                title="Chart display preferences"
              >
                <Settings2 className="h-3.5 w-3.5" strokeWidth={1.7} />
                View
              </button>
              <button
                onClick={() => { void persistWorkspaceSession().finally(() => setShowDeepAnalysis(true)); }}
                disabled={isExecuting || !baDecisionBrief}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-medium text-violet-700 shadow-sm transition-colors hover:bg-violet-100 disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-white disabled:text-black/30"
                title="Open a deeper BA explanation for this selected decision angle"
              >
                <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.7} />
                Analyze deeper
              </button>
              <button
                onClick={() => { void saveChartToLibrary(); }}
                disabled={!chartModel || chartModel.status !== 'ready'}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-black/10 disabled:bg-white disabled:text-black/30"
                title="Save this executed chart as a reusable dashboard card"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" strokeWidth={1.7} />
                Save chart
              </button>
              <button
                data-run-preview="true"
                onClick={handleRunPreview}
                disabled={isExecuting}
                className="rounded-[10px] bg-[#202123] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-black disabled:opacity-50"
              >
                {isExecuting ? 'Running...' : previewResult ? 'Refresh preview' : 'Run preview'}
              </button>
            </div>
          </div>
          
          <div className="border-b border-black/5 bg-white p-6">
             <div className="flex flex-wrap gap-4 mb-8">
                 <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Dimensions</span>
                   <div className="flex flex-wrap gap-2">
                     {runtimeIntent.dimensions.map(d => (
                       <span key={d} className="rounded-[9px] border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                         {d}
                       </span>
                     ))}
                   </div>
                 </div>
                 
                 <div className="flex flex-col gap-1.5">
                   <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">Measures</span>
                   <div className="flex flex-wrap gap-2">
                     {[...runtimeIntent.measures, ...(runtimeIntent.derivedMeasures ?? []).flatMap(m => [m.numeratorLabel, m.denominatorLabel, m.label])].map(m => (
                       <span key={m} className="rounded-[9px] border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                         {m}
                       </span>
                     ))}
                   </div>
                 </div>
             </div>
             
             {/* Chart Placeholder / Renderer Area */}
             <div className="mt-4 w-full">
               {previewResult?.status === 'blocked' ? (
                 <div className="flex h-64 w-full flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-amber-200 bg-amber-50/50 p-6 text-center text-amber-700">
                   <AlertTriangle className="mb-2 h-8 w-8 text-amber-500" />
                   <span className="text-sm font-medium">Analysis Blocked</span>
                   <span className="mt-1 text-xs text-amber-600">{previewResult.blockedReasons.join(', ') || 'Canonical preflight did not authorize execution.'}</span>
                 </div>
               ) : previewResult?.status === 'failed' ? (
                 <div className="flex h-64 w-full flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-red-200 bg-red-50/50 p-6 text-center text-red-500">
                   <AlertTriangle className="w-8 h-8 text-red-400 mb-2" />
                   <span className="text-sm font-medium">Execution Failed</span>
                   <span className="text-xs text-red-400 mt-1">{previewResult.errorMessage || "Preview could not be rendered."}</span>
                 </div>
               ) : previewResult?.rows && previewResult.rows.length > 0 && runtimeIntent.expectedShape === 'table' ? (
                 <div className="space-y-5">
                   <DatasetInsightSummary columns={previewResult.columns} rows={previewResult.rows} rowCount={previewResult.rowCount} />
                   {chartModel && chartModel.chartType !== 'table' && (
                     <div className="rounded-[18px] border border-black/10 bg-white p-4 shadow-sm">
                       <ChartPreviewRenderer model={chartModel} onDrillThrough={handleDrillThrough} />
                     </div>
                   )}
                 </div>
               ) : chartModel && runtimeIntent.expectedShape !== 'table' ? (
                 <div className="rounded-[18px] border border-black/10 bg-white p-4 shadow-sm">
                   <ChartPreviewRenderer model={chartModel} onDrillThrough={handleDrillThrough} />
                 </div>
               ) : (
                 <div className="flex h-64 w-full flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-slate-200 bg-slate-50 text-slate-400">
                   <Activity className={`mb-2 h-8 w-8 text-slate-300 ${isExecuting ? 'animate-pulse' : ''}`} />
                   <span className="text-sm font-medium">{isExecuting ? 'Preparing preview...' : 'Ready to preview'}</span>
                   {!isExecuting && (
                     <button
                       onClick={handleRunPreview}
                       className="mt-4 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/65 shadow-sm transition-colors hover:bg-black/[0.035]"
                     >
                       Preview chart
                     </button>
                   )}
                 </div>
               )}
             </div>

             {savedChartNotice && (
               <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
                 {savedChartNotice}
               </div>
             )}

             {baDecisionBrief && (
               <BasicBAAnswerCard
                 brief={baDecisionBrief}
                 onAnalyzeDeeper={() => { void persistWorkspaceSession().finally(() => setShowDeepAnalysis(true)); }}
               />
             )}

             {(isDrilling || drillError || drillResult) && (
               <div className="mt-5 rounded-lg border border-black/10 bg-white shadow-sm">
                 <div className="flex flex-col gap-3 border-b border-black/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
                   <div className="min-w-0">
                     <div className="flex items-center gap-2">
                       <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                       <h3 className="text-sm font-semibold text-gray-900">
                         Filtered rows from chart
                       </h3>
                     </div>
                     <p className="mt-1 text-xs text-gray-500">
                       {isDrilling
                         ? 'Loading matching source rows...'
                         : drillResult
                           ? `${formatValue(drillResult.rowCount, 'number', preferences)} rows matched: ${drillResult.point.dimensionField} = ${drillResult.point.label}`
                           : 'Unable to load matching rows.'}
                     </p>
                   </div>
                   <div className="flex flex-wrap items-center gap-2">
                     {drillResult && drillResult.rows.length > 0 && (
                       <>
                         <button
                           onClick={() => {
                             const allSelected = selectedDrillRows.size === drillResult.rows.length;
                             setSelectedDrillRows(allSelected ? new Set() : new Set(drillResult.rows.map((_, index) => index)));
                           }}
                           className="rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/65 transition-colors hover:bg-black/[0.035]"
                         >
                           {selectedDrillRows.size === drillResult.rows.length ? 'Clear selection' : 'Select all'}
                         </button>
                         <button
                           onClick={() => exportRowsAsCsv(`${drillExportBaseName}.csv`, drillResult.columns, selectedRows)}
                           disabled={selectedRows.length === 0}
                           className="inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-white px-3 py-1.5 text-xs font-medium text-black/65 transition-colors hover:bg-black/[0.035] disabled:opacity-40"
                         >
                           <Download className="h-3.5 w-3.5" /> CSV
                         </button>
                         <button
                           onClick={() => exportRowsAsXlsx(`${drillExportBaseName}.xlsx`, drillResult.columns, selectedRows)}
                           disabled={selectedRows.length === 0}
                           className="inline-flex items-center gap-1.5 rounded-md bg-[#202123] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black disabled:opacity-40"
                         >
                           <Download className="h-3.5 w-3.5" /> Excel
                         </button>
                       </>
                     )}
                     <button
                       onClick={() => {
                         drillRuns.current.cancel();
                         setIsDrilling(false);
                         setDrillError(null);
                         setDrillResult(null);
                         setSelectedDrillRows(new Set());
                       }}
                       className="rounded-md p-1.5 text-black/45 transition-colors hover:bg-black/[0.04] hover:text-[#202123]"
                       title="Close filtered rows"
                     >
                       <X className="h-4 w-4" />
                     </button>
                   </div>
                 </div>

                 {drillError && (
                   <div className="m-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                     {drillError}
                   </div>
                 )}

                 {isDrilling && (
                   <div className="flex h-32 items-center justify-center text-sm text-gray-500">
                     <Activity className="mr-2 h-4 w-4 animate-pulse" />
                     Filtering source rows...
                   </div>
                 )}

                 {drillResult && drillResult.rows.length > 0 && (
                   <div className="p-4">
                     <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                       <span>{formatValue(selectedRows.length, 'number', preferences)} of {formatValue(drillResult.rows.length, 'number', preferences)} rows selected for export</span>
                       {drillResult.rows.length >= drillResult.maxRows && (
                         <span className="rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-700">Limited to {formatValue(drillResult.maxRows, 'number', preferences)} rows</span>
                       )}
                     </div>
                     <div className="max-h-[360px] overflow-auto rounded-md border border-gray-200">
                       <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                         <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                           <tr>
                             <th className="w-10 px-3 py-2">
                               <input
                                 type="checkbox"
                                 checked={selectedDrillRows.size === drillResult.rows.length && drillResult.rows.length > 0}
                                 onChange={(event) => {
                                   setSelectedDrillRows(event.target.checked
                                     ? new Set(drillResult.rows.map((_, index) => index))
                                     : new Set());
                                 }}
                               />
                             </th>
                             {drillResult.columns.map(column => (
                               <th key={column} className="whitespace-nowrap bg-gray-50 px-3 py-2 font-medium uppercase tracking-wider text-gray-500">{column}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-gray-200 bg-white">
                           {drillResult.rows.slice(0, 500).map((row, rowIndex) => (
                             <tr key={rowIndex} className={selectedDrillRows.has(rowIndex) ? 'bg-blue-50/50' : undefined}>
                               <td className="px-3 py-2">
                                 <input
                                   type="checkbox"
                                   checked={selectedDrillRows.has(rowIndex)}
                                   onChange={(event) => {
                                     setSelectedDrillRows(current => {
                                       const next = new Set(current);
                                       if (event.target.checked) next.add(rowIndex);
                                       else next.delete(rowIndex);
                                       return next;
                                     });
                                   }}
                                 />
                               </td>
                               {drillResult.columns.map(column => {
                                 const semanticType = inferSemanticType(column, row[column]);
                                 return (
                                   <td key={column} className="whitespace-nowrap px-3 py-2 text-gray-900">
                                     {formatValue(row[column], semanticType, preferences)}
                                   </td>
                                 );
                               })}
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                     {drillResult.rows.length > 500 && (
                       <p className="mt-2 text-xs text-gray-500">Showing first 500 rows in the browser table. Export includes all selected rows loaded in this drill-through result.</p>
                     )}
                   </div>
                 )}
               </div>
             )}

          </div>
          
          <div className="flex flex-col gap-4 border-t border-black/5 bg-[#f7f7f6] px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Preview execution</h3>
              <button
                onClick={handleRunPreview}
                disabled={isExecuting}
                className="rounded-md bg-[#202123] px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-black disabled:opacity-50"
              >
                {isExecuting ? 'Running...' : 'Execute preview'}
              </button>
            </div>
            
            {!previewResult && !isExecuting && (
              <div className="text-xs text-slate-500 italic">
                Results not executed yet. Click "Run preview" to execute.
              </div>
            )}
            
            {previewResult && (
              <div className="flex flex-col gap-3">
                {previewResult.status === 'blocked' && (
                  <div className="mb-2 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 font-semibold text-amber-900">
                      <AlertTriangle className="h-5 w-5" />
                      Analysis Blocked
                    </div>
                    <p className="text-sm text-amber-800">{previewResult.blockedReasons.join(', ') || 'Canonical preflight did not authorize execution.'}</p>
                  </div>
                )}

                {previewResult.status === 'failed' && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-2 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-red-800 font-semibold">
                      <AlertTriangle className="w-5 h-5" />
                      Execution Failed
                    </div>
                    <p className="text-sm text-red-700">
                      {previewResult.errorMessage || "The engine could not process the analysis request."}
                    </p>
                    {validationResult?.warnings && validationResult.warnings.length > 0 && (
                      <ul className="list-disc pl-5 text-xs text-red-600 mt-2">
                        {validationResult.warnings.map(w => <li key={w}>{w}</li>)}
                      </ul>
                    )}
                  </div>
                )}
                
                {(() => {
                  const cleansingWarnings = previewResult.warnings.filter(w => w.includes('underwent silent cleansing'));
                  if (cleansingWarnings.length === 0) return null;
                  return (
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-1 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800">Data Cleansing Active</h4>
                        <p className="text-xs text-amber-700 mt-1">
                          The system has applied the <strong>Safe Numeric Guard</strong>. Dirty strings were automatically stripped of invalid characters or skipped to prevent execution failure during aggregation.
                        </p>
                        <ul className="list-disc pl-4 mt-1.5 text-xs text-amber-700">
                          {cleansingWarnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    </div>
                  );
                })()}
                <div className="flex items-center gap-3 text-xs">
                  <span className={`px-2 py-0.5 rounded font-medium ${previewResult.status === 'executed' ? 'bg-emerald-100 text-emerald-700' : previewResult.status === 'blocked' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'}`}>
                    {previewResult.status.toUpperCase()}
                  </span>
                  <span className="text-slate-500">Row count: {previewResult.rowCount}</span>
                  {previewResult.executionScope && (
                    <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                      {previewResult.executionScope === 'full_file'
                        ? 'Full file'
                        : previewResult.executionScope === 'semantic_sample'
                          ? 'Representative sample'
                          : previewResult.executionScope === 'retained_rows'
                            ? 'Retained rows'
                            : 'Preview rows'}
                    </span>
                  )}
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    Source: <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">{previewResult.source}</span>
                  </span>
                </div>
                


                {previewResult.rows.length > 0 && (
                  <details className="mt-4 mb-2 group">
                    <summary className="text-sm font-semibold text-gray-800 flex items-center gap-2 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden mb-2 hover:text-indigo-600 transition-colors">
                      <ChevronRight className="w-4 h-4 text-gray-500 group-open:rotate-90 transition-transform" />
                      <Database className="w-4 h-4 text-gray-500 group-hover:text-indigo-500" />
                      Raw rows evidence
                    </summary>
                    <div className="pl-6">
                      <p className="text-xs text-gray-500 mb-3">Scroll horizontally and vertically to inspect underlying raw data.</p>
                      <div className="max-h-[400px] overflow-auto border border-gray-200 rounded-md">
                    <table className="min-w-full divide-y divide-gray-200 text-xs text-left">
                      <thead className="bg-gray-50 sticky top-0 shadow-sm z-10">
                        <tr>
                          {previewResult.columns.map(c => (
                            <th key={c} className="px-3 py-2 font-medium text-gray-500 uppercase tracking-wider bg-gray-50">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewResult.rows.map((row, i) => (
                          <tr key={i}>
                            {previewResult.columns.map(c => {
                              const semanticType = inferSemanticType(c, row[c]);
                              return (
                                <td key={c} className="px-3 py-2 text-gray-900 whitespace-nowrap">
                                  {formatValue(row[c], semanticType, preferences)}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                    </div>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Developer Diagnostics Toggle */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden mt-4 transition-all duration-300">
          <button 
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                <Code2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-0.5">
                  {showDiagnostics ? 'Hide developer diagnostics' : 'Show developer diagnostics'}
                </h3>
                <p className="text-xs text-gray-500">Runtime intent, logical plan and SQL preview.</p>
              </div>
            </div>
            <div className="text-gray-400">
              {showDiagnostics ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
          </button>
          
          {/* Developer Diagnostics Content */}
          {showDiagnostics && (
            <div className="bg-slate-900 border-t border-slate-800 p-0">
              <div className="bg-slate-950 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Pipeline State</span>
                <div className="flex items-center gap-2">
                   <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${runtimeIntent.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                     Intent: {runtimeIntent.status}
                   </span>
                   <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${runtimePlanPreview.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                     Plan: {runtimePlanPreview.status}
                   </span>
                </div>
              </div>
              
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-[11px]">
                {/* Intent Column */}
                <div>
                  <h3 className="text-slate-500 mb-2 font-semibold">Runtime Intent</h3>
                  <div className="space-y-1 text-slate-300">
                    <p><span className="text-slate-500 w-20 inline-block">Type:</span> <span className="text-pink-400">{runtimeIntent.type}</span></p>
                    <p><span className="text-slate-500 w-20 inline-block">Shape:</span> <span className="text-emerald-400">{runtimeIntent.expectedShape}</span></p>
                  </div>
                </div>

                {/* Plan Column */}
                <div>
                  {previewResult?.warnings && previewResult.warnings.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-slate-500 mb-2 font-semibold">Execution Warnings</h3>
                      <div className="bg-amber-950/30 border border-amber-900/50 text-amber-500 p-3 rounded-lg text-xs">
                        <ul className="list-disc pl-4 space-y-1">
                          {previewResult.warnings.map((w, i) => {
                            if (w === "No dataset rows available for preview.") {
                              return <li key={i}>{w} Execution wiring will be completed when dataset rows are passed into the investigation session.</li>;
                            }
                            return <li key={i}>{w}</li>;
                          })}
                        </ul>
                      </div>
                    </div>
                  )}

                  <h3 className="text-slate-500 mb-2 font-semibold">Runtime Plan</h3>
                  <div className="space-y-1.5 text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800/50 mb-4">
                    {runtimePlanPreview.logicalOperations.map((op, i) => {
                      let details = '';
                      if (op.type === 'scan') details = op.columns.join(', ');
                      if (op.type === 'group_by') details = `${op.dimensions.join(', ')} / ${op.measures.join(', ')}`;
                      if (op.type === 'trend') details = `${op.timeDimension} / ${op.measures.join(', ')}`;
                      if (op.type === 'distribution') details = op.dimension;
                      if (op.type === 'relationship') details = op.measures.join(', ');
                      if (op.type === 'limit') details = op.rows.toString();
                      return (
                        <div key={i} className="flex">
                          <span className="text-pink-400 w-24 flex-shrink-0">{op.type}:</span>
                          <span className="text-slate-100">{details}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Safe SQL Preview */}
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-slate-500 font-semibold">Safe SQL Preview</h3>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider ${safeSqlPreview.status === 'ready' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {safeSqlPreview.status}
                    </span>
                  </div>
                  
                  {safeSqlPreview.status === 'blocked' && (
                    <div className="bg-red-950/50 border border-red-900/50 rounded-lg p-3 text-red-400 mb-2">
                      <p className="font-semibold mb-1">Blocked Reasons:</p>
                      <ul className="list-disc pl-4 space-y-0.5">
                        {safeSqlPreview.blockedReasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}

                  {safeSqlPreview.sql && (
                    <div className="relative group">
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                          {safeSqlPreview.dialect}
                        </span>
                      </div>
                      <pre className="bg-slate-950 text-slate-300 p-3 rounded-lg border border-slate-800/50 overflow-x-auto whitespace-pre font-mono text-[10px] leading-relaxed">
                        {safeSqlPreview.sql}
                      </pre>
                      <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1.5">
                        <Database className="w-3 h-3" />
                        SQL Preview only. Not executed yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </main>
      {showDeepAnalysis && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/10 backdrop-blur-[1px]" onClick={() => setShowDeepAnalysis(false)}>
          <aside
            className="h-full w-full max-w-[760px] overflow-y-auto border-l border-black/10 bg-[#fbfbfa] shadow-2xl"
            onClick={event => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/10 bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-600">
                  <ClipboardCheck className="h-3.5 w-3.5" />
                  Deep BA Analysis
                </div>
                <h2 className="mt-1 text-base font-semibold text-[#202123]">{analysisAction.opportunityName}</h2>
                <p className="mt-1 text-xs leading-5 text-black/50">
                  Explanation, trust score, caveats, and recommended actions for the decision angle currently shown in the chart.
                </p>
              </div>
              <button
                onClick={() => setShowDeepAnalysis(false)}
                className="rounded-full border border-black/10 bg-white p-2 text-black/50 shadow-sm transition-colors hover:bg-black/[0.035] hover:text-black"
                title="Close analysis panel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              {businessFusionOverview && (
                <>
                  <BusinessBrainBriefPanel
                    brief={createBusinessBrainBrief({
                      action: analysisAction,
                      chartModel,
                      overview: businessFusionOverview
                    })}
                    preferences={preferences}
                  />
                  <BusinessFusionAngleReadout
                    action={analysisAction}
                    chartModel={chartModel}
                    overview={businessFusionOverview}
                    preferences={preferences}
                  />
                  <div className="mb-5">
                    <BusinessFusionOverviewCard overview={businessFusionOverview} />
                  </div>
                </>
              )}
              {baDecisionBrief ? (
                <BADecisionBriefPanel brief={baDecisionBrief} />
              ) : (
                <div className="rounded-[16px] border border-black/10 bg-white p-6 text-sm text-black/55 shadow-sm">
                  Run the preview first, then LightBI can explain this decision angle in depth.
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
      <DisplayPreferencesModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
